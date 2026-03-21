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
 */
const NATURAL_PARAMS = {
  size: 14,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  start: { taper: 15 },
  end: { taper: 15 },
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
  start: { taper: 5 },
  end: { taper: 8 },
};

/**
 * 飞白风格参数
 */
const FLYING_WHITE_PARAMS = {
  size: 18,
  thinning: 0.7,
  smoothing: 0.3,
  streamline: 0.3,
  simulatePressure: true,
  start: { taper: 25 },
  end: { taper: 30 },
};

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
  inkColor: string = '#1a1a1a'
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

  ctx.fillStyle = inkColor;

  ctx.beginPath();
  ctx.moveTo(stroke[0][0], stroke[0][1]);
  for (let i = 1; i < stroke.length; i++) {
    ctx.lineTo(stroke[i][0], stroke[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // 飞白：在笔画上叠加不规则挖空效果
  if (style.textureType === 'dry-brush') {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';

    for (let i = 0; i < 40; i++) {
      const idx = Math.floor(Math.random() * stroke.length);
      const [x, y] = stroke[idx];
      const r = Math.random() * 3.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

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
  inkColor: string = '#1a1a1a'
): void {
  if (strokes.length === 0) return;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length < 2) continue;
    renderStroke(ctx, pts, stroke.smoothedPath, style, inkColor);
  }

  ctx.restore();
}
