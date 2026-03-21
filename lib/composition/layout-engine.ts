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

  // 竖排部分：左右两列
  const verticalMarginX = 80;
  const verticalMarginTop = 160; // 横批区域占用的顶部空间
  const verticalMarginBottom = 80;
  const columnGap = 80; // 左右列之间的间距

  const usableWidth = contentWidth - verticalMarginX * 2;
  const usableHeight = contentHeight - verticalMarginTop - verticalMarginBottom;
  const columnWidth = (usableWidth - columnGap) / 2;

  // 上联 - 右侧，字竖排（从上到下）
  const upperCharHeight = usableHeight / Math.max(upperCount, 1);
  for (let i = 0; i < upperCount; i++) {
    positions.push({
      x: verticalMarginX + columnWidth + columnGap,
      y: verticalMarginTop + i * upperCharHeight,
      width: columnWidth,
      height: upperCharHeight,
      rotation: 0,
      positionType: 'upper',
    });
  }

  // 下联 - 左侧，字竖排（从上到下）
  const lowerCharHeight = usableHeight / Math.max(lowerCount, 1);
  for (let i = 0; i < lowerCount; i++) {
    positions.push({
      x: verticalMarginX,
      y: verticalMarginTop + i * lowerCharHeight,
      width: columnWidth,
      height: lowerCharHeight,
      rotation: 0,
      positionType: 'lower',
    });
  }

  // 横批 - 顶部，字横排（从左到右）
  // 字号与上联/下联保持一致
  if (bannerCount > 0) {
    const bannerCharHeight = Math.max(upperCharHeight, lowerCharHeight); // 和上下联字号一致
    const bannerCharWidth = bannerCharHeight; // 方形字格
    const bannerTotalWidth = bannerCharWidth * bannerCount;
    // 横批在顶部区域垂直居中
    const bannerStartX = (contentWidth - bannerTotalWidth) / 2;
    const bannerStartY = (verticalMarginTop - bannerCharHeight) / 2;

    for (let i = 0; i < bannerCount; i++) {
      positions.push({
        x: bannerStartX + i * bannerCharWidth,
        y: bannerStartY,
        width: bannerCharWidth,
        height: bannerCharHeight,
        rotation: 0,
        positionType: 'banner',
      });
    }
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
    default:
      return 'vertical';
  }
}
