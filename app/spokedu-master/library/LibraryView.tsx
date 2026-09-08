'use client';

import {
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
import { MasterPageHeader, MasterPageShell } from '../components/ui/MasterPrimitives';
import { getFavoritesOwnerId } from '../lib/favoriteLib';
import {
  LESSON_TAG_PREFIX,
  getLessonTheme,
  parseTaggedValues,
} from '../lib/lessonDisplay';
import { LESSON_THEME_OPTIONS } from '../lib/lessonTheme';
import { spmChipClass } from '../lib/masterUiClasses';
import { programHasPlayableVideo, resolveProgramHero } from '../lib/program-media';
import {
  MASTER_PARTICIPANT_FORMATS,
  MASTER_SPACE_TAGS,
  isMasterParticipantFormat,
  parseMasterParticipantFormats,
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { buildActivitySessionHref, parseMasterWorkReturnHref } from '../lib/masterNavigationContext';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';
import { getMasterContentPrimaryAction, resolveMasterContentMode } from '../lib/masterProductTruth';
import { useIsPremium, useMasterStore } from '../store';
import type { Program } from '../types';
import {
  filterProgramsByReason,
  filterProgramsByShelf,
  parseLibraryShelfId,
} from './libraryCuration';
import {
  LIBRARY_SELECTION_REASON_IDS,
  formatProgramSelectionReasons,
  type LibrarySelectionReasonId,
} from './librarySelectionReasons';
import {
  filterLibraryPrograms,
  buildLibraryFilterGroups,
  LIBRARY_PAGE_SIZE,
  matchesLibraryFilters,
  paginateLibraryPrograms,
  rankLibraryPrograms,
  type LibraryActiveFilter,
  type LibraryFilterGroupKey,
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

const QUICK_THEME_VALUES = ['협동형', '경쟁형', '술래형', '도전형', '조절형'] as const satisfies readonly (typeof LESSON_THEME_OPTIONS)[number][];
const QUICK_SPACE_VALUES = MASTER_SPACE_TAGS;
const QUICK_PARTICIPANT_VALUES = MASTER_PARTICIPANT_FORMATS;
const QUICK_FILTER_GROUPS = new Set<FilterGroupKey>(['theme', 'space', 'participant']);

const QUICK_FILTER_LABEL: Partial<Record<FilterGroupKey, Record<string, string>>> = {
  theme: { 협동형: '협동', 경쟁형: '경쟁', 술래형: '술래', 도전형: '도전', 조절형: '조절' },
  participant: { 개인전: '개인', '2인 1조': '2인', 팀전: '팀' },
};

function normalizeQuickBrowseFilters(filters: ActiveFilters): ActiveFilters {
  const seenAxes = new Set<FilterGroupKey>();
  return filters.filter((filter) => {
    if (!QUICK_FILTER_GROUPS.has(filter.group)) return true;
    if (seenAxes.has(filter.group)) return false;
    seenAxes.add(filter.group);
    return true;
  });
}

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

function ProgramCard({
  program,
  locked,
  favorite,
  onPreview,
  onFavorite,
  favoriteEnabled,
  detailHref,
  priority = false,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
}: {
  program: Program;
  locked: boolean;
  favorite: boolean;
  onPreview: () => void;
  onFavorite: () => void;
  favoriteEnabled: boolean;
  detailHref: string;
  priority?: boolean;
  primaryActionLabel: string;
  onPrimaryAction?: () => void;
  primaryActionDisabled?: boolean;
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
      favorite={favorite}
      favoriteEnabled={favoriteEnabled}
      onFavorite={onFavorite}
      priority={priority}
      sizes="(min-width: 1280px) 300px, (min-width: 768px) 50vw, 100vw"
      primaryActionLabel={primaryActionLabel}
      onPrimaryAction={onPrimaryAction}
      primaryActionDisabled={primaryActionDisabled}
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
      <p className="shrink-0 text-[12px] font-medium text-slate-500 sm:w-16">{group.label}</p>
      <div className="flex min-w-0 flex-wrap gap-2">
        {group.options.map((option) => {
          const active = filters.some((filter) => filter.group === group.key && filter.value === option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilter({ group: group.key, value: option.value })}
              aria-pressed={active}
              className={spmChipClass(active, 'max-w-[11rem] truncate')}
              title={`${tagDisplayLabel(group.key, option.value)} (${option.count})`}
            >
              {tagDisplayLabel(group.key, option.value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickBrowseAxis({
  label,
  group,
  values,
  filters,
  onFilter,
}: {
  label: string;
  group: FilterGroupKey;
  values: readonly string[];
  filters: ActiveFilters;
  onFilter: (next: ActiveFilter) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <p className="shrink-0 text-[13px] font-medium text-slate-500">{label}</p>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {values.map((value) => {
          const active = filters.some((filter) => filter.group === group && filter.value === value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilter({ group, value })}
              aria-pressed={active}
              className={spmChipClass(active)}
            >
              {QUICK_FILTER_LABEL[group]?.[value] ?? value}
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
  const isFavoriteProgram = useMasterStore((state) => state.isFavoriteProgram);
  const toggleFavoriteProgram = useMasterStore((state) => state.toggleFavoriteProgram);
  const recordRecentProgramActivity = useMasterStore((state) => state.recordRecentProgramActivity);
  const operationalData = useOperationalData();
  const { sessions, status: operationalStatus } = operationalData;
  const sessionId = searchParams.get('session')?.trim() || null;
  const sessionContext = sessionId ? sessions.find((session) => session.id === sessionId && session.status === 'scheduled') : null;
  const sessionWorkState = sessionContext ? deriveMasterSessionWorkState(sessionContext, null, new Date()) : null;
  const sessionReturnHref = parseMasterWorkReturnHref(searchParams.get('returnTo'), null, null, sessionId ? buildActivitySessionHref(sessionId) : '/spokedu-master/activity');
  const contentMode = resolveMasterContentMode({ requestedSessionId: sessionId, hasExactScheduledSession: Boolean(sessionContext) });
  const primaryActionLabel = getMasterContentPrimaryAction(contentMode);
  const isPremium = useIsPremium();
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
    return normalizeQuickBrowseFilters(parsedFilters.length > 0 ? parsedFilters : legacyFilter);
  });
  const [shelfId, setShelfId] = useState(() => parseLibraryShelfId(searchParams.get('shelf')));
  const [reasonId, setReasonId] = useState(() => parseReasonId(searchParams.get('reason')));
  const [selected, setSelected] = useState<{ program: Program; autoplayVideo: boolean } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [addingProgramId, setAddingProgramId] = useState<string | null>(null);
  const [sessionAddError, setSessionAddError] = useState<string | null>(null);

  const addProgramToSession = async (program: Program) => {
    if (!sessionContext || addingProgramId) return;
    const programId = Number(program.id);
    if (!Number.isInteger(programId)) return;
    setAddingProgramId(program.id);
    setSessionAddError(null);
    try {
      await operationalData.addSessionProgram(sessionContext.id, programId);
      router.push(sessionReturnHref);
    } catch {
      setSessionAddError('활동을 수업에 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setAddingProgramId(null);
    }
  };

  // The physical-activity Library is a complete Lite catalog. Premium content lives in SPOMOVE.
  const pool = useMemo(() => programs.filter((program) => !program.isPro), [programs]);

  const viewPool = pool;

  const sourceLibrarySearch = useMemo(() => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set('q', trimmedQuery);
    for (const filter of filters) {
      params.append('filters', `${filter.group}:${filter.value}`);
    }
    if (shelfId) params.set('shelf', shelfId);
    if (reasonId) params.set('reason', reasonId);
    if (sessionContext) {
      params.set('session', sessionContext.id);
      params.set('returnTo', sessionReturnHref);
      params.set('source', 'session');
    }
    return params.toString();
  }, [filters, query, shelfId, reasonId, sessionContext, sessionReturnHref]);

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [query, filters, shelfId, reasonId]);

  useEffect(() => {
    if (sessionId && operationalStatus !== 'ready') return;
    const next = sourceLibrarySearch;
    const href = next ? `/spokedu-master/library?${next}` : '/spokedu-master/library';
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === href) return;
    window.history.replaceState(window.history.state, '', href);
  }, [operationalStatus, sessionId, sourceLibrarySearch]);

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

  const toggleQuickFilter = (nextFilter: ActiveFilter) => {
    setFilters((current) => {
      const active = current.some(
        (filter) => filter.group === nextFilter.group && filter.value === nextFilter.value,
      );
      const withoutAxis = current.filter((filter) => filter.group !== nextFilter.group);
      return active ? withoutAxis : [...withoutAxis, nextFilter];
    });
    setShelfId(null);
    setReasonId(null);
  };

  const clearAllSearch = () => {
    setQuery('');
    setFilters([]);
    setShelfId(null);
    setReasonId(null);
  };

  const filterGroups = useMemo<FilterGroup[]>(
    () =>
      buildLibraryFilterGroups(
        viewPool,
        filters,
        [
          { key: 'target', label: '대상' },
          { key: 'function', label: '신체 기능' },
          { key: 'movement', label: '움직임' },
        ],
        getStructuredValues,
      ),
    [viewPool, filters],
  );

  const advancedGroups = filterGroups;
  const advancedHasActive = filters.some((filter) => !QUICK_FILTER_GROUPS.has(filter.group));
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
          <h1 className="mt-3 text-xl font-semibold text-[color:var(--spm-t)]">수업 라이브러리를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--spm-t2)]">{message}</p>
          <Link href="/spokedu-master/subscription" className="spm-btn-primary mt-5 inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[13px] font-semibold focus-visible:outline-none">
            다시 구독하기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="h-full overflow-y-auto pb-24 lg:pb-12" style={{ background: 'var(--spm-bg)' }}>
        <MasterPageShell variant="editorial" className="flex max-w-[1120px] flex-col gap-6 sm:gap-7">
        {sessionContext ? <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 sm:px-4">
          <p className="min-w-0 truncate text-xs font-semibold text-blue-900">{sessionContext.className} · {sessionWorkState?.operationalLabel}{sessionWorkState?.progress.total ? ` · 진행 ${sessionWorkState.progress.completed}/${sessionWorkState.progress.total}` : ''}</p>
          <Link href={sessionReturnHref} className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-blue-700">수업으로 돌아가기</Link>
        </div> : null}
        {sessionAddError ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{sessionAddError}</p> : null}
        <div>
          <MasterPageHeader title="놀이체육" description="수업에 바로 활용할 수 있는 SPOKEDU 활동을 찾아보세요." />
          <div className="mt-4 flex w-full max-w-[640px] items-center gap-2">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--spm-t2)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="활동 이름, 교구, 종목 검색"
                aria-label="놀이체육 활동 검색"
                className="h-12 w-full rounded-[12px] border border-slate-300 bg-white pl-11 pr-4 text-[15px] font-medium text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-500 focus-visible:ring-2 focus-visible:ring-slate-200"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {hasSearchIntent ? (
                <button type="button" onClick={clearAllSearch} className="h-10 px-2 text-[12px] font-semibold text-[var(--spm-acc)]">
                  초기화
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <section aria-labelledby="library-quick-browse">
          <h2 id="library-quick-browse" className="text-[18px] font-semibold text-[color:var(--spm-t)]">빠르게 찾기</h2>
          <div className="mt-3 grid gap-x-8 gap-y-2.5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <QuickBrowseAxis label="수업 테마" group="theme" values={QUICK_THEME_VALUES} filters={filters} onFilter={toggleQuickFilter} />
            <QuickBrowseAxis label="공간" group="space" values={QUICK_SPACE_VALUES} filters={filters} onFilter={toggleQuickFilter} />
            <QuickBrowseAxis label="참여 형태" group="participant" values={QUICK_PARTICIPANT_VALUES} filters={filters} onFilter={toggleQuickFilter} />
          </div>
        </section>

        <section id="library-catalog">
          <div className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-3">
            <h2 className="text-[22px] font-semibold leading-tight text-[color:var(--spm-t)] sm:text-[24px]">놀이체육 활동</h2>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-expanded={isAdvancedOpen}
              className="inline-flex min-h-11 items-center gap-2 px-2 text-[13px] font-semibold text-slate-600 transition hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--spm-acc)]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              세부 필터
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {isAdvancedOpen ? (
            <div className="mb-5 border-b border-slate-200 pb-5">
              <div className="grid gap-3 lg:grid-cols-2">
                {advancedGroups.map((group) => (
                  <FilterRow key={group.key} group={group} filters={filters} onFilter={toggleFilter} />
                ))}
              </div>
            </div>
          ) : null}

          <ProgramGrid
            programs={visiblePrograms}
            isPremium={isPremium}
            isFavorite={(programId) => isFavoriteProgram(ownerId, programId)}
            favoriteEnabled={ownerId != null}
            sourceLibraryView="all"
            sourceLibrarySearch={sourceLibrarySearch}
          toggleFavorite={(id) => toggleFavoriteProgram(ownerId, id)}
          setSelected={setSelected}
          primaryActionLabel={primaryActionLabel}
          onAddToSession={sessionContext ? (program) => void addProgramToSession(program) : undefined}
          addingProgramId={addingProgramId}
        />
          {hasMorePrograms ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + LIBRARY_PAGE_SIZE)}
                className="inline-flex h-11 items-center rounded-[10px] border border-[color:var(--spm-br2)] bg-[var(--spm-s1)] px-5 text-[13px] font-semibold text-[color:var(--spm-t2)] transition hover:border-[color:var(--spm-br3)] hover:text-[color:var(--spm-t)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spm-acc)] focus-visible:ring-offset-2"
              >
                더 보기 ({visiblePrograms.length}/{filteredPrograms.length})
              </button>
            </div>
          ) : null}
          {filteredPrograms.length === 0 ? (
              <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-medium text-slate-600">
                  조건에 맞는 수업이 없습니다.
                </h3>
                <button
                  type="button"
                  onClick={clearAllSearch}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700"
                >
                  전체 활동 보기
                </button>
              </div>
          ) : null}
        </section>
        </MasterPageShell>
      </main>

      {selected ? (
        <ProgramPreviewModal
          program={selected.program}
          autoplayVideo={selected.autoplayVideo}
          isPremium={isPremium}
          favorite={isFavoriteProgram(ownerId, selected.program.id)}
          onFavorite={ownerId ? () => toggleFavoriteProgram(ownerId, selected.program.id) : undefined}
          sourceLibraryView="all"
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
  toggleFavorite,
  setSelected,
  primaryActionLabel,
  onAddToSession,
  addingProgramId,
}: {
  programs: Program[];
  isPremium: boolean;
  isFavorite: (programId: string) => boolean;
  favoriteEnabled: boolean;
  sourceLibraryView: 'all';
  sourceLibrarySearch: string;
  toggleFavorite: (id: string) => void;
  setSelected: (selection: { program: Program; autoplayVideo: boolean }) => void;
  primaryActionLabel: string;
  onAddToSession?: (program: Program) => void;
  addingProgramId: string | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {programs.map((program, index) => (
        <ProgramCard
          key={program.id}
          program={program}
          locked={program.isPro && !isPremium}
          favorite={isFavorite(program.id)}
          favoriteEnabled={favoriteEnabled}
          detailHref={getLibraryProgramDetailHref(program.id, sourceLibraryView, sourceLibrarySearch)}
          priority={index < 4}
          onFavorite={() => toggleFavorite(program.id)}
          onPreview={() =>
            setSelected({
              program,
              autoplayVideo: programHasPlayableVideo(program),
            })
          }
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onAddToSession ? () => onAddToSession(program) : undefined}
          primaryActionDisabled={addingProgramId !== null || program.isPro && !isPremium}
        />
      ))}
    </div>
  );
}
