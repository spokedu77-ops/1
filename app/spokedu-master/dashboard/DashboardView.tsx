'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  MonitorPlay,
  Play,
  Settings2,
  Sparkles,
  UsersRound,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { LessonPreviewContent } from '../components/lesson/LessonPreviewContent';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { cleanText, hasBrokenText } from '../lib/clean';
import { buildLessonDisplayModel } from '../lib/lessonDisplayModel';
import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';
import { getTrialDaysLeft, isActiveTrial } from '../lib/subscription';
import {
  getRecentActivityOwnerId,
  reconcileRecentProgramActivities,
  selectLatestProgramResume,
  type RecentProgramActivity,
} from '../lib/recentProgramActivity';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { parseMasterSpaces, parseMasterTargets } from '../lib/programDisplayTags';
import { selectWeeklyRecommendationSlots } from '../lib/weeklyRecommendations';
import { toClassRecord } from '../lib/operationalDataAdapter';
import { useExplanationData } from '../explanations/ExplanationDataProvider';
import { useOperationalData } from '../operational/OperationalDataProvider';
import { useMasterStore, useProfile } from '../store';
import type { MasterExplanationDto } from '../types/explanation';
import type { ClassRecord, Program, UserProfile } from '../types';

type ContinueItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  action: string;
  time?: string;
  href: string;
};

const FIRST_START_STEPS = [
  {
    title: '수업 자료 고르기',
    href: '/spokedu-master/library',
    Icon: BookOpen,
  },
  {
    title: '학생 등록하기',
    href: '/spokedu-master/students',
    Icon: UsersRound,
  },
  {
    title: '첫 수업 기록하기',
    href: '/spokedu-master/class-record',
    Icon: ClipboardList,
  },
] as const;

function isPlaceholderText(value?: string | null) {
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

function getProgramGrade(program: Program) {
  return displayText(program.grade, '');
}

function getProgramSpace(program: Program) {
  return displayText(program.space, '');
}

function getHeroImage(program: Program) {
  return resolveProgramHero(program);
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

function hasHomeFlow(program: Program) {
  return Boolean(program.lessonDetail?.rules?.length || program.steps.length);
}

function hasHomeContext(program: Program) {
  return Boolean(program.description && !isPlaceholderText(program.description));
}

function getHomeReadiness(program: Program) {
  const checks = [
    programHasPlayableVideo(program),
    Boolean(getHeroImage(program)),
    Boolean(getProgramGrade(program)),
    Boolean(getProgramSpace(program)),
    hasHomeFlow(program),
    hasHomeContext(program),
    program.equipment.some((item) => !isPlaceholderText(item)),
  ];
  return checks.filter(Boolean).length;
}

function isHomeDisplayable(program: Program) {
  return getHomeReadiness(program) >= 3 && Boolean(getHeroImage(program) || programHasPlayableVideo(program));
}

function getHomeSortOrder(program: Program) {
  return program.homeSortOrder ?? 9999;
}

function compareHomePrograms(a: Program, b: Program) {
  return (
    Number(b.isHot) - Number(a.isHot) ||
    getHomeSortOrder(a) - getHomeSortOrder(b) ||
    getHomeReadiness(b) - getHomeReadiness(a) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(programHasPlayableVideo(b)) - Number(programHasPlayableVideo(a)) ||
    Number(b.isNew) - Number(a.isNew)
  );
}

function selectFeaturedSpomove() {
  const ready = OFFICIAL_SPOMOVE_LIBRARY.filter((preset) => preset.isReady);
  const selected: OfficialSpomovePreset[] = [];
  const axes = new Set<string>();
  const groups = new Set<string>();

  for (const preset of ready) {
    if (selected.length >= 3) break;
    if (axes.has(preset.axis)) continue;
    selected.push(preset);
    axes.add(preset.axis);
    groups.add(preset.programGroup);
  }
  for (const preset of ready) {
    if (selected.length >= 4) break;
    if (groups.has(preset.programGroup)) continue;
    selected.push(preset);
    groups.add(preset.programGroup);
  }
  for (const preset of ready) {
    if (selected.length >= 4) break;
    if (!selected.some((item) => item.id === preset.id)) selected.push(preset);
  }
  return selected;
}

type ContextProgramTab = 'classroom' | 'preschool';

const CONTEXT_PROGRAM_TABS: Array<{ key: ContextProgramTab; label: string }> = [
  { key: 'classroom', label: '교실 체육' },
  { key: 'preschool', label: '미취학 체육' },
];

const isClassroomProgram = (program: Program) =>
  parseMasterSpaces(program.space).includes('교실');

const isPreschoolProgram = (program: Program) => {
  const target =
    program.lessonDetail?.recommendedAge ||
    program.grade ||
    '';

  return parseMasterTargets(target).includes('미취학');
};

function matchesContextTab(program: Program, tab: ContextProgramTab) {
  return tab === 'classroom'
    ? isClassroomProgram(program)
    : isPreschoolProgram(program);
}

function compareContextPrograms(a: Program, b: Program) {
  return (
    Number(isHomeDisplayable(b)) - Number(isHomeDisplayable(a)) ||
    Number(b.isHot) - Number(a.isHot) ||
    getHomeSortOrder(a) - getHomeSortOrder(b) ||
    getHomeReadiness(b) - getHomeReadiness(a) ||
    Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
    Number(programHasPlayableVideo(b)) - Number(programHasPlayableVideo(a)) ||
    Number(b.isNew) - Number(a.isNew)
  );
}

function selectContextPrograms(programs: Program[], tab: ContextProgramTab, weeklyIds: Set<string>) {
  const selected: Program[] = [];
  const usedIds = new Set<string>();
  const usedTitles = new Set<string>();
  const matched = programs.filter((program) => matchesContextTab(program, tab));
  const tiers = [
    matched.filter((program) => !weeklyIds.has(program.id)).sort(compareContextPrograms),
    matched.filter((program) => weeklyIds.has(program.id)).sort(compareContextPrograms),
  ];

  for (const tier of tiers) {
    for (const program of tier) {
      if (selected.length >= 4) return selected;
      const titleKey = normalizeTitle(getProgramTitle(program));
      if (!titleKey || usedIds.has(program.id) || usedTitles.has(titleKey)) continue;
      selected.push(program);
      usedIds.add(program.id);
      usedTitles.add(titleKey);
    }
  }
  return selected;
}

function formatRelativeDate(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '최근';
  const diffMs = Date.now() - time;
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) return '방금';
  const diffDays = Math.floor((Date.now() - time) / 86_400_000);
  if (diffDays <= 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(time));
}

function CoverImage({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
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

  return <Image src={imageSrc} alt={alt} fill sizes={sizes} className={className} priority={priority} />;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="mb-1 text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600">{eyebrow}</p> : null}
        <h2 className="text-[20px] font-black tracking-[-0.025em] text-slate-950 sm:text-[23px]">{title}</h2>
        {description ? <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500 sm:text-sm">{description}</p> : null}
      </div>
      {href && action ? (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[13px] font-black text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
          {action}
          <ArrowRight size={15} />
        </Link>
      ) : null}
    </div>
  );
}

function WeeklyProgramCard({
  program,
  cornerLabel,
  onPreview,
  scope = 'weekly',
  priority = false,
}: {
  program: Program;
  cornerLabel: string;
  onPreview: (program: Program) => void;
  scope?: 'weekly' | 'context';
  priority?: boolean;
}) {
  const model = buildLessonDisplayModel(program);
  const image = model.heroImageUrl;
  const meta = [model.theme, model.target, model.space].filter(Boolean).slice(0, 3);
  const hasVideo = programHasPlayableVideo(program);

  return (
    <article
      data-weekly-program={scope === 'weekly' ? program.id : undefined}
      data-context-program={scope === 'context' ? program.id : undefined}
      className="flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)]"
    >
      <div data-card-media className="group relative h-[calc(83.333333cqw+32px)] w-full overflow-hidden bg-slate-100 lg:h-[calc(83.333333cqw+42px)]">
        <button
          type="button"
          onClick={() => onPreview(program)}
          className="absolute inset-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500"
          aria-label={`${model.title} 미리보기`}
        >
          {image ? (
            <CoverImage src={image} alt={model.title} sizes="(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw" className="object-cover object-[center_38%] transition-transform duration-300 group-hover:scale-[1.01]" priority={priority} />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 to-slate-50">
              <CategoryIcon category={model.theme || '체육 수업'} size={30} />
            </div>
          )}
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/92 px-2.5 py-1 text-[10px] font-black tracking-[0.06em] text-indigo-700">
          {cornerLabel}
        </span>
        {hasVideo ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-indigo-600 text-white shadow-[0_6px_16px_rgba(49,46,129,0.22)] ring-2 ring-white/70"
          >
            <Play className="h-4 w-4 fill-current" />
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="line-clamp-2 text-[16px] font-black leading-5 text-white">{model.title}</h3>
          {meta.length > 0 ? (
            <p className="mt-1 truncate text-[11px] font-bold text-white/85 sm:text-[12px]">{meta.join(' · ')}</p>
          ) : null}
        </div>
      </div>
      <div data-card-footer className="flex h-16 items-center px-2.5 py-2 lg:h-[54px]">
        <div data-card-actions className="flex w-full items-center gap-1.5">
          <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-indigo-600 px-3 text-[13px] font-black text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 lg:h-9">
            수업 자료
          </Link>
        </div>
      </div>
    </article>
  );
}

function ContinueSection({ items }: { items: ContinueItem[] }) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <SectionHeader title="계속 사용하기" description="최근 작업을 바로 이어서 열 수 있습니다." />
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <Link data-continue-item={item.id} key={item.id} href={item.href} className="flex min-h-[82px] items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50 px-3 py-2 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-indigo-600 shadow-sm">
              {item.type === '수업' ? <BookOpen size={18} /> : item.type === 'SPOMOVE' ? <MonitorPlay size={18} /> : <FileText size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black text-indigo-600">{item.type}</span>
              <span className="mt-0.5 block truncate text-[13px] font-black text-slate-900">{item.title}</span>
              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{item.status}</span>
            </span>
            <span className="shrink-0 text-right">
              {item.time ? <span className="block text-[11px] font-bold text-slate-400">{item.time}</span> : null}
              <span className="mt-1 block text-[11px] font-black text-indigo-600">{item.action}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FirstStartGuide() {
  return (
    <section
      data-dashboard-section="first-start"
      aria-labelledby="first-start-heading"
      className="rounded-[20px] border border-indigo-100 bg-indigo-50/60 p-4 shadow-[0_8px_24px_rgba(79,70,229,0.06)] sm:p-5"
    >
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600">Start</p>
        <h2 id="first-start-heading" className="mt-1 text-[20px] font-black tracking-[-0.03em] text-slate-950">
          SPOKEDU MASTER 시작하기
        </h2>
        <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-600">
          수업 자료를 고르고 학생을 등록한 뒤 첫 수업 기록을 남겨 보세요.
        </p>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {FIRST_START_STEPS.map(({ title, href, Icon }, index) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center gap-3 rounded-[14px] border border-indigo-100 bg-white px-3 text-[13px] font-black text-slate-800 transition-colors hover:border-indigo-200 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-600 text-[12px] text-white">
              {index + 1}
            </span>
            <Icon size={16} className="shrink-0 text-indigo-600" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-keep">{title}</span>
            <ArrowRight size={14} className="shrink-0 text-indigo-500" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpomoveCard({ preset }: { preset: OfficialSpomovePreset }) {
  return (
    <article data-spomove-preset={preset.id} className="flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[18px] border border-slate-700 bg-[radial-gradient(circle_at_82%_12%,rgba(99,102,241,0.48),transparent_34%),linear-gradient(145deg,#111827,#0f172a_62%,#020617)] p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-2 gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-[4px] bg-rose-400" />
          <span className="h-3 w-3 rounded-[4px] bg-sky-400" />
          <span className="h-3 w-3 rounded-[4px] bg-amber-300" />
          <span className="h-3 w-3 rounded-[4px] bg-emerald-400" />
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/85">{preset.axisTitle}</span>
      </div>
      <div>
        <h3 className="line-clamp-2 text-[17px] font-black leading-5">{preset.title}</h3>
        <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-4 text-slate-300">{preset.salesCopy || preset.recommendedUse}</p>
        <Link href={officialPresetSessionHref(preset)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-[13px] font-black text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <MonitorPlay size={15} />
          큰 화면 실행
        </Link>
      </div>
    </article>
  );
}

function ActivityPanel({
  reportCount,
  recordCount,
  studentMemoCount,
  profile,
}: {
  reportCount: number | null;
  recordCount: number;
  studentMemoCount: number;
  profile: UserProfile | null;
}) {
  const status = profile?.isAdmin
    ? 'Admin'
    : isActiveTrial(profile)
      ? `무료 체험 D-${getTrialDaysLeft(profile)}`
      : profile?.plan === 'team'
        ? 'Team 이용 중'
        : profile?.plan === 'pro'
          ? 'Pro 이용 중'
          : '이용권 확인';

  const activities: Array<{
    label: string;
    value: number | null;
    href: string;
    Icon: typeof FileText;
  }> = [
    { label: '저장 안내문', value: reportCount, href: '/spokedu-master/report', Icon: FileText },
    { label: '수업 기록', value: recordCount, href: '/spokedu-master/class-record', Icon: CheckCircle2 },
    { label: '학생 메모', value: studentMemoCount, href: '/spokedu-master/students', Icon: UsersRound },
  ];

  return (
    <section data-dashboard-section="activity" aria-labelledby="activity-heading" className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="text-[18px] font-black text-slate-950">내 활동·기록</h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">안내문과 수업 운영 기록을 한곳에서 이어가세요.</p>
        </div>
        <Link href="/spokedu-master/profile" className="inline-flex min-h-9 items-center rounded-full bg-indigo-50 px-3 text-[12px] font-black text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
          {status}
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">
        {activities.map(({ label, value, href, Icon }, index) => (
          <Link
            key={label}
            href={href}
            className={`flex min-h-[70px] items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
              index === 2 ? 'col-span-2 lg:col-span-1' : ''
            }`}
            title={label === '학생 메모' ? '저장된 수업 기록 내 학생 메모 수' : undefined}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white text-emerald-700 shadow-sm"><Icon size={17} /></span>
            <span>
              <span className="block text-[12px] font-bold text-slate-500">{label}</span>
              <span className="mt-0.5 block text-[15px] font-black text-slate-900">
                {value === null ? '확인 중' : `${value}개`}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/spokedu-master/class-tools"
        className="mt-3 flex min-h-11 items-center justify-between rounded-[14px] border border-slate-200 bg-white px-4 text-[13px] font-black text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      >
        <span className="inline-flex items-center gap-2">
          <Wrench size={16} className="text-indigo-600" />
          수업 도구
        </span>

        <span className="inline-flex items-center gap-1 text-[12px] text-indigo-600">
          바로가기
          <ArrowRight size={14} />
        </span>
      </Link>
    </section>
  );
}

function HomeProgramPreview({
  program,
  autoplayVideo,
  onPlaybackStarted,
  onClose,
}: {
  program: Program;
  autoplayVideo: boolean;
  onPlaybackStarted: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet open title="수업 미리보기" onClose={onClose} size="preview">
      <LessonPreviewContent
        program={program}
        autoplayVideo={autoplayVideo}
        onPlaybackStarted={onPlaybackStarted}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="hidden h-10 w-[96px] items-center justify-center rounded-[10px] border border-slate-200 px-4 text-[13px] font-black text-slate-700 sm:inline-flex">
              닫기
            </button>
            <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-indigo-600 px-4 text-[13px] font-black text-white sm:h-10 sm:w-[160px]">
              <BookOpen className="h-4 w-4" />
              수업 자료 보기
            </Link>
          </div>
        }
      />
    </BottomSheet>
  );
}

function buildContinueItems(
  classRecords: ClassRecord[],
  recentProgramActivities: RecentProgramActivity[],
  recentActivityOwnerId: string | null,
  savedReports: MasterExplanationDto[],
  programs: Program[],
) {
  const programsById = new Map(programs.map((program) => [program.id, program]));
  const validActivities = reconcileRecentProgramActivities(recentProgramActivities, programs);
  const recentProgram = recentActivityOwnerId
    ? selectLatestProgramResume(
        validActivities,
        classRecords.filter((record) => programsById.has(record.programId)),
        recentActivityOwnerId,
      )
    : null;
  const recentReport = [...savedReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const items: ContinueItem[] = [];

  if (recentProgram) {
    items.push({
      id: `lesson-${recentProgram.programId}`,
      type: '수업',
      title: recentProgram.programTitle,
      status: recentProgram.source === 'video_started' ? '최근 시청한 수업 영상' : '최근 사용한 수업',
      action: '수업 열기',
      time: formatRelativeDate(recentProgram.occurredAt),
      href: recentProgram.resumeHref,
    });
  }

  if (recentReport) {
    items.push({
      id: `report-${recentReport.id}`,
      type: '안내문',
      title: recentReport.programTitle,
      status: '\uC800\uC7A5\uB41C \uC548\uB0B4\uBB38',
      action: '안내문 열기',
      time: formatRelativeDate(recentReport.createdAt),
      href: `/spokedu-master/report?program=${recentReport.programId}&saved=${recentReport.id}`,
    });
  }

  return items;
}

export default function DashboardView() {
  const {
    programs,
    programsLoaded,
    programsError,
    recentProgramActivities,
    recentActivityOwnerResolved,
    recordRecentProgramActivity,
    reloadPrograms,
  } = useMasterStore();
  const {
    students: serverStudents,
    classRecords: serverClassRecords,
    status: operationalStatus,
  } = useOperationalData();
  const explanationData = useExplanationData();
  const classRecords = useMemo(() => serverClassRecords.map(toClassRecord), [serverClassRecords]);
  const isFirstUser =
    operationalStatus === 'ready' &&
    serverStudents.length === 0 &&
    serverClassRecords.length === 0;
  const profile = useProfile();
  const recentActivityOwnerId = recentActivityOwnerResolved
    ? getRecentActivityOwnerId(profile)
    : null;
  const [mounted, setMounted] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [previewAutoplay, setPreviewAutoplay] = useState(false);
  const [contextTab, setContextTab] = useState<ContextProgramTab>('classroom');

  useEffect(() => {
    setMounted(true);
  }, []);

  const weeklySelection = useMemo(
    () =>
      selectWeeklyRecommendationSlots(programs, {
        isFallbackEligible: isHomeDisplayable,
        compareFallback: (a, b) =>
          Number(b.isHot) - Number(a.isHot) ||
          getHomeReadiness(b) - getHomeReadiness(a) ||
          Number(Boolean(getHeroImage(b))) - Number(Boolean(getHeroImage(a))) ||
          Number(programHasPlayableVideo(b)) - Number(programHasPlayableVideo(a)) ||
          Number(b.isNew) - Number(a.isNew) ||
          getHomeSortOrder(a) - getHomeSortOrder(b),
        normalizeTitle,
      }),
    [programs],
  );
  const weeklyPrograms = weeklySelection.programs;
  const programPool = useMemo(() => uniquePrograms(programs).sort(compareHomePrograms), [programs]);
  const weeklyIds = useMemo(() => new Set(weeklyPrograms.map((program) => program.id)), [weeklyPrograms]);
  const featuredSpomove = useMemo(() => selectFeaturedSpomove(), []);
  const contextPrograms = useMemo(() => {
    const tab = CONTEXT_PROGRAM_TABS.find((item) => item.key === contextTab) ?? CONTEXT_PROGRAM_TABS[0];
    return selectContextPrograms(programs, tab.key, weeklyIds);
  }, [contextTab, programs, weeklyIds]);
  const contextProgramCounts = useMemo(
    () =>
      CONTEXT_PROGRAM_TABS.map((tab) => ({
        ...tab,
        count: selectContextPrograms(programs, tab.key, weeklyIds).length,
      })),
    [programs, weeklyIds],
  );
  const availableContextTabs = contextProgramCounts.filter((tab) => tab.count > 0);
  const contextTabsToDisplay = profile?.isAdmin
    ? CONTEXT_PROGRAM_TABS
    : availableContextTabs;
  const showContextTypeControl = contextTabsToDisplay.length > 1;

  useEffect(() => {
    if (availableContextTabs.length === 1 && contextTab !== availableContextTabs[0].key) {
      setContextTab(availableContextTabs[0].key);
    }
  }, [availableContextTabs, contextTab]);

  const openPreview = (program: Program, autoplayVideo = false) => {
    setPreviewAutoplay(autoplayVideo);
    setSelectedProgram(program);
  };
  const continueItems = useMemo(
    () =>
      buildContinueItems(
        classRecords,
        recentProgramActivities,
        recentActivityOwnerId,
        explanationData.explanations,
        programs,
      ),
    [classRecords, explanationData.explanations, programs, recentActivityOwnerId, recentProgramActivities],
  );
  const studentMemoCount = useMemo(
    () => classRecords.flatMap((record) => record.students).filter((student) => student.memo?.trim()).length,
    [classRecords],
  );

  useEffect(() => {
    if (programsLoaded && programPool.length >= 4 && weeklyPrograms.length < 4) {
      console.error('[SPOKEDU MASTER] Weekly recommendations could not be filled to four items.');
    }
    if (weeklySelection.slotConflicts.length > 0) {
      console.error('[SPOKEDU MASTER] Conflicting explicit weekly slots.', weeklySelection.slotConflicts);
    }
  }, [programPool.length, programsLoaded, weeklyPrograms.length, weeklySelection.slotConflicts]);

  if (!mounted || !programsLoaded) return <DashboardSkeleton />;

  if (programPool.length === 0) {
    const isUnauthorized = programsError === 'unauthorized';
    const isForbidden = programsError === 'forbidden';
    const message = isUnauthorized
      ? '로그인 후 수업 자료를 불러올 수 있습니다.'
      : isForbidden
        ? '이용 기간이 종료되어 수업 자료를 불러올 수 없습니다.'
        : programsError === 'network'
          ? '네트워크 문제로 수업 자료를 불러오지 못했습니다. 연결 상태를 확인해 주세요.'
          : '수업 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return (
      <main className="mx-auto flex h-full w-full max-w-7xl items-center justify-center overflow-y-auto px-4 py-16">
        <section className="w-full max-w-xl rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-[0_16px_48px_rgba(15,23,42,0.06)]">
          <h1 className="text-xl font-black text-slate-950">수업 자료를 불러올 수 없습니다.</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{message}</p>
          {isUnauthorized ? (
            <Link href="/login?next=/spokedu-master/dashboard" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">로그인하기</Link>
          ) : isForbidden ? (
            <Link href="/spokedu-master/subscription" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">30일 이용권 다시 결제하기</Link>
          ) : (
            <button type="button" onClick={() => void reloadPrograms()} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-black text-white">다시 시도하기</button>
          )}
        </section>
      </main>
    );
  }

  const hasRecommendationDataIssue = weeklyPrograms.length < 4;

  return (
    <main className="mx-auto flex h-full w-full max-w-[1376px] flex-col gap-6 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-12">
      <header className="flex min-h-[76px] flex-col justify-center gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-indigo-600">Today</p>
          <h1 className="mt-1 text-[25px] font-black tracking-[-0.035em] text-slate-950">오늘 운영</h1>
          <p className="mt-1 text-[13px] font-semibold text-slate-500 sm:text-sm">수업 프로그램과 SPOMOVE를 확인하고, 최근 작업을 바로 이어갈 수 있습니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/spokedu-master/library" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[13px] font-black text-indigo-700"><BookOpen size={15} />수업안 찾기</Link>
          <Link href="/spokedu-master/spomove" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black text-slate-700"><MonitorPlay size={15} />SPOMOVE</Link>
          <Link href="/spokedu-master/report" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black text-slate-700"><FileText size={15} />안내문</Link>
        </div>
      </header>

      {isFirstUser ? <FirstStartGuide /> : null}

      <section data-dashboard-section="weekly" aria-labelledby="weekly-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600"><Sparkles size={13} />Weekly selection</p>
            <h2 id="weekly-heading" className="text-[22px] font-black tracking-[-0.03em] text-slate-950 sm:text-[26px]">이번 주 추천 프로그램</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">이번 주 현장에서 바로 활용하기 좋은 수업 4개를 골랐습니다.</p>
          </div>
          {profile?.isAdmin ? (
            <Link href="/admin/spokedu-master/programs" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[12px] font-black text-indigo-600"><Settings2 size={14} />추천 관리</Link>
          ) : null}
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {weeklyPrograms.map((program, index) => (
            <div key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start [container-type:inline-size] md:w-auto md:max-w-none">
              <WeeklyProgramCard
                program={program}
                cornerLabel={`추천 ${String(index + 1).padStart(2, '0')}`}
                onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                priority={index < 2}
              />
            </div>
          ))}
        </div>
        {hasRecommendationDataIssue && profile?.isAdmin ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800" role="status">
            추천 가능한 수업 데이터가 4개보다 적습니다. 관리자에서 이미지와 수업 정보를 확인해 주세요.
          </p>
        ) : null}
      </section>

      {continueItems.length > 0 ? <ContinueSection items={continueItems} /> : null}

      <ActivityPanel
        reportCount={explanationData.status === 'loading' ? null : explanationData.total}
        recordCount={classRecords.length}
        studentMemoCount={studentMemoCount}
        profile={profile}
      />

      <section data-dashboard-section="spomove">
        <SectionHeader
          eyebrow="Official screen activities"
          title="SPOMOVE 공식 활동"
          description="수업 도입, 집중 전환, 마무리에 활용할 수 있는 공식 화면 활동"
          href="/spokedu-master/spomove"
          action="전체 보기"
        />
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {featuredSpomove.map((preset) => (
            <div key={preset.id} className="w-[76vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none">
              <SpomoveCard preset={preset} />
            </div>
          ))}
        </div>
      </section>

      {availableContextTabs.length > 0 || profile?.isAdmin ? (
      <section data-dashboard-section="context-programs">
        <SectionHeader
          title="현장 맞춤 프로그램"
          description="교실 체육과 미취학 체육 프로그램을 바로 찾아보세요."
          href="/spokedu-master/library"
          action="라이브러리 보기"
        />
        {showContextTypeControl ? (
          <div className="mb-4 flex gap-2" role="group" aria-label="현장 맞춤 프로그램 유형">
            {contextTabsToDisplay.map((tab) => {
              const active = contextTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setContextTab(tab.key)}
                  className="inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                  style={{
                    background: active ? '#4f46e5' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
        {contextPrograms.length > 0 ? (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {contextPrograms.map((program) => (
              <div key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start [container-type:inline-size] md:w-auto md:max-w-none">
                <WeeklyProgramCard
                  program={program}
                  cornerLabel={contextTab === 'classroom' ? '교실 체육' : '미취학 체육'}
                  onPreview={(item) => openPreview(item, programHasPlayableVideo(item))}
                  scope="context"
                />
              </div>
            ))}
          </div>
        ) : profile?.isAdmin ? (
          <p className="rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-[13px] font-semibold text-slate-500">
            교실체육 또는 미취학 태그가 저장된 프로그램을 확인해 주세요.
          </p>
        ) : null}
      </section>
      ) : null}

      {selectedProgram ? (
        <HomeProgramPreview
          program={selectedProgram}
          autoplayVideo={previewAutoplay}
          onPlaybackStarted={() => {
            recordRecentProgramActivity({
              programId: selectedProgram.id,
              programTitle: selectedProgram.title,
              action: 'video_started',
              occurredAt: new Date().toISOString(),
            });
          }}
          onClose={() => {
            setSelectedProgram(null);
            setPreviewAutoplay(false);
          }}
        />
      ) : null}
    </main>
  );
}
