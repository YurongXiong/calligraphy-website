'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project-store';
import { getBrushStyle } from '@/lib/beautify/styles';
import { templates } from '@/data/templates';
import { composePreview } from '@/lib/composition';
import type { BrushStyle, CategoryId } from '@/types';

export default function PreviewPage() {
  const router = useRouter();
  const characters = useProjectStore((state) => state.characters);
  const categoryId = useProjectStore((state) => state.categoryId);
  const templateId = useProjectStore((state) => state.templateId);
  const styleId = useProjectStore((state) => state.styleId);
  const text = useProjectStore((state) => state.text);

  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  const category = categoryId as CategoryId;
  const template = templates.find((t) => t.id === templateId);
  const style = styleId ? getBrushStyle(styleId as BrushStyle['id']) : null;

  // 生成预览
  useEffect(() => {
    const generatePreview = async () => {
      if (!characters.length || !categoryId || !templateId || !styleId) return;

      setLoading(true);
      try {
        const brushStyle = getBrushStyle(styleId as BrushStyle['id']);
        const selectedTemplate = templates.find((t) => t.id === templateId);

        if (!selectedTemplate) return;

        // 大预览宽度 600
        const canvas = await composePreview(
          characters,
          categoryId,
          selectedTemplate,
          brushStyle,
          600,
          text ?? undefined
        );

        setPreviewCanvas(canvas);
      } catch (error) {
        console.error('Preview failed:', error);
      } finally {
        setLoading(false);
      }
    };

    generatePreview();
  }, [characters, categoryId, templateId, styleId, text]);

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

  return (
    <main className="min-h-screen bg-paper paper-texture">
      {/* 头部 */}
      <header className="border-b border-paper-dark bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/style" className="flex items-center gap-2 text-ink hover:text-seal transition-colors">
            <span className="text-xl">←</span>
            <span className="font-medium">返回</span>
          </Link>
          <h1 className="text-xl font-bold text-ink">作品预览</h1>
          <Link
            href="/export"
            className="px-4 py-2 bg-seal text-white rounded-lg text-sm font-medium hover:bg-seal/90 transition-colors"
          >
            导出作品
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 预览图 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div
            ref={previewRef}
            className="mx-auto rounded-lg overflow-hidden border border-paper-dark shadow-lg"
            style={{
              backgroundColor: template?.bgColor || '#f5f0e8',
            }}
          >
            {loading ? (
              <div
                className="flex items-center justify-center text-ink/40"
                style={{ width: 400, height: 600 }}
              >
                渲染中...
              </div>
            ) : previewCanvas ? (
              <canvas
                ref={(el) => {
                  if (el && previewCanvas) {
                    el.width = previewCanvas.width;
                    el.height = previewCanvas.height;
                    const ctx = el.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(previewCanvas, 0, 0);
                    }
                  }
                }}
                className="w-full h-auto"
              />
            ) : (
              <div
                className="flex items-center justify-center text-ink/40"
                style={{ width: 400, height: 600 }}
              >
                暂无预览
              </div>
            )}
          </div>
        </div>

        {/* 信息展示 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-4 text-ink/70">
            {style && (
              <span className="px-3 py-1 bg-bamboo/10 rounded-full text-sm">
                {style.name}笔触
              </span>
            )}
            {template && (
              <span className="px-3 py-1 bg-gold/10 rounded-full text-sm">
                {template.name}
              </span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <Link
            href="/style"
            className="w-full py-3 bg-paper border border-paper-dark text-ink rounded-xl font-medium text-center hover:border-seal/50 transition-colors"
          >
            返回改风格
          </Link>
          <Link
            href="/write"
            className="w-full py-3 bg-paper border border-paper-dark text-ink rounded-xl font-medium text-center hover:border-seal/50 transition-colors"
          >
            重新书写
          </Link>
          <Link
            href="/export"
            className="w-full py-3 bg-seal text-white rounded-xl font-bold text-center hover:bg-seal/90 transition-colors"
          >
            导出作品
          </Link>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-paper border border-ink/20 text-ink/70 rounded-xl font-medium text-center hover:border-seal/40 hover:text-seal transition-colors"
          >
            创作新作品
          </button>
        </div>
      </div>
    </main>
  );
}
