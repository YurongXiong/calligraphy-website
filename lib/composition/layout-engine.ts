import type { CategoryId, CharPosition } from '../../types';

/**
 * 计算每个字在内容区域中的位置和尺寸
 * 所有字按自然方向排列（不旋转），由 compositor 处理居中等细节
 */
export function calculateLayout(
  categoryId: CategoryId,
  charCount: number,
  contentWidth: number,
  contentHeight: number
): CharPosition[] {
  switch (categoryId) {
    case 'couplet':
      return calculateCoupletLayout(charCount, contentWidth, contentHeight);
    case 'hanging':
      return calculateHangingLayout(charCount, contentWidth, contentHeight);
    case 'plaque':
      return calculatePlaqueLayout(charCount, contentWidth, contentHeight);
    default:
      return calculateHangingLayout(charCount, contentWidth, contentHeight);
  }
}

/**
 * 春联布局：
 * - 上联：右侧竖排（字从上到下）
 * - 下联：左侧竖排（字从上到下）
 * - 横批：顶部居中横排
 *
 * 注意：这里的 charCount 不包括横批
 */
function calculateCoupletLayout(
  charCount: number,
  contentWidth: number,
  contentHeight: number
): CharPosition[] {
  const positions: CharPosition[] = [];
  const marginX = 80;
  const marginY = 120;
  const usableWidth = contentWidth - marginX * 2;
  const usableHeight = contentHeight - marginY * 2;

  // 上下联各占一半宽度
  const columnWidth = (usableWidth - 80) / 2;
  const charHeight = usableHeight / charCount;

  // 上联 - 右侧，字竖排
  for (let i = 0; i < charCount; i++) {
    positions.push({
      x: marginX + columnWidth + 80, // 右边开始
      y: marginY + i * charHeight,
      width: columnWidth,
      height: charHeight,
      rotation: 0,
    });
  }

  // 下联 - 左侧竖排（如果需要上下联同时显示，这里只返回上联；
  // 实际春联有上下联+横批，需要更多字数）
  // MVP 简化：这里只处理上联
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
