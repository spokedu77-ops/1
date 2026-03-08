'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { THEME_KEYS, THEME_LABELS, PROGRAM_BANK, THEME_KEY_TO_BANK_THEME } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';

type Category = 'all' | 'Play' | 'Think' | 'Grow';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'all', label: '전체 발달 영역 (PTG)' },
  { value: 'Play', label: 'Play — 신체 및 대근육' },
  { value: 'Think', label: 'Think — 인지 및 상황판단' },
  { value: 'Grow', label: 'Grow — 사회성 및 협동' },
];

const ProgramCard = memo(function ProgramCard({
  title,
  role,
  theme,
  gradient,
  thumbnailUrl,
  onClick,
}: {
  title: string;
  role: string;
  theme: string;
  gradient: string;
  thumbnailUrl?: string | null;
  onClick: () => void;
}) {
  return (
    <div
      className="media-card relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={title}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-70 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
        >
          <span className="text-6xl text-white/90">▶</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent p-5 flex flex-col justify-end">
        <div className="flex gap-1.5 mb-2 flex-wrap">
          <span className="text-[10px] font-black uppercase text-white px-2 py-0.5 bg-black/60 rounded">{role}</span>
          <span className="text-[10px] font-black text-slate-300 px-2 py-0.5 bg-slate-800/60 rounded">{theme}</span>
        </div>
        <h4 className="text-white font-black text-lg line-clamp-2">{title}</h4>
      </div>
    </div>
  );
});

const TAB_THEMES = THEME_KEYS.map((k) => ({ key: k, label: THEME_LABELS[k] }));

function SkeletonCard() {
  return (
    <div className="w-full aspect-[4/3] rounded-2xl bg-slate-800 animate-pulse" />
  );
}

export default function LibraryView({
  onOpenDetail,
  initialPreset = null,
  programDetails = {},
}: {
  onOpenDetail: (id: number, context?: { role?: string; themeKey?: string }) => void;
  initialPreset?: { themeKey?: string; preset?: string } | null;
  programDetails?: Record<string, ProgramDetail>;
}) {
  const [activeThemeKey, setActiveThemeKey] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (initialPreset?.themeKey && THEME_KEYS.includes(initialPreset.themeKey as (typeof THEME_KEYS)[number])) {
      setActiveThemeKey(initialPreset.themeKey);
    } else if (initialPreset?.preset === 'best') {
      setActiveThemeKey(null);
    }
    // 첫 마운트 시 스켈레톤 → 실제 카드 전환 (UX)
    const t = setTimeout(() => setIsReady(true), 80);
    return () => clearTimeout(t);
  }, [initialPreset?.themeKey, initialPreset?.preset]);

  const filteredPrograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PROGRAM_BANK.filter((p) => {
      // 테마 필터
      if (activeThemeKey && activeThemeKey !== 'best') {
        const bankTheme = THEME_KEY_TO_BANK_THEME[activeThemeKey as keyof typeof THEME_KEY_TO_BANK_THEME];
        if (bankTheme && p.theme !== bankTheme) return false;
      }
      // 카테고리 필터
      if (category !== 'all' && p.category !== category) return false;
      // 검색어 필터
      if (q) {
        const detail = programDetails[String(p.id)];
        const titleToSearch = (detail?.title ?? p.title).toLowerCase();
        const themeToSearch = p.theme.toLowerCase();
        if (!titleToSearch.includes(q) && !themeToSearch.includes(q)) return false;
      }
      return true;
    });
  }, [activeThemeKey, category, search, programDetails]);

  const clearFilters = () => {
    setActiveThemeKey(null);
    setCategory('all');
    setSearch('');
  };

  const hasActiveFilters = activeThemeKey !== null || category !== 'all' || search.trim() !== '';

  return (
    <section className="px-8 lg:px-16 py-12 pb-32 space-y-8">
      <header className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h2 className="text-4xl font-black text-white tracking-tight">
            전체 100대 프로그램 뱅크
          </h2>
          <span className="text-slate-400 text-sm font-medium">
            {filteredPrograms.length}개 표시 중
          </span>
        </div>

        {/* 테마 탭 */}
        <div className="flex flex-wrap gap-2 pt-2">
          {TAB_THEMES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveThemeKey(activeThemeKey === key ? null : key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                activeThemeKey === key
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 카테고리 + 검색 */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
          >
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="프로그램명 또는 테마로 검색..."
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="검색어 지우기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-3 rounded-lg text-sm font-bold border border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <X className="w-4 h-4" /> 필터 초기화
            </button>
          )}
        </div>
      </header>

      {/* 빈 상태 */}
      {filteredPrograms.length === 0 && isReady && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <span className="text-6xl">🔍</span>
          <p className="text-white font-black text-xl">검색 결과가 없습니다</p>
          <p className="text-slate-400 text-sm">
            다른 검색어나 필터를 사용해 보세요.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-500 transition-colors"
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* 카드 그리드 */}
      {filteredPrograms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
          {!isReady
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredPrograms.map((p) => {
                const detail = programDetails[String(p.id)];
                const thumbnailUrl = detail?.videoUrl ? getYouTubeThumbnailUrl(detail.videoUrl) : null;
                return (
                  <ProgramCard
                    key={p.id}
                    title={detail?.title ?? p.title}
                    role={p.role}
                    theme={p.theme}
                    gradient={p.gradient}
                    thumbnailUrl={thumbnailUrl}
                    onClick={() => onOpenDetail(p.id, undefined)}
                  />
                );
              })}
        </div>
      )}
    </section>
  );
}
