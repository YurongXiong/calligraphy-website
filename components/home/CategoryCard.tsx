'use client';

import Link from 'next/link';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
}

const categoryIcons: Record<string, string> = {
  couplet: '福',
  hanging: '雅',
  plaque: '匾',
  single: '墨',
};

const categoryBgColors: Record<string, string> = {
  couplet: 'bg-seal/10',
  hanging: 'bg-bamboo/10',
  plaque: 'bg-gold/10',
  single: 'bg-gold/10',
};

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/input?category=${category.id}`} className="block group">
      <div className={`
        relative p-8 rounded-lg border-2 border-paper-dark
        ${categoryBgColors[category.id]}
        transition-all duration-300
        hover:border-seal hover:shadow-lg hover:shadow-seal/10
        cursor-pointer
      `}>
        {/* 图标 */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper flex items-center justify-center">
          <span className="text-3xl font-bold text-ink">{categoryIcons[category.id]}</span>
        </div>

        {/* 名称 */}
        <h3 className="text-xl font-bold text-ink text-center mb-2">
          {category.name}
        </h3>

        {/* 描述 */}
        <p className="text-ink/60 text-center text-sm mb-4">
          {category.description}
        </p>

        {/* 字符数提示 */}
        <p className="text-xs text-ink/40 text-center">
          最少 {category.maxChars} 字
        </p>

        {/* 悬停效果 - 右上角装饰 */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-2xl text-seal">→</span>
        </div>
      </div>
    </Link>
  );
}
