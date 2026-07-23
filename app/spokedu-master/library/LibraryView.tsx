'use client';

import {
  Bookmark,
  BookOpen,
  ChevronDown,
  Lock,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  LessonCatalogCard,
} from '../components/lesson/LessonCatalogCard';
import { ProgramPreviewModal } from '../components/lesson/ProgramPreviewModal';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import { getFavoritesOwnerId } from '../lib/favoriteLib';
import {
  LESSON_TAG_PREFIX,
  buildLessonCardSupportMeta,
  getLessonTheme,
  parseTaggedValues,
} from '../lib/lessonDisplay';
import { LESSON_THEME_OPTIONS } from '../lib/lessonTheme';
import { programHasPlayableVideo, resolveProgramHero } from '../lib/program-media';
import {
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useIsPremium, useMasterStore } from '../store';
import type { Program } from '../types';
import {
  countValidFavoritePrograms,
  filterLibraryPrograms,
  getFavoritesEmptyState,
  parseLibraryView,
  selectLibraryBasePrograms,
  buildLibraryFilterGroups,
  formatRecentRecordSubtitle,
  LIBRARY_PAGE_SIZE,
  matchesLibraryFilters,
  paginateLibraryPrograms,
  formatLibraryCardEquipmentName,
  type LibraryActiveFilter,
  type LibraryFilterGroupKey,
  type LibraryViewMode,
} from './libraryViewModel';
import { getLibraryProgramDetailHref } from './libraryNavigation';

// Display-only label mapping — stored matching value는 변경하지 않음
const TARGET_LABEL: Record<string, string> = {
  '초등학생 이상': '초등학생',
};
const MOVEMENT_LABEL: Record<string, string> = {
  '조작운동기술': '조작',
  '이동운동기술': '이동',
  '안정운동기술': '안정',
};

type FilterGroupKey = LibraryFilterGroupKey;
type ActiveFilter = LibraryActiveFilter;
type ActiveFilters = ActiveFilter[];

type FilterGroup = {
  key: FilterGroupKey;
  label: string;
  options: Array<{ value: string; count: number }>;
};

function tagDisplayLabel(group: FilterGroupKey, value: string): string {
  if (group === 'target') return TARGET_LABEL[value] ?? value;
  if (group === 'movement') return MOVEMENT_LABEL[value] ?? value;
  return value;
}

function getStructuredValues(program: Program, group: FilterGroupKey): string[] {
  if (group === 'target') return parseMasterTargets(program.grade);
  if (group === 'space') return parseMasterSpaces(program.space);
  if (group === 'function') {
    return parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction);
  }
  if (group === 'movement') {
    return parseTaggedValues(program.tags, LESSON_TAG_PREFIX.movement);
  }
  if (group === 'theme') {
    const theme = getLessonTheme(program);
    return (LESSON_THEME_OPTIONS as readonly string[]).includes(theme) ? [theme] : [];
  }
  return [];
}

function getHeroImage(program: Program) {
  return resolveProgramHero(program);
}

function getSearchText(program: Program) {
  return program.title.toLowerCase();
}

function getCardPrepMeta(program: Program, locked: boolean) {
  const primaryEquipment = program.equipment[0];
  if (locked && program.isPro) return '프리미엄 자료';
  return primaryEquipment ? formatLibraryCardEquipmentName(primaryEquipment) : '없음';
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">{eyebrow}</p>
        <h2 className="mt-1 text-[24px] font-black leading-tight text-[color:var(--spm-t)]">{title}</h2>
      </div>
    </div>
  );
}

function ProgramCard({
  program,
  locked,
  favorite,
  used,
  onPreview,
  onFavorite,
  favoriteEnabled,
  detailHref,
  priority = false,
}: {
  program: Program;
  locked: boolean;
  favorite: boolean;
  used: boolean;
  onPreview: () => void;
  onFavorite: () => void;
  favoriteEnabled: boolean;
  detailHref: string;
  priority?: boolean;
}) {
  const prepMeta = getCardPrepMeta(program, locked);
  // SPOMOVE 카드와 동일: 액센트=테마, 설명=대상·공간·참여형태/준비
  const decisionMeta = getLessonTheme(program) || program.category || '체육 수업';
  const supportMeta = buildLessonCardSupportMeta(program, { equipmentFallback: prepMeta });

  return (
    <LessonCatalogCard
      variant="library"
      title={program.title}
      heroImageUrl={getHeroImage(program)}
      categoryFallback={program.category || getLessonTheme(program) || '체육 수업'}
      hasVideo={programHasPlayableVideo(program)}
      onPreview={onPreview}
      detailHref={detailHref}
      decisionMeta={decisionMeta}
      supportMeta={supportMeta}
      locked={locked}
      used={used}
      favorite={favorite}
      favoriteEnabled={favoriteEnabled}
      onFavorite={onFavorite}
      priority={priority}
      sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
    />
  );
}

function FilterRow({
  group,
  filters,
  onFilter,
}: {
  group: FilterGroup;
  filters: ActiveFilters;
  onFilter: (next: ActiveFilter) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <p className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:w-16">{group.label}</p>
      <div className="flex min-w-0 flex-wrap gap-2">
        {group.options.map((option) => {
          const active = filters.some((filter) => filter.group === group.key && filter.value === option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilter({ group: group.key, value: option.value })}
              className={`h-8 max-w-[11rem] shrink-0 truncate rounded-full px-3 text-[11px] font-black transition ${
                active
                  ? 'bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
              }`}
              title={`${tagDisplayLabel(group.key, option.value)} (${option.count})`}
            >
              {tagDisplayLabel(group.key, option.value)}
              <span className="ml-1 text-[10px] opacity-50">{option.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LibraryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { programs, programsLoaded, programsError } = useMasterStore();
  const profile = useMasterStore((state) => state.profile);
  const ownerId = getFavoritesOwnerId(profile);
  const storedFavoriteIds = useMasterStore((state) =>
    ownerId ? state.favoriteProgramIdsByOwner[ownerId] : undefined,
  );
  const getFavoriteProgramIds = useMasterStore((state) => state.getFavoriteProgramIds);
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const { classRecords: serverClassRecords } = useOperationalData();
  const classRecords = useMemo(() => serverClassRecords.map(toClassRecord), [serverClassRecords]);
  const isPremium = useIsPremium();
  const favoriteIds = storedFavoriteIds ?? getFavoriteProgramIds(ownerId);

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const [filters, setFilters] = useState<ActiveFilters>(() => {
    const group = searchParams.get('filterGroup') as FilterGroupKey | null;
    const value = searchParams.get('filter');
    const allowedGroups: FilterGroupKey[] = ['target', 'space', 'function', 'movement', 'theme'];
    const legacyFilter = group && value && allowedGroups.includes(group) ? [{ group, value }] : [];
    const parsedFilters = searchParams
      .getAll('filters')
      .flatMap((item) => {
        const [rawGroup, ...valueParts] = item.split(':');
        const parsedGroup = rawGroup as FilterGroupKey;
        const parsedValue = valueParts.join(':');
        return allowedGroups.includes(parsedGroup) && parsedValue
          ? [{ group: parsedGroup, value: parsedValue }]
          : [];
      });
    return parsedFilters.length > 0 ? parsedFilters : legacyFilter;
  });
  const view = parseLibraryView(searchParams.get('view'));
  const [selected, setSelected] = useState<{ program: Program; autoplayVideo: boolean } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const pool = programs;

  const viewPool = useMemo(
    () => selectLibraryBasePrograms(pool, favoriteIds, view),
    [pool, favoriteIds, view],
  );
  const validFavoriteCount = useMemo(
    () => countValidFavoritePrograms(pool, favoriteIds),
    [pool, favoriteIds],
  );

  const usedProgramIds = useMemo(
    () => new Set(classRecords.map((record) => record.programId)),
    [classRecords],
  );
  const recentProgramRecords = useMemo(() => {
    const programsById = new Map(pool.map((program) => [program.id, program]));
    const seen = new Set<string>();
    return [...classRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .flatMap((record) => {
        const program = programsById.get(record.programId);
        if (!program || seen.has(record.programId)) return [];
        seen.add(record.programId);
        return [{ program, record }];
      })
      .slice(0, 4);
  }, [classRecords, pool]);

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [query, filters, view]);

  useEffect(() => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set('q', trimmedQuery);
    for (const filter of filters) {
      params.append('filters', `${filter.group}:${filter.value}`);
    }
    params.set('view', view);
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `/spokedu-master/library?${next}` : '/spokedu-master/library', { scroll: false });
  }, [filters, query, view, router, searchParams]);

  const filteredPrograms = useMemo(
    () =>
      filterLibraryPrograms(
        viewPool,
        query,
        (program, normalizedQuery) => getSearchText(program).includes(normalizedQuery),
        (program) => matchesLibraryFilters(program, filters, getStructuredValues),
      ),
    [filters, viewPool, query],
  );
  const visiblePrograms = useMemo(
    () => paginateLibraryPrograms(filteredPrograms, visibleCount),
    [filteredPrograms, visibleCount],
  );
  const hasMorePrograms = visiblePrograms.length < filteredPrograms.length;
  const hasActiveFilters = filters.length > 0;
  const favoritesEmptyState = getFavoritesEmptyState(
    view,
    validFavoriteCount,
    query.trim().length > 0,
    hasActiveFilters,
    filteredPrograms.length,
  );

  const toggleFilter = (nextFilter: ActiveFilter) => {
    setFilters((current) => {
      const exists = current.some(
        (filter) => filter.group === nextFilter.group && filter.value === nextFilter.value,
      );
      return exists
        ? current.filter((filter) => filter.group !== nextFilter.group || filter.value !== nextFilter.value)
        : [...current, nextFilter];
    });
  };

  const changeView = (nextView: LibraryViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', nextView);
    router.push(`/spokedu-master/library?${params.toString()}`, { scroll: false });
  };

  const filterGroups = useMemo<FilterGroup[]>(
    () =>
      buildLibraryFilterGroups(
        viewPool,
        filters,
        [
          { key: 'target', label: '대상' },
          { key: 'space', label: '공간' },
          { key: 'function', label: '신체 기능' },
          { key: 'movement', label: '움직임' },
          { key: 'theme', label: '테마' },
        ],
        getStructuredValues,
      ),
    [viewPool, filters],
  );

  const basicGroups = useMemo(
    () => filterGroups.filter((g) => (['target', 'space'] as FilterGroupKey[]).includes(g.key)),
    [filterGroups],
  );
  const advancedGroups = useMemo(
    () => filterGroups.filter((g) => (['function', 'movement', 'theme'] as FilterGroupKey[]).includes(g.key)),
    [filterGroups],
  );

  // 상세 필터에 활성 값이 있으면 자동 펼침
  const advancedHasActive =
    filters.some((filter) => (['function', 'movement', 'theme'] as FilterGroupKey[]).includes(filter.group));
  const isAdvancedOpen = showAdvanced || advancedHasActive;

  if (pool.length === 0) {
    if (!programsLoaded) return <LibrarySkeleton />;
    const message =
      programsError === 'unauthorized'
        ? '로그인 후 수업 자료를 확인할 수 있습니다.'
        : programsError === 'forbidden'
          ? '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 구독을 시작하면 수업 자료를 이용할 수 있습니다.'
          : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto px-4 py-16 sm:px-6 lg:px-8" style={{ background: 'var(--spm-bg)' }}>
        <section className="w-full max-w-xl rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-6 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-[color:var(--spm-t3)]" />
          <h1 className="mt-3 text-xl font-black text-[color:var(--spm-t)]">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{message}</p>
          <Link href="/spokedu-master/subscription" className="mt-5 inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--spm-acc)] px-5 text-[13px] font-black text-white">
            다시 구독하기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-4 overflow-y-auto px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-12" style={{ background: 'var(--spm-bg)' }}>
        <header className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,var(--spm-s1)_0%,var(--spm-s2)_68%,color-mix(in_srgb,var(--spm-s3)_72%,white)_100%)] shadow-[0_16px_42px_rgba(15,23,42,0.08)] ring-1 ring-white/70 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[linear-gradient(90deg,#111827_0%,#475569_45%,rgba(71,85,105,0)_100%)]">
          <div className="space-y-2.5 p-4 sm:p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--spm-acc)]">
                  마스터 라이브러리
                </p>
                <h1 className="mt-1 text-[23px] font-black leading-tight text-[color:var(--spm-t)] sm:text-[27px]">
                  조건에 맞는 수업 찾기
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-[color:var(--spm-t2)]">
                <span className="rounded-full bg-slate-950 px-2.5 py-1 text-white">
                  결과 {filteredPrograms.length}개
                </span>
              </div>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--spm-t2)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="수업명 검색"
                  className="h-11 w-full rounded-xl border border-[color:var(--spm-br2)] bg-white pl-12 pr-4 text-sm font-semibold text-[color:var(--spm-t)] outline-none placeholder:text-[color:var(--spm-t3)] focus:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
              <div
                className="grid min-h-10 grid-cols-2 items-center rounded-xl border border-[color:var(--spm-br2)] bg-white p-1"
                aria-label="라이브러리 보기"
              >
                <button
                  type="button"
                  onClick={() => changeView('all')}
                  className={`min-h-8 rounded-lg px-3 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] ${
                    view === 'all'
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-[color:var(--spm-t2)] hover:text-[color:var(--spm-t)]'
                  }`}
                  aria-pressed={view === 'all'}
                >
                  전체 <span className="ml-1 text-[11px] opacity-60">{pool.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeView('favorites')}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] ${
                    view === 'favorites'
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-[color:var(--spm-t2)] hover:text-[color:var(--spm-t)]'
                  }`}
                  aria-pressed={view === 'favorites'}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  즐겨찾기 <span className="text-[11px] opacity-60">{validFavoriteCount}</span>
                </button>
              </div>
              {hasActiveFilters ? (
                <button type="button" onClick={() => setFilters([])} className="h-10 px-2 text-[12px] font-black text-[var(--spm-acc)]">
                  초기화
                </button>
              ) : null}
              </div>
            </div>

            <div className="rounded-[14px] border border-slate-200 bg-white/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-black text-slate-950">빠른 필터</p>
                <p className="text-[11px] font-bold text-slate-500">대상과 공간을 먼저 좁히세요.</p>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {basicGroups.map((group) => (
                  <FilterRow key={group.key} group={group} filters={filters} onFilter={toggleFilter} />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex min-h-9 w-full items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-white/72 px-3 py-2 text-left text-[12px] font-black text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
            >
              <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                세부 조건
                <span className="text-[11px] font-bold text-[color:var(--spm-t3)]">신체 기능 · 움직임 · 테마</span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAdvancedOpen ? (
              <div className="grid gap-2.5 rounded-[14px] border border-slate-200 bg-white/80 p-2.5 lg:grid-cols-2 2xl:grid-cols-3">
                {advancedGroups.map((group) => (
                  <FilterRow key={group.key} group={group} filters={filters} onFilter={toggleFilter} />
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {view === 'all' && recentProgramRecords.length > 0 ? (
          <section className="rounded-[16px] border border-slate-200 bg-white/86 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">최근 사용</p>
                <h2 className="mt-0.5 text-[18px] font-black leading-tight text-[color:var(--spm-t)]">최근 사용한 수업</h2>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {recentProgramRecords.map(({ program, record }) => (
                <article key={program.id} className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold text-[color:var(--spm-t3)]">
                    {formatRecentRecordSubtitle(record)}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-[14px] font-black leading-tight text-[color:var(--spm-t)]">{program.title}</h3>
                  <div className="mt-3 grid gap-2">
                    <Link href={`/spokedu-master/class-record?record=${record.id}&program=${program.id}`} className="inline-flex h-9 items-center justify-center rounded-[9px] bg-slate-950 px-3 text-[12px] font-black text-white">
                      기록 보기
                    </Link>
                    <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-9 items-center justify-center rounded-[9px] bg-white px-3 text-[12px] font-black text-slate-700 ring-1 ring-slate-200">
                      전체 수업 자료 보기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle
              eyebrow="수업 목록"
              title={
                view === 'favorites'
                  ? (query || hasActiveFilters ? `즐겨찾기 결과 ${filteredPrograms.length}개` : `즐겨찾기한 수업 ${filteredPrograms.length}개`)
                  : (query || hasActiveFilters ? `검색 결과 ${filteredPrograms.length}개` : `전체 수업 ${filteredPrograms.length}개`)
              }
            />
            {hasActiveFilters ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {filters.map((filter) => (
                  <button
                    key={`${filter.group}:${filter.value}`}
                    type="button"
                    onClick={() => toggleFilter(filter)}
                    className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm"
                  >
                    {tagDisplayLabel(filter.group, filter.value)} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <ProgramGrid
            programs={visiblePrograms}
            isPremium={isPremium}
            isFavorite={(programId) => isFavoriteProgram(ownerId, programId)}
            favoriteEnabled={ownerId != null}
            sourceLibraryView={view}
            usedProgramIds={usedProgramIds}
            toggleFavorite={(id) => toggleFavoriteProgram(ownerId, id)}
            setSelected={setSelected}
          />
          {hasMorePrograms ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + LIBRARY_PAGE_SIZE)}
                className="inline-flex h-11 items-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-5 text-[13px] font-black text-[color:var(--spm-t2)] shadow-sm transition hover:border-[color:var(--spm-br3)] hover:text-[color:var(--spm-t)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2"
              >
                더 보기 ({visiblePrograms.length}/{filteredPrograms.length})
              </button>
            </div>
          ) : null}
          {filteredPrograms.length === 0 ? (
            favoritesEmptyState === 'no-favorites' ? (
              <div className="rounded-[18px] border border-dashed border-[color:var(--spm-br3)] bg-[var(--spm-s1)] p-8 text-center">
                <Bookmark className="mx-auto h-10 w-10 text-[color:var(--spm-t3)]" />
                <h3 className="mt-4 text-lg font-black text-[color:var(--spm-t)]">아직 즐겨찾기한 수업이 없습니다.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">
                  자주 사용하는 수업을 즐겨찾기에 넣어 두면 여기에서 빠르게 다시 찾을 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => changeView('all')}
                  className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-[var(--spm-acc)] px-4 text-[13px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2"
                >
                  전체 수업 둘러보기
                </button>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[color:var(--spm-br3)] bg-[var(--spm-s1)] p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-[color:var(--spm-t2)]" />
                <h3 className="mt-4 text-lg font-black text-[color:var(--spm-t)]">
                  {view === 'favorites' ? '조건에 맞는 즐겨찾기 수업이 없습니다.' : '조건에 맞는 수업이 없습니다.'}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[color:var(--spm-t2)]">
                  검색어를 줄이거나 선택한 필터를 해제해 보세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilters([]);
                  }}
                  className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-[var(--spm-acc)] px-4 text-[13px] font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2"
                >
                  검색·필터 초기화
                </button>
              </div>
            )
          ) : null}
        </section>
      </main>

      {selected ? (
        <ProgramPreviewModal
          program={selected.program}
          autoplayVideo={selected.autoplayVideo}
          isPremium={isPremium}
          favorite={isFavoriteProgram(ownerId, selected.program.id)}
          onFavorite={ownerId ? () => toggleFavoriteProgram(ownerId, selected.program.id) : undefined}
          sourceLibraryView={view}
          onPlaybackStarted={() => {
            recordRecentProgramActivity({
              programId: selected.program.id,
              programTitle: selected.program.title,
              action: 'video_started',
              occurredAt: new Date().toISOString(),
            });
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function ProgramGrid({
  programs,
  isPremium,
  isFavorite,
  favoriteEnabled,
  sourceLibraryView,
  usedProgramIds,
  toggleFavorite,
  setSelected,
}: {
  programs: Program[];
  isPremium: boolean;
  isFavorite: (programId: string) => boolean;
  favoriteEnabled: boolean;
  sourceLibraryView: LibraryViewMode;
  usedProgramIds: Set<string>;
  toggleFavorite: (id: string) => void;
  setSelected: (selection: { program: Program; autoplayVideo: boolean }) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {programs.map((program, index) => (
        <ProgramCard
          key={program.id}
          program={program}
          locked={program.isPro && !isPremium}
          favorite={isFavorite(program.id)}
          favoriteEnabled={favoriteEnabled}
          detailHref={getLibraryProgramDetailHref(program.id, sourceLibraryView)}
          used={usedProgramIds.has(program.id)}
          priority={index < 4}
          onFavorite={() => toggleFavorite(program.id)}
          onPreview={() =>
            setSelected({
              program,
              autoplayVideo: programHasPlayableVideo(program),
            })
          }
        />
      ))}
    </div>
  );
}
