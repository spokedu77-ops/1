'use client';

import {
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  Clock3,
  FileText,
  Lock,
  MapPin,
  MonitorPlay,
  Package,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { LibrarySkeleton } from '../components/ui/Skeleton';
import { useIsPro, useMasterStore } from '../store';
import type { Drill, Program } from '../types';

const QUICK_FILTERS = ['전체', 'SPOMOVE', '유아', '초등', '준비물 적음', '좁은 공간', '협동', '민첩'];

function hasSpomoveLink(program: Program) {
  const tags = program.tags ?? [];
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  return related.length > 0 || tags.some((tag) => tag.toUpperCase().includes('SPOMOVE'));
}

function hasLowPrep(program: Program) {
  return program.equipment.length <= 2 || program.tags.some((tag) => /준비물 없음|간편|노준비|no prep/i.test(tag));
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
        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-300">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
      </div>
      {actionHref ? (
        <Link href={actionHref} className="inline-flex items-center gap-1 text-sm font-bold text-indigo-200 hover:text-white">
          보기
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function MetaPill({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-slate-300">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
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
    <article className="group flex min-h-[380px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.052] transition hover:-translate-y-0.5 hover:bg-white/[0.075]">
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

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <MetaPill icon={Users}>{program.grade}</MetaPill>
          <MetaPill icon={Clock3}>{`${program.duration}분`}</MetaPill>
          <MetaPill icon={MapPin}>{program.space}</MetaPill>
        </div>

        <button type="button" onClick={onPreview} className="text-left">
          <h3 className="line-clamp-2 text-lg font-black leading-snug text-white">{program.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{program.description}</p>
        </button>

        <div className="mt-4 flex flex-wrap gap-2">
          {(program.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-white/[0.055] px-2.5 py-1 text-[11px] font-semibold text-slate-400">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <button
            type="button"
            onClick={onFavorite}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
              favorite ? 'border-amber-300/40 bg-amber-300/14 text-amber-200' : 'border-white/10 bg-white/[0.05] text-slate-400 hover:text-white'
            }`}
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Bookmark className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-extrabold text-slate-950 transition hover:bg-slate-100"
          >
            수업 패키지 보기
          </button>
          {used ? <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200" title="사용 이력 있음"><Check className="h-4 w-4" /></span> : null}
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
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {program.lessonDetail?.objective || program.description}
            </p>
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
  const primaryDrillId = drill?.id ?? detail?.relatedSpomoveIds?.[0];
  const spomoveHref = primaryDrillId
    ? `/spokedu-master/spomove/session?drill=${primaryDrillId}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';
  const parentCopy = getParentCopy(program);
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  const setupNotes = detail?.setupNotes?.length ? detail.setupNotes : [`공간: ${program.space}`, `준비물: ${program.equipment.join(', ') || '현장 기본 도구'}`];
  const tips = [...(detail?.fieldTips ?? []), ...(detail?.safetyNotes ?? [])].slice(0, 5);

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
            {heroImage ? (
              <Image src={heroImage} alt="" fill sizes="720px" className="object-cover" priority unoptimized />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-indigo-500/32 via-slate-950 to-emerald-400/20">
                <CategoryIcon category={program.category} size={54} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
              aria-label="수업 패키지 닫기"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-5 left-5 right-5">
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
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <p className="text-[11px] font-bold text-slate-500">대상</p>
            <p className="mt-1 truncate text-sm font-black text-white">{detail?.recommendedAge || program.grade}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <p className="text-[11px] font-bold text-slate-500">시간</p>
            <p className="mt-1 text-sm font-black text-white">{program.duration}분</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
            <p className="text-[11px] font-bold text-slate-500">인원</p>
            <p className="mt-1 truncate text-sm font-black text-white">{detail?.recommendedPlayers || '소그룹~학급'}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
          {detail?.developmentFocus ? <p className="mt-3 text-sm font-bold text-emerald-200">발달 초점: {detail.developmentFocus}</p> : null}
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
            {drill?.name ? `${drill.name}과 연결하면 ${getSpomoveUseLabel(program)} 흐름으로 수업 몰입을 만들 수 있습니다.` : `${getSpomoveUseLabel(program)} 용도로 큰 화면 활동을 연결합니다.`}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
          <h3 className="flex items-center gap-2 text-base font-black text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            현장 팁
          </h3>
          <ul className="mt-4 space-y-2">
            {(tips.length ? tips : ['충돌 위험이 있는 구간은 교구 간격을 넓히고, 시범 후 난이도를 단계적으로 올립니다.']).map((tip) => (
              <li key={tip} className="flex gap-2 text-sm leading-6 text-slate-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-emerald-300/18 bg-emerald-400/10 p-5">
          <h3 className="flex items-center gap-2 text-base font-black text-white">
            <FileText className="h-4 w-4 text-emerald-200" />
            학부모/기관 설명 문구
          </h3>
          <p className="mt-3 text-sm leading-7 text-emerald-50/85">{parentCopy}</p>
        </section>
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

  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);

  const featured = useMemo(() => {
    return (
      programs.find((program) => program.isHot && hasSpomoveLink(program)) ||
      programs.find((program) => program.isHot) ||
      programs.find((program) => program.isNew) ||
      programs[0]
    );
  }, [programs]);

  const filteredPrograms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return programs.filter((program) => {
      const queryMatched = normalizedQuery.length === 0 || getSearchText(program).includes(normalizedQuery);
      return queryMatched && matchesFilter(program, filter);
    });
  }, [filter, programs, query]);

  const spomovePrograms = useMemo(() => programs.filter(hasSpomoveLink).slice(0, 6), [programs]);
  const favoritePrograms = useMemo(() => programs.filter((program) => favorites.includes(program.id)).slice(0, 6), [favorites, programs]);

  const counts = useMemo(() => {
    return QUICK_FILTERS.reduce<Record<string, number>>((acc, item) => {
      acc[item] = programs.filter((program) => matchesFilter(program, item)).length;
      return acc;
    }, {});
  }, [programs]);

  if (programs.length === 0) return <LibrarySkeleton />;

  const selectedDrill = selected ? getPrimaryDrill(selected, drills) : undefined;

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-slate-400">MASTER LIBRARY</p>
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">수업을 고르는 화면이 아니라, 바로 실행하는 수업 패키지입니다.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              센터 커리큘럼 데이터를 가져오되, 구독자 화면에서는 사진, 목표, 준비물, 공간 세팅, SPOMOVE, 설명 문구까지 한 번에 이어집니다.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="프로그램명, 도구, 공간, 발달 초점 검색"
                className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.055] pl-12 pr-4 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-indigo-300/45"
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
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
                  filter === item ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/[0.055] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                {item}
                <span className="ml-1 text-xs opacity-55">{counts[item] ?? 0}</span>
              </button>
            ))}
          </div>
        </header>

        {featured ? <FeaturedProgram program={featured} drill={getPrimaryDrill(featured, drills)} onPreview={() => setSelected(featured)} /> : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-bold text-slate-500">전체 프로그램</p>
            <p className="mt-2 text-3xl font-black text-white">{programs.length}</p>
            <p className="mt-1 text-xs font-bold text-emerald-300">admin/curriculum 연동</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-bold text-slate-500">SPOMOVE 연결</p>
            <p className="mt-2 text-3xl font-black text-white">{programs.filter(hasSpomoveLink).length}</p>
            <p className="mt-1 text-xs font-bold text-indigo-300">admin/spomove/training 실행</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs font-bold text-slate-500">바로 설명 가능</p>
            <p className="mt-2 text-3xl font-black text-white">{programs.filter((program) => Boolean(program.lessonDetail?.parentNote || program.description)).length}</p>
            <p className="mt-1 text-xs font-bold text-emerald-300">수업 후 문구 복사</p>
          </div>
        </section>

        {favoritePrograms.length > 0 ? (
          <section>
            <SectionTitle eyebrow="Saved" title="즐겨찾기" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {favoritePrograms.map((program) => (
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
          </section>
        ) : null}

        <section>
          <SectionTitle eyebrow="SPOMOVE Linked" title="화면 활동과 연결되는 수업" actionHref="/spokedu-master/spomove" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {spomovePrograms.map((program) => (
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
        </section>

        <section>
          <SectionTitle eyebrow="All Programs" title={query || filter !== '전체' ? `검색 결과 ${filteredPrograms.length}개` : '전체 수업 패키지'} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPrograms.map((program) => (
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
