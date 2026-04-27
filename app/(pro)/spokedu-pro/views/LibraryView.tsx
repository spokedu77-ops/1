'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Search, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { FUNCTION_TYPES, MAIN_THEMES, GROUP_SIZES } from '@/app/lib/spokedu-pro/programClassification';
import {
  THEME_KEYS,
  THEME_KEY_TO_BANK_THEME,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import { getYouTubeThumbnailUrl } from '../utils/youtube';
import { screenplayDetailStorageKey } from '../utils/spomoveLaunch';
import { useSpokeduProContent } from '../hooks/useSpokeduProContent';
import { resolveScreenplayTagMappingV1, getScreenplayLevelTag } from '../utils/screenplayTagMapping';
import type { ProgramDetail } from '../types';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';

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
  const tr = useTranslator();
  return (
    <div
      className="media-card relative w-full aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer border border-slate-700/80"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={tr(title)}
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
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold text-slate-300/90 px-2 py-0.5 bg-slate-900/35 rounded-md border border-white/10"
              >
                {tr(tag)}
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

function programFilterChipClass(active: boolean): string {
  return [
    'shrink-0 rounded-full px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-semibold transition-colors border',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
    active
      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100 shadow-sm shadow-emerald-900/20'
      : 'border-slate-600/45 bg-slate-950/35 text-slate-400 hover:border-slate-500 hover:bg-slate-800/55 hover:text-slate-100',
  ].join(' ');
}

export default function LibraryView({
  onOpenDetail,
  onSelectProgram,
  initialPreset = null,
  programDetails = {},
  compact = false,
  functionalCap,
  libraryMode = 'program',
  refreshToken,
  isEditMode = false,
  screenplaysRefreshToken = 0,
}: {
  onOpenDetail: (
    id: number,
    context?: {
      role?: string;
      themeKey?: string;
      screenplay?: boolean;
      /** 목록에서 전달하는 스냅샷(상세 맵에 없을 때 placeholder 방지) */
      row?: Partial<ProgramRow>;
    }
  ) => void;
  /** 설정 시 카드 클릭으로 프로그램 선택(드로어 대신). */
  onSelectProgram?: (id: number, row?: Partial<ProgramRow>) => void;
  initialPreset?: { themeKey?: string; preset?: string } | null;
  programDetails?: Record<string, ProgramDetail>;
  /** 슬라이드 패널 등 좁은 영역용(헤더·필터 일부 축소). */
  compact?: boolean;
  /** 펑셔널 무브 프리셋에서 기본 노출 상한(예: 144). */
  functionalCap?: number;
  /** 라이브러리 데이터 소스 강제 모드 */
  libraryMode?: 'program' | 'screenplay';
  /** 상위에서 저장 후 목록을 강제 새로고침하기 위한 토큰 */
  refreshToken?: number;
  /** 관리자(/admin/spokedu-pro) 편집 모드에서만 스크린플레이 동기화 UI 노출 */
  isEditMode?: boolean;
  /** 스크린플레이 목록 강제 재조회 */
  screenplaysRefreshToken?: number;
}) {
  const tr = useTranslator();
  const [syncingScreenplays, setSyncingScreenplays] = useState(false);
  const [functionType, setFunctionType] = useState<string>('');
  const [mainTheme, setMainTheme] = useState<string>('');
  const [groupSize, setGroupSize] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [isReady, setIsReady] = useState(false);
  const [programsFromApi, setProgramsFromApi] = useState<ProgramRow[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const isScreenplayPreset = libraryMode === 'screenplay' || initialPreset?.themeKey === 'cognitive';
  const isFunctionalPreset = initialPreset?.themeKey === 'co-op';

  // 스포무브(스크린플레이) 카드 태그: 인지영역/과제유형/레벨
  const { data: tagMappingContent, fetchContent: fetchTagMapping } = useSpokeduProContent('catalog', [
    'screenplay_tag_mapping_v1',
  ]);
  useEffect(() => {
    fetchTagMapping();
  }, [fetchTagMapping]);

  const screenplayTagMapping = resolveScreenplayTagMappingV1(
    tagMappingContent?.screenplay_tag_mapping_v1?.value
  );

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
      fetch('/api/spokedu-pro/screenplays', { credentials: 'include' })
        .then((res) => res.json().then((json) => ({ res, json })))
        .then(({ res, json }) => {
          if (cancelled || !res.ok || !Array.isArray(json?.screenplays)) {
            if (!cancelled) {
              setProgramsFromApi([]);
              setFetchError(true);
            }
            return;
          }
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
                id: Number(s.id),
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
            .filter((s: ProgramRow) => Number.isFinite(s.id) && s.id > 0)
            .filter((s: ProgramRow) => (q ? s.title.toLowerCase().includes(q) : true));
          setProgramsFromApi(mapped);
          setFetchError(false);
        })
        .catch(() => {
          if (!cancelled) { setProgramsFromApi([]); setFetchError(true); }
        });
    } else {
      const params = new URLSearchParams();
      params.set('limit', '200');
      // 펑셔널 무브(협동 놀이) 기본 진입: 센터 커리큘럼 Import 대상만 먼저 노출
      // 수동 필터/검색을 시작하면 전체 프로그램 뱅크로 확장
      const hasManualFiltersLocal =
        functionType !== '' || mainTheme !== '' || groupSize !== '' || search.trim() !== '';
      if (isFunctionalPreset && !hasManualFiltersLocal) {
        params.set('function_type', '협응력');
        params.set('main_theme', '협동형');
        params.set('group_size', '소그룹');
      }
      if (functionType) params.set('function_type', functionType);
      if (mainTheme) params.set('main_theme', mainTheme);
      if (groupSize) params.set('group_size', groupSize);
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      fetch(`/api/spokedu-pro/programs?${params}`)
        .then((res) => res.json().then((json) => ({ res, json })))
        .then(({ res, json }) => {
          if (cancelled || !res.ok || !Array.isArray(json?.data)) {
            if (!cancelled) {
              setProgramsFromApi([]);
              setFetchError(true);
            }
            return;
          }
          setProgramsFromApi(json.data);
          setFetchError(false);
        })
        .catch(() => {
          if (!cancelled) { setProgramsFromApi([]); setFetchError(true); }
        });
    }
    return () => { cancelled = true; };
  }, [
    functionType,
    mainTheme,
    groupSize,
    debouncedSearch,
    isScreenplayPreset,
    isFunctionalPreset,
    search,
    refreshToken,
    screenplaysRefreshToken,
  ]);

  const isLoading = programsFromApi === null;
  const filteredPrograms = programsFromApi ?? [];
  const hasManualFilters =
    functionType !== '' || mainTheme !== '' || groupSize !== '' || search.trim() !== '';
  const visiblePrograms = useMemo(() => {
    // 펑셔널 무브 기본 진입 시에는 센터 커리큘럼 카드 144개만 우선 노출합니다.
    if (isFunctionalPreset && !hasManualFilters && typeof functionalCap === 'number' && functionalCap > 0) {
      return filteredPrograms.slice(0, functionalCap);
    }
    return filteredPrograms;
  }, [isFunctionalPreset, hasManualFilters, filteredPrograms, functionalCap]);

  /**
   * 검색어(q)는 서버에서도 걸지만, 실제 표시 타이틀은 programDetails(편집/보강)로 덮일 수 있어
   * 화면에서 "최종 표시 타이틀" 기준으로 한 번 더 필터링한다.
   * (요청: 톱니바퀴 검색 시 유령 카드가 섞이는 문제 방지)
   */
  const displayFilteredPrograms = useMemo(() => {
    // 화면 표시 필터는 "즉시 입력값(search)" 기준으로 처리해서
    // 디바운스(서버 fetch용) 타이밍 때문에 잠깐 옛 결과가 보이는 깜빡임을 방지한다.
    const q = search.trim().toLowerCase();
    const getDisplayTitle = (p: ProgramRow) => {
      if (isScreenplayPreset) {
        const screenplayDetail = programDetails[screenplayDetailStorageKey(p.id)];
        return stripMonthWeekPrefix(screenplayDetail?.title ?? p.title ?? '').trim();
      }
      const detail = programDetails[String(p.id)];
      return stripMonthWeekPrefix(detail?.title ?? p.title ?? '').trim();
    };

    const filtered = q
      ? visiblePrograms.filter((p) => getDisplayTitle(p).toLowerCase().includes(q))
      : visiblePrograms;

    // 요청: 검색 시 같은 제목이 여러 줄로 존재(월/주, 중복 입력 등)하면 "유령"처럼 보이므로,
    // 표시 제목 기준으로 중복을 숨겨 실제 카드만 남긴다.
    if (!q) return filtered;
    const seen = new Set<string>();
    const deduped: ProgramRow[] = [];
    for (const p of filtered) {
      const key = getDisplayTitle(p).toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(p);
    }
    return deduped;
  }, [visiblePrograms, search, programDetails, isScreenplayPreset]);
  const clearFilters = () => {
    setFunctionType('');
    setMainTheme('');
    setGroupSize('');
    setSearch('');
    setDebouncedSearch('');
  };
  const hasActiveFilters = hasManualFilters;

  const selectionMode = typeof onSelectProgram === 'function';

  return (
    <section className={compact ? 'px-3 py-4 pb-8 space-y-4' : 'px-4 sm:px-8 lg:px-16 py-12 pb-32 space-y-8'}>
      <header className={compact ? 'space-y-3' : 'space-y-6'}>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <h2 className={compact ? 'text-xl font-black text-white tracking-tight' : 'text-3xl md:text-4xl font-black text-white tracking-tight'}>
            {selectionMode ? tr('프로그램 선택') : tr('프로그램 뱅크')}
          </h2>
          <span className="text-slate-400 text-sm font-medium tabular-nums">
            {displayFilteredPrograms.length}
            {tr('개')}
          </span>
        </div>

        {isScreenplayPreset && isEditMode && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/25 px-3 py-2.5">
            <button
              type="button"
              disabled={syncingScreenplays}
              onClick={async () => {
                setSyncingScreenplays(true);
                try {
                  const res = await fetch('/api/spokedu-pro/screenplays/import-memory-game', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    const hint =
                      Array.isArray(j.errors) && j.errors[0]?.message
                        ? ` — ${j.errors[0].message}`
                        : '';
                    toast.error(String(j.error ?? `HTTP ${res.status}`) + hint);
                    return;
                  }
                  const built = typeof j.built === 'number' ? j.built : null;
                  const failed = typeof j.failed === 'number' ? j.failed : 0;
                  if (failed > 0) {
                    const first = Array.isArray(j.errors) && j.errors[0]?.message ? j.errors[0].message : '';
                    toast.error(
                      tr(
                        `동기화 실패 ${failed}건 (생성 ${j.inserted ?? 0}, 수정 ${j.updated ?? 0}${built != null ? `, 대상 ${built}` : ''})${first ? `: ${first}` : ''}`
                      )
                    );
                    return;
                  }
                  toast.success(
                    tr(
                      `동기화 완료 (추가 ${j.inserted ?? 0}, 수정 ${j.updated ?? 0}${built != null ? `, 대상 ${built}` : ''})`
                    )
                  );
                  window.dispatchEvent(new CustomEvent('spokedu-pro-screenplays-synced'));
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : tr('동기화 실패'));
                } finally {
                  setSyncingScreenplays(false);
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600/90 text-white text-xs font-black hover:bg-amber-500 disabled:opacity-50 border border-amber-400/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingScreenplays ? 'animate-spin' : ''}`} />
              {syncingScreenplays ? tr('동기화 중…') : tr('스크린플레이 DB 동기화')}
            </button>
            <p className="text-[11px] text-slate-400 leading-snug max-w-xl">
              {tr('Memory Game MODES → DB. 플랫폼 관리자만 실행 가능. 완료 후 목록이 자동으로 갱신됩니다.')}
            </p>
          </div>
        )}

        {!isScreenplayPreset ? (
          <div
            className={
              compact
                ? 'rounded-xl border border-slate-700/60 bg-slate-950/25 p-3 space-y-3'
                : 'rounded-2xl border border-slate-700/50 bg-slate-950/20 p-4 sm:p-5 space-y-4'
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
              <div className="relative flex-1 min-w-0 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tr('프로그램명 검색...')}
                  className="w-full bg-slate-900/60 border border-slate-600/60 rounded-xl text-white text-sm pl-10 pr-10 py-2.5 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setDebouncedSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded-md hover:bg-slate-800"
                    aria-label={tr('지우기')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-600/70 text-slate-300 bg-slate-900/40 hover:bg-slate-800 hover:text-white"
                >
                  {tr('필터 초기화')}
                </button>
              ) : null}
            </div>

            <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">{tr('기능')}</p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 custom-scroll">
                  {FUNCTION_TYPES.map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFunctionType(functionType === ft ? '' : ft)}
                      className={programFilterChipClass(functionType === ft)}
                    >
                      {tr(ft)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-700/50" aria-hidden />

              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">{tr('테마')}</p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 custom-scroll">
                  {MAIN_THEMES.map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setMainTheme(mainTheme === mt ? '' : mt)}
                      className={programFilterChipClass(mainTheme === mt)}
                    >
                      {tr(mt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-700/50" aria-hidden />

              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">{tr('인원')}</p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 custom-scroll">
                  {GROUP_SIZES.map((gs) => (
                    <button
                      key={gs}
                      type="button"
                      onClick={() => setGroupSize(groupSize === gs ? '' : gs)}
                      className={programFilterChipClass(groupSize === gs)}
                    >
                      {tr(gs)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('프로그램명 검색...')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm pl-10 pr-10 py-2.5 focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  aria-label={tr('지우기')}
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
                {tr('필터 초기화')}
              </button>
            )}
          </div>
        )}
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
          <p className="text-slate-400 text-sm">{tr('프로그램 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.')}</p>
        </div>
      )}

      {!isLoading && !fetchError && displayFilteredPrograms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <span className="text-5xl">🔍</span>
          <p className="text-white font-black text-lg">{tr('검색 결과가 없습니다')}</p>
          <button type="button" onClick={clearFilters} className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500">
            {tr('필터 초기화')}
          </button>
        </div>
      )}

      {!isLoading && displayFilteredPrograms.length > 0 && (
        <div
          className={
            compact
              ? 'grid grid-cols-2 gap-3'
              : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6'
          }
        >
          {displayFilteredPrograms.map((p) => {
                const screenplayDetail = isScreenplayPreset ? programDetails[screenplayDetailStorageKey(p.id)] : undefined;
                const detail = programDetails[String(p.id)];
                const videoUrl = isScreenplayPreset
                  ? (screenplayDetail?.videoUrl ?? p.video_url)
                  : (detail?.videoUrl ?? p.video_url);
                const thumbnailUrl = isScreenplayPreset
                  ? (p.thumbnail_url ?? (videoUrl ? getYouTubeThumbnailUrl(videoUrl) : null))
                  : (p.thumbnail_url ?? (videoUrl ? getYouTubeThumbnailUrl(videoUrl) : null));
                const tags = isScreenplayPreset
                  ? (() => {
                      const modeId = String(p.mode_id ?? p.function_type ?? '');
                      const entry = screenplayTagMapping.modeIdMap[modeId];
                      const domainTag = entry?.domainLabel ?? tr('인지영역');
                      const taskTag = entry?.taskLabel ?? (modeId || tr('과제유형'));
                      const levelTag = getScreenplayLevelTag(p.preset_ref, screenplayTagMapping.levelLabelTemplate);
                      return [domainTag, taskTag, levelTag].filter(Boolean) as string[];
                    })()
                  : [p.function_type, p.main_theme, p.group_size].filter(Boolean) as string[];
                return (
                  <ProgramCard
                    key={`${isScreenplayPreset ? 'screenplay' : 'program'}-${p.id}`}
                    title={stripMonthWeekPrefix(
                      isScreenplayPreset ? (screenplayDetail?.title ?? p.title) : (detail?.title ?? p.title)
                    )}
                    tags={tags}
                    thumbnailUrl={thumbnailUrl}
                    onClick={() => {
                      if (selectionMode) {
                        onSelectProgram!(p.id, p);
                        return;
                      }
                      if (isScreenplayPreset) {
                        onOpenDetail(p.id, { screenplay: true, row: p });
                        return;
                      }
                      onOpenDetail(p.id, { row: p });
                    }}
                  />
                );
              })}
        </div>
      )}
    </section>
  );
}
