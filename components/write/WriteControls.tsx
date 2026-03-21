'use client';

import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/stores/project-store';

export function WriteControls() {
  const router = useRouter();
  const {
    characters,
    currentCharIndex,
    clearCurrentChar,
    setCurrentChar,
    saveDraft,
  } = useProjectStore();

  const isLastChar = currentCharIndex === characters.length - 1;
  const isFirstChar = currentCharIndex === 0;

  const handleClear = () => {
    clearCurrentChar();
  };

  const handlePrev = () => {
    if (!isFirstChar) {
      setCurrentChar(currentCharIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isLastChar) {
      setCurrentChar(currentCharIndex + 1);
    }
  };

  const handleDone = () => {
    saveDraft();
    router.push('/style');
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      {/* 第一行：清空 / 上一字 / 下一字 */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleClear}
          className="flex-1 py-3 px-4 rounded-lg border border-paper-dark bg-paper text-ink/70 text-sm
            hover:border-seal/50 hover:text-seal transition-colors"
        >
          清空当前
        </button>

        <button
          onClick={handlePrev}
          disabled={isFirstChar}
          className="flex-1 py-3 px-4 rounded-lg border border-paper-dark bg-paper text-ink/70 text-sm
            hover:border-seal/50 hover:text-seal transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          上一字
        </button>

        <button
          onClick={handleNext}
          disabled={isLastChar}
          className="flex-1 py-3 px-4 rounded-lg border border-paper-dark bg-paper text-ink/70 text-sm
            hover:border-seal/50 hover:text-seal transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          下一字
        </button>
      </div>

      {/* 完成按钮 */}
      <button
        onClick={handleDone}
        className="w-full py-4 rounded-lg bg-seal text-paper font-bold text-lg
          hover:bg-seal/90 transition-colors shadow-lg shadow-seal/20"
      >
        完成书写 →
      </button>
    </div>
  );
}
