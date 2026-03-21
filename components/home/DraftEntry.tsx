'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project-store';
import { CoupletText } from '@/types';

interface Draft {
  projectId: string;
  categoryId: string;
  text: string | CoupletText;
  savedAt: number;
}

export function DraftEntry() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const loadDraft = useProjectStore((state) => state.loadDraft);

  useEffect(() => {
    const storedDrafts = localStorage.getItem('calligraphy-drafts');
    if (storedDrafts) {
      try {
        const parsedDrafts = JSON.parse(storedDrafts);
        setDrafts(parsedDrafts.slice(0, 3));
      } catch (e) {
        console.error('Failed to parse drafts:', e);
      }
    }
  }, []);

  const handleLoadDraft = (draft: Draft) => {
    loadDraft(draft.projectId);
    window.location.href = '/write';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getCategoryName = (categoryId: string) => {
    const names: Record<string, string> = {
      couplet: '春联',
      hanging: '挂画',
      plaque: '牌匾',
    };
    return names[categoryId] || categoryId;
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-seal rounded-full"></div>
        <h3 className="text-lg font-bold text-ink">最近草稿</h3>
      </div>

      <div className="space-y-3">
        {drafts.map((draft) => (
          <button
            key={draft.projectId}
            onClick={() => handleLoadDraft(draft)}
            className="w-full flex items-center justify-between p-4 bg-paper rounded-lg border border-paper-dark hover:border-seal/50 transition-colors text-left group"
          >
            <div>
              <span className="inline-block px-2 py-0.5 text-xs bg-bamboo/10 text-bamboo rounded mr-2">
                {getCategoryName(draft.categoryId)}
              </span>
              <span className="text-ink">
                {typeof draft.text === 'string'
                  ? draft.text
                  : `${(draft.text as CoupletText).upper}…`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink/40 text-sm">
              <span>{formatDate(draft.savedAt)}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-seal">
                →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
