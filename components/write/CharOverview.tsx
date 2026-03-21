'use client';

import { useProjectStore } from '@/stores/project-store';

export function CharOverview() {
  const { characters, currentCharIndex, setCurrentChar } = useProjectStore();

  return (
    <div className="flex flex-wrap gap-2 justify-center px-4">
      {characters.map((char, idx) => {
        const isActive = idx === currentCharIndex;
        const isDone = char.strokes.length > 0;

        return (
          <button
            key={char.charId}
            onClick={() => setCurrentChar(idx)}
            className={`
              w-10 h-10 rounded-lg border-2 text-lg font-bold
              flex items-center justify-center
              transition-all duration-200
              ${isActive
                ? 'border-seal bg-seal/10 text-ink shadow-md'
                : isDone
                ? 'border-bamboo/40 bg-bamboo/5 text-ink/70'
                : 'border-paper-dark bg-paper text-ink/40'
              }
              hover:border-seal/60 hover:bg-seal/5
            `}
          >
            {char.character}
          </button>
        );
      })}
    </div>
  );
}
