import type { CategoryId } from '../../types';
import { getCanvasSize } from '../composition';

/**
 * 将 canvas 导出为 PNG 格式
 */
export async function exportAsPNG(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      },
      'image/png',
      1.0 // 最高质量
    );
  });
}

/**
 * 将 canvas 导出为 JPG 格式
 */
export async function exportAsJPG(canvas: HTMLCanvasElement, quality: number = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create JPG blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * 触发浏览器下载 Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出作品为 PNG
 */
export async function exportArtworkAsPNG(
  canvas: HTMLCanvasElement,
  categoryId: CategoryId,
  customFilename?: string
): Promise<void> {
  const blob = await exportAsPNG(canvas);
  const filename = customFilename || generateFilename(categoryId, 'png');
  downloadBlob(blob, filename);
}

/**
 * 导出作品为 JPG
 */
export async function exportArtworkAsJPG(
  canvas: HTMLCanvasElement,
  categoryId: CategoryId,
  quality?: number,
  customFilename?: string
): Promise<void> {
  const blob = await exportAsJPG(canvas, quality);
  const filename = customFilename || generateFilename(categoryId, 'jpg');
  downloadBlob(blob, filename);
}

/**
 * 生成默认文件名
 */
function generateFilename(categoryId: CategoryId, format: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const categoryNames: Record<CategoryId, string> = {
    couplet: '春联',
    hanging: '挂画',
    plaque: '牌匾',
  };
  return `书法_${categoryNames[categoryId]}_${timestamp}.${format}`;
}

/**
 * 导出不同尺寸的作品
 */
export async function exportArtworkMultiSize(
  canvas: HTMLCanvasElement,
  categoryId: CategoryId,
  sizes: ('original' | 'large' | 'medium' | 'small')[]
): Promise<void> {
  const { width, height } = getCanvasSize(categoryId);

  const sizeConfigs: Record<'original' | 'large' | 'medium' | 'small', { scale: number; suffix: string }> = {
    original: { scale: 1, suffix: '' },
    large: { scale: 1, suffix: '_4k' },
    medium: { scale: 0.5, suffix: '_2k' },
    small: { scale: 0.25, suffix: '_1k' },
  };

  for (const size of sizes) {
    const config = sizeConfigs[size];
    const scale = config.scale;

    // 创建缩放后的 canvas
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = Math.round(width * scale);
    scaledCanvas.height = Math.round(height * scale);
    const ctx = scaledCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

    // 导出
    await exportArtworkAsPNG(scaledCanvas, categoryId, `书法_${categoryId}${config.suffix}.png`);
  }
}

/**
 * 复制 canvas 到剪贴板
 */
export async function copyToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
    const blob = await exportAsPNG(canvas);
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
