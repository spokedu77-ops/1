'use client';

import {
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  FileText,
  Lock,
  MapPin,
  MonitorPlay,
  Package,
  Play,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { useIsPro, useMasterStore } from '../store';
import type { Drill, Program } from '../types';

const QUICK_FILTERS = ['전체', 'SPOMOVE', '유아', '초등', '준비물 적음', '좁은 공간', '협동', '민첩'];

function hasSpomoveLink(program: Program) {
  const tags = program.tags ?? [];
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  return related.length > 0 || tags.some((tag) => tag.toUpperCase().includes('SPOMOVE'));
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
  return uniquePrograms(programs.length > 0 ? programs : STATIC_PROGRAMS);
}

function hasLowPrep(program: Program) {
  const text = `${program.equipment.join(' ')} ${program.tags.join(' ')} ${program.description}`;
  return program.equipment.length <= 2 || /준비물 없음|준비물 적음|간편|no prep/i.test(text);
}

function isSmallSpace(program: Program) {
  return /좁은|실내|교실|소규모/.test(`${program.space} ${program.tags.join(' ')}`);
}

function matchesFilter(program: Program, filter: string) {
  const text = `${program.title} ${program.category} ${program.grade} ${program.space} ${program.description} ${program.tags.join(' ')}`;
  if (filter === '전체') return true;
  if (filter === 'SPOMOVE') return hasSpomoveLink(program);
  if (filter === '유아') return /유아|유치|5세|6세|7세/.test(text);
  if (filter === '초등') return /초등|저학년|고학년/.test(text);
  if (filter === '준비물 적음') return hasLowPrep(program);
  if (filter === '좁은 공간') return isSmallSpace(program);
  if (filter === '협동') return /협동|팀|릴레이|짝|관계/.test(text);
  if (filter === '민첩') return /민첩|순발|반응|스피드|속도/.test(text);
  return true;
}

function getHeroImage(program: Program) {
  return program.lessonDetail?.heroImageUrl || program.thumbnailUrl;
}

function getGalleryImages(program: Program) {
  return [program.lessonDetail?.heroImageUrl, ...(program.lessonDetail?.galleryImageUrls ?? []), program.lessonDetail?.setupImageUrl].filter(Boolean) as string[];
}

function getYouTubeId(url?: string) {
  if (!url) return undefined;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1];
}

function getVideoEmbedUrl(url?: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`;
  return undefined;
}

function isDirectVideoUrl(url?: string) {
  return Boolean(url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url));
}

function getPrimaryDrill(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id)) ?? (hasSpomoveLink(program) ? drills[0] : undefined);
}

function getSpomoveUseLabel(program: Program) {
  const text = `${program.title} ${program.category} ${program.description} ${program.tags.join(' ')} ${program.lessonDetail?.developmentFocus ?? ''}`;
  if (/도입|집중|신호|주의/.test(text)) return '도입 3분 집중 전환';
  if (/펜싱|민첩|순발|반응|스피드|거리|방향/.test(text)) return '수업 중 반응 전환';
  if (/마무리|정리|리듬|협동|기억/.test(text)) return '마무리 참여 게임';
  return '큰 화면 몰입 활동';
}

function getParentCopy(program: Program) {
  return (
    program.lessonDetail?.parentNote ||
    `오늘은 ${program.title} 활동으로 ${program.lessonDetail?.developmentFocus || program.category}을 자연스럽게 경험했습니다. 아이들이 규칙을 이해하고 움직임을 조절하는 과정을 함께 확인했습니다.`
  );
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
    program.lessonDetail?.objective,
    program.lessonDetail?.developmentFocus,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function SectionTitle({ eyebrow, title, actionHref }: { eyebrow: string; title: string; actionHref?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-acc)' }}>{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black" style={{ color: 'var(--spm-t)' }}>{title}</h2>
      </div>
      {actionHref ? (
        <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-bold transition" style={{ color: 'var(--spm-acc)' }}>
          보기
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function CompactMeta({ program }: { program: Program }) {
  const items = [program.grade, `${program.duration}분`, program.space].filter(Boolean);

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: 'var(--spm-bg)', color: 'var(--spm-t2)' }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function ValueChips({ program }: { program: Program }) {
  const chips = [
    hasLowPrep(program) ? '준비 간편' : null,
    isSmallSpace(program) ? '좁은 공간' : null,
    hasSpomoveLink(program) ? '화면 활동' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {chips.slice(0, 3).map((chip) => (
        <span key={chip} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-700">
          {chip}
        </span>
      ))}
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

  return (
    <article className="group flex min-h-[390px] flex-col overflow-hidden rounded-3xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: 'var(--spm-br2)' }}>
      <button type="button" onClick={onPreview} className="relative h-44 overflow-hidden text-left">
        {heroImage ? (
          <Image src={heroImage} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500/28 via-slate-900 to-emerald-500/18">
            <CategoryIcon category={program.category} size={42} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {program.isHot ? <span className="rounded-full bg-rose-400 px-2.5 py-1 text-[11px] font-black text-white">HOT</span> : null}
          {program.isNew ? <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-black text-slate-950">NEW</span> : null}
          {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-400 px-2.5 py-1 text-[11px] font-black text-white">SPOMOVE</span> : null}
        </div>
        {locked ? (
          <span className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
            <Lock className="h-4 w-4" />
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={onPreview} className="flex-1 text-left">
          <h3 className="line-clamp-2 text-base font-black leading-snug" style={{ color: 'var(--spm-t)' }}>{program.title}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5" style={{ color: 'var(--spm-t2)' }}>{program.description}</p>
          <CompactMeta program={program} />
          <ValueChips program={program} />
        </button>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={onFavorite}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
              favorite ? 'border-amber-300/60 bg-amber-50 text-amber-600' : 'bg-[var(--spm-bg)] text-[var(--spm-t3)]'
            }`}
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
          </button>
          <button type="button" onClick={onPreview} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-sm font-extrabold text-slate-950 transition hover:bg-slate-100">
            패키지 보기
          </button>
          {used ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600" title="사용 이력 있음">
              <Check className="h-4 w-4" />
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FeaturedProgram({ program, drill, onPreview }: { program: Program; drill?: Drill; onPreview: () => void }) {
  const heroImage = getHeroImage(program);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70">
      <div className="grid lg:grid-cols-[1fr_420px]">
        <div className="flex min-h-[320px] flex-col justify-between p-6 sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-400/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              이번 주 추천 수업안
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">{program.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{program.description}</p>
            <ValueChips program={program} />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/spokedu-master/class-mode/${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950">
              <Play className="h-4 w-4 fill-current" />
              수업 시작
            </Link>
            <Link href={spomoveHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-300/20 bg-indigo-400/10 px-5 text-sm font-bold text-indigo-100">
              <MonitorPlay className="h-4 w-4" />
              큰 화면 실행
            </Link>
            <button type="button" onClick={onPreview} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 text-sm font-bold text-slate-200">
              <BookOpen className="h-4 w-4" />
              패키지 열기
            </button>
          </div>
        </div>
        <button type="button" onClick={onPreview} className="relative min-h-[260px] overflow-hidden">
          {heroImage ? (
            <Image src={heroImage} alt="" fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" priority unoptimized />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-indigo-500/35 via-slate-900 to-emerald-400/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/12 bg-slate-950/72 p-4 text-left backdrop-blur-xl">
            <p className="text-xs font-bold text-slate-400">패키지 구성</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.06] px-2 py-3 text-xs font-bold text-white">수업안</div>
              <div className="rounded-2xl bg-white/[0.06] px-2 py-3 text-xs font-bold text-white">배치도</div>
              <div className="rounded-2xl bg-white/[0.06] px-2 py-3 text-xs font-bold text-white">설명 문구</div>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}

function ProgramModal({
  program,
  drill,
  isPro,
  favorite,
  onFavorite,
  onClose,
}: {
  program: Program;
  drill?: Drill;
  isPro: boolean;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const locked = program.isPro && !isPro;
  const detail = program.lessonDetail;
  const gallery = getGalleryImages(program);
  const heroImage = gallery[0];
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl);
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const primaryDrillId = drill?.id ?? detail?.relatedSpomoveIds?.[0];
  const spomoveHref = primaryDrillId
    ? `/spokedu-master/spomove/session?drill=${primaryDrillId}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';
  const parentCopy = getParentCopy(program);
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const setupNotes = detail?.setupNotes?.length ? detail.setupNotes : [`공간: ${program.space}`, `준비물: ${program.equipment.join(', ') || '현장 기본 도구'}`];

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <BottomSheet open title="수업 패키지" onClose={onClose}>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
          <div className="relative h-[260px]">
            {videoEmbedUrl ? (
              <iframe
                src={videoEmbedUrl}
                title={`${program.title} 영상`}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : directVideoUrl ? (
              <video src={directVideoUrl} className="h-full w-full object-cover" controls autoPlay muted playsInline />
            ) : heroImage ? (
              <Image src={heroImage} alt="" fill sizes="720px" className="object-cover" priority unoptimized />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500/32 via-slate-950 to-emerald-400/20">
                <CategoryIcon category={program.category} size={54} />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
            <div className="pointer-events-none absolute bottom-5 left-5 right-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">{program.category}</span>
                {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-400 px-3 py-1 text-xs font-black text-white">SPOMOVE 연동</span> : null}
                {locked ? <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">PRO 전용</span> : null}
              </div>
              <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">{program.title}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetaBox label="대상" value={detail?.recommendedAge || program.grade} />
          <MetaBox label="시간" value={`${program.duration}분`} />
          <MetaBox label="인원" value={detail?.recommendedPlayers || '소그룹~학급'} />
        </div>

        <div className="sticky top-0 z-10 grid gap-3 rounded-3xl border border-white/10 bg-[#0d0d14]/95 p-2 backdrop-blur-xl sm:grid-cols-2">
          <Link href={`/spokedu-master/class-mode/${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950">
            <Play className="h-4 w-4 fill-current" />
            수업 시작
          </Link>
          <Link href={spomoveHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-300/25 bg-indigo-400/10 px-5 text-sm font-bold text-indigo-100">
            <MonitorPlay className="h-4 w-4" />
            SPOMOVE 큰 화면
          </Link>
          <button type="button" onClick={copyParentNote} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 text-sm font-bold text-emerald-100">
            <Clipboard className="h-4 w-4" />
            {copied ? '복사 완료' : '설명 문구 복사'}
          </button>
          <button
            type="button"
            onClick={onFavorite}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold ${
              favorite ? 'border-amber-300/35 bg-amber-300/12 text-amber-100' : 'border-white/10 bg-white/[0.05] text-slate-200'
            }`}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
            {favorite ? '즐겨찾기 저장됨' : '즐겨찾기'}
          </button>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
          <h3 className="text-base font-black text-white">수업 목표</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{detail?.objective || program.description}</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <h3 className="flex items-center gap-2 text-base font-black text-white">
              <Package className="h-4 w-4 text-indigo-200" />
              준비물
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {(program.equipment.length ? program.equipment : ['현장 기본 도구']).map((item) => (
                <span key={item} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <h3 className="flex items-center gap-2 text-base font-black text-white">
              <MapPin className="h-4 w-4 text-indigo-200" />
              공간 세팅
            </h3>
            <ul className="mt-4 space-y-2">
              {setupNotes.slice(0, 4).map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
          <h3 className="text-base font-black text-white">진행 단계</h3>
          <ol className="mt-4 space-y-3">
            {rules.slice(0, 6).map((step, index) => (
              <li key={`${step}-${index}`} className="grid grid-cols-[32px_1fr] gap-3 rounded-2xl bg-white/[0.04] p-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-400/14 text-xs font-black text-indigo-100">{index + 1}</span>
                <p className="text-sm leading-6 text-slate-300">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-indigo-300/18 bg-indigo-400/10 p-5">
          <h3 className="flex items-center gap-2 text-base font-black text-white">
            <Zap className="h-4 w-4 text-indigo-200" />
            SPOMOVE 연결
          </h3>
          <p className="mt-3 text-sm leading-7 text-indigo-100/80">
            {drill?.name
              ? `${drill.name}과 연결하면 ${getSpomoveUseLabel(program)} 흐름으로 수업 몰입을 만들 수 있습니다.`
              : `${getSpomoveUseLabel(program)} 용도로 큰 화면 활동을 연결합니다.`}
          </p>
        </section>

        <section className="rounded-3xl border border-emerald-300/18 bg-emerald-400/10 p-5">
          <h3 className="flex items-center gap-2 text-base font-black text-white">
            <FileText className="h-4 w-4 text-emerald-200" />
            학부모·기관 설명 문구
          </h3>
          <p className="mt-3 text-sm leading-7 text-emerald-50/85">{parentCopy}</p>
        </section>
      </div>
    </BottomSheet>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-3" style={{ borderColor: 'var(--spm-br2)' }}>
      <p className="text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      <p className="mt-1 truncate text-sm font-black" style={{ color: 'var(--spm-t)' }}>{value}</p>
    </div>
  );
}

export default function LibraryView() {
  const { programs, drills, classRecords, favorites, toggleFavorite } = useMasterStore();
  const isPro = useIsPro();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('전체');
  const [selected, setSelected] = useState<Program | null>(null);

  const pool = useMemo(() => buildProgramPool(programs), [programs]);
  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);

  const featured = useMemo(() => {
    return (
      pool.find((program) => program.isHot && hasSpomoveLink(program)) ||
      pool.find((program) => program.isHot) ||
      pool.find((program) => program.isNew) ||
      pool[0]
    );
  }, [pool]);

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return pool.filter((program) => {
      const queryMatched = normalizedQuery.length === 0 || getSearchText(program).includes(normalizedQuery);
      return queryMatched && matchesFilter(program, filter);
    });
  }, [filter, pool, query]);

  const spomovePrograms = useMemo(() => pool.filter(hasSpomoveLink).slice(0, 6), [pool]);
  const favoritePrograms = useMemo(() => pool.filter((program) => favorites.includes(program.id)).slice(0, 6), [favorites, pool]);

  const counts = useMemo(() => {
    return QUICK_FILTERS.reduce<Record<string, number>>((acc, item) => {
      acc[item] = pool.filter((program) => matchesFilter(program, item)).length;
      return acc;
    }, {});
  }, [pool]);

  if (pool.length === 0) return <LibrarySkeleton />;

  const selectedDrill = selected ? getPrimaryDrill(selected, drills) : undefined;

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--spm-t3)' }}>MASTER LIBRARY</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl" style={{ color: 'var(--spm-t)' }}>수업 패키지</h1>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: 'var(--spm-t3)' }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="수업, 도구, 공간, 연령 검색"
                className="h-14 w-full rounded-2xl border bg-white pl-12 pr-4 text-sm font-semibold outline-none"
                style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}
              />
            </label>
            <Link href="/spokedu-master/spomove" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 text-sm font-extrabold text-white">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 전체 보기
            </Link>
          </div>

          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {QUICK_FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className="h-10 shrink-0 rounded-full px-4 text-sm font-black transition"
                style={filter === item ? { background: 'var(--spm-t)', color: 'var(--spm-s1)' } : { border: '1px solid var(--spm-br2)', background: 'var(--spm-s1)', color: 'var(--spm-t2)' }}
              >
                {item}
                <span className="ml-1 text-xs opacity-55">{counts[item] ?? 0}</span>
              </button>
            ))}
          </div>
        </header>

        {featured ? <FeaturedProgram program={featured} drill={getPrimaryDrill(featured, drills)} onPreview={() => setSelected(featured)} /> : null}

        {favoritePrograms.length > 0 ? (
          <section>
            <SectionTitle eyebrow="Saved" title="즐겨찾기" />
            <ProgramGrid programs={favoritePrograms} isPro={isPro} favorites={favorites} usedProgramIds={usedProgramIds} toggleFavorite={toggleFavorite} setSelected={setSelected} />
          </section>
        ) : null}

        <section>
          <SectionTitle eyebrow="SPOMOVE Linked" title="화면 활동과 연결되는 수업" actionHref="/spokedu-master/spomove" />
          <ProgramGrid programs={spomovePrograms} isPro={isPro} favorites={favorites} usedProgramIds={usedProgramIds} toggleFavorite={toggleFavorite} setSelected={setSelected} />
        </section>

        <section>
          <SectionTitle eyebrow="All Programs" title={query || filter !== '전체' ? `검색 결과 ${filteredPrograms.length}개` : '전체 수업 패키지'} />
          <ProgramGrid programs={filteredPrograms} isPro={isPro} favorites={favorites} usedProgramIds={usedProgramIds} toggleFavorite={toggleFavorite} setSelected={setSelected} />
          {filteredPrograms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-black text-white">조건에 맞는 수업이 없습니다.</h3>
              <p className="mt-2 text-sm text-slate-400">검색어를 줄이거나 필터를 전체로 바꿔보세요.</p>
            </div>
          ) : null}
        </section>
      </main>

      {selected ? (
        <ProgramModal
          program={selected}
          drill={selectedDrill}
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
