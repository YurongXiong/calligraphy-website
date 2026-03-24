'use client';

import { categories } from '@/data/categories';
import { CategoryCard } from '@/components/home/CategoryCard';
import { HeroSection } from '@/components/home/HeroSection';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero 区域 */}
      <HeroSection />

      {/* 主内容区 */}
      <section className="flex-1 container mx-auto px-4 py-12">
        {/* 选择作品形式 */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-ink mb-2">选择创作形式</h2>
          <div className="w-24 h-1 bg-seal mx-auto rounded-full"></div>
        </div>

        {/* 分类卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* 页脚 */}
      <footer className="py-6 text-center text-ink/60 text-sm border-t border-paper-dark">
        <p>手写成书 · 传承墨香文化</p>
      </footer>
    </main>
  );
}
