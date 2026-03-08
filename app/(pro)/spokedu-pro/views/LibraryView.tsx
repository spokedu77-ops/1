'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { THEME_KEYS, THEME_LABELS } from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';

const MOCK_PROGRAMS = Array.from({ length: 20 }, (_, i) => {
  const themes = ['인트로 프로그램', '협동 놀이체육', '스피드리액션', '인지 발달', '챌린지', '술래 대결', '변형스포츠'];
  const roles = ['Intro', 'Lead-up', 'Main', 'Finisher'];
  const categories = ['Play', 'Think', 'Grow'];
  const gradients = ['from-orange-500 to-red-600', 'from-emerald-500 to-teal-600', 'from-purple-500 to-indigo-600'];
  const idx = i % 3;
  return {
    id: i + 1,
    title: `스포키듀 추천 커리큘럼 #${i + 1}`,
    category: categories[idx],
    gradient: gradients[idx],
    theme: themes[i % themes.length],
    role: roles[i % roles.length],
  };
});

function ProgramCard({
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
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
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
        <div className="flex gap-1.5 mb-2">
          <span className="text-[10px] font-black uppercase text-white px-2 py-0.5 bg-black/60 rounded">{role}</span>
          <span className="text-[10px] font-black text-slate-300 px-2 py-0.5 bg-slate-800/60 rounded">{theme}</span>
        </div>
        <h4 className="text-white font-black text-lg line-clamp-2">{title}</h4>
      </div>
    </div>
  );
}

const TAB_THEMES = THEME_KEYS.map((k) => ({ key: k, label: THEME_LABELS[k] }));

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

  useEffect(() => {
    if (initialPreset?.themeKey && THEME_KEYS.includes(initialPreset.themeKey as (typeof THEME_KEYS)[number])) {
      setActiveThemeKey(initialPreset.themeKey);
    } else if (initialPreset?.preset === 'best') {
      setActiveThemeKey('best');
    }
  }, [initialPreset?.themeKey, initialPreset?.preset]);

  return (
    <section className="px-8 lg:px-16 py-12 pb-32 space-y-8">
      <header className="space-y-6">
        <h2 className="text-4xl font-black text-white tracking-tight">전체 100대 프로그램 뱅크</h2>
        <div className="flex flex-wrap gap-2 pt-2">
          {initialPreset?.preset === 'best' && (
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white border border-blue-500"
            >
              선생님 베스트
            </button>
          )}
          {TAB_THEMES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveThemeKey(activeThemeKey === key ? null : key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                activeThemeKey === key
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <select className="bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500">
            <option value="all">전체 발달 영역 (PTG)</option>
            <option value="Play">Play (신체 및 대근육)</option>
            <option value="Think">Think (인지 및 상황판단)</option>
            <option value="Grow">Grow (사회성 및 협동)</option>
          </select>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="프로그램 검색..."
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
        {MOCK_PROGRAMS.map((p) => {
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
    </section>
  );
}
