import { getStroke } from 'perfect-freehand';
import type { Point, BrushStyle } from '../../types';

/**
 * perfect-freehand 的点格式：[x, y, pressure]
 * pressure 范围 0-1，0.5 为中性
 */
function toPFPoints(points: Point[]): [number, number, number][] {
  return points.map((p) => [p.x, p.y, p.pressure ?? 0.5]);
}

/**
 * 自然风格参数
 * taper/size ≈ 0.4，cap: true 消除三角形尖头
 */
const NATURAL_PARAMS = {
  size: 14,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  start: { cap: true, taper: 6 },
  end: { cap: true, taper: 6 },
};

/**
 * 浓墨风格参数
 */
const HEAVY_INK_PARAMS = {
  size: 22,
  thinning: 0.2,
  smoothing: 0.6,
  streamline: 0.6,
  simulatePressure: true,
  start: { cap: true, taper: 8 },
  end: { cap: true, taper: 10 },
};

/**
 * 飞白风格参数
 * 保持飞白特色但控制 taper 上限，避免三角形
 */
const FLYING_WHITE_PARAMS = {
  size: 18,
  thinning: 0.7,
  smoothing: 0.3,
  streamline: 0.3,
  simulatePressure: true,
  start: { cap: true, taper: 6 },
  end: { cap: true, taper: 8 },
};

/**
 * 【改动2】点数保护：outline 点数 < 3 时，补充微偏移点避免退化三角形
 * 在每个点旁边加 5 个偏移量 0.01px 的点，笔画太短时也有基本形状
 */
function ensureMinOutlinePoints(stroke: [number, number][]): [number, number][] {
  if (stroke.length >= 3) return stroke;
  if (stroke.length === 2) {
    const [a, b] = stroke;
    const pts: [number, number][] = [a];
    // 在 A 附近插 5 个微偏移点
    for (let i = 0; i < 5; i++) {
      pts.push([a[0] + (Math.random() - 0.5) * 0.02, a[1] + (Math.random() - 0.5) * 0.02]);
    }
    pts.push(b);
    // 在 B 附近插 5 个微偏移点
    for (let i = 0; i < 5; i++) {
      pts.push([b[0] + (Math.random() - 0.5) * 0.02, b[1] + (Math.random() - 0.5) * 0.02]);
    }
    return pts;
  }
  // 单点：复制自身附近
  const [p] = stroke;
  return Array.from({ length: 12 }, (_, i) =>
    i < 6
      ? [p[0] + (Math.random() - 0.5) * 0.02, p[1] + (Math.random() - 0.5) * 0.02] as [number, number]
      : [p[0] + (Math.random() - 0.5) * 0.02, p[1] + (Math.random() - 0.5) * 0.02] as [number, number]
  );
}

/**
 * 【改动1】二次贝塞尔中点路径生成
 * 参考 perfect-freehand 官方 getSvgPathFromStroke：
 * 相邻点之间用 Q 命令，中点作为控制点 → 自然圆弧磨平角点
 * stroke 是 perfect-freehand 返回的 outline 点数组
 */
function quadraticBezierPath(stroke: [number, number][]): string {
  if (stroke.length === 0) return '';
  if (stroke.length === 1) {
    const [x, y] = stroke[0];
    return `M ${x} ${y} Q ${x} ${y} ${x + 0.01} ${y}`;
  }

  const parts: string[] = [];
  parts.push(`M ${stroke[0][0].toFixed(2)} ${stroke[0][1].toFixed(2)}`);

  let m1 = stroke[0];
  for (let i = 1; i < stroke.length; i++) {
    const m2 = stroke[i];
    // 中点
    const midX = (m1[0] + m2[0]) / 2;
    const midY = (m1[1] + m2[1]) / 2;
    // Q: 控制点=m1, 终点=中点  →  曲线从 m1 圆滑过渡到 mid
    parts.push(`Q ${m1[0].toFixed(2)} ${m1[1].toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`);
    m1 = m2;
  }

  // 最后一段回到起点：用起点作为控制点，自身为终点，形成圆弧收尾
  const [lastX, lastY] = m1;
  parts.push(`Q ${lastX.toFixed(2)} ${lastY.toFixed(2)} ${stroke[0][0].toFixed(2)} ${stroke[0][1].toFixed(2)}`);
  parts.push('Z');

  return parts.join(' ');
}

/**
 * 根据风格 ID 获取 perfect-freehand 参数
 */
function getPFStyleParams(styleId: BrushStyle['id']) {
  switch (styleId) {
    case 'heavy_ink':
      return HEAVY_INK_PARAMS;
    case 'flying_white':
      return FLYING_WHITE_PARAMS;
    default:
      return NATURAL_PARAMS;
  }
}

/**
 * 绘制单条笔画（用 perfect-freehand 生成轮廓，填充多边形）
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  _unusedSmoothedPath: unknown,
  style: BrushStyle,
  inkColor: string = '#1a1a1a',
  borderStyle?: string
): void {
  if (points.length < 2) return;

  const pfPoints = toPFPoints(points);
  const params = getPFStyleParams(style.id);

  // 获取轮廓点数组
  const stroke = getStroke(pfPoints, params) as [number, number][];
  if (stroke.length < 2) return;

  ctx.save();
  ctx.globalAlpha = style.opacity;

  if (style.textureType === 'heavy') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  }

  if (borderStyle === 'none') {
    // 雾气窗户效果（borderStyle='none'）：destination-out 擦除雾层，露出深色背景
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(255,255,255,1)';
    const safeStroke = ensureMinOutlinePoints(stroke);
    const d = quadraticBezierPath(safeStroke);
    const path = new Path2D(d);
    ctx.fill(path);
    ctx.restore();
    return;
  }

  ctx.fillStyle = inkColor;

  // 轮廓点数不足 3 时，补充微偏移点防止退化三角形
  const safeStroke = ensureMinOutlinePoints(stroke);

  // 用二次贝塞尔中点连接替代直线连接，自然磨圆角点
  const d = quadraticBezierPath(safeStroke);
  const path = new Path2D(d);
  ctx.fill(path);

  ctx.restore();
}

/**
 * 渲染单个字的所有笔画
 */
export function renderCharacter(
  ctx: CanvasRenderingContext2D,
  strokes: { points?: Point[]; smoothedPath?: unknown[] }[],
  style: BrushStyle,
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 1,
  inkColor: string = '#1a1a1a',
  borderStyle?: string
): void {
  if (strokes.length === 0) return;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length < 2) continue;
    renderStroke(ctx, pts, stroke.smoothedPath, style, inkColor, borderStyle);
  }

  ctx.restore();
}
