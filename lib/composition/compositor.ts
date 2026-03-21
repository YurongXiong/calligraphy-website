import type { CharacterStrokes, CategoryId, BrushStyle, Template } from '../../types';
import { calculateLayout, getCanvasSize } from './layout-engine';
import { renderCharacter } from '../beautify';

// 书写画布的尺寸（WritingCanvas.tsx 里的 canvasSize 最大约 400）
const STROKE_CANVAS_SIZE = 400;

/**
 * 合成作品主函数
 */
export async function composeArtwork(
  characters: CharacterStrokes[],
  categoryId: CategoryId,
  template: Template,
  style: BrushStyle
): Promise<HTMLCanvasElement> {
  const { width, height } = getCanvasSize(categoryId);

  // 创建离屏 canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 绘制背景
  drawBackground(ctx, template.bgColor, width, height);

  // 绘制装裱边框
  drawBorder(ctx, template.borderStyle, width, height);

  // 获取内容区域（边框内）
  const contentArea = getContentArea(width, height);

  // 计算布局
  const charCount = characters.length;
  const positions = calculateLayout(categoryId, charCount, contentArea.width, contentArea.height);

  // 渲染每个字
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const pos = positions[i];
    if (!pos) continue;

    // 字在内容区域中的位置
    const absX = contentArea.x + pos.x;
    const absY = contentArea.y + pos.y;

    // 计算缩放：将笔画从书写画布缩放到目标字格
    // 笔画在 STROKE_CANVAS_SIZE × STROKE_CANVAS_SIZE 画布上
    // 目标字格是 pos.width × pos.height
    const scaleX = pos.width / STROKE_CANVAS_SIZE;
    const scaleY = pos.height / STROKE_CANVAS_SIZE;
    const scale = Math.min(scaleX, scaleY); // 保持比例

    // 居中偏移：如果字格和笔画比例不同，需要居中
    const scaledStrokeWidth = STROKE_CANVAS_SIZE * scale;
    const scaledStrokeHeight = STROKE_CANVAS_SIZE * scale;
    const offsetInCellX = (pos.width - scaledStrokeWidth) / 2;
    const offsetInCellY = (pos.height - scaledStrokeHeight) / 2;

    const finalX = absX + offsetInCellX;
    const finalY = absY + offsetInCellY;

    // 渲染（无旋转，直接画），使用模板指定的墨色
    renderCharacter(
      ctx,
      char.strokes,
      style,
      finalX,
      finalY,
      scale,
      template.textColor
    );
  }

  // 绘制水印
  drawWatermark(ctx, width, height);

  return canvas;
}

/**
 * 获取内容区域（边框内的可写字区域）
 */
function getContentArea(width: number, height: number): { x: number; y: number; width: number; height: number } {
  const borderWidth = 40;
  const innerMargin = 20;
  return {
    x: borderWidth + innerMargin,
    y: borderWidth + innerMargin,
    width: width - (borderWidth + innerMargin) * 2,
    height: height - (borderWidth + innerMargin) * 2,
  };
}

/**
 * 绘制背景
 */
function drawBackground(ctx: CanvasRenderingContext2D, bgColor: string, width: number, height: number): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
}

/**
 * 绘制装裱边框
 */
function drawBorder(ctx: CanvasRenderingContext2D, borderStyle: string, width: number, height: number): void {
  const borderWidth = 40;

  // 外边框 - 木框
  ctx.fillStyle = '#5c3d2e';
  ctx.fillRect(0, 0, width, borderWidth); // 上
  ctx.fillRect(0, height - borderWidth, width, borderWidth); // 下
  ctx.fillRect(0, 0, borderWidth, height); // 左
  ctx.fillRect(width - borderWidth, 0, borderWidth, height); // 右

  // 内边框装饰线
  ctx.fillStyle = borderStyle === 'classic' ? '#c9a227' : '#8b7355';
  const innerLineWidth = 6;
  ctx.fillRect(borderWidth, borderWidth, width - borderWidth * 2, innerLineWidth); // 上
  ctx.fillRect(borderWidth, height - borderWidth - innerLineWidth, width - borderWidth * 2, innerLineWidth); // 下
  ctx.fillRect(borderWidth, borderWidth, innerLineWidth, height - borderWidth * 2); // 左
  ctx.fillRect(width - borderWidth - innerLineWidth, borderWidth, innerLineWidth, height - borderWidth * 2); // 右
}

/**
 * 绘制水印
 */
function drawWatermark(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.font = `${Math.min(width, height) * 0.035}px "KaiTi", "STKaiti", serif`;
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('手写成书', width / 2, height - 30);
  ctx.restore();
}

/**
 * 快速预览合成（缩放到较小尺寸）
 */
export async function composePreview(
  characters: CharacterStrokes[],
  categoryId: CategoryId,
  template: Template,
  style: BrushStyle,
  previewWidth: number = 400
): Promise<HTMLCanvasElement> {
  const { width, height } = getCanvasSize(categoryId);
  const scale = previewWidth / width;

  const fullCanvas = await composeArtwork(characters, categoryId, template, style);

  // 缩放到预览尺寸
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = previewWidth;
  previewCanvas.height = Math.round(height * scale);
  const ctx = previewCanvas.getContext('2d')!;
  ctx.drawImage(fullCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

  return previewCanvas;
}
