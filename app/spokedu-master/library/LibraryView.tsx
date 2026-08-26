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
  getLessonTheme,
  parseTaggedValues,
} from '../lib/lessonDisplay';
import { LESSON_THEME_OPTIONS } from '../lib/lessonTheme';
import { spmChipClass, spmSegClass } from '../lib/masterUiClasses';
import { programHasPlayableVideo, resolveProgramHero } from '../lib/program-media';
import {
  isMasterParticipantFormat,
  parseMasterParticipantFormats,
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { buildActivitySessionHref, parseMasterWorkReturnHref } from '../lib/masterNavigationContext';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import { useIsPremium, useMasterStore } from '../store';
import type { Program } from '../types';
import {
  buildLibraryShelves,
  filterProgramsByReason,
  filterProgramsByShelf,
  getLibraryShelfDefinition,
  parseLibraryShelfId,
  LIBRARY_SITUATION_ENTRIES,
  type LibraryShelfId,
} from './libraryCuration';
import {
  LIBRARY_SELECTION_REASON_IDS,
  LIBRARY_SELECTION_REASONS,
  formatProgramSelectionReasons,
  type LibrarySelectionReasonId,
} from './librarySelectionReasons';
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
  rankLibraryPrograms,
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
  if (group === 'target') return parseMasterTargets(program.lessonDetail?.recommendedAge || program.grade);
  if (group === 'space') return parseMasterSpaces(program.space);
  if (group === 'participant') {
    const fromTags = parseMasterParticipantFormats(program.tags);
    if (fromTags.length > 0) return fromTags;
    const fromDetail = String(program.lessonDetail?.recommendedPlayers ?? '').trim();
    return isMasterParticipantFormat(fromDetail) ? [fromDetail] : [];
  }
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

function getProgramSearchFields(program: Program) {
  const structuredGroups: FilterGroupKey[] = ['target', 'space', 'participant', 'function', 'movement', 'theme'];
  return {
    title: program.title,
    category: [program.category, getLessonTheme(program)].filter(Boolean).join(' '),
    structured: [
      ...structuredGroups.flatMap((group) => getStructuredValues(program, group)),
      ...(program.tags ?? []),
      ...(program.equipment ?? []),
      program.grade,
      program.space,
      program.lessonDetail?.recommendedAge,
      program.lessonDetail?.recommendedPlayers,
    ].filter((value): value is string => Boolean(value)),
    body: [
      program.description,
      ...(program.steps ?? []),
      program.lessonDetail?.objective,
      program.lessonDetail?.developmentFocus,
    ].filter((value): value is string => Boolean(value)),
  };
}

function parseReasonId(value: string | null): LibrarySelectionReasonId | null {
  if (!value) return null;
  return (LIBRARY_SELECTION_REASON_IDS as readonly string[]).includes(value)
    ? (value as LibrarySelectionReasonId)
    : null;
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
  const decisionMeta = getLessonTheme(program) || program.category || '체육 수업';
  const supportMeta = formatProgramSelectionReasons(program);

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
              className={spmChipClass(active, 'max-w-[11rem] truncate')}
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
  const { sessions } = useOperationalData();
  const sessionId = searchParams.get('session')?.trim() || null;
  const sessionContext = sessionId ? sessions.find((session) => session.id === sessionId && session.status === 'scheduled') : null;
  const sessionWorkState = sessionContext ? deriveMasterSessionWorkState(sessionContext, null, new Date()) : null;
  const sessionReturnHref = parseMasterWorkReturnHref(searchParams.get('returnTo'), null, null, sessionId ? buildActivitySessionHref(sessionId) : '/spokedu-master/activity');
  const isPremium = useIsPremium();
  const favoriteIds = useMemo(
    () => storedFavoriteIds ?? getFavoriteProgramIds(ownerId),
    [storedFavoriteIds, getFavoriteProgramIds, ownerId],
  );

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const [filters, setFilters] = useState<ActiveFilters>(() => {
    const group = searchParams.get('filterGroup') as FilterGroupKey | null;
    const value = searchParams.get('filter');
    const allowedGroups: FilterGroupKey[] = ['target', 'space', 'participant', 'function', 'movement', 'theme'];
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
  const shelfId = parseLibraryShelfId(searchParams.get('shelf'));
  const reasonId = parseReasonId(searchParams.get('reason'));
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
    () => new Set(sessions.filter((session) => session.status === 'completed').flatMap((session) => session.programs
      .filter((item) => item.sourceType === 'program' && item.programId != null && item.isCompleted)
      .map((item) => String(item.programId)))),
    [sessions],
  );
  const recentProgramRecords = useMemo(() => {
    const programsById = new Map(pool.map((program) => [program.id, program]));
    const seen = new Set<string>();
    return sessions.filter((session) => session.status === 'completed')
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      .flatMap((session) => session.programs.filter((record) => record.sourceType === 'program' && record.programId != null && record.isCompleted).map((record) => ({ session, record })))
      .flatMap(({ session, record }) => {
        const program = programsById.get(String(record.programId));
        if (!program || seen.has(String(record.programId))) return [];
        seen.add(String(record.programId));
        return [{ program, record: {
          id: session.id, date: session.startAt, lessonTitle: session.className, classId: session.classId,
          programId: String(record.programId), programTitle: record.programTitle ?? program.title,
          present: session.attendance.filter((item) => item.status === 'present').length,
          absent: session.attendance.filter((item) => item.status === 'absent').length,
          focusCount: 0, skillCount: 0, kakaoSent: false, students: [],
        } }];
      })
      .slice(0, 4);
  }, [sessions, pool]);

  const shelves = useMemo(() => buildLibraryShelves(viewPool), [viewPool]);

  const sourceLibrarySearch = useMemo(() => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set('q', trimmedQuery);
    for (const filter of filters) {
      params.append('filters', `${filter.group}:${filter.value}`);
    }
    params.set('view', view);
    if (shelfId) params.set('shelf', shelfId);
    if (reasonId) params.set('reason', reasonId);
    if (sessionContext) {
      params.set('session', sessionContext.id);
      params.set('returnTo', sessionReturnHref);
      params.set('source', 'session');
    }
    return params.toString();
  }, [filters, query, view, shelfId, reasonId, sessionContext, sessionReturnHref]);

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [query, filters, view, shelfId, reasonId]);

  useEffect(() => {
    const next = sourceLibrarySearch;
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `/spokedu-master/library?${next}` : '/spokedu-master/library', { scroll: false });
  }, [sourceLibrarySearch, router, searchParams]);

  const filteredPrograms = useMemo(() => {
    const base = filterLibraryPrograms(
      viewPool,
      '',
      () => true,
      (program) => matchesLibraryFilters(program, filters, getStructuredValues),
    );
    const constrained = shelfId
      ? filterProgramsByShelf(base, shelfId)
      : reasonId
        ? filterProgramsByReason(base, reasonId)
        : base;
    return rankLibraryPrograms(constrained, query, getProgramSearchFields);
  }, [filters, viewPool, query, shelfId, reasonId]);

  const visiblePrograms = useMemo(
    () => paginateLibraryPrograms(filteredPrograms, visibleCount),
    [filteredPrograms, visibleCount],
  );
  const hasMorePrograms = visiblePrograms.length < filteredPrograms.length;
  const hasActiveFilters = filters.length > 0;
  const hasBrowseConstraint = Boolean(shelfId || reasonId);
  const hasSearchIntent = query.trim().length > 0 || hasActiveFilters || hasBrowseConstraint;
  const isBrowseMode = view === 'all' && !hasSearchIntent;
  const favoritesEmptyState = getFavoritesEmptyState(
    view,
    validFavoriteCount,
    query.trim().length > 0,
    hasActiveFilters || hasBrowseConstraint,
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

  const replaceLibraryParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/spokedu-master/library?${params.toString()}`, { scroll: false });
  };

  const changeView = (nextView: LibraryViewMode) => {
    replaceLibraryParams((params) => {
      params.set('view', nextView);
      if (nextView === 'favorites') {
        params.delete('shelf');
        params.delete('reason');
      }
    });
  };

  const openShelf = (nextShelf: LibraryShelfId) => {
    setQuery('');
    setFilters([]);
    replaceLibraryParams((params) => {
      params.set('view', 'all');
      params.set('shelf', nextShelf);
      params.delete('reason');
      params.delete('q');
      params.delete('filters');
    });
  };

  const applySituationFilter = (filter: ActiveFilter) => {
    setQuery('');
    setFilters([filter]);
    replaceLibraryParams((params) => {
      params.set('view', 'all');
      params.delete('shelf');
      params.delete('reason');
      params.delete('q');
      params.delete('filters');
      params.append('filters', `${filter.group}:${filter.value}`);
    });
  };

  const clearBrowseConstraints = () => {
    replaceLibraryParams((params) => {
      params.delete('shelf');
      params.delete('reason');
    });
  };

  const clearAllSearch = () => {
    setQuery('');
    setFilters([]);
    replaceLibraryParams((params) => {
      params.delete('q');
      params.delete('filters');
      params.delete('shelf');
      params.delete('reason');
      params.set('view', view);
    });
  };

  const filterGroups = useMemo<FilterGroup[]>(
    () =>
      buildLibraryFilterGroups(
        viewPool,
        filters,
        [
          { key: 'target', label: '대상' },
          { key: 'space', label: '공간' },
          { key: 'participant', label: '참여 형태' },
          { key: 'function', label: '신체 기능' },
          { key: 'movement', label: '움직임' },
          { key: 'theme', label: '테마' },
        ],
        getStructuredValues,
      ),
    [viewPool, filters],
  );

  const basicGroups = useMemo(
    () =>
      filterGroups.filter((g) =>
        (['target', 'space', 'participant'] as FilterGroupKey[]).includes(g.key),
      ),
    [filterGroups],
  );
  const advancedGroups = useMemo(
    () => filterGroups.filter((g) => (['function', 'movement', 'theme'] as FilterGroupKey[]).includes(g.key)),
    [filterGroups],
  );

  const advancedHasActive =
    filters.some((filter) => (['function', 'movement', 'theme'] as FilterGroupKey[]).includes(filter.group));
  const isAdvancedOpen = showAdvanced || advancedHasActive;

  if (pool.length === 0) {
    if (!programsLoaded) return <LibrarySkeleton />;
    const message =
      programsError === 'unauthorized'
        ? '로그인 후 수업 라이브러리를 확인할 수 있습니다.'
        : programsError === 'forbidden'
          ? '이용 기간이 종료되어 수업 라이브러리를 불러올 수 없습니다. 구독을 시작하면 전체 수업을 이용할 수 있습니다.'
          : '수업 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto px-4 py-16 sm:px-6 lg:px-8" style={{ background: 'var(--spm-bg)' }}>
        <section className="w-full max-w-xl rounded-[18px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] p-6 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-[color:var(--spm-t3)]" />
          <h1 className="mt-3 text-xl font-black text-[color:var(--spm-t)]">수업 라이브러리를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{message}</p>
          <Link href="/spokedu-master/subscription" className="spm-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-black focus-visible:outline-none">
            다시 구독하기
          </Link>
        </section>
      </main>
    );
  }

  const catalogTitle = view === 'favorites'
    ? (hasSearchIntent ? `즐겨찾기 결과 ${filteredPrograms.length}개` : `즐겨찾기한 수업 ${filteredPrograms.length}개`)
    : shelfId
      ? `${getLibraryShelfDefinition(shelfId).title} ${filteredPrograms.length}개`
      : reasonId
        ? `${LIBRARY_SELECTION_REASONS[reasonId].label} ${filteredPrograms.length}개`
        : hasSearchIntent
          ? `검색 결과 ${filteredPrograms.length}개`
          : '전체에서 찾기';

  return (
    <>
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 overflow-y-auto px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-12" style={{ background: 'var(--spm-bg)' }}>
        {sessionContext ? <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 sm:px-4">
          <p className="min-w-0 truncate text-xs font-black text-blue-900">{sessionContext.className} · {sessionWorkState?.operationalLabel}{sessionWorkState?.progress.total ? ` · 진행 ${sessionWorkState.progress.completed}/${sessionWorkState.progress.total}` : ''}</p>
          <Link href={sessionReturnHref} className="inline-flex min-h-11 shrink-0 items-center text-xs font-black text-blue-700">수업으로 돌아가기</Link>
        </div> : null}
        <header className="rounded-[20px] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--spm-acc)]">
                놀이체육
              </p>
              <h1 className="mt-1 text-[23px] font-black leading-tight text-[color:var(--spm-t)] sm:text-[27px]">
                {isBrowseMode ? '바로 쓸 수업 고르기' : '맞는 수업 찾기'}
              </h1>
              <p className="mt-1 text-[13px] font-semibold text-slate-600">
                {isBrowseMode
                  ? '편집된 수업부터 보고, 필요할 때 전체에서 검색하세요.'
                  : '검색과 조건으로 원하는 수업을 좁히세요.'}
              </p>
            </div>
            <p className="text-[11px] font-bold text-slate-500">
              전체 {pool.length}개 수업
            </p>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--spm-t2)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="수업명·준비물·키워드 검색"
                className="h-10 w-full rounded-xl border border-[color:var(--spm-br2)] bg-white pl-10 pr-4 text-sm font-semibold text-[color:var(--spm-t)] outline-none placeholder:text-[color:var(--spm-t3)] focus:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200"
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
                  className={spmSegClass(view === 'all')}
                  aria-pressed={view === 'all'}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => changeView('favorites')}
                  className={spmSegClass(view === 'favorites', 'inline-flex items-center gap-1.5')}
                  aria-pressed={view === 'favorites'}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  즐겨찾기 <span className="text-[11px] opacity-60">{validFavoriteCount}</span>
                </button>
              </div>
              {hasSearchIntent ? (
                <button type="button" onClick={clearAllSearch} className="h-10 px-2 text-[12px] font-black text-[var(--spm-acc)]">
                  초기화
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {isBrowseMode ? (
          <>
            {shelves.length > 0 ? (
              <section aria-label="편집 컬렉션" className="space-y-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">컬렉션</p>
                  <h2 className="mt-1 text-[22px] font-black leading-tight text-[color:var(--spm-t)]">상황별 바로 고르기</h2>
                </div>
                {shelves.map(({ shelf, programs: shelfPrograms, total }) => (
                  <div key={shelf.id} className="rounded-[18px] border border-slate-200 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:p-4">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500">
                          {shelf.kind === 'editorial' ? '편집' : '규칙'} · {shelf.subtitle}
                        </p>
                        <h3 className="mt-0.5 text-[18px] font-black text-[color:var(--spm-t)]">{shelf.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => openShelf(shelf.id)}
                        className="text-[12px] font-black text-[var(--spm-acc)]"
                      >
                        더 보기 ({total})
                      </button>
                    </div>
                    <ProgramGrid
                      programs={shelfPrograms}
                      isPremium={isPremium}
                      isFavorite={(programId) => isFavoriteProgram(ownerId, programId)}
                      favoriteEnabled={ownerId != null}
                      sourceLibraryView={view}
                      sourceLibrarySearch={sourceLibrarySearch}
                      usedProgramIds={usedProgramIds}
                      toggleFavorite={(id) => toggleFavoriteProgram(ownerId, id)}
                      setSelected={setSelected}
                    />
                  </div>
                ))}
              </section>
            ) : null}

            <section aria-label="상황별 빠른 진입" className="rounded-[18px] border border-slate-200 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <div className="mb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">빠른 진입</p>
                <h2 className="mt-1 text-[20px] font-black text-[color:var(--spm-t)]">조건으로 출발하기</h2>
                <p className="mt-1 text-[13px] font-semibold text-slate-600">대상·공간·교구·활동 성격으로 바로 들어갑니다.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {LIBRARY_SITUATION_ENTRIES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => applySituationFilter(entry.filter)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 text-[12px] font-black text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-950"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{entry.groupLabel}</span>
                    {entry.label}
                  </button>
                ))}
              </div>
            </section>

            {recentProgramRecords.length > 0 ? (
              <section className="rounded-[16px] border border-slate-200 bg-white/80 p-3">
                <div className="mb-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">최근 사용</p>
                  <h2 className="mt-0.5 text-[16px] font-black leading-tight text-[color:var(--spm-t)]">최근에 쓴 수업</h2>
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {recentProgramRecords.map(({ program, record }) => (
                    <article key={program.id} className="rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] font-bold text-[color:var(--spm-t3)]">
                        {formatRecentRecordSubtitle(record)}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-[14px] font-black leading-tight text-[color:var(--spm-t)]">{program.title}</h3>
                      <div className="mt-3 grid gap-2">
                        <Link href={`/spokedu-master/activity?session=${encodeURIComponent(record.id)}`} className="spm-btn-primary inline-flex h-9 items-center justify-center rounded-[9px] px-3 text-[12px] font-black focus-visible:outline-none">
                          지난 수업 보기
                        </Link>
                        <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-9 items-center justify-center rounded-[9px] bg-white px-3 text-[12px] font-black text-slate-700 ring-1 ring-slate-200">
                          수업 다시 준비
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        <section id="library-catalog">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle
              eyebrow={isBrowseMode ? '전체 검색' : '수업 목록'}
              title={catalogTitle}
            />
            {hasActiveFilters || hasBrowseConstraint ? (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {shelfId ? (
                  <button
                    type="button"
                    onClick={clearBrowseConstraints}
                    className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm"
                  >
                    {getLibraryShelfDefinition(shelfId).title} ×
                  </button>
                ) : null}
                {reasonId ? (
                  <button
                    type="button"
                    onClick={clearBrowseConstraints}
                    className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-700 shadow-sm"
                  >
                    {LIBRARY_SELECTION_REASONS[reasonId].label} ×
                  </button>
                ) : null}
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

          <div className="mb-4 space-y-2">
            <div className="rounded-[14px] border border-slate-200 bg-white/80 px-3 py-2">
              {isBrowseMode ? (
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-slate-950">세부 조건</p>
                  <p className="text-[11px] font-bold text-slate-500">필요할 때만 좁히세요.</p>
                </div>
              ) : null}
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
                {isBrowseMode ? '더 많은 조건' : '세부 조건'}
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

          <ProgramGrid
            programs={visiblePrograms}
            isPremium={isPremium}
            isFavorite={(programId) => isFavoriteProgram(ownerId, programId)}
            favoriteEnabled={ownerId != null}
            sourceLibraryView={view}
            sourceLibrarySearch={sourceLibrarySearch}
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
                  className="spm-btn-primary mt-4 inline-flex h-11 items-center rounded-[10px] px-4 text-[13px] font-black focus-visible:outline-none"
                >
                  수업 둘러보기
                </button>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[color:var(--spm-br3)] bg-[var(--spm-s1)] p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-[color:var(--spm-t2)]" />
                <h3 className="mt-4 text-lg font-black text-[color:var(--spm-t)]">
                  {view === 'favorites' ? '조건에 맞는 즐겨찾기 수업이 없습니다.' : '조건에 맞는 수업이 없습니다.'}
                </h3>
                <p className="mt-2 text-sm font-semibold text-[color:var(--spm-t2)]">
                  검색어를 줄이거나 선택한 조건을 해제해 보세요.
                </p>
                <button
                  type="button"
                  onClick={clearAllSearch}
                  className="spm-btn-primary mt-4 inline-flex h-11 items-center rounded-[10px] px-4 text-[13px] font-black focus-visible:outline-none"
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
          sourceLibrarySearch={sourceLibrarySearch}
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
  sourceLibrarySearch,
  usedProgramIds,
  toggleFavorite,
  setSelected,
}: {
  programs: Program[];
  isPremium: boolean;
  isFavorite: (programId: string) => boolean;
  favoriteEnabled: boolean;
  sourceLibraryView: LibraryViewMode;
  sourceLibrarySearch: string;
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
          detailHref={getLibraryProgramDetailHref(program.id, sourceLibraryView, sourceLibrarySearch)}
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
