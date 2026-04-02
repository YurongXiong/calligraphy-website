import type { CharacterStrokes, CategoryId, BrushStyle, Template, CoupletText } from '../../types';
import { calculateLayout, getCanvasSize, calculateCoupletLayoutWithFrames, type Rect } from './layout-engine';
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
  await drawBackground(ctx, template, width, height);

  // 绘制装裱边框
  drawBorder(ctx, template.borderStyle, width, height);

  // 获取内容区域（边框内）
  const contentArea = getContentArea(width, height);

  // 计算春联的分组信息
  const coupletInfo = getCoupletInfo(categoryId, text);

  // 春联：绘制三个内框，并使用新的布局计算
  if (categoryId === 'couplet' && coupletInfo) {
    const { upperCount, lowerCount, bannerCount } = coupletInfo;
    const sectionGap = 60;
    const innerFramePadding = 16;

    // 统一字号由布局引擎计算
    const layoutResult = calculateCoupletLayoutWithFrames(
      upperCount, lowerCount, bannerCount,
      contentArea.width, contentArea.height,
      sectionGap, innerFramePadding
    );

    // 绘制三个内框
    drawCoupletInnerFrames(ctx, contentArea, coupletInfo, layoutResult, sectionGap, template.borderStyle);

    // 使用布局结果中的字位置（已经是绝对坐标）
    for (let i = 0; i < layoutResult.positions.length; i++) {
      const pos = layoutResult.positions[i];
      const absX = contentArea.x + pos.x;
      const absY = contentArea.y + pos.y;

      const charIndex = getCharIndexByPosition(pos, coupletInfo, characters.length, i);
      if (charIndex < 0 || charIndex >= characters.length) continue;
      const char = characters[charIndex];
      if (!char.strokes.length) continue;

      const scaleX = pos.width / STROKE_CANVAS_SIZE;
      const scaleY = pos.height / STROKE_CANVAS_SIZE;
      const scale = Math.min(scaleX, scaleY);
      const scaledStrokeWidth = STROKE_CANVAS_SIZE * scale;
      const scaledStrokeHeight = STROKE_CANVAS_SIZE * scale;
      const offsetInCellX = (pos.width - scaledStrokeWidth) / 2;
      const offsetInCellY = (pos.height - scaledStrokeHeight) / 2;
      const finalX = absX + offsetInCellX;
      const finalY = absY + offsetInCellY;
      const finalScale = scale * (template.textScale ?? 1);

      renderCharacter(ctx, char.strokes, style, finalX, finalY, finalScale, template.textColor);
    }

    // 绘制水印
    drawWatermark(ctx, width, height);
    return canvas;
  }

  // 非春联：使用原有布局
  const positions = calculateLayout(
    categoryId,
    characters.length,
    contentArea.width,
    contentArea.height,
    coupletInfo,
    template
  );

  // 按 positionType 渲染每个字
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    // 获取对应的字在 characters 数组中的索引
    const charIndex = getCharIndexByPosition(pos, coupletInfo, characters.length, i);
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
    const finalScale = scale * (template.textScale ?? 1);

    renderCharacter(ctx, char.strokes, style, finalX, finalY, finalScale, template.textColor);
  }

  // 绘制水印
  drawWatermark(ctx, width, height);

  return canvas;
}

/**
 * 根据 positionType 确定 characters 数组中的绝对索引
 *
 * positions 数组顺序：[upper(0..upperCount-1), lower(upperCount..upperCount+lowerCount-1), banner]
 * characters 数组顺序：[banner(0..bannerCount-1), upper(bannerCount..), lower(...)]
 */
function getCharIndexByPosition(
  pos: { positionType: 'upper' | 'lower' | 'banner' | 'single' },
  coupletInfo: { upperCount: number; lowerCount: number; bannerCount: number } | undefined,
  totalChars: number,
  positionIdx: number
): number {
  // 防御性边界检查
  if (positionIdx < 0 || positionIdx >= totalChars) {
    return 0;
  }

  if (!coupletInfo) {
    // 非春联：一对一映射
    return positionIdx;
  }

  const { bannerCount, upperCount, lowerCount } = coupletInfo;

  switch (pos.positionType) {
    case 'upper': {
      // 上联：characters[bannerCount + positionIdx]
      const upperIdx = bannerCount + positionIdx;
      return upperIdx < totalChars ? upperIdx : positionIdx;
    }
    case 'lower': {
      // 下联：characters[bannerCount + upperCount + (positionIdx - upperCount)]
      const lowerIdx = bannerCount + upperCount + (positionIdx - upperCount);
      return lowerIdx < totalChars ? lowerIdx : positionIdx;
    }
    case 'banner': {
      // 横批：characters[positionIdx - upperCount - lowerCount]
      const bannerIdx = positionIdx - upperCount - lowerCount;
      return bannerIdx >= 0 ? bannerIdx : positionIdx;
    }
    default:
      return positionIdx;
  }
}

/**
 * 从文本内容中提取春联的分组信息
 */
function getCoupletInfo(
  categoryId: CategoryId,
  text?: string | CoupletText
): { upperCount: number; lowerCount: number; bannerCount: number } | undefined {
  if (categoryId !== 'couplet' || !text) return undefined;

  if (typeof text === 'object' && 'upper' in text) {
    return {
      upperCount: (text as CoupletText).upper.length,
      lowerCount: (text as CoupletText).lower.length,
      bannerCount: (text as CoupletText).banner?.length ?? 0,
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
async function drawBackground(ctx: CanvasRenderingContext2D, template: Template, width: number, height: number): Promise<void> {
  if (template.bgImage) {
    const img = new Image();
    img.src = template.bgImage;
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const scaleX = template.bgScaleX ?? 1;
        const drawWidth = width * scaleX;
        const drawX = (width - drawWidth) / 2;
        ctx.drawImage(img, drawX, 0, drawWidth, height);
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = template.bgColor;
        ctx.fillRect(0, 0, width, height);
        resolve();
      };
    });
  } else {
    ctx.fillStyle = template.bgColor;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * 绘制装裱边框
 */
function drawBorder(ctx: CanvasRenderingContext2D, borderStyle: string, width: number, height: number): void {
  // borderStyle === 'none' 时跳过边框绘制（如雾气窗户效果）
  if (borderStyle === 'none') return;

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
 * 绘制春联的三个内框（横批、上联、下联各自的独立边框）
 * 大框包三个小框，参考 couplet reference_2
 */
function drawCoupletInnerFrames(
  ctx: CanvasRenderingContext2D,
  contentArea: { x: number; y: number; width: number; height: number },
  coupletInfo: { upperCount: number; lowerCount: number; bannerCount: number },
  layoutResult: { banner: Rect; upper: Rect; lower: Rect },
  sectionGap: number,
  borderStyle: string
): void {
  const { x, y, width, height } = contentArea;
  const { banner, upper, lower } = layoutResult;

  // borderStyle 'double' = 红底金字模板，金色框；其他 = 素雅宣纸，无色（透明）
  const isGold = borderStyle === 'double';
  const outerColor = isGold ? '#c9a227' : 'rgba(0,0,0,0)';
  const innerColor = isGold ? '#8b6914' : 'rgba(0,0,0,0)';
  const innerLineW = 15;

  // 横批：顶部居中
  const bannerAbs = { x: x + (width - banner.width) / 2, y: y, width: banner.width, height: banner.height };
  drawSingleFrame(ctx, bannerAbs.x, bannerAbs.y, bannerAbs.width, bannerAbs.height, outerColor, innerColor, innerLineW);

  // 上联：右侧，贴着横批下方
  const upperAbs = { x: x + width - upper.width, y: y + banner.height + sectionGap, width: upper.width, height: upper.height };
  drawSingleFrame(ctx, upperAbs.x, upperAbs.y, upperAbs.width, upperAbs.height, outerColor, innerColor, innerLineW);

  // 下联：左侧，贴着横批下方
  const lowerAbs = { x: x, y: y + banner.height + sectionGap, width: lower.width, height: lower.height };
  drawSingleFrame(ctx, lowerAbs.x, lowerAbs.y, lowerAbs.width, lowerAbs.height, outerColor, innerColor, innerLineW);
}

/**
 * 绘制单个内框（红框+金线）
 */
function drawSingleFrame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  outerColor: string, innerColor: string, innerLineW: number
): void {
  const pad = 24;
  // 外红线
  ctx.fillStyle = outerColor;
  ctx.fillRect(x, y, w, pad); // 上
  ctx.fillRect(x, y + h - pad, w, pad); // 下
  ctx.fillRect(x, y, pad, h); // 左
  ctx.fillRect(x + w - pad, y, pad, h); // 右
  // 内金线
  ctx.fillStyle = innerColor;
  ctx.fillRect(x + pad, y + pad, w - pad * 2, innerLineW); // 上
  ctx.fillRect(x + pad, y + h - pad - innerLineW, w - pad * 2, innerLineW); // 下
  ctx.fillRect(x + pad, y + pad, innerLineW, h - pad * 2); // 左
  ctx.fillRect(x + w - pad - innerLineW, y + pad, innerLineW, h - pad * 2); // 右
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
