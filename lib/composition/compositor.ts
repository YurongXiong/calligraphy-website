import type { CharacterStrokes, CategoryId, BrushStyle, Template, CoupletText } from '../../types';
import { calculateLayout, getCanvasSize } from './layout-engine';
import { renderCharacter } from '../beautify';

// 书写画布的尺寸（WritingCanvas.tsx 里的 canvasSize 最大约 400）
const STROKE_CANVAS_SIZE = 400;

/**
 * 合成作品主函数
 *
 * @param characters 书写过的所有字的笔画数据
 * @param categoryId 作品类型
 * @param template 模板配置
 * @param style 笔触风格
 * @param text 完整的文本内容（春联需要区分上联/下联/横批）
 */
export async function composeArtwork(
  characters: CharacterStrokes[],
  categoryId: CategoryId,
  template: Template,
  style: BrushStyle,
  text?: string | CoupletText
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

  // 计算春联的分组信息
  const coupletInfo = getCoupletInfo(categoryId, characters.length, text);

  // 计算布局
  const positions = calculateLayout(
    categoryId,
    characters.length,
    contentArea.width,
    contentArea.height,
    coupletInfo
  );

  // 按 positionType 渲染每个字
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    // 获取对应的字在 characters 数组中的索引
    const charIndex = getCharIndexByPosition(pos, coupletInfo, i);
    if (charIndex < 0 || charIndex >= characters.length) continue;

    const char = characters[charIndex];
    if (!char.strokes.length) continue; // 跳过未书写的字

    // 字在内容区域中的位置
    const absX = contentArea.x + pos.x;
    const absY = contentArea.y + pos.y;

    // 计算缩放
    const scaleX = pos.width / STROKE_CANVAS_SIZE;
    const scaleY = pos.height / STROKE_CANVAS_SIZE;
    const scale = Math.min(scaleX, scaleY);

    // 居中偏移
    const scaledStrokeWidth = STROKE_CANVAS_SIZE * scale;
    const scaledStrokeHeight = STROKE_CANVAS_SIZE * scale;
    const offsetInCellX = (pos.width - scaledStrokeWidth) / 2;
    const offsetInCellY = (pos.height - scaledStrokeHeight) / 2;

    const finalX = absX + offsetInCellX;
    const finalY = absY + offsetInCellY;

    renderCharacter(ctx, char.strokes, style, finalX, finalY, scale, template.textColor);
  }

  // 绘制水印
  drawWatermark(ctx, width, height);

  return canvas;
}

/**
 * 根据位置数组中的绝对索引 positionIdx，计算 characters 数组中的索引
 *
 * positions 数组的顺序: [upper..., lower..., banner...]
 * characters 数组的顺序: [banner?, upper..., lower...]
 */
function getCharIndexByPosition(
  pos: { positionType: 'upper' | 'lower' | 'banner' | 'single' },
  coupletInfo: ReturnType<typeof getCoupletInfo>,
  positionIdx: number
): number {
  const info = coupletInfo;

  if (!info) {
    // 非春联：一一对应
    return positionIdx;
  }

  const { bannerCount, upperCount, lowerCount } = info;

  if (pos.positionType === 'banner') {
    // banner 在 characters 数组最前面
    return positionIdx - upperCount - lowerCount;
  }
  if (pos.positionType === 'upper') {
    // 上联: characters[bannerCount + 组内偏移]
    return bannerCount + positionIdx;
  }
  if (pos.positionType === 'lower') {
    // 下联: characters[bannerCount + upperCount + 组内偏移]
    return bannerCount + upperCount + (positionIdx - upperCount);
  }
  return positionIdx;
}

/**
 * 从文本内容中提取春联的分组信息
 */
function getCoupletInfo(
  categoryId: CategoryId,
  totalChars: number,
  text?: string | CoupletText
): { upperCount: number; lowerCount: number; bannerCount: number } | undefined {
  if (categoryId !== 'couplet' || !text) return undefined;

  if (typeof text === 'object' && 'upper' in text) {
    return {
      upperCount: text.upper.length,
      lowerCount: text.lower.length,
      bannerCount: text.banner?.length ?? 0,
    };
  }

  // 无法解析，回退
  return undefined;
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
  previewWidth: number = 400,
  text?: string | CoupletText
): Promise<HTMLCanvasElement> {
  const { width, height } = getCanvasSize(categoryId);
  const scale = previewWidth / width;

  const fullCanvas = await composeArtwork(characters, categoryId, template, style, text);

  // 缩放到预览尺寸
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = previewWidth;
  previewCanvas.height = Math.round(height * scale);
  const ctx = previewCanvas.getContext('2d')!;
  ctx.drawImage(fullCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

  return previewCanvas;
}
