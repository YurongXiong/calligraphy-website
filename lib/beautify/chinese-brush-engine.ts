import type { Point, BrushStyle } from '../../types';

export interface ChineseBrushConfig {
  /** 笔刷最小宽度（px） */
  minWidth: number;
  /** 笔刷最大宽度（px） */
  maxWidth: number;
  /** 墨水透明度 0-1 */
  inkOpacity: number;
  /** 起笔渐变点数 */
  startTaperLength: number;
  /** 收笔渐变点数 */
  endTaperLength: number;
  /** 纹理类型 */
  textureType: BrushStyle['textureType'];
}

/** 三种风格的笔刷配置 */
export const BRUSH_CONFIGS: Record<BrushStyle['id'], ChineseBrushConfig> = {
  natural: {
    minWidth: 10,
    maxWidth: 44,
    inkOpacity: 0.88,
    startTaperLength: 6,
    endTaperLength: 10,
    textureType: 'none',
  },
  heavy_ink: {
    minWidth: 14,
    maxWidth: 56,
    inkOpacity: 1.0,
    startTaperLength: 8,
    endTaperLength: 14,
    textureType: 'heavy',
  },
  flying_white: {
    minWidth: 8,
    maxWidth: 40,
    inkOpacity: 0.55,
    startTaperLength: 5,
    endTaperLength: 8,
    textureType: 'dry-brush',
  },
};

/** 3 点移动平均平滑 */
function smoothPoints(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    out.push({
      x: (prev.x + cur.x * 2 + next.x) / 4,
      y: (prev.y + cur.y * 2 + next.y) / 4,
      t: cur.t,
      pressure: (prev.pressure ?? 0.5 + (cur.pressure ?? 0.5) * 2 + (next.pressure ?? 0.5)) / 4,
    });
  }
  out.push(points[points.length - 1]);
  return out;
}

/** 根据压力和位置计算笔宽（半径） */
function getPointRadius(
  index: number,
  total: number,
  pressure: number,
  config: ChineseBrushConfig
): number {
  const { minWidth, maxWidth, startTaperLength, endTaperLength } = config;
  // 压力曲线：提升低压力值，手指数值通常 0.1-0.3
  const p = Math.max(0.25, Math.sqrt(pressure) * 1.8);
  const base = minWidth + (maxWidth - minWidth) * p;

  // 起笔渐入
  if (index < startTaperLength) {
    const t = index / startTaperLength;
    return base * (0.2 + 0.8 * Math.sin(t * Math.PI * 0.5));
  }

  // 收笔渐出
  const endIndex = total - endTaperLength;
  if (index >= endIndex) {
    const t = (index - endIndex) / endTaperLength;
    return base * (1 - 0.8 * (1 - Math.pow(1 - t, 3)));
  }

  return base;
}

/** 绘制单个墨点（浓淡渐变圆形） */
function drawStamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  opacity: number,
  inkColor: string
): void {
  if (radius < 0.8) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, hexToRgba(inkColor, opacity));
  gradient.addColorStop(0.45, hexToRgba(inkColor, opacity * 0.75));
  gradient.addColorStop(1, hexToRgba(inkColor, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** 十六进制颜色转 rgba */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 飞白挖空效果 */
function applyFlyingWhiteEffect(
  ctx: CanvasRenderingContext2D,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  config: ChineseBrushConfig
): void {
  const { maxWidth } = config;
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  if (spanX < 2 || spanY < 2) return;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const count = Math.floor((spanX * spanY) / 60);
  for (let i = 0; i < count; i++) {
    const x = bounds.minX + Math.random() * spanX;
    const y = bounds.minY + Math.random() * spanY;
    const r = Math.random() * maxWidth * 0.5 + 2;
    const a = Math.random() * 0.45 + 0.1;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(0,0,0,${a})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 混合策略：
 * 1. 用 lineTo + round cap/join 绘制连续线主体（饱满流畅）
 * 2. 叠加圆形墨点（径向渐变）增加墨水质感
 * 3. step = width*0.15 确保无缝隙重叠（约 2.7x 重叠率）
 */
export class ChineseBrushEngine {
  /**
   * 绘制整条笔画
   */
  drawStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    style: BrushStyle,
    inkColor: string = '#1a1a1a'
  ): void {
    if (points.length < 2) return;

    const config = BRUSH_CONFIGS[style.id];
    const total = points.length;

    // 移动平均平滑
    const pts = smoothPoints(points);

    // 包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    ctx.save();
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = inkColor;

    if (style.textureType === 'heavy') {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
    }

    // --- 方式 A：线段主体 + 墨点叠加 ---
    // 绘制线段（step 加密保证流畅）
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const r0 = getPointRadius(i, total, p0.pressure ?? 0.5, config);
      const r1 = getPointRadius(i + 1, total, p1.pressure ?? 0.5, config);
      const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const step = Math.min(r0, r1) * 0.15; // 密插值
      const n = Math.max(1, Math.floor(dist / step));

      for (let j = 1; j <= n; j++) {
        const t = j / n;
        const x = p0.x + (p1.x - p0.x) * t;
        const y = p0.y + (p1.y - p0.y) * t;
        const r = r0 + (r1 - r0) * t;
        const idx = i + j / n;

        // 线段笔画
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // 叠加墨点质感（径向渐变）
        drawStamp(ctx, x, y, r * 0.65, config.inkOpacity, inkColor);

        minX = Math.min(minX, x - r);
        minY = Math.min(minY, y - r);
        maxX = Math.max(maxX, x + r);
        maxY = Math.max(maxY, y + r);
      }
    }

    // --- 方式 B（备选）：仅用圆形墨点叠加 ---
    // 当前用方式 A，方式 B 作为备选注释保留
    /*
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      const r = getPointRadius(i, total, pt.pressure ?? 0.5, config);
      if (this.lastPt) {
        const dx = pt.x - this.lastPt.x, dy = pt.y - this.lastPt.y;
        const dist = Math.hypot(dx, dy);
        const step = r * 0.2;
        const n = Math.max(1, Math.floor(dist / step));
        for (let j = 1; j <= n; j++) {
          const t = j / n;
          const x = this.lastPt.x + dx * t;
          const y = this.lastPt.y + dy * t;
          const p = (this.lastPt.pressure ?? 0.5) + ((pt.pressure ?? 0.5) - (this.lastPt.pressure ?? 0.5)) * t;
          const rad = getPointRadius(i - 1 + j / n, total, p, config);
          drawStamp(ctx, x, y, rad * 0.55, config.inkOpacity, inkColor);
        }
      } else {
        drawStamp(ctx, pt.x, pt.y, r * 0.55, config.inkOpacity, inkColor);
      }
      this.lastPt = pt;
    }
    */

    // 飞白效果
    if (style.textureType === 'dry-brush') {
      applyFlyingWhiteEffect(ctx, { minX, minY, maxX, maxY }, config);
    }

    ctx.restore();
  }
}
