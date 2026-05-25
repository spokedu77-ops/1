'use client';

import {
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  ExternalLink,
  FileText,
  Layers3,
  Lock,
  MapPin,
  MonitorPlay,
  Play,
  Search,
  Sparkles,
  Timer,
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
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  return related.length > 0;
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

function getExternalVideoUrl(url?: string) {
  const text = (url ?? '').trim();
  if (!/^https?:\/\//i.test(text)) return undefined;
  if (getVideoEmbedUrl(text) || isDirectVideoUrl(text)) return undefined;
  return text;
}

function getVideoThumbnail(url?: string) {
  const youtubeId = getYouTubeId(url);
  return youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : undefined;
}

function getPrimaryDrill(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id));
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

function getPackageCompleteness(program: Program) {
  const detail = program.lessonDetail;
  const checks = [
    Boolean(detail?.objective || program.description),
    program.equipment.length > 0,
    (detail?.rules?.length ?? program.steps.length) > 0,
    (detail?.setupNotes?.length ?? 0) > 0 || Boolean(program.space),
    Boolean(detail?.parentNote),
    hasSpomoveLink(program),
  ];
  return checks.filter(Boolean).length;
}

function SectionTitle({ eyebrow, title, actionHref }: { eyebrow: string; title: string; actionHref?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black tracking-[0.14em] text-indigo-500">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
      {actionHref ? (
        <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-500">
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
        <span key={item} className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
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
        <span key={chip} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-600">
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
  const completeness = getPackageCompleteness(program);

  return (
    <article className="group flex min-h-[420px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
      <button type="button" onClick={onPreview} className="relative h-44 overflow-hidden text-left">
        {heroImage ? (
          <>
            <Image src={heroImage} alt="" fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
          </>
        ) : (
          <div className="grid h-full w-full place-items-center" style={{ background: 'linear-gradient(135deg, var(--spm-s3) 0%, var(--spm-s4) 100%)' }}>
            <CategoryIcon category={program.category} size={42} />
          </div>
        )}
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
          <h3 className="line-clamp-2 text-base font-black leading-snug text-slate-950">{program.title}</h3>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{program.description}</p>
          <CompactMeta program={program} />
          <ValueChips program={program} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <span className="rounded-xl bg-slate-50 px-2 py-2 text-center text-[11px] font-black text-slate-600">
              수업안
            </span>
            <span className="rounded-xl bg-slate-50 px-2 py-2 text-center text-[11px] font-black text-slate-600">
              세팅
            </span>
            <span className="rounded-xl bg-slate-50 px-2 py-2 text-center text-[11px] font-black text-slate-600">
              문구
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2">
            <span className="text-[11px] font-black text-indigo-700">수업 자료</span>
            <span className="text-[11px] font-black text-indigo-700">{completeness}/6 준비</span>
          </div>
        </button>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={onFavorite}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
              favorite ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700'
            }`}
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
          </button>
          <button type="button" onClick={onPreview} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-extrabold text-white transition hover:bg-indigo-500">
            자세히
          </button>
          {used ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600" title="사용 이력 있음">
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
  const detail = program.lessonDetail;
  const spomoveHref = drill ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}` : null;

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="grid lg:grid-cols-[1fr_460px]">
        <div className="flex min-h-[360px] flex-col justify-between p-6 sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black tracking-[0.14em] text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
              대표 수업안
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{program.title}</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600">{detail?.objective || program.description}</p>
            <ValueChips program={program} />
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <FeatureMetric icon={Timer} label="수업 시간" value={`${program.duration}분`} />
              <FeatureMetric icon={MapPin} label="공간" value={program.space} />
              <FeatureMetric icon={Layers3} label="활용 흐름" value="숙지·실행·복사" />
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white">
              <BookOpen className="h-4 w-4" />
              수업안 보기
            </Link>
            {spomoveHref ? (
              <Link href={spomoveHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-800">
                <MonitorPlay className="h-4 w-4" />
                지정 화면 열기
              </Link>
            ) : null}
            <button type="button" onClick={onPreview} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-slate-500 hover:text-slate-900">
              <BookOpen className="h-4 w-4" />
              빠른 미리보기
            </button>
          </div>
        </div>
        <button type="button" onClick={onPreview} className="relative min-h-[260px] overflow-hidden" style={{ background: 'var(--spm-s2)' }}>
          {heroImage ? (
            <>
              <Image src={heroImage} alt="" fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" priority unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--spm-s3) 0%, var(--spm-s4) 100%)' }} />
          )}
          <div className="absolute bottom-5 left-5 right-5 rounded-[18px] border border-white/25 bg-white/88 p-4 text-left shadow-[0_18px_46px_rgba(15,23,42,0.2)] backdrop-blur-xl">
            <p className="text-xs font-bold text-slate-500">수업 활용 흐름</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800">수업안</div>
              <div className="rounded-xl bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800">화면 활동</div>
              <div className="rounded-xl bg-slate-100 px-2 py-3 text-xs font-bold text-slate-800">설명 문구</div>
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}

function FeatureMetric({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-black text-slate-400">{label}</span>
        <span className="mt-1 block truncate text-sm font-black text-slate-950">{value}</span>
      </span>
    </div>
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
  const [activeMedia, setActiveMedia] = useState<'video' | number>('video');
  const locked = program.isPro && !isPro;
  const detail = program.lessonDetail;
  const setupImage = detail?.setupImageUrl;
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl);
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(detail?.videoUrl) : undefined;
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const videoThumbnail = getVideoThumbnail(detail?.videoUrl);
  const primaryDrillId = drill?.id ?? detail?.relatedSpomoveIds?.[0];
  const spomoveHref = hasSpomoveLink(program) && primaryDrillId
    ? `/spokedu-master/spomove/session?drill=${primaryDrillId}&mode=projector&program=${program.id}`
    : null;
  const parentCopy = getParentCopy(program);
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const setupNotes = detail?.setupNotes?.length ? detail.setupNotes : [`공간: ${program.space}`, `준비물: ${program.equipment.join(', ') || '현장 기본 도구'}`];
  const safetyNotes = detail?.safetyNotes?.length
    ? detail.safetyNotes
    : ['활동 전 공간의 장애물을 정리합니다.', '교구를 던지거나 밀치지 않도록 약속합니다.', '속도보다 안전한 이동과 정확한 규칙 수행을 우선합니다.'];
  const variations = detail?.variations?.length ? detail.variations : detail?.fieldTips ?? [];
  const overviewRows = [
    ['테마', program.category],
    ['대상', detail?.recommendedAge || program.grade],
    ['인원', detail?.recommendedPlayers || '소그룹~학급'],
    ['기능', detail?.developmentFocus || program.category],
    ['공간', program.space],
  ].filter(([, value]) => value && !/확인 필요|미정|undefined|null/i.test(value));

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <BottomSheet open title="수업안" onClose={onClose} size="document">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-0 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
            {['개요', '사전 체크', '교구 세팅', '안전', '참고 영상', '활동 방법', '응용', '설명 문구'].map((item) => (
              <a key={item} href={`#program-${item}`} className="block rounded-lg px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-950">
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          <header className="rounded-[10px] border border-slate-200 bg-white p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-600">
                <CategoryIcon category={program.category} size={28} />
              </span>
              {locked ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">PRO 전용</span> : null}
              {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">SPOMOVE 연결</span> : null}
            </div>
            <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{program.title}</h1>
            <p className="mt-4 border-l-2 border-slate-900 pl-4 text-sm font-semibold leading-7 text-slate-700">
              {detail?.objective || program.description}
            </p>
          </header>

          <section id="program-개요" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <BookOpen className="h-4 w-4 text-rose-600" />
              프로그램 개요
            </h2>
            <div className="mt-4 max-w-xl overflow-hidden rounded-lg border border-slate-200">
              {overviewRows.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] border-b border-slate-200 last:border-b-0">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">{label}</div>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="program-사전 체크" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <Check className="h-4 w-4 text-emerald-600" />
              사전 체크 Pre-Activity Checklist
            </h2>
            <div className="mt-4 rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-black text-slate-700">필요 교구</p>
              <ul className="mt-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-x-6 lg:gap-y-2">
                {(program.equipment.length ? program.equipment : ['현장 기본 도구']).map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-3.5 w-3.5 border border-slate-500 bg-white" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="program-교구 세팅" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <MapPin className="h-4 w-4 text-indigo-600" />
              초기 교구 세팅
            </h2>
            <div className="mt-4 overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50">
              <div className="relative aspect-[16/7] min-h-[220px]">
                {setupImage ? (
                  <Image src={setupImage} alt="" fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center bg-white px-6 text-center">
                    <div>
                      <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-base font-black text-slate-700">교구 세팅 사진 아직 없음</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">아래 세팅 메모만 확인하세요.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {setupNotes.slice(0, 5).map((item) => (
                <li key={item} className="ml-5 list-disc text-sm leading-6 text-slate-700">{item}</li>
              ))}
            </ul>
          </section>

          <section id="program-안전" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-slate-950">활동 전 선행되어야 할 사전 교육</h2>
            <ul className="mt-4 space-y-2">
              {safetyNotes.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-1 h-4 w-4 shrink-0 border border-slate-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {hasVideo ? (
            <section id="program-참고 영상" className="rounded-[10px] border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <Play className="h-4 w-4 fill-current text-red-600" />
                참고 영상
              </h2>
              <div className="mt-4 overflow-hidden rounded-[10px] bg-slate-950">
                <div className="relative aspect-video">
                  {activeMedia === 'video' && videoEmbedUrl ? (
                    <iframe src={videoEmbedUrl} title={`${program.title} 영상`} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                  ) : activeMedia === 'video' && directVideoUrl ? (
                    <video src={directVideoUrl} className="h-full w-full object-cover" controls muted playsInline />
                  ) : activeMedia === 'video' && externalVideoUrl ? (
                    <div className="grid h-full place-items-center bg-slate-950 p-6 text-center text-white">
                      <div>
                        <Play className="mx-auto h-10 w-10 fill-current text-red-500" />
                        <p className="mt-4 text-base font-black">외부 참고 영상</p>
                        <a href={externalVideoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950">
                          영상 열기
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center bg-slate-900 text-white">
                      <CategoryIcon category={program.category} size={54} />
                    </div>
                  )}
                </div>
              </div>
              {hasVideo ? (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  <button type="button" onClick={() => setActiveMedia('video')} className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border ${activeMedia === 'video' ? 'border-slate-950' : 'border-slate-200'}`} aria-label="수업 영상 보기">
                    {videoThumbnail ? <Image src={videoThumbnail} alt="" fill sizes="112px" className="object-cover" unoptimized /> : null}
                    <span className="absolute inset-0 grid place-items-center bg-black/30 text-white">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          <section id="program-활동 방법" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="text-base font-black text-slate-950">활동 방법 How to Play</h2>
            <ol className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              {rules.map((step, index) => (
                <li key={`${step}-${index}`} className="grid grid-cols-[28px_1fr] gap-3 text-sm leading-6 text-slate-800">
                  <span className="font-black text-slate-500">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {variations.length > 0 ? (
            <section id="program-응용" className="rounded-[10px] border border-slate-200 bg-white p-5">
              <h2 className="text-base font-black text-slate-950">응용 방법 Variations</h2>
              <ul className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                {variations.map((item, index) => (
                  <li key={`${item}-${index}`} className="grid grid-cols-[18px_1fr] gap-3 text-sm leading-6 text-slate-800">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {spomoveHref ? (
            <section className="rounded-[10px] border border-indigo-200 bg-indigo-50 p-5">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <MonitorPlay className="h-4 w-4 text-indigo-700" />
                SPOMOVE 활동
              </h2>
              <p className="mt-3 text-sm leading-7 text-indigo-800">
                {drill?.name ? `${drill.name}은(는) 이 수업안에 명시 연결된 큰 화면 활동입니다.` : '이 수업안에 명시 연결된 큰 화면 활동입니다.'}
              </p>
              <Link href={spomoveHref} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-black text-white">
                <MonitorPlay className="h-4 w-4" />
                큰 화면 실행
              </Link>
            </section>
          ) : null}

          <section id="program-설명 문구" className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <FileText className="h-4 w-4 text-emerald-700" />
              학부모·기관 설명 문구
            </h2>
            <p className="mt-3 rounded-lg bg-white p-4 text-sm leading-7 text-emerald-900">{parentCopy}</p>
          </section>

          <div className="sticky bottom-0 z-10 grid gap-2 rounded-[10px] border border-slate-200 bg-white/95 p-2 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:grid-cols-4">
            <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white">
              <BookOpen className="h-4 w-4" />
              상세 보기
            </Link>
            <button type="button" onClick={copyParentNote} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '문구 복사'}
            </button>
            <button type="button" onClick={onFavorite} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black ${favorite ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
              저장
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
              <FileText className="h-4 w-4" />
              인쇄
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
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
  const packageStats = useMemo(() => {
    const spomoveCount = pool.filter(hasSpomoveLink).length;
    const lowPrepCount = pool.filter(hasLowPrep).length;
    const denseCount = pool.filter((program) => getPackageCompleteness(program) >= 5).length;
    return [
      { label: '전체 패키지', value: `${pool.length}개` },
      { label: '화면 활동 연동', value: `${spomoveCount}개` },
      { label: '준비 간편', value: `${lowPrepCount}개` },
      { label: '고밀도 구성', value: `${denseCount}개` },
    ];
  }, [pool]);

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
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-7 overflow-y-auto bg-[#f5f7fb] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="flex flex-col gap-5">
          <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.06)] sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div>
                <p className="text-sm font-semibold text-slate-400">MASTER LIBRARY</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                  바로 꺼내 쓰는 수업 패키지
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                  수업안, 준비물, 공간 세팅, 큰 화면 활동, 학부모 설명 문구까지 한 번에 확인하고 바로 실행합니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {packageStats.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-black text-slate-400">{item.label}</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="수업, 도구, 공간, 연령 검색"
                className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.04)] outline-none placeholder:text-slate-400 focus:border-indigo-300"
              />
            </label>
            <Link href="/spokedu-master/spomove" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white">
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
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
                  filter === item ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
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
            <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-500" />
              <h3 className="mt-4 text-lg font-black text-slate-950">조건에 맞는 수업이 없습니다.</h3>
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
