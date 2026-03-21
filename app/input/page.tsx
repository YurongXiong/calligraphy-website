'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectStore } from '@/stores/project-store';
import { coupletExamples, hangingExamples, plaqueExamples } from '@/data/examples';
import { categories } from '@/data/categories';
import { CategoryId, CoupletText } from '@/types';

export default function InputPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = use(searchParams);
  const router = useRouter();
  const setCategory = useProjectStore((state) => state.setCategory);
  const setText = useProjectStore((state) => state.setText);

  const [categoryId, setCategoryId] = useState<CategoryId>('couplet');
  const [upperText, setUpperText] = useState('');
  const [lowerText, setLowerText] = useState('');
  const [bannerText, setBannerText] = useState('');
  const [singleText, setSingleText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.category && ['couplet', 'hanging', 'plaque'].includes(params.category)) {
      setCategoryId(params.category as CategoryId);
    }
  }, [params.category]);

  const currentCategory = categories.find((c) => c.id === categoryId);

  const handleSelectExample = (example: string | CoupletText) => {
    if (categoryId === 'couplet' && typeof example === 'object') {
      setUpperText(example.upper);
      setLowerText(example.lower);
      setBannerText(example.banner || '');
    } else if (typeof example === 'string') {
      setSingleText(example);
    }
  };

  const validateAndSubmit = () => {
    setError('');

    if (categoryId === 'couplet') {
      if (!upperText.trim() || !lowerText.trim()) {
        setError('请输入上联和下联');
        return;
      }
      if (upperText.length !== lowerText.length) {
        setError('上联和下联字数必须相同');
        return;
      }
      if (currentCategory && upperText.length > currentCategory.maxChars) {
        setError(`上联不能超过 ${currentCategory.maxChars} 个字`);
        return;
      }

      const coupletText: CoupletText = {
        upper: upperText.trim(),
        lower: lowerText.trim(),
        banner: bannerText.trim() || undefined,
      };

      setCategory(categoryId);
      setText(coupletText);
      router.push('/write');
    } else {
      if (!singleText.trim()) {
        setError('请输入内容');
        return;
      }
      if (currentCategory && singleText.length > currentCategory.maxChars) {
        setError(`内容不能超过 ${currentCategory.maxChars} 个字`);
        return;
      }

      setCategory(categoryId);
      setText(singleText.trim());
      router.push('/write');
    }
  };

  const examples = categoryId === 'couplet'
    ? coupletExamples
    : categoryId === 'hanging'
      ? hangingExamples
      : plaqueExamples;

  return (
    <main className="min-h-screen bg-paper paper-texture">
      {/* 头部 */}
      <header className="border-b border-paper-dark bg-paper/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-ink hover:text-seal transition-colors">
            <span className="text-xl">←</span>
            <span className="font-medium">返回首页</span>
          </Link>
          <h1 className="text-xl font-bold text-ink">{currentCategory?.name}</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 分类切换 */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryId(cat.id);
                setUpperText('');
                setLowerText('');
                setBannerText('');
                setSingleText('');
                setError('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                categoryId === cat.id
                  ? 'bg-seal text-white'
                  : 'bg-paper-dark text-ink/70 hover:bg-bamboo/10 hover:text-bamboo'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* 输入区域 */}
        <div className="bg-paper rounded-xl border border-paper-dark p-6 mb-6">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-seal rounded-full"></span>
            输入内容
          </h2>

          {categoryId === 'couplet' ? (
            <div className="space-y-4">
              {/* 横批 */}
              <div>
                <label className="block text-sm text-ink/60 mb-2">横批（可选）</label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="如：迎春接福"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-paper-dark rounded-lg border border-paper-dark focus:border-seal focus:outline-none text-ink text-center text-lg tracking-wider"
                />
              </div>

              {/* 上联 */}
              <div>
                <label className="block text-sm text-ink/60 mb-2">
                  上联 <span className="text-xs">（{upperText.length}/{currentCategory?.maxChars} 字）</span>
                </label>
                <input
                  type="text"
                  value={upperText}
                  onChange={(e) => setUpperText(e.target.value)}
                  placeholder="请输入上联"
                  maxLength={10}
                  className="w-full px-4 py-3 bg-paper-dark rounded-lg border border-paper-dark focus:border-seal focus:outline-none text-ink text-center text-lg tracking-wider"
                />
              </div>

              {/* 下联 */}
              <div>
                <label className="block text-sm text-ink/60 mb-2">
                  下联 <span className="text-xs">（{lowerText.length}/{currentCategory?.maxChars} 字）</span>
                </label>
                <input
                  type="text"
                  value={lowerText}
                  onChange={(e) => setLowerText(e.target.value)}
                  placeholder="请输入下联"
                  maxLength={10}
                  className="w-full px-4 py-3 bg-paper-dark rounded-lg border border-paper-dark focus:border-seal focus:outline-none text-ink text-center text-lg tracking-wider"
                />
              </div>

              {/* 字数校验提示 */}
              {upperText && lowerText && upperText.length !== lowerText.length && (
                <p className="text-seal text-sm text-center">
                  上联和下联字数不一致 ({upperText.length} vs {lowerText.length})
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm text-ink/60 mb-2">
                内容 <span className="text-xs">（{singleText.length}/{currentCategory?.maxChars} 字）</span>
              </label>
              <input
                type="text"
                value={singleText}
                onChange={(e) => setSingleText(e.target.value)}
                placeholder={categoryId === 'hanging' ? '如：宁静致远' : '如：书房'}
                maxLength={currentCategory?.maxChars}
                className="w-full px-4 py-3 bg-paper-dark rounded-lg border border-paper-dark focus:border-seal focus:outline-none text-ink text-center text-xl tracking-wider"
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <p className="text-seal text-sm text-center mt-4">{error}</p>
          )}
        </div>

        {/* 示例 */}
        <div className="bg-paper rounded-xl border border-paper-dark p-6 mb-6">
          <h2 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-bamboo rounded-full"></span>
            示例参考
          </h2>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, idx) => {
              const label = typeof example === 'object'
                ? `${example.upper.slice(0, 4)}...`
                : example;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectExample(example)}
                  className="px-3 py-1.5 bg-paper-dark hover:bg-bamboo/10 hover:text-bamboo rounded-lg text-sm text-ink/70 transition-colors"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="button"
          onClick={validateAndSubmit}
          className="w-full py-4 bg-seal hover:bg-seal/90 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-seal/20 active:bg-seal/80"
        >
          开始书写
        </button>
      </div>
    </main>
  );
}
