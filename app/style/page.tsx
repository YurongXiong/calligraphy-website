'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project-store';
import { BRUSH_STYLES, getBrushStyle } from '@/lib/beautify/styles';
import { templates } from '@/data/templates';
import { composePreview } from '@/lib/composition';
import type { BrushStyle, CategoryId, Template } from '@/types';

/** 渲染模板卡片预览图 */
function TemplatePreview({ template }: { template: Template }) {
  const id = template.id;

  // 雾气窗户（适配飞白）
  if (id === 'hanging-fog' || id === 'plaque-fog') {
    return (
      <svg viewBox="0 0 80 48" className="w-full h-full" style={{ display: 'block' }}>
        {/* 木框 */}
        <rect x="2" y="2" width="76" height="44" rx="3" fill="none" stroke="#8B5E3C" strokeWidth="4" />
        {/* 灰蓝玻璃 */}
        <rect x="6" y="6" width="68" height="36" rx="1" fill="#4a5d6a" />
        {/* 田字格窗棂 */}
        <line x1="40" y1="6" x2="40" y2="42" stroke="#8B5E3C" strokeWidth="2" />
        <line x1="6" y1="24" x2="74" y2="24" stroke="#8B5E3C" strokeWidth="2" />
        {/* 雾气效果 */}
        <rect x="6" y="6" width="68" height="36" rx="1" fill="rgba(180,190,200,0.15)" />
      </svg>
    );
  }

  // 竖向卷轴
  if (id === 'hanging-scroll-v') {
    return (
      <svg viewBox="0 0 40 64" className="w-full h-full" style={{ display: 'block' }}>
        {/* 上卷轴头 */}
        <rect x="4" y="2" width="32" height="8" rx="4" fill="#8B5E3C" />
        <rect x="8" y="4" width="24" height="4" rx="2" fill="#A0714F" />
        {/* 下卷轴头 */}
        <rect x="4" y="54" width="32" height="8" rx="4" fill="#8B5E3C" />
        <rect x="8" y="56" width="24" height="4" rx="2" fill="#A0714F" />
        {/* 卷轴身 */}
        <rect x="10" y="10" width="20" height="44" fill="#f5f0e8" />
        <rect x="10" y="10" width="20" height="44" fill="rgba(0,0,0,0.05)" />
        {/* 装饰线 */}
        <line x1="12" y1="12" x2="12" y2="52" stroke="#d4c9b8" strokeWidth="0.5" />
        <line x1="28" y1="12" x2="28" y2="52" stroke="#d4c9b8" strokeWidth="0.5" />
      </svg>
    );
  }

  // 横向卷轴
  if (id === 'plaque-scroll') {
    return (
      <svg viewBox="0 0 80 28" className="w-full h-full" style={{ display: 'block' }}>
        {/* 左卷轴头 */}
        <rect x="2" y="4" width="8" height="20" rx="4" fill="#8B5E3C" />
        <rect x="4" y="8" width="4" height="12" rx="2" fill="#A0714F" />
        {/* 右卷轴头 */}
        <rect x="70" y="4" width="8" height="20" rx="4" fill="#8B5E3C" />
        <rect x="72" y="8" width="4" height="12" rx="2" fill="#A0714F" />
        {/* 卷轴身 */}
        <rect x="10" y="6" width="60" height="16" fill="#f5f0e8" />
        <rect x="10" y="6" width="60" height="16" fill="rgba(0,0,0,0.05)" />
        {/* 装饰线 */}
        <line x1="12" y1="8" x2="68" y2="8" stroke="#d4c9b8" strokeWidth="0.5" />
        <line x1="12" y1="20" x2="68" y2="20" stroke="#d4c9b8" strokeWidth="0.5" />
      </svg>
    );
  }

  // 蓝底金字：深蓝背景 + 金色样字（使用模板颜色）
  if (id === 'hanging-blue-board') {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: '#1a3a6b' }}
      >
        <span
          className="text-lg font-bold"
          style={{ color: template.textColor }}
        >
          样
        </span>
      </div>
    );
  }

  // 默认：纯色 + 样字
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: template.bgColor }}
    >
      <span
        className="text-lg font-bold"
        style={{ color: template.textColor }}
      >
        样
      </span>
    </div>
  );
}

export default function StylePage() {
  const router = useRouter();
  const characters = useProjectStore((state) => state.characters);
  const categoryId = useProjectStore((state) => state.categoryId);
  const templateId = useProjectStore((state) => state.templateId);
  const styleId = useProjectStore((state) => state.styleId);
  const text = useProjectStore((state) => state.text);
  const setStyle = useProjectStore((state) => state.setStyle);
  const setTemplate = useProjectStore((state) => state.setTemplate);

  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const category = categoryId as CategoryId;
  const categoryTemplates = templates.filter((t) => t.categoryId === category);

  // 更新预览
  useEffect(() => {
    const updatePreview = async () => {
      if (!characters.length || !categoryId || !templateId || !styleId) return;

      setLoading(true);
      try {
        const style = getBrushStyle(styleId as BrushStyle['id']);
        const template = templates.find((t) => t.id === templateId);

        if (!template) return;

        const canvas = await composePreview(
          characters,
          categoryId,
          template,
          style,
          300,
          text ?? undefined
        );

        setPreviewCanvas(canvas);
      } catch (error) {
        console.error('Preview failed:', error);
      } finally {
        setLoading(false);
      }
    };

    updatePreview();
  }, [characters, categoryId, templateId, styleId, text]);

  const handleContinue = () => {
    router.push('/preview');
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

  return (
    <main className="min-h-screen bg-paper paper-texture">
      {/* 头部 */}
      <header className="border-b border-paper-dark bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/write" className="flex items-center gap-2 text-ink hover:text-seal transition-colors">
            <span className="text-xl">←</span>
            <span className="font-medium">返回书写</span>
          </Link>
          <h1 className="text-xl font-bold text-ink">选择风格</h1>
          <button
            onClick={handleContinue}
            className="px-4 py-2 bg-seal text-white rounded-lg text-sm font-medium hover:bg-seal/90 transition-colors"
          >
            下一步
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 预览区 */}
        <div className="mb-8">
          <div
            ref={previewRef}
            className="mx-auto rounded-lg overflow-hidden border border-paper-dark shadow-lg"
            style={{
              backgroundColor: templates.find((t) => t.id === templateId)?.bgColor || '#f5f0e8',
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-ink/40">
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
                className="w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-ink/40">
                暂无预览
              </div>
            )}
          </div>
          <p className="text-center text-ink/50 text-sm mt-2">
            实际效果预览
          </p>
        </div>

        {/* 风格选择 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-seal rounded-full"></span>
            笔触风格
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(BRUSH_STYLES) as BrushStyle['id'][]).map((id) => {
              const style = BRUSH_STYLES[id];
              const isSelected = styleId === id;
              return (
                <button
                  key={id}
                  onClick={() => setStyle(id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-seal bg-seal/5 shadow-md'
                      : 'border-paper-dark bg-paper hover:border-seal/50'
                  }`}
                >
                  <div className="text-center">
                    <div
                      className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center"
                      style={{
                        background: id === 'natural'
                          ? 'linear-gradient(135deg, #333 0%, #666 100%)'
                          : id === 'heavy_ink'
                            ? 'linear-gradient(135deg, #000 0%, #333 100%)'
                            : 'linear-gradient(135deg, #666 0%, #999 100%)',
                      }}
                    ></div>
                    <span className="font-medium text-ink">{style.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 模板选择 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-bamboo rounded-full"></span>
            作品模板
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {categoryTemplates.map((template) => {
              const isSelected = templateId === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => setTemplate(template.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-seal bg-seal/5 shadow-md'
                      : 'border-paper-dark bg-paper hover:border-seal/50'
                  }`}
                >
                  <div className="h-20 rounded mb-2 overflow-hidden">
                    <TemplatePreview template={template} />
                  </div>
                  <span className="text-sm font-medium text-ink">{template.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 继续按钮 */}
        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-4 bg-seal hover:bg-seal/90 disabled:bg-seal/50 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-seal/20"
        >
          {loading ? '渲染中...' : '生成预览'}
        </button>
      </div>
    </main>
  );
}
