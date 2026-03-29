import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectStore, CategoryId, BrushStyle, Stroke, CharacterStrokes, CoupletText } from '@/types';

const generateId = () => Math.random().toString(36).substring(2, 15);

// 每个分类对应的默认模板 ID
const DEFAULT_TEMPLATE_MAP: Record<CategoryId, string> = {
  couplet: 'couplet-light',
  hanging: 'hanging-light',
  plaque: 'plaque-light',
  single: 'single-light',
};

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
        set({ categoryId: id, templateId: DEFAULT_TEMPLATE_MAP[id] });
      },

      setText: (text: string | CoupletText) => {
        set({ text });
        const categoryId = get().categoryId;
        let charArray: string[] = [];

        if (categoryId === 'couplet' && typeof text === 'object') {
          const couplet = text as CoupletText;
          // 每个字都作为独立元素：横批 → 上联 → 下联
          if (couplet.banner) charArray.push(...couplet.banner.split(''));
          charArray.push(...couplet.upper.split(''));
          charArray.push(...couplet.lower.split(''));
        } else if (typeof text === 'string') {
          charArray = text.split('');
        }

        const characters: CharacterStrokes[] = charArray.map((char) => ({
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
