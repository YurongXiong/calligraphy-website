'use client';

export function HeroSection() {
  return (
    <section className="relative py-16 md:py-24 px-4 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-8 left-8 md:top-10 md:left-10 w-24 md:w-32 border-2 border-ink rounded-full"></div>
        <div className="absolute top-16 right-8 md:top-20 md:right-20 w-20 md:w-24 border border-ink rounded-full"></div>
        <div className="absolute bottom-8 left-1/4 w-12 md:w-16 h-12 md:h-16 bg-gold/30 rounded-full"></div>
      </div>

      <div className="relative container mx-auto text-center">
        {/* 品牌标题 */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-ink mb-3 tracking-wider" style={{ fontFamily: 'var(--font-noto-serif)' }}>
          手写成书
        </h1>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-medium text-ink/80 mb-4 tracking-wide" style={{ fontFamily: 'var(--font-noto-serif)' }}>
          汉字作品工坊
        </h2>

        {/* 副标题 */}
        <p className="text-lg md:text-xl text-ink/70 mb-8 max-w-xl mx-auto">
          落笔成字，创作你自己的书法作品
        </p>

        {/* 装饰线 */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-12 md:w-16 h-px bg-gradient-to-r from-transparent to-gold"></div>
          <span className="text-seal seal-stamp">墨韵</span>
          <div className="w-12 md:w-16 h-px bg-gradient-to-l from-transparent to-gold"></div>
        </div>
      </div>
    </section>
  );
}
