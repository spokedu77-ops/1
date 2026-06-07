'use client';

import {
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  MonitorPlay,
  Play,
  Search,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import {
  getExternalVideoUrl,
  getVideoEmbedUrl,
  getVideoThumbnail,
  isDirectVideoUrl,
  resolveProgramHero,
} from '../lib/program-media';
import {
  displayMasterDuration,
  hasMasterSpace,
  hasMasterTarget,
  normalizeMasterSpace,
  normalizeMasterTarget,
  parseMasterSpaces,
  parseMasterTargets,
} from '../lib/programDisplayTags';
import {
  findOfficialSpomovePreset,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { useIsPro, useMasterStore } from '../store';
import type { Program } from '../types';

const QUICK_FILTERS = ['전체', '미취학', '초등학생 이상', '체육관', '교실', '협동', '민첩', '참고 영상'];

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

function hasLowPrep(program: Program) {
  const text = `${program.equipment.join(' ')} ${program.tags.join(' ')} ${program.description}`;
  return program.equipment.length <= 2 || /준비물 없음|준비물 적음|간편|no prep/i.test(text);
}

function matchesFilter(program: Program, filter: string) {
  const text = `${program.title} ${program.category} ${program.grade} ${program.space} ${program.description} ${program.tags.join(' ')}`;
  if (filter === '전체') return true;
  if (filter === '미취학') return hasMasterTarget(program.grade, '미취학');
  if (filter === '초등학생 이상') return hasMasterTarget(program.grade, '초등학생 이상');
  if (filter === '체육관') return hasMasterSpace(program.space, '체육관');
  if (filter === '교실') return hasMasterSpace(program.space, '교실');
  if (filter === '준비물 적음') return hasLowPrep(program);
  if (filter === '협동') return /협동|팀|릴레이|짝|관계/.test(text);
  if (filter === '민첩') return /민첩|순발|반응|스피드|속도/.test(text);
  if (filter === '참고 영상') return Boolean(program.lessonDetail?.videoUrl);
  return true;
}

function getHeroImage(program: Program) {
  return resolveProgramHero(program);
}

function getPrimarySpomovePreset(program: Program) {
  for (const id of program.lessonDetail?.relatedSpomoveIds ?? []) {
    const preset = findOfficialSpomovePreset(id);
    if (preset) return preset;
  }
  return undefined;
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

function splitFocusTags(value?: string) {
  return (value ?? '')
    .split(/[\/,·]/)
    .map((item) => item.trim())
    .filter((item) => item && !isPlaceholderText(item));
}

function getProgramInfoTags(program: Program) {
  const detail = program.lessonDetail;
  const candidates = [
    program.category,
    ...parseMasterTargets(detail?.recommendedAge || program.grade),
    detail?.recommendedPlayers,
    ...splitFocusTags(detail?.developmentFocus),
    ...parseMasterSpaces(program.space),
    ...(detail?.videoUrl ? ['참고 영상'] : []),
  ];
  return Array.from(new Set(candidates.filter((item): item is string => Boolean(item) && !isPlaceholderText(item)))).slice(0, 6);
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
  const items = getProgramInfoTags(program).slice(0, 4);

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
    hasMasterSpace(program.space, '교실') ? '교실' : null,
    program.lessonDetail?.videoUrl ? '참고 영상' : null,
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

  return (
    <article className="group flex min-h-[350px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
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

function FeaturedProgram({ program, onPreview }: { program: Program; onPreview: () => void }) {
  const heroImage = getHeroImage(program);
  const tags = getProgramInfoTags(program);

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="grid lg:grid-cols-[1fr_460px]">
        <div className="flex min-h-[360px] flex-col justify-between p-6 sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black tracking-[0.14em] text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" />
              오늘의 추천
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{program.title}</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600">{program.description}</p>
            <ValueChips program={program} />
            <div className="mt-5 flex flex-wrap gap-2">
              {tags.slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onPreview} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white">
              <BookOpen className="h-4 w-4" />
              빠른 미리보기
            </button>
            <Link href="/spokedu-master/spomove" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-800">
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 전체보기
            </Link>
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
            <p className="text-xs font-bold text-slate-500">빠른 미리보기</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800">{tag}</span>
              ))}
            </div>
          </div>
        </button>
      </div>
    </section>
  );
}

function ProgramModal({
  program,
  spomovePreset,
  isPro,
  favorite,
  onFavorite,
  onClose,
}: {
  program: Program;
  spomovePreset?: OfficialSpomovePreset;
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
  const videoEmbedUrl = getVideoEmbedUrl(detail?.videoUrl, { autoplay: true });
  const directVideoUrl = !videoEmbedUrl && isDirectVideoUrl(detail?.videoUrl) ? detail?.videoUrl : undefined;
  const externalVideoUrl = !videoEmbedUrl && !directVideoUrl ? getExternalVideoUrl(detail?.videoUrl) : undefined;
  const hasVideo = Boolean(videoEmbedUrl || directVideoUrl || externalVideoUrl);
  const videoThumbnail = getVideoThumbnail(detail?.videoUrl);
  const spomoveHref = spomovePreset
    ? officialPresetSessionHref(spomovePreset)
    : null;
  const parentCopy = getParentCopy(program);
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const equipment = program.equipment.filter((item) => !isPlaceholderText(item));
  const setupFallback = [`공간: ${normalizeMasterSpace(program.space)}`, `준비물: ${equipment.join(', ') || '현장 기본 도구'}`].filter((item) => !isPlaceholderText(item));
  const setupNotes = (detail?.setupNotes?.length ? detail.setupNotes : setupFallback).filter((item) => !isPlaceholderText(item));
  const variations = detail?.variations?.length ? detail.variations : detail?.fieldTips ?? [];
  const overviewRows = [
    ['테마', program.category],
    ['대상', normalizeMasterTarget(detail?.recommendedAge || program.grade)],
    ['인원', detail?.recommendedPlayers || '소그룹~학급'],
    ['기능', detail?.developmentFocus || program.category],
    ['공간', normalizeMasterSpace(program.space)],
    ['시간', displayMasterDuration(program.duration)],
  ].filter(([, value]) => value && !isPlaceholderText(value));
  const focusTags = getProgramInfoTags(program).slice(0, 6);
  const decisionCards = [
    { label: '영상', value: hasVideo ? '있음' : '없음', tone: hasVideo ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-500 bg-slate-50 border-slate-200' },
    { label: '교구', value: equipment.length ? `${equipment.length}개` : '기본', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    { label: '진행', value: rules.length ? `${rules.length}단계` : '확인', tone: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
    { label: '공간', value: normalizeMasterSpace(program.space), tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  ];
  const sectionNavItems = [
    '개요',
    '수업 전 체크',
    setupNotes.length || setupImage ? '교구 세팅' : null,
    hasVideo ? '참고 영상' : null,
    rules.length ? '활동 방법' : null,
    variations.length ? '응용' : null,
    '설명 문구',
  ].filter((item): item is string => Boolean(item));

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <BottomSheet open title="빠른 미리보기" onClose={onClose} size="document">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-0 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
            {sectionNavItems.map((item) => (
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
              {hasSpomoveLink(program) ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">SPOMOVE 명시 연결</span> : null}
            </div>
            <h1 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{program.title}</h1>
            <p className="mt-4 border-l-2 border-slate-900 pl-4 text-sm font-semibold leading-7 text-slate-700">
              {program.description}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {decisionCards.map((item) => (
                <div key={item.label} className={`rounded-[12px] border px-3 py-3 ${item.tone}`}>
                  <p className="text-[11px] font-black">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-black">{item.value}</p>
                </div>
              ))}
            </div>
            {focusTags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {focusTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          <section id="program-개요" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <BookOpen className="h-4 w-4 text-rose-600" />
              프로그램 개요
            </h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {overviewRows.map(([label, value]) => (
                <div key={label} className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-black text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="program-수업 전 체크" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <Check className="h-4 w-4 text-emerald-600" />
              수업 전 체크
            </h2>
            <div className="mt-4 rounded-[12px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-700">필요 교구</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {(equipment.length ? equipment : ['현장 기본 도구']).map((item) => (
                  <li key={item} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {setupNotes.length || setupImage ? (
          <section id="program-교구 세팅" className="rounded-[10px] border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
              <MapPin className="h-4 w-4 text-indigo-600" />
              초기 교구 세팅
            </h2>
            <div className="mt-4 overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50">
              {setupImage ? (
                <div className="relative aspect-[16/7] min-h-[220px]">
                  <Image src={setupImage} alt="" fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white px-4 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-800">세팅 사진 없음</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">사진이 없는 수업은 아래 세팅 메모만 표시합니다.</p>
                  </div>
                </div>
              )}
            </div>
            <ul className="mt-4 grid gap-2">
              {setupNotes.slice(0, 5).map((item) => (
                <li key={item} className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{item}</li>
              ))}
            </ul>
          </section>
          ) : null}

          {hasVideo ? (
            <section id="program-참고 영상" className="rounded-[10px] border border-slate-200 bg-white p-5">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-950">
                <Play className="h-4 w-4 fill-current text-red-600" />
                참고 영상
              </h2>
              <div className="mt-4 overflow-hidden rounded-[10px] bg-slate-950">
                <div className="relative aspect-video">
                  {activeMedia === 'video' && videoEmbedUrl ? (
                    <iframe
                      key={`${program.id}-${videoEmbedUrl}`}
                      src={videoEmbedUrl}
                      title={`${program.title} 참고 영상`}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : activeMedia === 'video' && directVideoUrl ? (
                    <video src={directVideoUrl} className="h-full w-full object-cover" controls playsInline autoPlay muted />
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
            <h2 className="text-base font-black text-slate-950">활동 방법</h2>
            <ol className="mt-4 grid gap-2">
              {rules.map((step, index) => (
                <li key={`${step}-${index}`} className="grid grid-cols-[34px_1fr] gap-3 rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                  <span className="font-semibold">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {variations.length > 0 ? (
            <section id="program-응용" className="rounded-[10px] border border-slate-200 bg-white p-5">
              <h2 className="text-base font-black text-slate-950">응용 방법</h2>
              <ul className="mt-4 grid gap-2">
                {variations.map((item, index) => (
                  <li key={`${item}-${index}`} className="grid grid-cols-[18px_1fr] gap-3 rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span className="font-semibold">{item}</span>
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
                {spomovePreset ? `${spomovePreset.title}은(는) 이 수업에 명시 연결된 큰 화면 활동입니다.` : '이 수업에 명시 연결된 큰 화면 활동입니다.'}
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

          <div className="sticky bottom-0 z-10 grid grid-cols-[1fr_auto] gap-2 rounded-[10px] border border-slate-200 bg-white/95 p-2 shadow-[0_-14px_36px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:grid-cols-3">
            <button type="button" onClick={copyParentNote} className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-700">
              <Clipboard className="h-4 w-4" />
              {copied ? '복사 완료' : '문구 복사'}
            </button>
            <button type="button" onClick={onFavorite} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black sm:px-4 ${favorite ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`} aria-label={favorite ? '저장 해제' : '저장'}>
              <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">저장</span>
            </button>
            <button type="button" onClick={() => window.print()} className="hidden h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 sm:inline-flex">
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
  const { programs, programsLoaded, programsError, classRecords, favorites, toggleFavorite } = useMasterStore();
  const isPro = useIsPro();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('전체');
  const [selected, setSelected] = useState<Program | null>(null);

  const pool = useMemo(
    () => buildProgramPool(programs),
    [programs],
  );
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

  const favoritePrograms = useMemo(() => pool.filter((program) => favorites.includes(program.id)).slice(0, 6), [favorites, pool]);
  const packageStats = useMemo(() => {
    const videoCount = pool.filter((program) => program.lessonDetail?.videoUrl).length;
    const indoorCount = pool.filter((program) => hasMasterSpace(program.space, '교실')).length;
    const lowPrepCount = pool.filter(hasLowPrep).length;
    return [
      { label: '전체 패키지', value: `${pool.length}개` },
      { label: '참고 영상', value: `${videoCount}개` },
      { label: '준비 간편', value: `${lowPrepCount}개` },
      { label: '실내 가능', value: `${indoorCount}개` },
    ];
  }, [pool]);

  const counts = useMemo(() => {
    return QUICK_FILTERS.reduce<Record<string, number>>((acc, item) => {
      acc[item] = pool.filter((program) => matchesFilter(program, item)).length;
      return acc;
    }, {});
  }, [pool]);

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

  const selectedSpomovePreset = selected ? getPrimarySpomovePreset(selected) : undefined;

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
                  수업 자료, 참고 영상, 교구 세팅, 설명 문구를 한 화면에서 빠르게 확인합니다. SPOMOVE는 별도 화면 활동으로 분리해 운영합니다.
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

        {featured ? <FeaturedProgram program={featured} onPreview={() => setSelected(featured)} /> : null}

        {favoritePrograms.length > 0 ? (
          <section>
            <SectionTitle eyebrow="Saved" title="즐겨찾기" />
            <ProgramGrid programs={favoritePrograms} isPro={isPro} favorites={favorites} usedProgramIds={usedProgramIds} toggleFavorite={toggleFavorite} setSelected={setSelected} />
          </section>
        ) : null}

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
          spomovePreset={selectedSpomovePreset}
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
