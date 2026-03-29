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
 * 触发浏览器下载 Blob（标准方式）
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
 * 检测是否为国产双核浏览器（QQ/UC/搜狗），这些浏览器的 blob URL 下载被拦截
 */
export function isDualCoreBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /QQBrowser|UCBrowser|SogouMSE|SogouMobile/.test(ua);
}

/**
 * Blob → data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 触发 data URL 下载
 */
function downloadByDataURL(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 兼容所有浏览器的下载函数
 * 策略：
 *   - 正常浏览器：blob URL → data URL → 弹窗
 *   - 国产双核浏览器：data URL + 弹窗同时触发（这些浏览器 download 静默失败，不抛错）
 * @param blob 要下载的 blob
 * @param filename 文件名
 * @param onModalFallback 弹窗兜底回调，传入 data URL
 */
export async function downloadWithFallback(
  blob: Blob,
  filename: string,
  onModalFallback?: (dataUrl: string) => void
): Promise<void> {
  // 国产双核浏览器：data URL 下载 + 弹窗兜底同时进行
  // （这些浏览器的 <a click()> 全部静默失败，无法通过 try/catch 判断）
  if (isDualCoreBrowser()) {
    const dataUrl = await blobToDataURL(blob);
    downloadByDataURL(dataUrl, filename); // 尝试下载，可能静默失败
    onModalFallback?.(dataUrl); // 同时触发弹窗兜底
    return;
  }

  // 正常浏览器：blob URL → data URL → 弹窗（try/catch 降级）
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch {
    try {
      const dataUrl = await blobToDataURL(blob);
      downloadByDataURL(dataUrl, filename);
    } catch {
      const dataUrl = await blobToDataURL(blob);
      onModalFallback?.(dataUrl);
    }
  }
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
    single: '单字',
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
