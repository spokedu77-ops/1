'use client';

import { useTranslator } from '@/app/providers/I18nProvider';
import { useState, useMemo, memo, useEffect, useRef } from 'react';
import { Search, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  FUNCTION_TYPES,
  MAIN_THEMES,
  EQUIPMENT_CATALOG,
  extractEquipmentDisplayTags,
} from '@/app/lib/spokedu-pro/programClassification';
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
import {
  LESSON_PACKAGE_KEY_LABELS,
  LESSON_PACKAGE_KEY_ORDER,
  isLessonPackageKeyId,
  normalizePackageKeysFromDb,
  type LessonPackageKeyId,
} from '@/app/lib/spokedu-pro/lessonPackageKeys';

type ProgramLessonDetailLite = {
  isFeaturedLesson?: boolean;
  summary?: string | null;
  packageKeys?: unknown;
};

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

function buildProgramBankMetaSlots(p: ProgramRow, detail: ProgramDetail | undefined): ProgramCardMetaSlot[] {
  const theme = String(detail?.mainTheme ?? p.main_theme ?? '').trim();
  const fnFromDetail = Array.isArray(detail?.functionTypes) ? detail.functionTypes.filter(Boolean) : [];
  const fnFromRow =
    Array.isArray(p.function_types) && p.function_types.length > 0
      ? p.function_types.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
      : p.function_type
        ? [p.function_type]
        : [];
  const fnFirst = (fnFromDetail[0] ?? fnFromRow[0] ?? '').trim();
  const eqFirst = extractEquipmentDisplayTags(detail?.equipment ?? p.equipment ?? '')[0]?.trim() ?? '';
  const dash = '—';
  return [
    { label: '활동 테마', value: theme || dash },
    { label: '신체 기능', value: fnFirst || dash },
    { label: '활용 교구', value: eqFirst || dash },
  ];
}

/** 스트리밍 앱형: 포스터(16:9) + 하단 제목·메타 3칸 (넷플릭스/디즈니+류 레이아웃) */
const ProgramCard = memo(function ProgramCard({
  title,
  thumbnailUrl,
  metaSlots,
  onClick,
  compact: compactCard = false,
  featuredBadgeLabel,
  packageLabelChips,
  subtitle,
  subtleBadges = false,
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
  /** 구독자 화면: 대표·패키지 뱃지를 포스터 위 보조 수준으로만 표시 */
  subtleBadges?: boolean;
  /** 구독자: 메타 3칸 대신 태그 1~2개 + 수업 보기 CTA */
  streamlined?: boolean;
}) {
  const tr = useTranslator();
  const slots = metaSlots.slice(0, 3);
  const chips = (packageLabelChips ?? []).filter(Boolean).slice(0, 2);
  const tagLine =
    streamlined && slots.length > 0
      ? [
          slots[0]?.value && slots[0].value !== '—' ? String(slots[0].value) : '',
          slots[1]?.value && slots[1].value !== '—' ? String(slots[1].value) : '',
        ]
          .filter(Boolean)
          .slice(0, 2)
      : [];
  return (
    <button
      type="button"
      className={[
        'group flex w-full flex-col overflow-hidden rounded-xl border text-left transition-all duration-300',
        'border-slate-700/60 bg-slate-900/50 shadow-lg shadow-black/25',
        'hover:-translate-y-1 hover:border-slate-500/70 hover:shadow-xl hover:shadow-black/35',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45',
      ].join(' ')}
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
            <span className="text-4xl text-white/40">▶</span>
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10"
          aria-hidden
        />
        {(featuredBadgeLabel || chips.length > 0) && (
          <div
            className={
              subtleBadges
                ? 'pointer-events-none absolute left-1.5 top-1.5 z-[1] flex max-w-[calc(100%-0.75rem)] flex-wrap gap-0.5 opacity-90'
                : 'pointer-events-none absolute left-2 top-2 z-[1] flex max-w-[calc(100%-1rem)] flex-wrap gap-1'
            }
          >
            {featuredBadgeLabel ? (
              <span
                className={
                  subtleBadges
                    ? 'rounded border border-slate-600/70 bg-black/55 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-slate-200'
                    : 'rounded-full border border-amber-400/45 bg-amber-950/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-100 shadow-sm'
                }
              >
                {tr(featuredBadgeLabel)}
              </span>
            ) : null}
            {chips.map((c) => (
              <span
                key={c}
                className={
                  subtleBadges
                    ? 'truncate rounded border border-slate-600/60 bg-black/50 px-1 py-px text-[8px] font-semibold text-slate-300'
                    : 'truncate rounded-full border border-sky-500/35 bg-slate-950/85 px-2 py-0.5 text-[9px] font-bold text-sky-100/95'
                }
                title={tr(c)}
              >
                {tr(c)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className={
          compactCard
            ? 'flex min-h-0 flex-1 flex-col border-t border-slate-800/90 bg-slate-950 px-2.5 py-2'
            : 'flex min-h-0 flex-1 flex-col border-t border-slate-800/90 bg-slate-950 px-3 py-2.5 sm:px-3.5 sm:py-3'
        }
      >
        <h4
          className={
            compactCard
              ? 'line-clamp-2 text-left text-[13px] font-bold leading-snug tracking-tight text-white'
              : 'line-clamp-2 text-left text-[15px] font-bold leading-snug tracking-tight text-white sm:text-base'
          }
        >
          {title}
        </h4>
        {subtitle?.trim() ? (
          <p
            className={
              streamlined
                ? compactCard
                  ? 'mt-1 line-clamp-1 text-left text-[11px] leading-snug text-slate-400'
                  : 'mt-1 line-clamp-1 text-left text-xs leading-snug text-slate-400 sm:text-[13px]'
                : compactCard
                  ? 'mt-1 line-clamp-2 text-left text-[11px] leading-snug text-slate-400'
                  : 'mt-1 line-clamp-2 text-left text-xs leading-snug text-slate-400 sm:text-[13px]'
            }
          >
            {tr(subtitle.trim())}
          </p>
        ) : null}
        {streamlined ? (
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-800/80 pt-2">
            {tagLine.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="truncate rounded-md border border-slate-600/50 bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200"
              >
                {tr(t)}
              </span>
            ))}
            <span className="ml-auto text-[10px] font-black uppercase tracking-wide text-emerald-400/95">
              {tr('수업 보기')}
            </span>
          </div>
        ) : (
          <div
            className={
              compactCard
                ? 'mt-2 grid grid-cols-3 gap-1.5 border-t border-slate-800/80 pt-2'
                : 'mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-2.5'
            }
          >
            {slots.map((slot, i) => (
              <div key={`${slot.label}-${i}`} className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                  {tr(slot.label)}
                </p>
                <p
                  className={
                    compactCard
                      ? 'mt-0.5 truncate text-[10px] font-semibold text-slate-200'
                      : 'mt-0.5 truncate text-[11px] font-semibold text-slate-200 sm:text-xs'
                  }
                  title={slot.value === '—' ? undefined : tr(slot.value)}
                >
                  {slot.value === '—' ? '—' : tr(slot.value)}
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
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 animate-pulse">
      <div className="aspect-video bg-slate-800" />
      <div className={compact ? 'space-y-2 p-2' : 'space-y-2 p-3'}>
        <div className="h-4 w-[72%] rounded bg-slate-800" />
        <div
          className={
            compact
              ? 'grid grid-cols-3 gap-1.5 border-t border-slate-800/80 pt-2'
              : 'grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-2'
          }
        >
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
    'shrink-0 rounded-full px-3 py-1.5 text-xs sm:py-2 font-semibold transition-colors border',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
    active
      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100 shadow-sm shadow-emerald-900/20'
      : 'border-slate-600/45 bg-slate-950/35 text-slate-400 hover:border-slate-500 hover:bg-slate-800/55 hover:text-slate-100',
  ].join(' ');
}

/** 수업안/패키지 빠른 필터: 기본 필터보다 한 톤 낮춰 한 줄에 많이 있어도 부담 적게 */
function lessonQuickFilterChipClass(active: boolean): string {
  return [
    'shrink-0 rounded-full px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs font-medium transition-colors border',
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
  /** 대시보드 등에서 라이브러리로 들어올 때 대표/패키지 필터 */
  libraryLessonNav?: { featuredLesson?: boolean; packageKey?: string } | null;
  /** 빠른 필터「전체」·필터 초기화 시 상위 nav 제거 */
  onClearLibraryLessonNav?: () => void;
  /** 관리자(/admin/spokedu-pro) 편집 모드에서만 스크린플레이 동기화 UI 노출 */
  isEditMode?: boolean;
  /** 스크린플레이 목록 강제 재조회 */
  screenplaysRefreshToken?: number;
}) {
  const tr = useTranslator();
  const [syncingScreenplays, setSyncingScreenplays] = useState(false);
  const [selectedFunctionTypes, setSelectedFunctionTypes] = useState<string[]>([]);
  const [mainTheme, setMainTheme] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [isReady, setIsReady] = useState(false);
  const [programsFromApi, setProgramsFromApi] = useState<ProgramRow[] | null>(null);
  const [fetchError, setFetchError] = useState(false);
  /** 전체 | 대표 수업안 | 패키지 키 */
  const [quickLesson, setQuickLesson] = useState<'all' | 'featured' | LessonPackageKeyId>('all');
  const [subscriberFiltersOpen, setSubscriberFiltersOpen] = useState(false);
  const isScreenplayPreset = libraryMode === 'screenplay' || initialPreset?.themeKey === 'cognitive';
  const isFunctionalPreset = initialPreset?.themeKey === 'co-op';

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
      setSelectedFunctionTypes([]);
      setSelectedEquipment([]);
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
      const hasSearch = Boolean(debouncedSearch.trim());
      const lessonQuickActive = quickLesson !== 'all';
      // 펑셔널 무브: 검색어가 있을 때만 기본 3종(협응력·협동형·소그룹)으로 API 풀을 제한한다.
      // (검색만 켜졌을 때 q만으로 찌꺼기 행이 잡히던 문제 방지)
      // 브라우징(검색 없음)에서는 서버에 기본 3종을 보내지 않는다 — 저장한 태그가 기본과 달라도 전체 본편이 목록에 남는다.
      // 대표/패키지 빠른 필터 시에는 trio 제한을 끄고 서버 lesson 필터만 사용한다.
      const forceTrioForApi = isFunctionalPreset && hasSearch && !lessonQuickActive;
      const effFunc =
        forceTrioForApi && selectedFunctionTypes.length === 0 ? ['협응력'] : selectedFunctionTypes;
      const effMainTheme = forceTrioForApi && !mainTheme ? '협동형' : mainTheme;
      if (effFunc.length === 1) params.set('function_type', effFunc[0]);
      else if (effFunc.length > 1) params.set('function_types', effFunc.join(','));
      if (effMainTheme) params.set('main_theme', effMainTheme);
      if (isFunctionalPreset && forceTrioForApi) params.set('group_size', '소그룹');
      if (selectedEquipment.length === 1) params.set('equipment', selectedEquipment[0]);
      else if (selectedEquipment.length > 1) params.set('equipment', selectedEquipment.join(','));
      // 펑셔널 무브: 커리큘럼 본편에 없는 spokedu 행은 검색에도 나오지 않게(예: 후프 낚시 잔상)
      if (isFunctionalPreset) params.set('only_curriculum', '1');
      if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
      if (quickLesson === 'featured') params.set('featuredLesson', '1');
      else if (quickLesson !== 'all') params.set('packageKey', quickLesson);
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
  const filteredPrograms = programsFromApi ?? [];
  const hasManualFilters =
    selectedFunctionTypes.length > 0 ||
    mainTheme !== '' ||
    selectedEquipment.length > 0 ||
    search.trim() !== '' ||
    quickLesson !== 'all';
  const visiblePrograms = useMemo(() => {
    // 펑셔널 무브: 검색어가 비어 있을 때만 상한(예: 144). 검색 중에는 같은 필터 풀 안에서만 넓힘.
    if (
      isFunctionalPreset &&
      !search.trim() &&
      typeof functionalCap === 'number' &&
      functionalCap > 0
    ) {
      return filteredPrograms.slice(0, functionalCap);
    }
    return filteredPrograms;
  }, [isFunctionalPreset, search, filteredPrograms, functionalCap]);

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

    // 같은 표시 제목(월/주 접두 제거 후)은 카드 1개만 — 검색 여부와 관계없이 동일.
    // 빈 제목은 id로만 구분해 실수로 합쳐지지 않게 한다.
    const seen = new Set<string>();
    const deduped: ProgramRow[] = [];
    for (const p of filtered) {
      const norm = getDisplayTitle(p).trim();
      const key = norm.toLowerCase() || `__id:${p.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(p);
    }
    const out = deduped;

    return [...out].sort((a, b) =>
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
              {syncingScreenplays ? tr('동기화 중…') : tr('SPOMOVE 콘텐츠 DB 동기화')}
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
                : isEditMode
                  ? 'rounded-2xl border border-slate-700/50 bg-slate-950/20 p-4 sm:p-5 space-y-4'
                  : 'rounded-2xl border border-slate-800/40 bg-slate-950/15 p-3 sm:p-4 space-y-3'
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
              <div className="relative flex-1 min-w-0 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearch(v);
                    // 비우는 순간: debouncedSearch 즉시 동기 + 목록 비움 → 스켈레톤 후 기본 목록만 다시 채움(찌꺼기 잔상 방지)
                    if (!v.trim()) {
                      setDebouncedSearch('');
                      setProgramsFromApi(null);
                    }
                  }}
                  placeholder={tr('프로그램명 검색...')}
                  className="w-full bg-slate-900/60 border border-slate-600/60 rounded-xl text-white text-sm pl-10 pr-10 py-2.5 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/30"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setDebouncedSearch('');
                      setProgramsFromApi(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 rounded-md hover:bg-slate-800"
                    aria-label={tr('지우기')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
              {hasActiveFilters && isEditMode ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-600/70 text-slate-300 bg-slate-900/40 hover:bg-slate-800 hover:text-white"
                >
                  {tr('필터 초기화')}
                </button>
              ) : null}
            </div>

            {!isEditMode && hasActiveFilters && !subscriberFiltersOpen ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-left text-[11px] font-bold text-emerald-400/90 underline-offset-2 hover:underline"
              >
                {tr('필터 초기화')}
              </button>
            ) : null}

            {isEditMode ? (
              <div className={compact ? 'space-y-2.5' : 'space-y-4'}>
                <div className="min-w-0 rounded-lg border border-slate-800/50 bg-slate-950/20 p-2 sm:p-2.5 opacity-95">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-0.5">
                    <p className="text-[10px] font-medium tracking-wide text-slate-500">{tr('보조 필터')}</p>
                    {quickLesson !== 'all' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickLesson('all');
                          onClearLibraryLessonNav?.();
                          setProgramsFromApi(null);
                        }}
                        className="shrink-0 text-[11px] font-bold text-emerald-400/95 underline-offset-2 hover:text-emerald-300 hover:underline"
                      >
                        {tr('전체로')}
                      </button>
                    ) : null}
                  </div>
                  {quickLesson !== 'all' ? (
                    <p className="mb-2 px-0.5 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-500">{tr('선택')}</span>
                      {' · '}
                      <span className="text-slate-200">
                        {quickLesson === 'featured'
                          ? tr('대표 수업안')
                          : tr(LESSON_PACKAGE_KEY_LABELS[quickLesson])}
                      </span>
                    </p>
                  ) : null}
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] sm:pb-1">
                    <button
                      type="button"
                      aria-pressed={quickLesson === 'all'}
                      onClick={() => {
                        setQuickLesson('all');
                        onClearLibraryLessonNav?.();
                        setProgramsFromApi(null);
                      }}
                      className={lessonQuickFilterChipClass(quickLesson === 'all')}
                    >
                      {tr('전체')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={quickLesson === 'featured'}
                      onClick={() => {
                        setQuickLesson('featured');
                        setProgramsFromApi(null);
                      }}
                      className={lessonQuickFilterChipClass(quickLesson === 'featured')}
                    >
                      {tr('대표 수업안')}
                    </button>
                    {LESSON_PACKAGE_KEY_ORDER.map((key) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={quickLesson === key}
                        onClick={() => {
                          setQuickLesson(key);
                          setProgramsFromApi(null);
                        }}
                        className={lessonQuickFilterChipClass(quickLesson === key)}
                      >
                        {tr(LESSON_PACKAGE_KEY_LABELS[key])}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-slate-700/50" aria-hidden />

                <div className="space-y-1.5 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500">{tr('활동 테마')}</p>
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
                  <p className="text-[11px] font-semibold text-slate-500">
                    {tr('신체 기능 (중복 선택 가능)')}
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 custom-scroll">
                    {FUNCTION_TYPES.map((ft) => {
                      const on = selectedFunctionTypes.includes(ft);
                      return (
                        <button
                          key={ft}
                          type="button"
                          onClick={() =>
                            setSelectedFunctionTypes((prev) =>
                              on ? prev.filter((x) => x !== ft) : [...prev, ft]
                            )
                          }
                          className={programFilterChipClass(on)}
                        >
                          {tr(ft)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-slate-700/50" aria-hidden />

                <div className="space-y-1.5 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {tr('활용 교구 (중복 선택 가능)')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT_CATALOG.map((eq) => {
                      const on = selectedEquipment.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() =>
                            setSelectedEquipment((prev) =>
                              on ? prev.filter((x) => x !== eq) : [...prev, eq]
                            )
                          }
                          className={programFilterChipClass(on)}
                        >
                          {tr(eq)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-medium text-slate-400">{tr('활동 테마')}</p>
                  <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

                <div className="space-y-1.5 min-w-0">
                  <p className="text-xs font-medium text-slate-400">{tr('신체 기능')}</p>
                  <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {FUNCTION_TYPES.map((ft) => {
                      const on = selectedFunctionTypes.includes(ft);
                      return (
                        <button
                          key={ft}
                          type="button"
                          onClick={() =>
                            setSelectedFunctionTypes((prev) =>
                              on ? prev.filter((x) => x !== ft) : [...prev, ft]
                            )
                          }
                          className={programFilterChipClass(on)}
                        >
                          {tr(ft)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSubscriberFiltersOpen((o) => !o)}
                  aria-expanded={subscriberFiltersOpen}
                  className="w-full rounded-xl border border-slate-600/55 bg-slate-900/50 py-2.5 text-center text-sm font-semibold text-slate-100 hover:border-emerald-500/40 hover:bg-slate-800/70"
                >
                  {subscriberFiltersOpen ? tr('필터 접기') : tr('필터 더보기')}
                </button>

                {subscriberFiltersOpen ? (
                  <div className="space-y-4 rounded-xl border border-slate-800/50 bg-slate-950/30 p-3 sm:p-4">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-400">{tr('빠른 찾기')}</p>
                        {quickLesson !== 'all' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setQuickLesson('all');
                              onClearLibraryLessonNav?.();
                              setProgramsFromApi(null);
                            }}
                            className="shrink-0 text-[11px] font-bold text-emerald-400/95 underline-offset-2 hover:text-emerald-300 hover:underline"
                          >
                            {tr('전체로')}
                          </button>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          aria-pressed={quickLesson === 'all'}
                          onClick={() => {
                            setQuickLesson('all');
                            onClearLibraryLessonNav?.();
                            setProgramsFromApi(null);
                          }}
                          className={lessonQuickFilterChipClass(quickLesson === 'all')}
                        >
                          {tr('전체')}
                        </button>
                        <button
                          type="button"
                          aria-pressed={quickLesson === 'featured'}
                          onClick={() => {
                            setQuickLesson('featured');
                            setProgramsFromApi(null);
                          }}
                          className={lessonQuickFilterChipClass(quickLesson === 'featured')}
                        >
                          {tr('대표 수업안')}
                        </button>
                        {LESSON_PACKAGE_KEY_ORDER.map((key) => (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={quickLesson === key}
                            onClick={() => {
                              setQuickLesson(key);
                              setProgramsFromApi(null);
                            }}
                            className={lessonQuickFilterChipClass(quickLesson === key)}
                          >
                            {tr(LESSON_PACKAGE_KEY_LABELS[key])}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">{tr('활용 교구 (중복 선택 가능)')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {EQUIPMENT_CATALOG.map((eq) => {
                          const on = selectedEquipment.includes(eq);
                          return (
                            <button
                              key={eq}
                              type="button"
                              onClick={() =>
                                setSelectedEquipment((prev) =>
                                  on ? prev.filter((x) => x !== eq) : [...prev, eq]
                                )
                              }
                              className={programFilterChipClass(on)}
                            >
                              {tr(eq)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {hasActiveFilters ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="w-full px-3 py-2 rounded-lg text-xs font-bold border border-slate-600/70 text-slate-300 bg-slate-900/40 hover:bg-slate-800 hover:text-white"
                      >
                        {tr('필터 초기화')}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearch(v);
                  if (!v.trim()) {
                    setDebouncedSearch('');
                    setProgramsFromApi(null);
                  }
                }}
                placeholder={tr('프로그램명 검색...')}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl text-white text-sm pl-10 pr-10 py-2.5 focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setProgramsFromApi(null);
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
              : 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
          }
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} compact={compact} />
          ))}
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
              : isEditMode
                ? 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
                : 'grid grid-cols-1 gap-x-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
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
                const ld = !isScreenplayPreset ? p.lesson_detail : undefined;
                const summaryText =
                  typeof ld?.summary === 'string' && ld.summary.trim() ? ld.summary.trim() : '';
                const activitySnippet = !isScreenplayPreset
                  ? (() => {
                      const m = detail?.activityMethod?.trim();
                      return m ? m.split('\n').find((line) => line.trim())?.trim() ?? '' : '';
                    })()
                  : '';
                /** 구독자 카드: lesson_detail 요약으로 본체를 덮지 않음 */
                const subtitle =
                  !isScreenplayPreset && !isEditMode
                    ? activitySnippet || ''
                    : summaryText || activitySnippet || '';
                const pkgKeys = normalizePackageKeysFromDb(ld?.packageKeys);
                const packageLabelChips = pkgKeys
                  .filter((k): k is LessonPackageKeyId => isLessonPackageKeyId(k))
                  .map((k) => LESSON_PACKAGE_KEY_LABELS[k]);
                const metaSlots: ProgramCardMetaSlot[] = isScreenplayPreset
                  ? (() => {
                      const modeId = String(p.mode_id ?? p.function_type ?? '');
                      const entry = screenplayTagMapping.modeIdMap[modeId];
                      const domainTag = entry?.domainLabel ?? tr('인지영역');
                      const taskTag = entry?.taskLabel ?? (modeId || tr('과제유형'));
                      const levelTag = getScreenplayLevelTag(p.preset_ref, screenplayTagMapping.levelLabelTemplate);
                      return [
                        { label: '인지영역', value: domainTag },
                        { label: '과제유형', value: taskTag },
                        { label: '레벨', value: levelTag || '—' },
                      ];
                    })()
                  : buildProgramBankMetaSlots(p, detail);
                return (
                  <ProgramCard
                    key={`${isScreenplayPreset ? 'screenplay' : 'program'}-${p.id}`}
                    title={stripMonthWeekPrefix(
                      isScreenplayPreset ? (screenplayDetail?.title ?? p.title) : (detail?.title ?? p.title)
                    )}
                    metaSlots={metaSlots}
                    thumbnailUrl={thumbnailUrl}
                    compact={compact}
                    featuredBadgeLabel={
                      ld?.isFeaturedLesson ? (isEditMode ? '대표 수업안' : '대표') : null
                    }
                    packageLabelChips={packageLabelChips}
                    subtitle={subtitle || null}
                    subtleBadges={!isEditMode}
                    streamlined={!isEditMode && !isScreenplayPreset}
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
