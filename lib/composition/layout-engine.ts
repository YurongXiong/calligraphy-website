import type { CategoryId, CharPosition } from '../../types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  // 设计原则：横批、上联、下联字号统一
  // ============================================================

  const marginX = 80;
  const marginY = 120;
  const marginBottom = 120;
  const columnGap = 80; // 左右列间距
  const bannerGap = 80; // 横批与上下联间距

  const usableWidth = contentWidth - marginX * 2;

  // Step 1: 估算上下联字号（以剩余高度分配，预留横批区域）
  // 横批区域高度约为 1.3 倍字高 + bannerGap
  const maxLineChars = Math.max(upperCount, lowerCount, 1);
  const coupletAreaHeight = contentHeight - marginY - marginBottom;
  const coupletCharSizeByHeight = coupletAreaHeight / (maxLineChars + 1.5); // +1.5 预留给横批

  // Step 2: 估算横批字号（以宽度约束）
  const maxBannerChars = Math.max(bannerCount, 1);
  const bannerCharSizeByWidth = usableWidth * 0.6 / maxBannerChars;

  // Step 3: 确定统一字号 = min(宽度约束, 高度约束)
  const charSize = Math.min(coupletCharSizeByHeight, bannerCharSizeByWidth);

  // Step 4: 横批区域高度（横批字高 + bannerGap）
  const bannerAreaHeight = bannerCount > 0 ? charSize + bannerGap : 0;

  // 列宽 = (可用宽度 - 间距) / 2
  const columnWidth = (usableWidth - columnGap) / 2;

  // -------- 横批：顶部居中，字横排 --------
  if (bannerCount > 0) {
    const bannerTotalWidth = charSize * bannerCount;
    const bannerStartX = (contentWidth - bannerTotalWidth) / 2;
    const bannerStartY = marginY;
    for (let i = 0; i < bannerCount; i++) {
      positions.push({
        x: bannerStartX + i * charSize,
        y: bannerStartY,
        width: charSize,
        height: charSize,
        rotation: 0,
        positionType: 'banner',
      });
    }
  }

  // -------- 上联：右侧，字竖排 --------
  for (let i = 0; i < upperCount; i++) {
    positions.push({
      x: marginX + columnWidth + columnGap,
      y: marginY + bannerAreaHeight + i * charSize,
      width: columnWidth,
      height: charSize,
      rotation: 0,
      positionType: 'upper',
    });
  }

  // -------- 下联：左侧，字竖排 --------
  for (let i = 0; i < lowerCount; i++) {
    positions.push({
      x: marginX,
      y: marginY + bannerAreaHeight + i * charSize,
      width: columnWidth,
      height: charSize,
      rotation: 0,
      positionType: 'lower',
    });
  }

  return positions;
}

/**
 * 春联布局 v2：配合三个内框，字尽量撑满各自的小框
 * 返回：各区域内框尺寸 + 每个字的位置
 */
export function calculateCoupletLayoutWithFrames(
  upperCount: number,
  lowerCount: number,
  bannerCount: number,
  contentWidth: number,
  contentHeight: number,
  sectionGap: number,
  innerFramePadding: number
): { banner: Rect; upper: Rect; lower: Rect; positions: CharPosition[] } {
  const positions: CharPosition[] = [];

  // 统一字号：取上联/下联可用高度能容纳的最大字
  // 可用高度 = 总高 - 横批区预估 - 间距
  // 先以高度约束估算字号
  const maxLineChars = Math.max(upperCount, lowerCount, 1);
  const charSizeByHeight = (contentHeight * 0.65) / maxLineChars;
  // 再以宽度约束估算（两列+间距）
  const coupletColWidth = contentWidth * 0.44; // 约占内容区44%
  const charSizeByWidth = coupletColWidth - innerFramePadding * 2;
  // 统一字号取较小值（确保两个方向都能放下）
  const charSize = Math.min(charSizeByHeight, charSizeByWidth);

  // 横批框
  const bannerWidth = charSize * Math.max(bannerCount, 1) + innerFramePadding * 2;
  const bannerHeight = charSize + innerFramePadding * 2;

  // 上联/下联框：高度刚好包住所有字（字顶到字底 + padding）
  const coupletColW = charSize + innerFramePadding * 2;
  const coupletColH = charSize * Math.max(upperCount, lowerCount, 1) + innerFramePadding * 2;

  // 上联框
  const upper: Rect = { x: 0, y: 0, width: coupletColW, height: coupletColH };
  // 下联框
  const lower: Rect = { x: 0, y: 0, width: coupletColW, height: coupletColH };
  // 横批框
  const banner: Rect = { x: 0, y: 0, width: bannerWidth, height: bannerHeight };

  // ===== 横批：居中横排 =====
  for (let i = 0; i < bannerCount; i++) {
    positions.push({
      x: (contentWidth - bannerWidth) / 2 + innerFramePadding + i * charSize,
      y: innerFramePadding,
      width: charSize,
      height: charSize,
      rotation: 0,
      positionType: 'banner',
    });
  }

  // ===== 上联：右侧竖排 =====
  // 上联从内容区右边缘往左排
  const upperStartX = contentWidth - coupletColW;
  for (let i = 0; i < upperCount; i++) {
    positions.push({
      x: upperStartX + innerFramePadding,
      y: bannerHeight + sectionGap + innerFramePadding + i * charSize,
      width: charSize,
      height: charSize,
      rotation: 0,
      positionType: 'upper',
    });
  }

  // ===== 下联：左侧竖排 =====
  for (let i = 0; i < lowerCount; i++) {
    positions.push({
      x: innerFramePadding,
      y: bannerHeight + sectionGap + innerFramePadding + i * charSize,
      width: charSize,
      height: charSize,
      rotation: 0,
      positionType: 'lower',
    });
  }

  return { banner, upper, lower, positions };
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
