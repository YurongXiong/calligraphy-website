'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project-store';
import { getBrushStyle } from '@/lib/beautify/styles';
import { templates } from '@/data/templates';
import { composeArtwork } from '@/lib/composition';
import { exportAsPNG, exportAsJPG, downloadBlob } from '@/lib/export';
import type { BrushStyle, CategoryId } from '@/types';

export default function ExportPage() {
  const router = useRouter();
  const characters = useProjectStore((state) => state.characters);
  const categoryId = useProjectStore((state) => state.categoryId);
  const templateId = useProjectStore((state) => state.templateId);
  const styleId = useProjectStore((state) => state.styleId);
  const text = useProjectStore((state) => state.text);

  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [artworkCanvas, setArtworkCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const template = templates.find((t) => t.id === templateId);

  // 生成作品画布
  useEffect(() => {
    const generateArtwork = async () => {
      if (!characters.length || !categoryId || !templateId || !styleId) return;

      setLoading(true);
      try {
        const brushStyle = getBrushStyle(styleId as BrushStyle['id']);
        const selectedTemplate = templates.find((t) => t.id === templateId);

        if (!selectedTemplate) return;

        const canvas = await composeArtwork(
          characters,
          categoryId as CategoryId,
          selectedTemplate,
          brushStyle,
          text ?? undefined
        );

        setArtworkCanvas(canvas);
      } catch (error) {
        console.error('Artwork generation failed:', error);
      } finally {
        setLoading(false);
      }
    };

    generateArtwork();
  }, [characters, categoryId, templateId, styleId]);

  const handleExport = async () => {
    if (!artworkCanvas) return;

    setExporting(true);
    try {
      let blob: Blob;
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'png') {
        blob = await exportAsPNG(artworkCanvas);
        downloadBlob(blob, `书法作品_${timestamp}.png`);
      } else {
        blob = await exportAsJPG(artworkCanvas, 0.92);
        downloadBlob(blob, `书法作品_${timestamp}.jpg`);
      }

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (!categoryId || !characters.length) {
    return (
      <main className="min-h-screen bg-paper paper-texture flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink/60 mb-4">请先创建作品</p>
          <Link href="/input" className="text-seal hover:underline">
            去输入内容
          </Link>
        </div>
      </main>
    );
  }

  // 根据分类获取画布尺寸
  const getCanvasSize = () => {
    if (!artworkCanvas) return { width: 0, height: 0 };
    return {
      width: artworkCanvas.width,
      height: artworkCanvas.height,
    };
  };

  const { width, height } = getCanvasSize();

  return (
    <main className="min-h-screen bg-paper paper-texture">
      {/* 头部 */}
      <header className="border-b border-paper-dark bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/preview" className="flex items-center gap-2 text-ink hover:text-seal transition-colors">
            <span className="text-xl">←</span>
            <span className="font-medium">返回预览</span>
          </Link>
          <h1 className="text-xl font-bold text-ink">导出作品</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 预览 */}
        <div className="mb-8">
          <div
            className="mx-auto rounded-lg overflow-hidden border border-paper-dark shadow-lg"
            style={{
              backgroundColor: template?.bgColor || '#f5f0e8',
              width: '100%',
              maxWidth: 400,
            }}
          >
            {loading ? (
              <div className="aspect-[2/3] flex items-center justify-center text-ink/40">
                渲染中...
              </div>
            ) : artworkCanvas ? (
              <canvas
                ref={(el) => {
                  if (el && artworkCanvas) {
                    el.width = artworkCanvas.width;
                    el.height = artworkCanvas.height;
                    const ctx = el.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(artworkCanvas, 0, 0);
                    }
                  }
                }}
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-[2/3] flex items-center justify-center text-ink/40">
                暂无预览
              </div>
            )}
          </div>
        </div>

        {/* 分辨率信息 */}
        <div className="mb-6 text-center">
          <p className="text-ink/60 text-sm">
            导出分辨率: {width} × {height} 像素
          </p>
          <p className="text-ink/40 text-xs mt-1">
            高清输出，适合打印装裱
          </p>
        </div>

        {/* 格式选择 */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-seal rounded-full"></span>
            选择导出格式
          </h2>
          <div className="flex gap-4">
            <button
              onClick={() => setFormat('png')}
              className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                format === 'png'
                  ? 'border-seal bg-seal/5'
                  : 'border-paper-dark bg-paper hover:border-seal/50'
              }`}
            >
              <div className="font-medium text-ink">PNG</div>
              <div className="text-xs text-ink/60">无损画质，支持透明</div>
            </button>
            <button
              onClick={() => setFormat('jpg')}
              className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                format === 'jpg'
                  ? 'border-seal bg-seal/5'
                  : 'border-paper-dark bg-paper hover:border-seal/50'
              }`}
            >
              <div className="font-medium text-ink">JPG</div>
              <div className="text-xs text-ink/60">文件更小，兼容性好</div>
            </button>
          </div>
        </div>

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          disabled={loading || exporting}
          className="w-full py-4 bg-seal hover:bg-seal/90 disabled:bg-seal/50 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-seal/20 mb-4"
        >
          {exporting ? '导出中...' : exported ? '下载成功!' : `下载 ${format.toUpperCase()}`}
        </button>

        {/* 返回链接 */}
        <div className="text-center">
          <Link href="/preview" className="text-ink/60 hover:text-seal text-sm">
            返回预览
          </Link>
        </div>
      </div>
    </main>
  );
}
