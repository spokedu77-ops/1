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
}: {
  title: string;
  thumbnailUrl?: string | null;
  metaSlots: ProgramCardMetaSlot[];
  onClick: () => void;
  compact?: boolean;
}) {
  const tr = useTranslator();
  const slots = metaSlots.slice(0, 3);
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
  const [selectedFunctionTypes, setSelectedFunctionTypes] = useState<string[]>([]);
  const [mainTheme, setMainTheme] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
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
      // 펑셔널 무브(co-op): 검색 시에도 기본 3종(협응력·협동형·소그룹)을 유지한다.
      // 예전에는 검색만 켜질 때 이 조건이 빠져 DB 전체에서 q만 걸려, 목록 144밖 '찌꺼기' 행만 검색에 잡히는 문제가 있었다.
      const effFunc =
        isFunctionalPreset && selectedFunctionTypes.length === 0 ? ['협응력'] : selectedFunctionTypes;
      const effMainTheme = isFunctionalPreset && !mainTheme ? '협동형' : mainTheme;
      if (effFunc.length === 1) params.set('function_type', effFunc[0]);
      else if (effFunc.length > 1) params.set('function_types', effFunc.join(','));
      if (effMainTheme) params.set('main_theme', effMainTheme);
      if (isFunctionalPreset) params.set('group_size', '소그룹');
      if (selectedEquipment.length === 1) params.set('equipment', selectedEquipment[0]);
      else if (selectedEquipment.length > 1) params.set('equipment', selectedEquipment.join(','));
      // 펑셔널 무브: 커리큘럼 본편에 없는 spokedu 행은 검색에도 나오지 않게(예: 후프 낚시 잔상)
      if (isFunctionalPreset) params.set('only_curriculum', '1');
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
    selectedFunctionTypes,
    mainTheme,
    selectedEquipment,
    debouncedSearch,
    isScreenplayPreset,
    isFunctionalPreset,
    refreshToken,
    screenplaysRefreshToken,
  ]);

  const isLoading = programsFromApi === null;
  const filteredPrograms = programsFromApi ?? [];
  const hasManualFilters =
    selectedFunctionTypes.length > 0 ||
    mainTheme !== '' ||
    selectedEquipment.length > 0 ||
    search.trim() !== '';
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

    // 요청: 검색 시 같은 제목이 여러 줄로 존재(월/주, 중복 입력 등)하면 "유령"처럼 보이므로,
    // 표시 제목 기준으로 중복을 숨겨 실제 카드만 남긴다.
    let out: ProgramRow[];
    if (!q) {
      out = filtered;
    } else {
      const seen = new Set<string>();
      const deduped: ProgramRow[] = [];
      for (const p of filtered) {
        const key = getDisplayTitle(p).toLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(p);
      }
      out = deduped;
    }

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
              : 'grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
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
