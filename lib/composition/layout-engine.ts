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

  // ============================================================
  // 新布局（横向幅面）：横批居中顶部，上下联分列底部左右
  // ============================================================

  // 整体边距
  const marginX = 120;
  const marginY = 120;

  // 内容区域
  const usableWidth = contentWidth - marginX * 2;
  const usableHeight = contentHeight - marginY * 2;

  // 横批区域：顶部 40% 高度
  const bannerAreaHeight = usableHeight * 0.38;
  // 上下联区域：底部 60%
  const coupletAreaHeight = usableHeight - bannerAreaHeight;

  // 横批字号 = min(上下联字号，banner区域可用宽度/bannerCount)
  // 先计算上下联每字大小
  const upperCharSize = coupletAreaHeight / Math.max(upperCount, 1);
  const lowerCharSize = coupletAreaHeight / Math.max(lowerCount, 1);
  const coupletCharSize = Math.min(upperCharSize, lowerCharSize);

  // 横批每字宽度 = min( coupletCharSize, 可用宽度 * 0.6 / bannerCount )
  const bannerCharSize = Math.min(coupletCharSize, usableWidth * 0.55 / Math.max(bannerCount, 1));
  // 横批实际占用宽度
  const bannerTotalWidth = bannerCharSize * bannerCount;

  // -------- 横批：顶部居中，字横排 --------
  if (bannerCount > 0) {
    const bannerStartX = (contentWidth - bannerTotalWidth) / 2;
    const bannerStartY = marginY + (bannerAreaHeight - bannerCharSize) / 2;
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

  // -------- 上下联：底部区域，左右分列 --------
  // 两列中间间距
  const columnGap = 200;
  // 每列宽度 = (可用宽度 - columnGap) / 2
  const columnWidth = (usableWidth - columnGap) / 2;

  // 上联 - 右侧（视觉右侧），字竖排从上到下
  for (let i = 0; i < upperCount; i++) {
    const charHeight = coupletCharSize;
    const charWidth = columnWidth;
    const startY = marginY + bannerAreaHeight + (coupletAreaHeight - upperCount * charHeight) / 2;
    positions.push({
      x: marginX + columnWidth + columnGap, // 右侧列起始X
      y: startY + i * charHeight,
      width: charWidth,
      height: charHeight,
      rotation: 0,
      positionType: 'upper',
    });
  }

  // 下联 - 左侧，字竖排从上到下
  for (let i = 0; i < lowerCount; i++) {
    const charHeight = coupletCharSize;
    const charWidth = columnWidth;
    const startY = marginY + bannerAreaHeight + (coupletAreaHeight - lowerCount * charHeight) / 2;
    positions.push({
      x: marginX,
      y: startY + i * charHeight,
      width: charWidth,
      height: charHeight,
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
      return { width: 4800, height: 2800 };
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
