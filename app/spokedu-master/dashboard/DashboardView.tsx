'use client';

import { Play, Search, Sparkles, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { CategoryIcon } from '../components/ui/ProgramThumb';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { useMasterStore } from '../store';
import type { Program } from '../types';

const CATEGORIES = ['전체', '참고 영상', '민첩·반응', '협동', '저학년', '실내 가능'];

type VideoItem = {
  id: string;
  title: string;
  href: string;
  thumbnail?: string;
  meta: string;
  hasVideo: boolean;
  tags: string[];
  program?: Program;
};

function isPlaceholderText(value: string | undefined) {
  const text = (value ?? '').trim();
  return !text || hasBrokenText(text) || /확인 필요|활동 공간 확인|조정|미정|undefined|null/i.test(text);
}

function displayText(value: string | undefined, fallback: string) {
  const text = cleanText(value, fallback);
  return isPlaceholderText(text) ? fallback : text;
}

function getProgramTitle(program: Program) {
  return displayText(program.title, 'SPOKEDU 수업');
}

function getProgramCategory(program: Program) {
  return displayText(program.category, '체육 수업');
}

function getProgramGrade(program: Program) {
  return displayText(program.grade, '');
}

function getProgramSpace(program: Program) {
  return displayText(program.space, '');
}

function getHeroImage(program: Program | undefined) {
  return program?.lessonDetail?.heroImageUrl || program?.thumbnailUrl;
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

function uniquePrograms(programs: Program[]) {
  const seen = new Set<string>();
  return programs.filter((program) => {
    const key = normalizeTitle(getProgramTitle(program));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildProgramPool(programs: Program[]) {
  return uniquePrograms(programs.length > 0 ? programs : STATIC_PROGRAMS);
}

function normalizeImageSrc(src: string) {
  if (!src.includes('img.youtube.com')) return src;
  return src
    .replace('/mqdefault.jpg', '/maxresdefault.jpg')
    .replace('/hqdefault.jpg', '/maxresdefault.jpg')
    .replace('/default.jpg', '/maxresdefault.jpg');
}

function getImageFallbackSrc(src: string) {
  if (!src.includes('img.youtube.com') || !src.includes('/maxresdefault.jpg')) return undefined;
  return src.replace('/maxresdefault.jpg', '/hqdefault.jpg');
}

function isRemoteImage(src: string) {
  return /^https?:\/\//.test(src);
}

function CoverImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
  quality = 90,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
  quality?: number;
}) {
  const imageSrc = normalizeImageSrc(src);

  if (isRemoteImage(imageSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full ${className}`}
        loading={priority ? 'eager' : 'lazy'}
        onError={(event) => {
          const fallback = getImageFallbackSrc(imageSrc);
          if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
        }}
      />
    );
  }

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      quality={quality}
    />
  );
}

function getProgramTags(program: Program) {
  const tags = [getProgramCategory(program), getProgramGrade(program), getProgramSpace(program), ...program.tags]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item));
  return Array.from(new Set(tags)).slice(0, 4);
}

function getCardTags(program: Program) {
  const focusTags = (program.lessonDetail?.developmentFocus ?? '')
    .split(/[\/,·]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tags = [
    getProgramGrade(program),
    getProgramSpace(program),
    ...focusTags,
    ...program.tags,
    ...(program.lessonDetail?.videoUrl ? ['참고 영상'] : []),
  ]
    .filter(Boolean)
    .filter((item) => !isPlaceholderText(item));
  return Array.from(new Set(tags)).slice(0, 5);
}

function CompactTagList({ tags, max = 3, className = '' }: { tags: string[]; max?: number; className?: string }) {
  const visibleTags = tags.slice(0, max);
  const hiddenCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {visibleTags.map((tag) => (
        <span key={tag} className="max-w-full shrink-0 whitespace-nowrap rounded-md border border-white/16 bg-white/10 px-2 py-1 text-[11px] font-semibold leading-none text-white/85 backdrop-blur-sm">
          {tag}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="shrink-0 whitespace-nowrap rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold leading-none text-zinc-300">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function getSearchText(program: Program) {
  return [
    getProgramTitle(program),
    getProgramCategory(program),
    getProgramGrade(program),
    getProgramSpace(program),
    program.description,
    program.tags.join(' '),
    program.equipment.join(' '),
    program.lessonDetail?.developmentFocus,
  ]
    .filter(Boolean)
    .join(' ');
}

function programMatchesCategory(program: Program, category: string) {
  const text = getSearchText(program);
  if (category === '전체') return true;
  if (category === '참고 영상') return Boolean(program.lessonDetail?.videoUrl);
  if (category === '민첩·반응') return /민첩|반응|순발|스피드|속도|방향|전환/.test(text);
  if (category === '협동') return /협동|릴레이|팀|짝|그룹|대항/.test(text);
  if (category === '저학년') return /유아|저학년|1학년|2학년|초등\s*[12]|초등 1|초등 2/.test(text);
  if (category === '실내 가능') return /실내|체육관|교실|복도|좁은 공간/.test(text);
  return true;
}

function getHomeReadiness(program: Program) {
  const detail = program.lessonDetail;
  const checks = [
    Boolean(getHeroImage(program)),
    Boolean(detail?.videoUrl),
    Boolean(detail?.rules?.length || program.steps.length),
    Boolean(detail?.setupNotes?.length || program.equipment.length),
    Boolean(detail?.developmentFocus || program.category),
  ];
  const penalty = [program.title, program.category, program.grade, program.space, program.description, detail?.objective].filter(isPlaceholderText).length;
  return checks.filter(Boolean).length - penalty;
}

function compareHomePrograms(a: Program, b: Program) {
  return (
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(Boolean(b.lessonDetail?.videoUrl)) - Number(Boolean(a.lessonDetail?.videoUrl)) ||
    Number(b.isHot) - Number(a.isHot) ||
    getHomeReadiness(b) - getHomeReadiness(a) ||
    Number(b.isNew) - Number(a.isNew)
  );
}

function toVideoItem(program: Program): VideoItem {
  const tags = getProgramTags(program);
  return {
    id: program.id,
    title: getProgramTitle(program),
    href: `/spokedu-master/library/${program.id}`,
    thumbnail: getHeroImage(program),
    meta: tags[0] || '체육 수업',
    hasVideo: Boolean(program.lessonDetail?.videoUrl),
    tags: getCardTags(program),
    program,
  };
}

function pickHeroProgram(programs: Program[]) {
  return [...buildProgramPool(programs)].sort(compareHomePrograms)[0];
}

function takeUniquePrograms(programs: Program[], usedIds: Set<string>, limit: number) {
  const selected: Program[] = [];
  for (const program of programs) {
    if (usedIds.has(program.id)) continue;
    selected.push(program);
    usedIds.add(program.id);
    if (selected.length >= limit) break;
  }
  return selected;
}

function Hero({ program }: { program: Program }) {
  const heroImage = getHeroImage(program);
  const tags = getProgramTags(program);

  return (
    <section className="relative h-[58vh] min-h-[430px] overflow-hidden sm:min-h-[470px]">
      <div className="absolute inset-0">
        {heroImage ? (
          <CoverImage src={heroImage} alt={getProgramTitle(program)} sizes="(min-width: 1024px) 1200px, 100vw" className="scale-105 object-cover" priority quality={92} />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(139,92,246,0.26),transparent_34%),linear-gradient(135deg,#09090b,#18181b_55%,#020617)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/44 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/78 via-[#0a0a0a]/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,10,0.12)_100%)]" />
      </div>

      <div className="relative flex h-full items-end px-6 pb-18 sm:px-8 sm:pb-22 lg:px-10">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-gradient-to-r from-white/[0.12] to-white/[0.08] px-4 py-2 shadow-xl backdrop-blur-xl">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            <Sparkles className="h-[15px] w-[15px] text-violet-300" />
            <span className="text-[13px] font-medium tracking-wide text-white">이번 주 추천</span>
          </div>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-6xl xl:text-7xl">
            {getProgramTitle(program)}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[15px]">
            <div className="flex items-center gap-1.5">
              <Star className="h-[15px] w-[15px] fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-white">큐레이션</span>
            </div>
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-zinc-300">
                <span className="mr-4 text-zinc-500">•</span>
                {tag}
              </span>
            ))}
          </div>

          <p className="max-w-xl text-[15px] leading-relaxed text-zinc-300 sm:text-[17px]">
            {displayText(program.lessonDetail?.objective || program.description, '수업 전 확인할 수업안과 참고 자료를 제공합니다.')}
          </p>

          <div className="flex gap-3 pt-1 sm:gap-4 sm:pt-2">
            <Link href={`/spokedu-master/library/${program.id}`} className="group inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3.5 text-[14px] font-semibold text-black shadow-2xl transition hover:scale-[1.02] hover:bg-zinc-100 hover:shadow-white/20 active:scale-[0.98] sm:px-8 sm:py-4 sm:text-[15px]">
              <Play className="h-5 w-5 fill-black transition-transform group-hover:scale-110" />
              수업안 열기
            </Link>
            <Link href="/spokedu-master/library" className="rounded-xl border border-white/20 bg-white/[0.12] px-5 py-3.5 text-[14px] font-semibold text-white shadow-xl backdrop-blur-xl transition hover:scale-[1.02] hover:border-white/30 hover:bg-white/20 active:scale-[0.98] sm:px-8 sm:py-4 sm:text-[15px]">
              전체 수업 보기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryStrip({
  activeCategory,
  search,
  onCategoryChange,
  onSearchChange,
}: {
  activeCategory: string;
  search: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <section className="relative z-10 -mt-12 mb-7 px-6 sm:-mt-14 sm:mb-9 sm:px-8 lg:px-10">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex min-w-0 flex-wrap gap-2 sm:gap-3">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-3 text-[13px] font-semibold transition-all sm:px-6 sm:text-[14px] ${
                activeCategory === category
                  ? 'scale-105 bg-white text-black shadow-2xl shadow-white/20'
                  : 'border border-white/[0.08] bg-white/[0.06] text-zinc-400 hover:scale-105 hover:border-white/20 hover:bg-white/[0.12] hover:text-white active:scale-95'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-[420px] shrink-0">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="수업, 활동 검색"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.06] py-3 pl-12 pr-4 text-[15px] text-white transition-all placeholder:text-zinc-500 focus:border-white/20 focus:bg-white/[0.1] focus:outline-none"
          />
        </label>
      </div>
    </section>
  );
}

const CURATION_SUMMARY = [
  { title: '금주 추천', desc: '이번 주 대표 수업안' },
  { title: '영상 먼저', desc: '움직임 확인 후 준비' },
  { title: '실내 수업', desc: '좁은 공간도 운영' },
];

function CurationSummary() {
  return (
    <section className="px-6 pb-7 sm:px-8 lg:px-10">
      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {CURATION_SUMMARY.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/[0.08] bg-white/[0.055] px-4 py-3 shadow-[0_10px_34px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <p className="text-[13px] font-black text-white">{item.title}</p>
            <p className="mt-1 text-[12px] font-semibold leading-4 text-zinc-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function VideoCard({ item }: { item: VideoItem }) {
  return (
    <Link href={item.href} className="group block cursor-pointer">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.05] transition-all duration-500 group-hover:ring-white/20">
        {item.thumbnail ? (
          <CoverImage src={item.thumbnail} alt={item.title} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-all duration-700 ease-out group-hover:scale-110" quality={90} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-zinc-900">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.08] text-zinc-300 ring-1 ring-white/10">
              {item.program ? <CategoryIcon category={getProgramCategory(item.program)} size={30} /> : <Play className="h-7 w-7" />}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/0 via-transparent to-fuchsia-600/0 transition-all duration-700 group-hover:from-violet-600/10 group-hover:to-fuchsia-600/10" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100">
          <div className="relative">
            <div className="absolute inset-0 scale-150 rounded-full bg-white/20 blur-xl" />
            <div className="relative flex h-16 w-16 scale-75 items-center justify-center rounded-full bg-white/95 shadow-2xl ring-2 ring-white/20 backdrop-blur-md transition-transform duration-500 group-hover:scale-100">
              <Play className="ml-1 h-7 w-7 fill-black text-black" />
            </div>
          </div>
        </div>

        <div className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/80 px-3 py-1.5 text-[13px] font-medium text-white opacity-90 shadow-xl backdrop-blur-xl transition-opacity group-hover:opacity-100">
          {item.meta}
        </div>

        <div className="absolute bottom-0 left-0 right-0 translate-y-2 p-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <CompactTagList tags={item.tags} max={4} />
        </div>
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-semibold leading-snug text-white transition-colors duration-300 group-hover:text-zinc-200">
        {item.title}
      </h3>
      <CompactTagList tags={item.tags} max={3} className="mt-2" />
    </Link>
  );
}

function VideoRow({ title, subtitle, videos }: { title: string; subtitle: string; videos: VideoItem[] }) {
  if (videos.length === 0) return null;

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-[21px] font-bold tracking-[-0.01em] text-white sm:text-[24px]">{title}</h2>
        <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-5 text-zinc-400">{subtitle}</p>
      </div>
      <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:-mx-8 sm:gap-5 sm:px-8 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden">
        {videos.map((item) => (
          <div key={item.id} className="w-[250px] shrink-0 sm:w-[290px] xl:w-[340px]">
            <VideoCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded } = useMasterStore();
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const programPool = useMemo(() => buildProgramPool(programs).sort(compareHomePrograms), [programs]);
  const filteredPrograms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return programPool.filter((program) => {
      const matchesCategory = programMatchesCategory(program, activeCategory);
      const matchesSearch = !query || getSearchText(program).toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, programPool, search]);
  const heroProgram = useMemo(() => pickHeroProgram(filteredPrograms.length ? filteredPrograms : programPool), [filteredPrograms, programPool]);
  const curatedRows = useMemo(() => {
    const usedIds = new Set<string>();
    if (heroProgram) usedIds.add(heroProgram.id);

    const weekly = takeUniquePrograms(filteredPrograms, usedIds, 4);
    const videoCandidates = programPool.filter((program) => program.lessonDetail?.videoUrl);
    const video = takeUniquePrograms(videoCandidates.length ? videoCandidates : programPool, usedIds, 8);
    const indoorCandidates = programPool.filter((program) => /실내|체육관|교실|복도|좁은 공간/.test(getSearchText(program)));
    const indoor = takeUniquePrograms(indoorCandidates.length ? indoorCandidates : programPool, usedIds, 8);

    return {
      weeklyLessons: weekly.map((program) => toVideoItem(program)),
      videoLessons: video.map((program) => toVideoItem(program)),
      indoorLessons: indoor.map((program) => toVideoItem(program)),
    };
  }, [filteredPrograms, heroProgram, programPool]);

  if (!mounted || !programsLoaded || !heroProgram) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="h-full overflow-y-auto bg-[#0a0a0a]">
      <Hero program={heroProgram} />
      <CategoryStrip activeCategory={activeCategory} search={search} onCategoryChange={setActiveCategory} onSearchChange={setSearch} />
      <CurationSummary />
      <div className="space-y-6 px-6 pb-14 sm:space-y-8 sm:px-8 sm:pb-16 lg:px-10">
        <VideoRow title="금주 추천 프로그램" subtitle="수업안, 참고 영상, 발달 초점이 비교적 잘 갖춰진 이번 주 대표 수업입니다." videos={curatedRows.weeklyLessons} />
        <VideoRow title="영상으로 먼저 익히는 수업" subtitle="강사가 수업 전에 움직임과 공간 흐름을 빠르게 확인하기 좋은 프로그램입니다." videos={curatedRows.videoLessons} />
        <VideoRow title="실내에서도 바로 쓰는 수업" subtitle="체육관, 교실, 좁은 공간에서도 준비 부담을 낮춰 운영할 수 있는 수업입니다." videos={curatedRows.indoorLessons} />
      </div>
      <div className="h-8 bg-gradient-to-t from-black to-transparent sm:h-12" />
    </main>
  );
}
