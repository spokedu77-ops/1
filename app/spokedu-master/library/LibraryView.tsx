'use client';

import {
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  FileText,
  Lock,
  MonitorPlay,
  Play,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { LessonPreviewContent } from '../components/lesson/LessonPreviewContent';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import {
  LESSON_TAG_PREFIX,
  getLessonTheme,
  parseTaggedValues,
} from '../lib/lessonDisplay';
import { LESSON_THEME_OPTIONS } from '../lib/lessonTheme';
import { resolveProgramHero } from '../lib/program-media';
import {
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import {
  findOfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { useIsPro, useMasterStore } from '../store';
import type { Program } from '../types';

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
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  return related.some((id) => Boolean(findOfficialSpomovePreset(id)));
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
    ...(program.lessonDetail?.videoUrl ? ['참고 영상'] : []),
    ...(hasSpomoveLink(program) ? ['SPOMOVE 연결'] : []),
  ];
}

function matchesFilter(program: Program, filter: ActiveFilter) {
  return filter == null || getStructuredValues(program, filter.group).includes(filter.value);
}

function getHeroImage(program: Program) {
  return resolveProgramHero(program);
}

function getParentCopy(program: Program) {
  return program.lessonDetail?.parentNote?.trim() ?? '';
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
}: {
  program: Program;
  locked: boolean;
  favorite: boolean;
  used: boolean;
  onPreview: () => void;
  onFavorite: () => void;
}) {
  const heroImage = getHeroImage(program);
  const meta = getCardMetaLine(program);
  const hasVideo = Boolean(program.lessonDetail?.videoUrl);

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={onPreview}
        className={`${THUMBNAIL_FRAME} block w-full border border-slate-200 bg-white text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-indigo-200 group-hover:shadow-[0_18px_38px_rgba(99,102,241,0.14)]`}
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
            <span className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-white px-3 text-[12px] font-black text-slate-950 shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
              {hasVideo ? '영상 미리보기' : '수업 미리보기'}
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onFavorite}
        className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur transition ${
          favorite
            ? 'bg-amber-50 text-amber-600'
            : 'bg-white/90 text-slate-500 hover:bg-white hover:text-slate-900'
        }`}
        aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
}

function ProgramModal({
  program,
  isPro,
  favorite,
  onFavorite,
  onClose,
}: {
  program: Program;
  isPro: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const locked = program.isPro && !isPro;
  const parentCopy = getParentCopy(program);

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <BottomSheet open title="빠른 미리보기" onClose={onClose} size="document">
      <LessonPreviewContent
        program={program}
        badges={
          <>
            {locked ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">PRO 전용</span> : null}
            {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">SPOMOVE 명시 연결</span> : null}
          </>
        }
        footer={
          <div className="sticky bottom-0 z-10 grid grid-cols-[1fr_auto] gap-2 rounded-[10px] border border-slate-200 bg-white/95 p-2 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:grid-cols-3">
            {parentCopy ? (
              <button type="button" onClick={copyParentNote} className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
                <Clipboard className="h-4 w-4" />
                {copied ? '복사 완료' : '문구 복사'}
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={onFavorite} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black sm:px-4 ${favorite ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`} aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기'}>
              <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">즐겨찾기</span>
            </button>
            <button type="button" onClick={() => window.print()} className="hidden h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 sm:inline-flex">
              <FileText className="h-4 w-4" />
              인쇄
            </button>
          </div>
        }
      />
    </BottomSheet>
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
  const { programs, programsLoaded, programsError, classRecords, favorites, toggleFavorite } = useMasterStore();
  const isPro = useIsPro();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ActiveFilter>(null);
  const [selected, setSelected] = useState<Program | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const pool = useMemo(() => buildProgramPool(programs), [programs]);
  const usedProgramIds = useMemo(
    () => new Set(classRecords.map((record) => record.programId)),
    [classRecords],
  );

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return pool.filter((program) => {
      const queryMatched = normalizedQuery.length === 0 || getSearchText(program).includes(normalizedQuery);
      return queryMatched && matchesFilter(program, filter);
    });
  }, [filter, pool, query]);

  const packageStats = useMemo(() => {
    const videoCount = pool.filter((program) => program.lessonDetail?.videoUrl).length;
    const spomoveCount = pool.filter(hasSpomoveLink).length;
    const lessonPlanCount = pool.filter(
      (program) => program.steps.length > 0 || Boolean(program.lessonDetail?.objective),
    ).length;
    return [
      { label: '전체 수업', value: pool.length },
      { label: '영상 포함', value: videoCount },
      { label: 'SPOMOVE', value: spomoveCount },
      { label: '수업안', value: lessonPlanCount },
    ];
  }, [pool]);

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
      for (const program of pool) {
        for (const value of getStructuredValues(program, definition.key)) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const options = Array.from(counts, ([value, count]) => ({ value, count })).sort(
        (a, b) => b.count - a.count || a.value.localeCompare(b.value, 'ko'),
      );
      return options.length > 0 ? [{ ...definition, options }] : [];
    });
  }, [pool]);

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
          ? '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다. 30일 이용권을 다시 결제하면 수업 자료를 이용할 수 있습니다.'
          : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto bg-[#f5f7fb] px-4 py-16 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl rounded-[18px] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <Lock className="mx-auto h-6 w-6 text-slate-400" />
          <h1 className="mt-3 text-xl font-black text-slate-950">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          <Link href="/spokedu-master/subscription" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">
            30일 이용권 다시 결제하기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-7 overflow-y-auto bg-[#f5f7fb] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          {/* 헤더 상단: 타이틀 + 통계 + 검색 */}
          <div className="border-b border-slate-200 p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-500">
                  Master Library
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
                  조건에 맞는 수업 찾기
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  대상, 공간, 기능과 자료 조건을 선택해 필요한 수업을 빠르게 확인하세요.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {packageStats.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                    <p className="text-[11px] font-black text-slate-400">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="수업명, 설명, 교구, 태그 검색"
                  className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400 focus:border-indigo-300"
                />
              </label>
              <Link href="/spokedu-master/spomove" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 text-sm font-extrabold text-indigo-700">
                <MonitorPlay className="h-4 w-4" />
                SPOMOVE
              </Link>
            </div>
          </div>

          {/* 필터 영역 */}
          <div className="bg-slate-50/80 px-5 py-4 sm:px-7">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black text-slate-700">필터</p>
              {filter ? (
                <button type="button" onClick={() => setFilter(null)} className="text-[12px] font-black text-indigo-600">
                  전체 보기
                </button>
              ) : null}
            </div>

            {/* 기본 필터: 대상 / 공간 / 자료 */}
            <div className="mt-3 space-y-2.5">
              {basicGroups.map((group) => (
                <FilterRow key={group.key} group={group} filter={filter} onFilter={setFilter} />
              ))}
            </div>

            {/* 상세 필터 토글 버튼 */}
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="mt-4 flex items-center gap-1.5 text-[12px] font-black text-slate-500 hover:text-slate-800"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              신체 기능 · 움직임 · 테마
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 상세 필터: 신체 기능 / 움직임 / 테마 */}
            {isAdvancedOpen ? (
              <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
                {advancedGroups.map((group) => (
                  <FilterRow key={group.key} group={group} filter={filter} onFilter={setFilter} />
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle
              eyebrow="Programs"
              title={query || filter ? `검색 결과 ${filteredPrograms.length}개` : `전체 수업 ${filteredPrograms.length}개`}
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
            isPro={isPro}
            favorites={favorites}
            usedProgramIds={usedProgramIds}
            toggleFavorite={toggleFavorite}
            setSelected={setSelected}
          />
          {filteredPrograms.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-black text-slate-950">조건에 맞는 수업이 없습니다.</h3>
              <p className="mt-2 text-sm text-slate-400">검색어를 줄이거나 선택한 필터를 해제해 보세요.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setFilter(null);
                }}
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-black text-white"
              >
                검색 초기화
              </button>
            </div>
          ) : null}
        </section>
      </main>

      {selected ? (
        <ProgramModal
          program={selected}
          isPro={isPro}
          favorite={favorites.includes(selected.id)}
          onFavorite={() => toggleFavorite(selected.id)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function ProgramGrid({
  programs,
  isPro,
  favorites,
  usedProgramIds,
  toggleFavorite,
  setSelected,
}: {
  programs: Program[];
  isPro: boolean;
  favorites: string[];
  usedProgramIds: Set<string>;
  toggleFavorite: (id: string) => void;
  setSelected: (program: Program) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {programs.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          locked={program.isPro && !isPro}
          favorite={favorites.includes(program.id)}
          used={usedProgramIds.has(program.id)}
          onFavorite={() => toggleFavorite(program.id)}
          onPreview={() => setSelected(program)}
        />
      ))}
    </div>
  );
}
