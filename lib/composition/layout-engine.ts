import type { CategoryId, CharPosition } from '../../types';

/**
 * 计算每个字在内容区域中的位置和尺寸
 * 所有字按自然方向排列（不旋转），由 compositor 处理居中等细节
 */
export function calculateLayout(
  categoryId: CategoryId,
  charCount: number,
  contentWidth: number,
  contentHeight: number,
  coupletInfo?: { upperCount: number; lowerCount: number; bannerCount: number }
): CharPosition[] {
  switch (categoryId) {
    case 'couplet':
      return calculateCoupletLayout(
        coupletInfo?.upperCount ?? charCount,
        coupletInfo?.lowerCount ?? charCount,
        coupletInfo?.bannerCount ?? 0,
        contentWidth,
        contentHeight
      );
    case 'hanging':
      return calculateHangingLayout(charCount, contentWidth, contentHeight);
    case 'plaque':
      return calculatePlaqueLayout(charCount, contentWidth, contentHeight);
    case 'single':
      return calculateSingleLayout(charCount, contentWidth, contentHeight);
    default:
      return calculateHangingLayout(charCount, contentWidth, contentHeight);
  }
}

/**
 * 春联布局完整实现
 * - 横批：顶部居中横排
 * - 上联：右侧竖排（字从上到下）
 * - 下联：左侧竖排（字从上到下）
 *
 * @param upperCount 上联字数
 * @param lowerCount 下联字数
 * @param bannerCount 横批字数（0 或具体字数）
 * @param contentWidth 内容区域宽度
 * @param contentHeight 内容区域高度
 */
export function calculateCoupletLayout(
  upperCount: number,
  lowerCount: number,
  bannerCount: number,
  contentWidth: number,
  contentHeight: number
): CharPosition[] {
  const positions: CharPosition[] = [];

  // ============================================================
  // 竖向幅面布局：横批顶部居中，上下联左右分列
  // 设计原则：横批字号 ≥ 上下联字号
  // ============================================================

  const marginX = 80;
  const marginY = 120;
  const marginBottom = 120;
  const columnGap = 80; // 左右列间距

  const usableWidth = contentWidth - marginX * 2;

  // Step 1: 估算横批字号（以内容区60%宽度能容纳banner为参考）
  const maxBannerChars = Math.max(bannerCount, 1);
  const bannerCharSizeByWidth = usableWidth * 0.6 / maxBannerChars;

  // Step 2: 估算上下联字号（以剩余高度分配）
  // 预留给横批区域约 2.5 倍字高
  const approxBannerArea = bannerCharSizeByWidth * 2.5;
  const coupletAreaHeight = contentHeight - marginY - marginBottom - approxBannerArea;
  const maxLineChars = Math.max(upperCount, lowerCount, 1);
  const coupletCharSizeByHeight = coupletAreaHeight / maxLineChars;

  // Step 3: 确定最终字号 = min(宽度约束, 高度约束)
  const coupletCharSize = Math.min(coupletCharSizeByHeight, bannerCharSizeByWidth);
  // 横批字号 = max(上下联字号, 宽度约束)，并给 1.2 倍留白
  const bannerCharSize = Math.max(coupletCharSize, bannerCharSizeByWidth);

  // Step 4: 实际横批区域高度
  const bannerAreaHeight = Math.max(bannerCharSize * 1.3, coupletCharSize * 1.3);

  // Step 5: 重新计算上下联字号（扣除横批区域后）
  const actualCoupletAreaHeight = contentHeight - marginY - marginBottom - bannerAreaHeight;
  const actualCoupletCharSize = Math.min(
    actualCoupletAreaHeight / Math.max(upperCount, 1),
    actualCoupletAreaHeight / Math.max(lowerCount, 1),
    (contentWidth - marginX * 2 - columnGap) / 2
  );

  // 列宽 = (可用宽度 - 间距) / 2
  const columnWidth = (usableWidth - columnGap) / 2;

  // -------- 横批：顶部居中，字横排 --------
  if (bannerCount > 0) {
    const bannerTotalWidth = bannerCharSize * bannerCount;
    const bannerStartX = (contentWidth - bannerTotalWidth) / 2;
    const bannerStartY = marginY;
    for (let i = 0; i < bannerCount; i++) {
      positions.push({
        x: bannerStartX + i * bannerCharSize,
        y: bannerStartY,
        width: bannerCharSize,
        height: bannerCharSize,
        rotation: 0,
        positionType: 'banner',
      });
    }
  }

  // -------- 上联：右侧，字竖排 --------
  for (let i = 0; i < upperCount; i++) {
    positions.push({
      x: marginX + columnWidth + columnGap,
      y: marginY + bannerAreaHeight + i * actualCoupletCharSize,
      width: columnWidth,
      height: actualCoupletCharSize,
      rotation: 0,
      positionType: 'upper',
    });
  }

  // -------- 下联：左侧，字竖排 --------
  for (let i = 0; i < lowerCount; i++) {
    positions.push({
      x: marginX,
      y: marginY + bannerAreaHeight + i * actualCoupletCharSize,
      width: columnWidth,
      height: actualCoupletCharSize,
      rotation: 0,
      positionType: 'lower',
    });
  }

  return positions;
}

/**
 * 挂画布局：所有字竖排居中（从上到下排列，不旋转）
 */
function calculateHangingLayout(
  charCount: number,
  contentWidth: number,
  contentHeight: number
): CharPosition[] {
  const positions: CharPosition[] = [];
  const marginY = 150;
  const marginX = 100;
  const usableHeight = contentHeight - marginY * 2;
  const usableWidth = contentWidth - marginX * 2;

  // 字竖排，每字宽 = 高（正方形格）
  const charSize = Math.min(usableWidth, usableHeight / charCount);

  // 水平居中
  const startX = marginX + (usableWidth - charSize) / 2;

  for (let i = 0; i < charCount; i++) {
    positions.push({
      x: startX,
      y: marginY + i * charSize,
      width: charSize,
      height: charSize,
      rotation: 0,
      positionType: 'single',
    });
  }

  return positions;
}

/**
 * 单字布局：单字居中放大
 */
function calculateSingleLayout(
  charCount: number,
  contentWidth: number,
  contentHeight: number
): CharPosition[] {
  const positions: CharPosition[] = [];
  const margin = 100;
  const usableSize = Math.min(contentWidth, contentHeight) - margin * 2;

  // 单字居中
  const x = (contentWidth - usableSize) / 2;
  const y = (contentHeight - usableSize) / 2;

  positions.push({
    x,
    y,
    width: usableSize,
    height: usableSize,
    rotation: 0,
    positionType: 'single',
  });

  return positions;
}

/**
 * 牌匾布局：所有字横排居中
 */
function calculatePlaqueLayout(
  charCount: number,
  contentWidth: number,
  contentHeight: number
): CharPosition[] {
  const positions: CharPosition[] = [];
  const marginX = 200;
  const marginY = 100;
  const usableWidth = contentWidth - marginX * 2;
  const usableHeight = contentHeight - marginY * 2;

  // 字横排，每字等宽
  const charWidth = usableWidth / charCount;
  // 字高不超过宽度太多
  const charHeight = Math.min(charWidth, usableHeight);

  // 垂直居中
  const startY = marginY + (usableHeight - charHeight) / 2;

  for (let i = 0; i < charCount; i++) {
    positions.push({
      x: marginX + i * charWidth,
      y: startY,
      width: charWidth,
      height: charHeight,
      rotation: 0,
      positionType: 'single',
    });
  }

  return positions;
}

/**
 * 获取特定类别的画布尺寸（基础分辨率）
 */
export function getCanvasSize(categoryId: CategoryId): { width: number; height: number } {
  switch (categoryId) {
    case 'couplet':
      return { width: 2160, height: 4800 };
    case 'hanging':
      return { width: 2160, height: 3840 };
    case 'plaque':
      return { width: 3840, height: 1440 };
    case 'single':
      return { width: 2160, height: 2160 };
    default:
      return { width: 2160, height: 3840 };
  }
}

/**
 * 根据类别获取文字排列方向
 */
export function getTextDirection(categoryId: CategoryId): 'vertical' | 'horizontal' {
  switch (categoryId) {
    case 'couplet':
    case 'hanging':
      return 'vertical';
    case 'plaque':
      return 'horizontal';
    case 'single':
      return 'vertical';
    default:
      return 'vertical';
  }
}
