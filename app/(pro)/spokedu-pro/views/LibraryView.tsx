'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslator } from '@/app/providers/I18nProvider';
import { RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  EQUIPMENT_CATALOG,
  FUNCTION_TYPES,
  MAIN_THEMES,
  extractEquipmentDisplayTags,
} from '@/app/lib/spokedu-pro/programClassification';
import {
  THEME_KEY_TO_BANK_THEME,
  THEME_KEYS,
  type ThemeKey,
} from '@/app/lib/spokedu-pro/dashboardDefaults';
import {
  LESSON_PACKAGE_KEY_LABELS,
  LESSON_PACKAGE_KEY_ORDER,
  isLessonPackageKeyId,
  normalizePackageKeysFromDb,
  type LessonPackageKeyId,
} from '@/app/lib/spokedu-pro/lessonPackageKeys';
import type { ProgramLessonDetailLite } from '@/app/lib/spokedu-pro/programLessonDetail';
import { stripMonthWeekPrefix } from '@/app/lib/spokedu-pro/titleSanitizer';
import { SubscriberButton } from '../components/SubscriberWorkspacePrimitives';
import type { SpokeduProOpenDetailContext } from '../programDrawerContext';
import type { ProgramDetail } from '../types';
import { useSpokeduProContent } from '../hooks/useSpokeduProContent';
import { resolveScreenplayTagMappingV1, getScreenplayLevelTag } from '../utils/screenplayTagMapping';
import { screenplayDetailStorageKey } from '../utils/spomoveLaunch';
import { getYouTubeThumbnailUrl } from '../utils/youtube';

type ProgramRow = {
  id: number;
  title: string;
  function_type?: string | null;
  function_types?: string[] | null;
  main_theme?: string | null;
  group_size?: string | null;
  equipment?: string | null;
  video_url?: string | null;
  mode_id?: string | null;
  preset_ref?: string | null;
  thumbnail_url?: string | null;
  lesson_detail?: ProgramLessonDetailLite | null;
};

type ProgramCardMetaSlot = { label: string; value: string };

const DISPLAY_DASH = '-';

function displayLabel(value: string): string {
  if (!value || value === DISPLAY_DASH) return DISPLAY_DASH;
  return value;
}

function lessonPackageLabel(key: 'all' | 'featured' | LessonPackageKeyId): string {
  if (key === 'all') return '전체';
  if (key === 'featured') return '추천 수업안';
  return LESSON_PACKAGE_KEY_LABELS[key];
}

function buildProgramBankMetaSlots(row: ProgramRow, detail: ProgramDetail | undefined): ProgramCardMetaSlot[] {
  const theme = String(detail?.mainTheme ?? row.main_theme ?? '').trim();
  const fnFromDetail = Array.isArray(detail?.functionTypes) ? detail.functionTypes.filter(Boolean) : [];
  const fnFromRow =
    Array.isArray(row.function_types) && row.function_types.length > 0
      ? row.function_types.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : row.function_type
        ? [row.function_type]
        : [];
  const functionFirst = (fnFromDetail[0] ?? fnFromRow[0] ?? '').trim();
  const equipmentFirst = extractEquipmentDisplayTags(detail?.equipment ?? row.equipment ?? '')[0]?.trim() ?? '';

  return [
    { label: '활동 테마', value: theme || DISPLAY_DASH },
    { label: '신체 기능', value: functionFirst || DISPLAY_DASH },
    { label: '사용 교구', value: equipmentFirst || DISPLAY_DASH },
  ];
}

const ProgramCard = memo(function ProgramCard({
  title,
  thumbnailUrl,
  metaSlots,
  onClick,
  compact = false,
  featuredBadgeLabel,
  packageLabelChips,
  subtitle,
  streamlined = false,
}: {
  title: string;
  thumbnailUrl?: string | null;
  metaSlots: ProgramCardMetaSlot[];
  onClick: () => void;
  compact?: boolean;
  featuredBadgeLabel?: string | null;
  packageLabelChips?: string[];
  subtitle?: string | null;
  streamlined?: boolean;
}) {
  const tr = useTranslator();
  const slots = metaSlots.slice(0, 3);
  const chips = (packageLabelChips ?? []).filter(Boolean).slice(0, 2);
  const tagLine = slots
    .map((slot) => displayLabel(slot.value))
    .filter((value) => value && value !== DISPLAY_DASH)
    .slice(0, 2);

  return (
    <button
      type="button"
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/50 text-left shadow-lg shadow-black/25 transition-all duration-300 hover:-translate-y-1 hover:border-slate-500/70 hover:shadow-xl hover:shadow-black/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45"
      onClick={onClick}
      aria-label={tr(title)}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-slate-800">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
            <span className="text-sm font-black uppercase tracking-widest text-white/45">SPOKEDU</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" aria-hidden />
        {(featuredBadgeLabel || chips.length > 0) ? (
          <div className="pointer-events-none absolute left-2 top-2 z-[1] flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
            {featuredBadgeLabel ? (
              <span className="rounded-full border border-amber-400/45 bg-amber-950/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-100 shadow-sm">
                {tr(featuredBadgeLabel)}
              </span>
            ) : null}
            {chips.map((chip) => (
              <span key={chip} className="truncate rounded-full border border-sky-500/35 bg-slate-950/85 px-2 py-0.5 text-[9px] font-bold text-sky-100/95">
                {tr(chip)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className={compact ? 'flex flex-1 flex-col border-t border-slate-800/90 bg-slate-950 px-2.5 py-2' : 'flex flex-1 flex-col border-t border-slate-800/90 bg-slate-950 px-3 py-2.5 sm:px-3.5 sm:py-3'}>
        <h4 className={compact ? 'line-clamp-2 text-[13px] font-bold leading-snug tracking-tight text-white' : 'line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-white sm:text-base'}>
          {title}
        </h4>
        {subtitle?.trim() ? (
          <p className={compact ? 'mt-1 line-clamp-1 text-[11px] leading-snug text-slate-400' : 'mt-1 line-clamp-1 text-xs leading-snug text-slate-400 sm:text-[13px]'}>
            {tr(subtitle.trim())}
          </p>
        ) : null}

        {streamlined ? (
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-800/80 pt-2">
            {tagLine.map((tag) => (
              <span key={tag} className="truncate rounded-md border border-slate-600/50 bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
                {tr(tag)}
              </span>
            ))}
            <span className="ml-auto text-[10px] font-black uppercase tracking-wide text-emerald-400/95">{tr('수업 보기')}</span>
          </div>
        ) : (
          <div className={compact ? 'mt-2 grid grid-cols-3 gap-1.5 border-t border-slate-800/80 pt-2' : 'mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-2.5'}>
            {slots.map((slot) => (
              <div key={slot.label} className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">{tr(slot.label)}</p>
                <p className={compact ? 'mt-0.5 truncate text-[10px] font-semibold text-slate-200' : 'mt-0.5 truncate text-[11px] font-semibold text-slate-200 sm:text-xs'} title={displayLabel(slot.value)}>
                  {tr(displayLabel(slot.value))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
});

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full animate-pulse overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="aspect-video bg-slate-800" />
      <div className={compact ? 'space-y-2 p-2' : 'space-y-2 p-3'}>
        <div className="h-4 w-[72%] rounded bg-slate-800" />
        <div className="grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-2">
          <div className="h-7 rounded bg-slate-800/90" />
          <div className="h-7 rounded bg-slate-800/90" />
          <div className="h-7 rounded bg-slate-800/90" />
        </div>
      </div>
    </div>
  );
}

function programFilterChipClass(active: boolean): string {
  return [
    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:py-2',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
    active
      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100 shadow-sm shadow-emerald-900/20'
      : 'border-slate-600/45 bg-slate-950/35 text-slate-400 hover:border-slate-500 hover:bg-slate-800/55 hover:text-slate-100',
  ].join(' ');
}

function lessonQuickFilterChipClass(active: boolean): string {
  return [
    'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35',
    active
      ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-100/90'
      : 'border-slate-800/60 bg-transparent text-slate-500 hover:border-slate-600/50 hover:bg-slate-900/30 hover:text-slate-300',
  ].join(' ');
}

export default function LibraryView({
  onOpenDetail,
  onSelectProgram,
  initialPreset = null,
  libraryLessonNav = null,
  onClearLibraryLessonNav,
  programDetails = {},
  compact = false,
  functionalCap,
  libraryMode = 'program',
  refreshToken,
  isEditMode = false,
  screenplaysRefreshToken = 0,
}: {
  onOpenDetail: (id: number, context?: SpokeduProOpenDetailContext) => void;
  onSelectProgram?: (id: number, row?: Partial<ProgramRow>) => void;
  initialPreset?: { themeKey?: string; preset?: string } | null;
  programDetails?: Record<string, ProgramDetail>;
  compact?: boolean;
  functionalCap?: number;
  libraryMode?: 'program' | 'screenplay';
  refreshToken?: number;
  libraryLessonNav?: { featuredLesson?: boolean; packageKey?: string } | null;
  onClearLibraryLessonNav?: () => void;
  isEditMode?: boolean;
  screenplaysRefreshToken?: number;
}) {
  const tr = useTranslator();
  const [syncingScreenplays, setSyncingScreenplays] = useState(false);
  const [selectedFunctionTypes, setSelectedFunctionTypes] = useState<string[]>([]);
  const [mainTheme, setMainTheme] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [programsFromApi, setProgramsFromApi] = useState<ProgramRow[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [quickLesson, setQuickLesson] = useState<'all' | 'featured' | LessonPackageKeyId>('all');
  const [subscriberFiltersOpen, setSubscriberFiltersOpen] = useState(false);

  const isScreenplayPreset = libraryMode === 'screenplay' || initialPreset?.themeKey === 'cognitive';
  const isFunctionalPreset = initialPreset?.themeKey === 'co-op';
  const selectionMode = typeof onSelectProgram === 'function';

  useEffect(() => {
    if (libraryLessonNav == null) {
      setQuickLesson('all');
      return;
    }
    if (libraryLessonNav.featuredLesson) {
      setQuickLesson('featured');
      return;
    }
    if (libraryLessonNav.packageKey && isLessonPackageKeyId(libraryLessonNav.packageKey)) {
      setQuickLesson(libraryLessonNav.packageKey);
      return;
    }
    setQuickLesson('all');
  }, [libraryLessonNav]);

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
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const prevPresetRef = useRef(initialPreset);
  useEffect(() => {
    const themeKey = initialPreset?.themeKey;
    if (themeKey && (THEME_KEYS as readonly string[]).includes(themeKey)) {
      setSelectedFunctionTypes([]);
      setSelectedEquipment([]);
      const bankTheme = THEME_KEY_TO_BANK_THEME[themeKey as ThemeKey];
      setMainTheme(bankTheme && (MAIN_THEMES as readonly string[]).includes(bankTheme) ? bankTheme : '');
    } else if (prevPresetRef.current?.themeKey && !themeKey) {
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
          if (cancelled) return;
          if (!res.ok || !Array.isArray(json?.screenplays)) {
            setProgramsFromApi([]);
            setFetchError(true);
            return;
          }
          const query = debouncedSearch.trim().toLowerCase();
          const mapped = json.screenplays
            .map((item: {
              id: number | string;
              modeId?: string;
              title?: string;
              presetRef?: string;
              thumbnailUrl?: string;
            }) => ({
              id: Number(item.id),
              title: item.title ?? '',
              function_type: item.modeId ?? null,
              main_theme: null,
              group_size: null,
              video_url: null,
              mode_id: item.modeId ?? null,
              preset_ref: item.presetRef ?? null,
              thumbnail_url: item.thumbnailUrl ?? null,
            }))
            .filter((item: ProgramRow) => Number.isFinite(item.id) && item.id > 0)
            .filter((item: ProgramRow) => (query ? item.title.toLowerCase().includes(query) : true));
          setProgramsFromApi(mapped);
          setFetchError(false);
        })
        .catch(() => {
          if (!cancelled) {
            setProgramsFromApi([]);
            setFetchError(true);
          }
        });
    } else {
      const params = new URLSearchParams();
      params.set('limit', '200');
      const hasSearch = Boolean(debouncedSearch.trim());
      const lessonQuickActive = quickLesson !== 'all';
      const forceTrioForApi = isFunctionalPreset && hasSearch && !lessonQuickActive;
      const effectiveFunctions = forceTrioForApi && selectedFunctionTypes.length === 0
        ? [FUNCTION_TYPES[4]]
        : selectedFunctionTypes;
      const effectiveTheme = forceTrioForApi && !mainTheme ? MAIN_THEMES[1] : mainTheme;

      if (effectiveFunctions.length === 1) params.set('function_type', effectiveFunctions[0]);
      else if (effectiveFunctions.length > 1) params.set('function_types', effectiveFunctions.join(','));
      if (effectiveTheme) params.set('main_theme', effectiveTheme);
      if (selectedEquipment.length === 1) params.set('equipment', selectedEquipment[0]);
      else if (selectedEquipment.length > 1) params.set('equipment', selectedEquipment.join(','));
      if (isFunctionalPreset) params.set('only_curriculum', '1');
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (quickLesson === 'featured') params.set('featuredLesson', '1');
      else if (quickLesson !== 'all') params.set('packageKey', quickLesson);

      fetch(`/api/spokedu-pro/programs?${params}`)
        .then((res) => res.json().then((json) => ({ res, json })))
        .then(({ res, json }) => {
          if (cancelled) return;
          if (!res.ok || !Array.isArray(json?.data)) {
            setProgramsFromApi([]);
            setFetchError(true);
            return;
          }
          setProgramsFromApi(json.data);
          setFetchError(false);
        })
        .catch(() => {
          if (!cancelled) {
            setProgramsFromApi([]);
            setFetchError(true);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [
    selectedFunctionTypes,
    mainTheme,
    selectedEquipment,
    debouncedSearch,
    isScreenplayPreset,
    isFunctionalPreset,
    refreshToken,
    screenplaysRefreshToken,
    quickLesson,
  ]);

  const isLoading = programsFromApi === null;
  const hasManualFilters =
    selectedFunctionTypes.length > 0 ||
    mainTheme !== '' ||
    selectedEquipment.length > 0 ||
    search.trim() !== '' ||
    quickLesson !== 'all';

  const visiblePrograms = useMemo(() => {
    const source = programsFromApi ?? [];
    if (isFunctionalPreset && !search.trim() && typeof functionalCap === 'number' && functionalCap > 0) {
      return source.slice(0, functionalCap);
    }
    return source;
  }, [isFunctionalPreset, search, programsFromApi, functionalCap]);

  const displayFilteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    const getDisplayTitle = (row: ProgramRow) => {
      if (isScreenplayPreset) {
        const screenplayDetail = programDetails[screenplayDetailStorageKey(row.id)];
        return stripMonthWeekPrefix(screenplayDetail?.title ?? row.title ?? '').trim();
      }
      const detail = programDetails[String(row.id)];
      return stripMonthWeekPrefix(detail?.title ?? row.title ?? '').trim();
    };

    const filtered = query
      ? visiblePrograms.filter((row) => getDisplayTitle(row).toLowerCase().includes(query))
      : visiblePrograms;

    const seen = new Set<string>();
    const deduped: ProgramRow[] = [];
    for (const row of filtered) {
      const normalizedTitle = getDisplayTitle(row).trim();
      const key = normalizedTitle.toLowerCase() || `__id:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(row);
    }

    return [...deduped].sort((a, b) =>
      getDisplayTitle(a).localeCompare(getDisplayTitle(b), 'ko-KR', { sensitivity: 'base' })
    );
  }, [visiblePrograms, search, programDetails, isScreenplayPreset]);

  const clearFilters = () => {
    setSelectedFunctionTypes([]);
    setMainTheme('');
    setSelectedEquipment([]);
    setSearch('');
    setDebouncedSearch('');
    setQuickLesson('all');
    onClearLibraryLessonNav?.();
    setProgramsFromApi(null);
  };

  const title = selectionMode
    ? '수업안 선택'
    : isScreenplayPreset
      ? 'SPOMOVE 반응훈련'
      : '수업안 라이브러리';

  return (
    <section className={compact ? 'space-y-4 px-3 py-4 pb-8' : 'space-y-8 px-4 py-12 pb-32 sm:px-8 lg:px-16'}>
      <header className={compact ? 'space-y-3' : 'space-y-6'}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={compact ? 'text-xl font-black tracking-tight text-white' : 'text-3xl font-black tracking-tight text-white md:text-4xl'}>
            {tr(title)}
          </h2>
          <span className="text-sm font-medium tabular-nums text-slate-400">
            {displayFilteredPrograms.length}{tr('개')}
          </span>
        </div>

        {isScreenplayPreset && isEditMode ? (
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
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    const hint = Array.isArray(data.errors) && data.errors[0]?.message ? ` ${data.errors[0].message}` : '';
                    toast.error(String(data.error ?? `HTTP ${res.status}`) + hint);
                    return;
                  }
                  const built = typeof data.built === 'number' ? data.built : null;
                  const failed = typeof data.failed === 'number' ? data.failed : 0;
                  if (failed > 0) {
                    const first = Array.isArray(data.errors) && data.errors[0]?.message ? data.errors[0].message : '';
                    toast.error(
                      tr(
                        `동기화 실패 ${failed}건(생성 ${data.inserted ?? 0}, 수정 ${data.updated ?? 0}${built != null ? `, 빌드 ${built}` : ''})${first ? `: ${first}` : ''}`
                      )
                    );
                    return;
                  }
                  toast.success(
                    tr(`동기화 완료 (추가 ${data.inserted ?? 0}, 수정 ${data.updated ?? 0}${built != null ? `, 빌드 ${built}` : ''})`)
                  );
                  window.dispatchEvent(new CustomEvent('spokedu-pro-screenplays-synced'));
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : tr('동기화 실패'));
                } finally {
                  setSyncingScreenplays(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-600/90 px-3 py-2 text-xs font-black text-white hover:bg-amber-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingScreenplays ? 'animate-spin' : ''}`} />
              {syncingScreenplays ? tr('동기화 중') : tr('SPOMOVE 콘텐츠 DB 동기화')}
            </button>
            <p className="max-w-xl text-[11px] leading-snug text-slate-400">
              {tr('Memory Game MODES를 DB와 동기화합니다. 관리자 모드에서만 실행됩니다.')}
            </p>
          </div>
        ) : null}

        <div className={compact ? 'space-y-3 rounded-xl border border-slate-700/60 bg-slate-950/25 p-3' : 'space-y-3 rounded-2xl border border-slate-800/40 bg-slate-950/15 p-3 sm:p-4'}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearch(value);
                  if (!value.trim()) {
                    setDebouncedSearch('');
                    setProgramsFromApi(null);
                  }
                }}
                placeholder={tr(isScreenplayPreset ? 'SPOMOVE 제목 검색' : '수업안명 검색')}
                className="w-full rounded-xl border border-slate-600/60 bg-slate-900/60 py-2.5 pl-10 pr-10 text-sm text-white outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setProgramsFromApi(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                  aria-label={tr('지우기')}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {hasManualFilters && isEditMode ? (
              <SubscriberButton tone="slate" size="sm" onClick={clearFilters}>
                {tr('필터 초기화')}
              </SubscriberButton>
            ) : null}
          </div>

          {!isScreenplayPreset ? (
            <>
              {!isEditMode && hasManualFilters && !subscriberFiltersOpen ? (
                <button type="button" onClick={clearFilters} className="text-left text-[11px] font-bold text-emerald-400/90 underline-offset-2 hover:underline">
                  {tr('필터 초기화')}
                </button>
              ) : null}

              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-400">{tr('빠른 찾기')}</p>
                    {quickLesson !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickLesson('all');
                          onClearLibraryLessonNav?.();
                          setProgramsFromApi(null);
                        }}
                        className="text-[11px] font-bold text-emerald-400/95 underline-offset-2 hover:text-emerald-300 hover:underline"
                      >
                        {tr('전체로')}
                      </button>
                    ) : null}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
                    {(['all', 'featured', ...LESSON_PACKAGE_KEY_ORDER] as Array<'all' | 'featured' | LessonPackageKeyId>).map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={quickLesson === key}
                        onClick={() => {
                          setQuickLesson(key);
                          if (key === 'all') onClearLibraryLessonNav?.();
                          setProgramsFromApi(null);
                        }}
                        className={lessonQuickFilterChipClass(quickLesson === key)}
                      >
                        {tr(displayLabel(lessonPackageLabel(key)))}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-400">{tr('활동 테마')}</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
                    {MAIN_THEMES.map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => setMainTheme(mainTheme === theme ? '' : theme)}
                        className={programFilterChipClass(mainTheme === theme)}
                      >
                        {tr(displayLabel(theme))}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-400">{tr('신체 기능')}</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
                    {FUNCTION_TYPES.map((functionType) => {
                      const active = selectedFunctionTypes.includes(functionType);
                      return (
                        <button
                          key={functionType}
                          type="button"
                          onClick={() =>
                            setSelectedFunctionTypes((prev) =>
                              active ? prev.filter((item) => item !== functionType) : [...prev, functionType]
                            )
                          }
                          className={programFilterChipClass(active)}
                        >
                          {tr(displayLabel(functionType))}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!isEditMode ? (
                  <button
                    type="button"
                    onClick={() => setSubscriberFiltersOpen((open) => !open)}
                    aria-expanded={subscriberFiltersOpen}
                    className="w-full rounded-xl border border-slate-600/55 bg-slate-900/50 py-2.5 text-center text-sm font-semibold text-slate-100 hover:border-emerald-500/40 hover:bg-slate-800/70"
                  >
                    {subscriberFiltersOpen ? tr('필터 접기') : tr('교구 필터 더보기')}
                  </button>
                ) : null}

                {(isEditMode || subscriberFiltersOpen) ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-400">{tr('사용 교구')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EQUIPMENT_CATALOG.map((equipment) => {
                        const active = selectedEquipment.includes(equipment);
                        return (
                          <button
                            key={equipment}
                            type="button"
                            onClick={() =>
                              setSelectedEquipment((prev) =>
                                active ? prev.filter((item) => item !== equipment) : [...prev, equipment]
                              )
                            }
                            className={programFilterChipClass(active)}
                          >
                            {tr(displayLabel(equipment))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {hasManualFilters && subscriberFiltersOpen ? (
                  <SubscriberButton tone="slate" size="sm" wide onClick={clearFilters}>
                    {tr('필터 초기화')}
                  </SubscriberButton>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'}>
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonCard key={index} compact={compact} />
          ))}
        </div>
      ) : null}

      {!isLoading && fetchError ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center">
          <p className="text-sm text-slate-400">{tr('목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.')}</p>
        </div>
      ) : null}

      {!isLoading && !fetchError && displayFilteredPrograms.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
          <Search className="h-12 w-12 text-slate-600" />
          <p className="text-lg font-black text-white">{tr('검색 결과가 없습니다')}</p>
          <SubscriberButton tone="emerald" onClick={clearFilters}>
            {tr('필터 초기화')}
          </SubscriberButton>
        </div>
      ) : null}

      {!isLoading && displayFilteredPrograms.length > 0 ? (
        <div className={compact ? 'grid grid-cols-2 gap-3' : isEditMode ? 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4' : 'grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'}>
          {displayFilteredPrograms.map((row) => {
            const screenplayDetail = isScreenplayPreset ? programDetails[screenplayDetailStorageKey(row.id)] : undefined;
            const detail = programDetails[String(row.id)];
            const videoUrl = isScreenplayPreset ? screenplayDetail?.videoUrl ?? row.video_url : detail?.videoUrl ?? row.video_url;
            const thumbnailUrl = row.thumbnail_url ?? (videoUrl ? getYouTubeThumbnailUrl(videoUrl) : null);
            const lessonDetail = !isScreenplayPreset ? row.lesson_detail : undefined;
            const summaryText = typeof lessonDetail?.summary === 'string' && lessonDetail.summary.trim() ? lessonDetail.summary.trim() : '';
            const activitySnippet = !isScreenplayPreset
              ? (() => {
                  const method = detail?.activityMethod?.trim();
                  return method ? method.split('\n').find((line) => line.trim())?.trim() ?? '' : '';
                })()
              : '';
            const subtitle = !isScreenplayPreset && !isEditMode ? activitySnippet || '' : summaryText || activitySnippet || '';
            const packageLabelChips = normalizePackageKeysFromDb(lessonDetail?.packageKeys)
              .filter((key): key is LessonPackageKeyId => isLessonPackageKeyId(key))
              .map((key) => LESSON_PACKAGE_KEY_LABELS[key]);
            const metaSlots: ProgramCardMetaSlot[] = isScreenplayPreset
              ? (() => {
                  const modeId = String(row.mode_id ?? row.function_type ?? '');
                  const entry = screenplayTagMapping.modeIdMap[modeId];
                  const domainTag = entry?.domainLabel ?? '인지 영역';
                  const taskTag = entry?.taskLabel ?? (modeId || '과제 유형');
                  const levelTag = getScreenplayLevelTag(row.preset_ref, screenplayTagMapping.levelLabelTemplate);
                  return [
                    { label: '인지 영역', value: domainTag },
                    { label: '과제 유형', value: taskTag },
                    { label: '레벨', value: levelTag || DISPLAY_DASH },
                  ];
                })()
              : buildProgramBankMetaSlots(row, detail);

            return (
              <ProgramCard
                key={`${isScreenplayPreset ? 'screenplay' : 'program'}-${row.id}`}
                title={stripMonthWeekPrefix(isScreenplayPreset ? screenplayDetail?.title ?? row.title : detail?.title ?? row.title)}
                metaSlots={metaSlots}
                thumbnailUrl={thumbnailUrl}
                compact={compact}
                featuredBadgeLabel={lessonDetail?.isFeaturedLesson ? (isEditMode ? '추천 수업안' : '추천') : null}
                packageLabelChips={packageLabelChips.map(displayLabel)}
                subtitle={subtitle || null}
                streamlined={!isEditMode && !isScreenplayPreset}
                onClick={() => {
                  if (selectionMode) {
                    onSelectProgram!(row.id, row);
                    return;
                  }
                  if (isScreenplayPreset) {
                    onOpenDetail(row.id, { screenplay: true, row });
                    return;
                  }
                  onOpenDetail(row.id, { row });
                }}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
