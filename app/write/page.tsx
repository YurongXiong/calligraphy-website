'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project-store';
import { WritingCanvas } from '@/components/write/WritingCanvas';
import { CharOverview } from '@/components/write/CharOverview';
import { WriteControls } from '@/components/write/WriteControls';

export default function WritePage() {
  const router = useRouter();
  const { categoryId, text, characters, setCurrentChar } = useProjectStore();

  // 没有选择作品形式则跳转
  useEffect(() => {
    if (!categoryId || !text) {
      router.replace('/');
    }
  }, [categoryId, text, router]);

  if (!categoryId || !text || characters.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-ink/50">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-paper-dark">
        <Link href="/input" className="text-ink/60 hover:text-ink text-sm flex items-center gap-1">
          ← 返回
        </Link>
        <h1 className="text-ink font-bold">逐字书写</h1>
        <div className="w-16" />
      </header>

      {/* 进度指示 */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-1">
          {characters.map((char, idx) => (
            <div
              key={char.charId}
              onClick={() => setCurrentChar(idx)}
              className={`
                h-1.5 flex-1 rounded-full transition-colors cursor-pointer
                ${char.strokes.length > 0 ? 'bg-bamboo' : 'bg-paper-dark'}
              `}
            />
          ))}
        </div>
      </div>

      {/* 书写区域（移动端：垂直堆叠） */}
      <main className="flex-1 flex flex-col items-center justify-start pt-6 pb-8 gap-6">
        {/* WritingCanvas 组件 */}
        <WritingCanvas />

        {/* 字序总览 */}
        <div className="w-full">
          <p className="text-xs text-ink/40 text-center mb-2">字序总览</p>
          <CharOverview />
        </div>

        {/* 操作按钮 */}
        <WriteControls />
      </main>
    </div>
  );
}
