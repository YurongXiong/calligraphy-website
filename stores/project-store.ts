import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectStore, CategoryId, BrushStyle, Stroke, CharacterStrokes, CoupletText } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projectId: generateId(),
      categoryId: null,
      text: null,
      characters: [],
      currentCharIndex: 0,
      styleId: 'natural',
      templateId: 'couplet-light',

      setCategory: (id: CategoryId) => {
        set({ categoryId: id });
        const templateMap: Record<CategoryId, string> = {
          couplet: 'couplet-light',
          hanging: 'hanging-light',
          plaque: 'plaque-light',
        };
        set({ templateId: templateMap[id] });
      },

      setText: (text: string | CoupletText) => {
        set({ text });
        const categoryId = get().categoryId;
        let charArray: string[] = [];

        if (categoryId === 'couplet' && typeof text === 'object') {
          const couplet = text as CoupletText;
          // 横批、上联、下联分别作为一个字符串，整体作为 charArray 的一个元素
          if (couplet.banner) charArray.push(couplet.banner);
          charArray.push(...couplet.upper.split(''));
          charArray.push(...couplet.lower.split(''));
        } else if (typeof text === 'string') {
          charArray = text.split('');
        }

        const characters: CharacterStrokes[] = charArray.map((char, idx) => ({
          charId: generateId(),
          character: char,
          strokes: [],
        }));

        set({ characters, currentCharIndex: 0 });
      },

      updateCharacterStrokes: (index: number, strokes: Stroke[]) => {
        const characters = [...get().characters];
        if (characters[index]) {
          characters[index] = { ...characters[index], strokes };
          set({ characters });
        }
      },

      setCurrentChar: (index: number) => {
        set({ currentCharIndex: index });
      },

      clearCurrentChar: () => {
        const index = get().currentCharIndex;
        const characters = [...get().characters];
        if (characters[index]) {
          characters[index] = { ...characters[index], strokes: [] };
          set({ characters });
        }
      },

      setStyle: (id: BrushStyle['id']) => {
        set({ styleId: id });
      },

      setTemplate: (id: string) => {
        set({ templateId: id });
      },

      saveDraft: () => {
        const state = get();
        const draft = {
          projectId: state.projectId,
          categoryId: state.categoryId,
          text: state.text,
          characters: state.characters,
          styleId: state.styleId,
          templateId: state.templateId,
          savedAt: Date.now(),
        };

        const drafts = JSON.parse(localStorage.getItem('calligraphy-drafts') || '[]');
        const existingIndex = drafts.findIndex((d: { projectId: string }) => d.projectId === state.projectId);

        if (existingIndex >= 0) {
          drafts[existingIndex] = draft;
        } else {
          drafts.unshift(draft);
        }

        localStorage.setItem('calligraphy-drafts', JSON.stringify(drafts.slice(0, 10)));
      },

      loadDraft: (projectId: string) => {
        const drafts = JSON.parse(localStorage.getItem('calligraphy-drafts') || '[]');
        const draft = drafts.find((d: { projectId: string }) => d.projectId === projectId);

        if (draft) {
          set({
            projectId: draft.projectId,
            categoryId: draft.categoryId,
            text: draft.text,
            characters: draft.characters,
            styleId: draft.styleId,
            templateId: draft.templateId,
            currentCharIndex: 0,
          });
        }
      },
    }),
    {
      name: 'calligraphy-project',
      partialize: (state) => ({
        projectId: state.projectId,
        categoryId: state.categoryId,
        text: state.text,
        styleId: state.styleId,
        templateId: state.templateId,
      }),
    }
  )
);
