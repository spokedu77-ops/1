'use client';

import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { FUNCTION_TYPES, MAIN_THEMES, GROUP_SIZES } from '@/app/lib/spokedu-pro/programClassification';
import {
  THEME_KEYS,
  THEME_KEY_TO_BANK_THEME,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import type { ProgramDetail } from '../types';

type ProgramRow = {
  id: number;
  title: string;
  function_type?: string | null;
  main_theme?: string | null;
  group_size?: string | null;
  video_url?: string | null;
  mode_id?: string | null;
  preset_ref?: string | null;
  thumbnail_url?: string | null;
};

const ProgramCard = memo(function ProgramCard({
  title,
  tags,
  thumbnailUrl,
  onClick,
}: {
  title: string;
  tags: string[];
  thumbnailUrl?: string | null;
  onClick: () => void;
}) {
  return (
    <div
      className="media-card relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer border border-slate-700/80"
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
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 opacity-90 group-hover:opacity-100 flex items-center justify-center">
          <span className="text-5xl text-white/80">▶</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent p-4 flex flex-col justify-end">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] font-bold text-emerald-200 px-2 py-0.5 bg-emerald-500/25 rounded-md border border-emerald-500/30"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <h4 className="text-white font-black text-base line-clamp-2">{title}</h4>
      </div>
    </div>
  );
});

function SkeletonCard() {
  return <div className="w-full aspect-[4/3] rounded-2xl bg-slate-800 animate-pulse" />;
}

export default function LibraryView({
  onOpenDetail,
  onSelectProgram,
  initialPreset = null,
  programDetails = {},
  compact = false,
  functionalCap,
  libraryMode = 'program',
}: {
  onOpenDetail: (id: number, context?: { role?: string; themeKey?: string; screenplay?: boolean }) => void;
  /** 설정 시 카드 클릭으로 프로그램 선택(드로어 대신). */
  onSelectProgram?: (id: number) => void;
  initialPreset?: { themeKey?: string; preset?: string } | null;
  programDetails?: Record<string, ProgramDetail>;
  /** 슬라이드 패널 등 좁은 영역용(헤더·필터 일부 축소). */
  compact?: boolean;
  /** 펑셔널 무브 프리셋에서 기본 노출 상한(예: 144). */
  functionalCap?: number;
  /** 라이브러리 데이터 소스 강제 모드 */
  libraryMode?: 'program' | 'screenplay';
}) {
  const [functionType, setFunctionType] = useState<string>('');
  const [mainTheme, setMainTheme] = useState<string>('');
  const [groupSize, setGroupSize] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [isReady, setIsReady] = useState(false);
  const [programsFromApi, setProgramsFromApi] = useState<ProgramRow[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const isScreenplayPreset = libraryMode === 'screenplay' || initialPreset?.themeKey === 'cognitive';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const prevPresetRef = useRef(initialPreset);
  useEffect(() => {
    const tk = initialPreset?.themeKey;
    if (tk && (THEME_KEYS as readonly string[]).includes(tk)) {
      // 사이드바 프리셋(펑셔널/스포무브) 진입 시 이전 수동 필터 잔존으로 0개가 보이는 상황을 방지
      setFunctionType('');
      setGroupSize('');
      setSearch('');
      const bank = THEME_KEY_TO_BANK_THEME[tk as ThemeKey];
      // 프리셋 라벨과 실제 DB main_theme 분류가 다를 수 있어, 유효한 분류값일 때만 테마 필터를 적용
      if (bank && (MAIN_THEMES as readonly string[]).includes(bank)) {
        setMainTheme(bank);
      } else {
        setMainTheme('');
      }
    } else if (prevPresetRef.current?.themeKey && !tk) {
      setMainTheme('');
    }
    prevPresetRef.current = initialPreset;
  }, [initialPreset]);

  useEffect(() => {
    let cancelled = false;
    setFetchError(false);
    if (isScreenplayPreset) {
      fetch('/api/spokedu-pro/screenplays')
        .then((res) => res.json())
        .then((json) => {
          if (cancelled || !Array.isArray(json?.screenplays)) return;
          const q = debouncedSearch.trim().toLowerCase();
          const mapped = json.screenplays
            .map(
              (s: {
                id: number | string;
                modeId?: string;
                title?: string;
                subtitle?: string;
                description?: string;
                presetRef?: string;
                thumbnailUrl?: string;
              }) => ({
                id: Number(s.id) || 0,
                title: s.title ?? '',
                function_type: s.modeId ?? null,
                main_theme: null,
                group_size: null,
                video_url: null,
                mode_id: s.modeId ?? null,
                preset_ref: s.presetRef ?? null,
                thumbnail_url: s.thumbnailUrl ?? null,
              })
            )
            .filter((s: ProgramRow) => (q ? s.title.toLowerCase().includes(q) : true));
          setProgramsFromApi(mapped);
        })
        .catch(() => {
          if (!cancelled) { setProgramsFromApi([]); setFetchError(true); }
        });
    } else {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (functionType) params.set('function_type', functionType);
      if (mainTheme) params.set('main_theme', mainTheme);
      if (groupSize) params.set('group_size', groupSize);
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      fetch(`/api/spokedu-pro/programs?${params}`)
        .then((res) => res.json())
        .then((json) => {
          if (cancelled || !Array.isArray(json?.data)) return;
          setProgramsFromApi(json.data);
        })
        .catch(() => {
          if (!cancelled) { setProgramsFromApi([]); setFetchError(true); }
        });
    }
    return () => { cancelled = true; };
  }, [functionType, mainTheme, groupSize, debouncedSearch, isScreenplayPreset]);

  const isLoading = programsFromApi === null;
  const filteredPrograms = programsFromApi ?? [];
  const isFunctionalPreset = initialPreset?.themeKey === 'co-op';
  const hasManualFilters =
    functionType !== '' || mainTheme !== '' || groupSize !== '' || search.trim() !== '';
  const visiblePrograms = useMemo(() => {
    // 펑셔널 무브 기본 진입 시에는 센터 커리큘럼 카드 144개만 우선 노출합니다.
    if (isFunctionalPreset && !hasManualFilters && typeof functionalCap === 'number' && functionalCap > 0) {
      return filteredPrograms.slice(0, functionalCap);
    }
    return filteredPrograms;
  }, [isFunctionalPreset, hasManualFilters, filteredPrograms, functionalCap]);
  const clearFilters = () => {
    setFunctionType('');
    setMainTheme('');
    setGroupSize('');
    setSearch('');
  };
  const hasActiveFilters = hasManualFilters;

  const selectionMode = typeof onSelectProgram === 'function';

  return (
    <section className={compact ? 'px-3 py-4 pb-8 space-y-4' : 'px-4 sm:px-8 lg:px-16 py-12 pb-32 space-y-8'}>
      <header className={compact ? 'space-y-3' : 'space-y-6'}>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h2 className={compact ? 'text-xl font-black text-white tracking-tight' : 'text-3xl md:text-4xl font-black text-white tracking-tight'}>
            {selectionMode ? '프로그램 선택' : '프로그램 뱅크'}
          </h2>
          <span className="text-slate-400 text-sm font-medium">{visiblePrograms.length}개</span>
        </div>

        {!compact && !isScreenplayPreset && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">기능</span>
          {FUNCTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFunctionType(functionType === t ? '' : t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                functionType === t
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        )}
        {!compact && !isScreenplayPreset && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">테마</span>
          {MAIN_THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMainTheme(mainTheme === t ? '' : t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                mainTheme === t
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        )}
        {!compact && !isScreenplayPreset && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">인원</span>
          {GROUP_SIZES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setGroupSize(groupSize === t ? '' : t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                groupSize === t
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="프로그램명 검색..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm pl-10 pr-10 py-2.5 focus:outline-none focus:border-emerald-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label="지우기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              필터 초기화
            </button>
          )}
        </div>
      </header>

      {isLoading && (
        <div
          className={
            compact
              ? 'grid grid-cols-2 gap-3'
              : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6'
          }
        >
          {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!isLoading && fetchError && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <p className="text-slate-400 text-sm">프로그램 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.</p>
        </div>
      )}

      {!isLoading && !fetchError && visiblePrograms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <span className="text-5xl">🔍</span>
          <p className="text-white font-black text-lg">검색 결과가 없습니다</p>
          <button type="button" onClick={clearFilters} className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500">
            필터 초기화
          </button>
        </div>
      )}

      {!isLoading && visiblePrograms.length > 0 && (
        <div
          className={
            compact
              ? 'grid grid-cols-2 gap-3'
              : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6'
          }
        >
          {visiblePrograms.map((p) => {
                const detail = programDetails[String(p.id)];
                const videoUrl = isScreenplayPreset ? p.video_url : (detail?.videoUrl ?? p.video_url);
                const thumbnailUrl = isScreenplayPreset
                  ? (p.thumbnail_url ?? null)
                  : (p.thumbnail_url ?? (videoUrl ? getYouTubeThumbnailUrl(videoUrl) : null));
                const tags = isScreenplayPreset
                  ? [p.mode_id ?? p.function_type].filter(Boolean) as string[]
                  : [p.function_type, p.main_theme, p.group_size].filter(Boolean) as string[];
                return (
                  <ProgramCard
                    key={p.id}
                    title={isScreenplayPreset ? p.title : (detail?.title ?? p.title)}
                    tags={tags}
                    thumbnailUrl={thumbnailUrl}
                    onClick={() => {
                      if (selectionMode) {
                        onSelectProgram!(p.id);
                        return;
                      }
                      if (isScreenplayPreset) {
                        onOpenDetail(p.id, { screenplay: true });
                        return;
                      }
                      onOpenDetail(p.id, undefined);
                    }}
                  />
                );
              })}
        </div>
      )}
    </section>
  );
}
