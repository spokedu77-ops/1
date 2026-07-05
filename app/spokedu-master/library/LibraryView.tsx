'use client';

import {
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Lock,
  Play,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ProgramPreviewModal } from '../components/lesson/ProgramPreviewModal';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import { getFavoritesOwnerId } from '../lib/favoriteLib';
import {
  LESSON_TAG_PREFIX,
  getLessonTheme,
  parseTaggedValues,
} from '../lib/lessonDisplay';
import { LESSON_THEME_OPTIONS } from '../lib/lessonTheme';
import { programHasPlayableVideo, resolveProgramHero } from '../lib/program-media';
import {
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import { getSupportedOfficialSpomovePresets } from '../lib/program-meta';
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
  type LibraryViewMode,
} from './libraryViewModel';
import { getLibraryProgramDetailHref } from './libraryNavigation';

const THUMBNAIL_FRAME =
  'relative aspect-[6/5] w-full max-w-[1250px] overflow-hidden rounded-2xl';

// Display-only label mapping — stored matching value는 변경하지 않음
const TARGET_LABEL: Record<string, string> = {
  '초등학생 이상': '초등학생',
};
const MOVEMENT_LABEL: Record<string, string> = {
  '조작운동기술': '조작',
  '이동운동기술': '이동',
  '안정운동기술': '안정',
};
const MATERIAL_LABEL: Record<string, string> = {
  '참고 영상': '영상',
  'SPOMOVE 연결': 'SPOMOVE',
};
const MATERIAL_VIDEO_VALUE = '참고 영상';
const MATERIAL_SPOMOVE_VALUE = 'SPOMOVE 연결';

type FilterGroupKey = 'target' | 'space' | 'function' | 'movement' | 'theme' | 'material';

type ActiveFilter = {
  group: FilterGroupKey;
  value: string;
} | null;

type FilterGroup = {
  key: FilterGroupKey;
  label: string;
  options: Array<{ value: string; count: number }>;
};

function tagDisplayLabel(group: FilterGroupKey, value: string): string {
  if (group === 'target') return TARGET_LABEL[value] ?? value;
  if (group === 'movement') return MOVEMENT_LABEL[value] ?? value;
  if (group === 'material') return MATERIAL_LABEL[value] ?? value;
  return value;
}

function hasSpomoveLink(program: Program) {
  return getSupportedOfficialSpomovePresets(program).length > 0;
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

function uniquePrograms(programs: Program[]) {
  const seen = new Set<string>();
  return programs.filter((program) => {
    const key = normalizeTitle(program.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildProgramPool(programs: Program[]) {
  return uniquePrograms(programs);
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
  return [
    ...(program.lessonDetail?.videoUrl ? [MATERIAL_VIDEO_VALUE] : []),
    ...(hasSpomoveLink(program) ? [MATERIAL_SPOMOVE_VALUE] : []),
  ];
}

function matchesFilter(program: Program, filter: ActiveFilter) {
  return filter == null || getStructuredValues(program, filter.group).includes(filter.value);
}

function getHeroImage(program: Program) {
  return resolveProgramHero(program);
}

function getSearchText(program: Program) {
  return [
    program.title,
    program.category,
    program.grade,
    program.space,
    program.description,
    program.equipment.join(' '),
    program.tags.join(' '),
    program.lessonDetail?.developmentFocus,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isPlaceholderText(value?: string | number | null) {
  const text = String(value ?? '').trim();
  return !text || /확인 필요|활동 공간 확인|미정|undefined|null|NaN/i.test(text);
}

// 카드 메타 라인: "초등학생 · 교실 · 협응력" 형태, 최대 3개
function getCardMetaLine(program: Program): string {
  const targets = parseMasterTargets(program.grade);
  const target = targets[0] ? (TARGET_LABEL[targets[0]] ?? targets[0]) : null;

  const spaces = parseMasterSpaces(program.space);
  const space = spaces[0] && !isPlaceholderText(spaces[0]) ? spaces[0] : null;

  const bodyFns = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction);
  const movements = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.movement);
  const theme = getLessonTheme(program);

  const core =
    (bodyFns[0] && !isPlaceholderText(bodyFns[0]) ? bodyFns[0] : null) ??
    (movements[0] ? (MOVEMENT_LABEL[movements[0]] ?? movements[0]) : null) ??
    (theme || null);

  return [target, space, core].filter(Boolean).join(' · ');
}

function getCardDecisionItems(program: Program) {
  const target = parseMasterTargets(program.grade)[0];
  const space = parseMasterSpaces(program.space)[0];
  const bodyFn = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction)[0];
  const movement = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.movement)[0];
  const activityType = bodyFn ?? movement ?? getLessonTheme(program);
  return [
    target ? `대상 ${TARGET_LABEL[target] ?? target}` : null,
    program.duration ? `${program.duration}분` : null,
    space && !isPlaceholderText(space) ? `공간 ${space}` : null,
    activityType ? `활동 ${MOVEMENT_LABEL[activityType] ?? activityType}` : null,
    program.equipment.length ? `준비물 ${program.equipment.length}개` : '준비물 없음',
  ].filter(Boolean);
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black tracking-[0.14em] text-indigo-500">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
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
}: {
  program: Program;
  locked: boolean;
  favorite: boolean;
  used: boolean;
  onPreview: () => void;
  onFavorite: () => void;
  favoriteEnabled: boolean;
  detailHref: string;
}) {
  const heroImage = getHeroImage(program);
  const meta = getCardMetaLine(program);
  const hasVideo = programHasPlayableVideo(program);
  const decisionItems = getCardDecisionItems(program);

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={onPreview}
        className={`${THUMBNAIL_FRAME} block w-full border border-slate-200 bg-white text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-[0_18px_38px_rgba(99,102,241,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}
        aria-label={`${program.title} 수업 미리보기`}
      >
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt=""
              fill
              sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
              className="object-cover object-[center_38%] transition duration-500 group-hover:scale-[1.015]"
              unoptimized
            />
          </>
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-100 via-slate-50 to-white">
            <CategoryIcon category={program.category} size={42} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/82 via-slate-950/20 to-transparent" />

        <div className="absolute left-3 top-3 flex gap-1">
          {hasVideo ? (
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white shadow-md">
              참고 영상
            </span>
          ) : null}
          {hasSpomoveLink(program) ? (
            <span className="rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-indigo-700 shadow-md backdrop-blur">
              SPOMOVE
            </span>
          ) : null}
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white">
              <Lock className="h-3 w-3" />
              PRO
            </span>
          ) : null}
        </div>

        {hasVideo ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-indigo-600 shadow-xl ring-4 ring-white/30 backdrop-blur transition-transform duration-300 group-hover:scale-105">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-8">
          <h3 className="line-clamp-2 text-[15px] font-black leading-[1.18] text-white sm:text-[16px]">
            {program.title}
          </h3>
          {meta ? (
            <p className="mt-1 line-clamp-1 text-[12px] font-semibold leading-4 text-white/72">
              {meta}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            {used ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-400/90 px-2.5 py-1 text-[10px] font-black text-emerald-950"
                title="사용 이력 있음"
              >
                <Check className="h-3 w-3" />
                사용함
              </span>
            ) : (
              <span />
            )}
            <span />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onFavorite();
        }}
        className={`absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 ${
          favorite
            ? 'bg-amber-50 text-amber-600'
            : 'bg-white/90 text-slate-500 hover:bg-white hover:text-slate-900'
        }`}
        aria-pressed={favorite}
        aria-label={favorite ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
        disabled={!favoriteEnabled}
      >
        <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={onPreview} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-[12px] font-black text-slate-700 ring-1 ring-slate-200">
          수업 미리보기
        </button>
        {locked ? (
          <Link href="/spokedu-master/payment?plan=premium" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-indigo-600 px-3 text-[12px] font-black text-white ring-1 ring-indigo-600">
            프리미엄 자료
          </Link>
        ) : (
          <Link href={detailHref} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-[12px] font-black text-slate-700 ring-1 ring-slate-200">
            전체 자료 보기
          </Link>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {decisionItems.map((item) => (
          <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">{item}</span>
        ))}
      </div>
    </article>
  );
}

function FilterRow({
  group,
  filter,
  onFilter,
}: {
  group: FilterGroup;
  filter: ActiveFilter;
  onFilter: (next: ActiveFilter) => void;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
      <p className="text-[11px] font-black text-slate-400">{group.label}</p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {group.options.map((option) => {
          const active = filter?.group === group.key && filter.value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilter(active ? null : { group: group.key, value: option.value })}
              className={`h-8 shrink-0 rounded-full px-3 text-[11px] font-black transition ${
                active
                  ? 'bg-slate-950 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
              }`}
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
  const [filter, setFilter] = useState<ActiveFilter>(() => {
    const group = searchParams.get('filterGroup') as FilterGroupKey | null;
    const value = searchParams.get('filter');
    const allowedGroups: FilterGroupKey[] = ['target', 'space', 'function', 'movement', 'theme', 'material'];
    return group && value && allowedGroups.includes(group) ? { group, value } : null;
  });
  const view = parseLibraryView(searchParams.get('view'));
  const [selected, setSelected] = useState<{ program: Program; autoplayVideo: boolean } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const pool = useMemo(() => buildProgramPool(programs), [programs]);

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
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set('q', trimmedQuery);
    if (filter) {
      params.set('filterGroup', filter.group);
      params.set('filter', filter.value);
    }
    params.set('view', view);
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `/spokedu-master/library?${next}` : '/spokedu-master/library', { scroll: false });
  }, [filter, query, view, router, searchParams]);

  const filteredPrograms = useMemo(
    () =>
      filterLibraryPrograms(
        viewPool,
        query,
        (program, normalizedQuery) => getSearchText(program).includes(normalizedQuery),
        (program) => matchesFilter(program, filter),
      ),
    [filter, viewPool, query],
  );
  const favoritesEmptyState = getFavoritesEmptyState(
    view,
    validFavoriteCount,
    query.trim().length > 0,
    filter != null,
    filteredPrograms.length,
  );

  const changeView = (nextView: LibraryViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', nextView);
    router.push(`/spokedu-master/library?${params.toString()}`, { scroll: false });
  };

  const packageStats = useMemo(() => {
    const videoCount = viewPool.filter((program) =>
      getStructuredValues(program, 'material').includes(MATERIAL_VIDEO_VALUE),
    ).length;
    const spomoveCount = viewPool.filter((program) =>
      getStructuredValues(program, 'material').includes(MATERIAL_SPOMOVE_VALUE),
    ).length;
    return { videoCount, spomoveCount };
  }, [viewPool]);

  const filterGroups = useMemo<FilterGroup[]>(() => {
    const definitions: Array<{ key: FilterGroupKey; label: string }> = [
      { key: 'target', label: '대상' },
      { key: 'space', label: '공간' },
      { key: 'material', label: '자료' },
      { key: 'function', label: '신체 기능' },
      { key: 'movement', label: '움직임' },
      { key: 'theme', label: '테마' },
    ];

    return definitions.flatMap((definition) => {
      const counts = new Map<string, number>();
      for (const program of viewPool) {
        for (const value of getStructuredValues(program, definition.key)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const options = Array.from(counts, ([value, count]) => ({ value, count })).sort(
        (a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'),
      );
      return options.length > 0 ? [{ ...definition, options }] : [];
    });
  }, [viewPool]);

  const basicGroups = useMemo(
    () => filterGroups.filter((g) => (['target', 'space', 'material'] as FilterGroupKey[]).includes(g.key)),
    [filterGroups],
  );
  const advancedGroups = useMemo(
    () => filterGroups.filter((g) => (['function', 'movement', 'theme'] as FilterGroupKey[]).includes(g.key)),
    [filterGroups],
  );

  // 상세 필터에 활성 값이 있으면 자동 펼침
  const advancedHasActive =
    filter != null && (['function', 'movement', 'theme'] as FilterGroupKey[]).includes(filter.group);
  const isAdvancedOpen = showAdvanced || advancedHasActive;

  if (pool.length === 0) {
    if (!programsLoaded) return <LibrarySkeleton />;
    const message =
      programsError === 'unauthorized'
        ? '로그인 후 수업 자료를 확인할 수 있습니다.'
        : programsError === 'forbidden'
          ? '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 이용권을 구독하면 수업 자료를 이용할 수 있습니다.'
          : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-16 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl rounded-[18px] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-slate-400" />
          <h1 className="mt-3 text-xl font-black text-slate-950">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <Link href="/spokedu-master/subscription" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">
            이용권 다시 구독하기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-7 overflow-y-auto bg-[#f5f7fb] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="rounded-[18px] border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-indigo-500">
                  Master Library
                </p>
                <h1 className="mt-1 text-[22px] font-black text-slate-950 sm:text-2xl">
                  조건에 맞는 수업 찾기
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  결과 {filteredPrograms.length}개
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  영상 {packageStats.videoCount}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  SPOMOVE {packageStats.spomoveCount}
                </span>
              </div>
            </div>

            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="수업명, 교구, 태그 검색"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="grid min-h-10 grid-cols-2 items-center rounded-xl border border-slate-200 bg-slate-50 p-1"
                aria-label="라이브러리 보기"
              >
                <button
                  type="button"
                  onClick={() => changeView('all')}
                  className={`min-h-8 rounded-lg px-3 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    view === 'all'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-pressed={view === 'all'}
                >
                  전체 <span className="ml-1 text-[11px] opacity-60">{pool.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => changeView('favorites')}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    view === 'favorites'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-pressed={view === 'favorites'}
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  저장 <span className="text-[11px] opacity-60">{validFavoriteCount}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFilter(filter?.group === 'material' && filter.value === MATERIAL_VIDEO_VALUE ? null : { group: 'material', value: MATERIAL_VIDEO_VALUE })}
                className={`h-10 rounded-xl px-3 text-[12px] font-black transition ${
                  filter?.group === 'material' && filter.value === MATERIAL_VIDEO_VALUE
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
                }`}
                aria-pressed={filter?.group === 'material' && filter.value === MATERIAL_VIDEO_VALUE}
              >
                영상 {packageStats.videoCount}
              </button>
              <button
                type="button"
                onClick={() => setFilter(filter?.group === 'material' && filter.value === MATERIAL_SPOMOVE_VALUE ? null : { group: 'material', value: MATERIAL_SPOMOVE_VALUE })}
                className={`h-10 rounded-xl px-3 text-[12px] font-black transition ${
                  filter?.group === 'material' && filter.value === MATERIAL_SPOMOVE_VALUE
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
                }`}
                aria-pressed={filter?.group === 'material' && filter.value === MATERIAL_SPOMOVE_VALUE}
              >
                SPOMOVE {packageStats.spomoveCount}
              </button>
              {filter ? (
                <button type="button" onClick={() => setFilter(null)} className="h-10 px-2 text-[12px] font-black text-indigo-600">
                  초기화
                </button>
              ) : null}
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              {basicGroups.map((group) => (
                <FilterRow key={group.key} group={group} filter={filter} onFilter={setFilter} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-slate-800"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              신체 기능 · 움직임 · 테마
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAdvancedOpen ? (
              <div className="space-y-2.5 border-t border-slate-200 pt-3">
                {advancedGroups.map((group) => (
                  <FilterRow key={group.key} group={group} filter={filter} onFilter={setFilter} />
                ))}
              </div>
            ) : null}
          </div>
        </header>

        {view === 'all' && recentProgramRecords.length > 0 ? (
          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-600">Recent programs</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">최근 사용한 수업</h2>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {recentProgramRecords.map(({ program, record }) => (
                <article key={program.id} className="rounded-[14px] border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold text-slate-400">
                    {new Date(record.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} · {record.classId}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-[14px] font-black leading-tight text-slate-950">{program.title}</h3>
                  <div className="mt-3 grid gap-2">
                    <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-3 text-[12px] font-black text-slate-700 ring-1 ring-slate-200">
                      전체 수업 자료 보기
                    </Link>
                    <Link href={`/spokedu-master/class-record?record=${record.id}&program=${program.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-3 text-[12px] font-black text-white">
                      기록 보기
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
              eyebrow="Programs"
              title={
                view === 'favorites'
                  ? (query || filter ? `즐겨찾기 결과 ${filteredPrograms.length}개` : `즐겨찾기한 수업 ${filteredPrograms.length}개`)
                  : (query || filter ? `검색 결과 ${filteredPrograms.length}개` : `전체 수업 ${filteredPrograms.length}개`)
              }
            />
            {filter ? (
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="mb-4 inline-flex h-9 items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-black text-indigo-700"
              >
                {tagDisplayLabel(filter.group, filter.value)} ×
              </button>
            ) : null}
          </div>
          <ProgramGrid
            programs={filteredPrograms}
            isPremium={isPremium}
            isFavorite={(programId) => isFavoriteProgram(ownerId, programId)}
            favoriteEnabled={ownerId != null}
            sourceLibraryView={view}
            usedProgramIds={usedProgramIds}
            toggleFavorite={(id) => toggleFavoriteProgram(ownerId, id)}
            setSelected={setSelected}
          />
          {filteredPrograms.length === 0 ? (
            favoritesEmptyState === 'no-favorites' ? (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-8 text-center">
                <Bookmark className="mx-auto h-10 w-10 text-slate-400" />
                <h3 className="mt-4 text-lg font-black text-slate-950">아직 즐겨찾기한 수업이 없습니다.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
                  자주 사용하는 수업을 저장해 두면 여기에서 빠르게 다시 찾을 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => changeView('all')}
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  전체 수업 둘러보기
                </button>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-8 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {view === 'favorites' ? '조건에 맞는 즐겨찾기 수업이 없습니다.' : '조건에 맞는 수업이 없습니다.'}
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  검색어를 줄이거나 선택한 필터를 해제해 보세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setFilter(null);
                  }}
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {programs.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          locked={program.isPro && !isPremium}
          favorite={isFavorite(program.id)}
          favoriteEnabled={favoriteEnabled}
          detailHref={getLibraryProgramDetailHref(program.id, sourceLibraryView)}
          used={usedProgramIds.has(program.id)}
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
