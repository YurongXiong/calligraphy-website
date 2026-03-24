import { Category } from '@/types';

export const categories: Category[] = [
  {
    id: 'couplet',
    name: '春联',
    description: '新春佳节，对联迎福',
    maxChars: 7,
    hasBanner: true,
  },
  {
    id: 'hanging',
    name: '挂画',
    description: '书房雅居，水墨丹青',
    maxChars: 5,
  },
  {
    id: 'plaque',
    name: '牌匾',
    description: '门楣匾额，翰墨留香',
    maxChars: 4,
  },
  {
    id: 'single',
    name: '单字',
    description: '一字凝神，方寸印心',
    maxChars: 1,
  },
];
