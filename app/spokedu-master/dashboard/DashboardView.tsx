'use client';

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileText,
  MonitorPlay,
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
import { getLessonFunction, getLessonSpace, getLessonTarget, getLessonTheme } from '../lib/lessonDisplay';
import {
  getImageFallbackSrc,
  isRemoteImage,
  normalizeImageSrc,
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';
import { getTrialDaysLeft, isActiveTrial } from '../lib/subscription';
import {
  OFFICIAL_SPOMOVE_LIBRARY,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';
import { parseMasterSpaces, parseMasterTargets } from '../lib/programDisplayTags';
import { useMasterStore, useProfile } from '../store';
import type { ClassRecord, Program, Session, UserProfile } from '../types';

type SavedExplanation = {
  id: string;
  programId: string;
  programTitle: string;
  createdAt: string;
};

type ContinueItem = {
  id: string;
  type: string;
  title: string;
  time: string;
  href: string;
};

const REPORT_STORAGE_KEY = 'spokedu-master-explanations-v1';
const OFFICIAL_PRESET_IDS = new Set(
  OFFICIAL_SPOMOVE_LIBRARY.flatMap((preset) => [preset.id, preset.engine.mode, preset.programGroup]),
);

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

function getProgramCategory(program: Program) {
  return displayText(program.category, '체육 수업');
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

function selectWeeklyPrograms(programs: Program[]) {
  const selected: Program[] = [];
  const seen = new Set<string>();

  const append = (candidates: Program[]) => {
    for (const program of candidates) {
      if (selected.length >= 4) return;
      if (seen.has(program.id) || !isHomeDisplayable(program)) continue;
      selected.push(program);
      seen.add(program.id);
    }
  };

  append(
    programs
      .filter((program) => getHomeSortOrder(program) >= 1 && getHomeSortOrder(program) <= 4)
      .sort((a, b) => getHomeSortOrder(a) - getHomeSortOrder(b)),
  );
  append(programs.filter((program) => program.isHot).sort(compareHomePrograms));
  append(programs.filter(isHomeDisplayable).sort(compareHomePrograms));

  return selected;
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

function hasExplicitOfficialSpomove(program: Program) {
  return (program.lessonDetail?.relatedSpomoveIds ?? []).some((id) => OFFICIAL_PRESET_IDS.has(id));
}

function compactToken(value?: string | null) {
  const text = cleanText(value ?? undefined, '').trim();
  if (!text || isPlaceholderText(text) || text.length > 18) return '';
  return text;
}

function getProgramMeta(program: Program) {
  const target = parseMasterTargets(getLessonTarget(program))[0] ?? compactToken(getLessonTarget(program));
  const space = parseMasterSpaces(getLessonSpace(program))[0] ?? compactToken(getLessonSpace(program));
  const equipment = program.equipment.find((item) => !isPlaceholderText(item)) ?? '';
  return Array.from(new Set([target, space, equipment].filter(Boolean))).slice(0, 3);
}

function getNewProgramMeta(program: Program) {
  const theme = compactToken(getLessonTheme(program));
  const feature = getLessonFunction(program)
    .split(/[\/,·]/)
    .map((value) => compactToken(value))
    .find(Boolean);
  return Array.from(new Set([theme, ...getProgramMeta(program), feature].filter(Boolean))).slice(0, 2);
}

function formatRelativeDate(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '최근';
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
  index,
  onPreview,
}: {
  program: Program;
  index: number;
  onPreview: (program: Program) => void;
}) {
  const image = getHeroImage(program);
  const meta = getProgramMeta(program);
  const hasVideo = programHasPlayableVideo(program);
  const hasParentNote = Boolean(program.lessonDetail?.parentNote?.trim());
  const hasSpomove = hasExplicitOfficialSpomove(program);

  return (
    <article data-weekly-program={program.id} className="flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)]">
      <button
        type="button"
        onClick={() => onPreview(program)}
        className="group relative aspect-[6/5] w-full overflow-hidden bg-slate-100 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-indigo-500"
        aria-label={`${getProgramTitle(program)} 미리보기`}
      >
        {image ? (
          <CoverImage src={image} alt={getProgramTitle(program)} sizes="(min-width: 1280px) 290px, (min-width: 768px) 45vw, 82vw" className="object-cover object-[center_38%] transition-transform duration-300 group-hover:scale-[1.01]" priority={index < 2} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-100 to-slate-50">
            <CategoryIcon category={getProgramCategory(program)} size={30} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/16 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/92 px-2.5 py-1 text-[10px] font-black tracking-[0.06em] text-indigo-700">
          추천 {String(index + 1).padStart(2, '0')}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="line-clamp-2 min-h-10 text-[17px] font-black leading-5 text-white">{getProgramTitle(program)}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meta.map((item) => (
              <span key={item} className="rounded-md bg-white/14 px-2 py-1 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur">
                {item}
              </span>
            ))}
          </div>
        </div>
      </button>
      <div className="flex min-h-[98px] flex-1 flex-col justify-between gap-3 p-3.5">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
            <Clock3 size={12} />
            {program.duration}분
          </span>
          {hasVideo ? <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">영상</span> : null}
          {hasParentNote ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">안내문</span> : null}
          {hasSpomove ? <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">SPOMOVE</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-indigo-600 px-3 text-[13px] font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
            수업 자료
          </Link>
          <button type="button" onClick={() => onPreview(program)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-[13px] font-black text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            미리보기
          </button>
          {hasParentNote ? (
            <Link href={`/spokedu-master/report?program=${program.id}`} className="inline-flex min-h-11 items-center px-1 text-[12px] font-black text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
              안내문
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CompactProgramCard({ program, onPreview }: { program: Program; onPreview: (program: Program) => void }) {
  const image = getHeroImage(program);
  return (
    <button
      type="button"
      onClick={() => onPreview(program)}
      className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
      aria-label={`${getProgramTitle(program)} 보기`}
    >
      <div className="relative aspect-[6/5] overflow-hidden rounded-[17px] border border-slate-200 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
        {image ? (
          <CoverImage src={image} alt={getProgramTitle(program)} sizes="(min-width: 1024px) 250px, 72vw" className="object-cover object-[center_38%] transition-transform duration-300 group-hover:scale-[1.01]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-slate-100">
            <CategoryIcon category={getProgramCategory(program)} size={28} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/12 to-transparent" />
        {programHasPlayableVideo(program) ? <span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-indigo-700">영상 포함</span> : null}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-[15px] font-black leading-5 text-white">{getProgramTitle(program)}</h3>
          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-white/72">{getNewProgramMeta(program).join(' · ')}</p>
        </div>
      </div>
    </button>
  );
}

function ContinueSection({ items }: { items: ContinueItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <SectionHeader title="계속 사용하기" description="최근 작업을 바로 이어서 열 수 있습니다." />
      <div className="grid gap-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className="flex min-h-[68px] items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50 px-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-indigo-600 shadow-sm">
              {item.type === '수업' ? <BookOpen size={18} /> : item.type === 'SPOMOVE' ? <MonitorPlay size={18} /> : <FileText size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-black text-indigo-600">{item.type}</span>
              <span className="mt-0.5 block truncate text-[13px] font-black text-slate-900">{item.title}</span>
            </span>
            <span className="shrink-0 text-[11px] font-bold text-slate-400">{item.time}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpomoveCard({ preset }: { preset: OfficialSpomovePreset }) {
  return (
    <article data-spomove-preset={preset.id} className="flex aspect-[6/5] flex-col justify-between overflow-hidden rounded-[18px] border border-slate-700 bg-[radial-gradient(circle_at_82%_12%,rgba(99,102,241,0.48),transparent_34%),linear-gradient(145deg,#111827,#0f172a_62%,#020617)] p-4 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]">
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
        <div className="mt-3 flex flex-wrap gap-1.5">
          {preset.settingChips.slice(0, 2).map((chip) => (
            <span key={chip} className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold text-white/80 ring-1 ring-white/10">{chip}</span>
          ))}
        </div>
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
    value: number | null | undefined;
    href: string;
    Icon: typeof FileText;
  }> = [
    { label: '안내문', value: reportCount, href: '/spokedu-master/report', Icon: FileText },
    { label: '수업 기록', value: recordCount, href: '/spokedu-master/class-record', Icon: CheckCircle2 },
    { label: '학생 메모', value: studentMemoCount, href: '/spokedu-master/students', Icon: UsersRound },
    { label: '수업 도구', value: undefined, href: '/spokedu-master/class-tools', Icon: Wrench },
  ];

  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-black text-slate-950">내 활동</h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">안내문과 수업 운영 기록을 한곳에서 이어가세요.</p>
        </div>
        <Link href="/spokedu-master/profile" className="inline-flex min-h-9 items-center rounded-full bg-indigo-50 px-3 text-[12px] font-black text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
          {status}
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {activities.map(({ label, value, href, Icon }) => (
          <Link key={label} href={href} className="flex min-h-[70px] items-center gap-3 rounded-[14px] border border-slate-100 bg-slate-50 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-white text-emerald-700 shadow-sm"><Icon size={17} /></span>
            <span>
              <span className="block text-[12px] font-bold text-slate-500">{label}</span>
              <span className="mt-0.5 block text-[15px] font-black text-slate-900">
                {value === null ? '확인 중' : value === undefined ? '바로가기' : `${value}개`}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomeProgramPreview({ program, onClose }: { program: Program; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const parentCopy = program.lessonDetail?.parentNote?.trim() ?? '';

  const copyParentNote = async () => {
    await navigator.clipboard.writeText(parentCopy);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <BottomSheet open title="수업 미리보기" onClose={onClose} size="document">
      <LessonPreviewContent
        program={program}
        footer={
          <div className={parentCopy ? 'grid gap-2 sm:grid-cols-2' : ''}>
            <Link href={`/spokedu-master/library/${program.id}`} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white">
              <BookOpen className="h-4 w-4" />
              수업 자료 보기
            </Link>
            {parentCopy ? (
              <button type="button" onClick={copyParentNote} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
                <Clipboard className="h-4 w-4" />
                {copied ? '복사 완료' : '안내문 문구 복사'}
              </button>
            ) : null}
          </div>
        }
      />
    </BottomSheet>
  );
}

function buildContinueItems(
  classRecords: ClassRecord[],
  sessions: Session[],
  savedReports: SavedExplanation[],
  programs: Program[],
) {
  const items: ContinueItem[] = [];
  const programsById = new Map(programs.map((program) => [program.id, program]));
  const recentRecord = [...classRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((record) => programsById.has(record.programId));

  if (recentRecord) {
    items.push({
      id: `lesson-${recentRecord.id}`,
      type: '수업',
      title: recentRecord.programTitle || recentRecord.lessonTitle,
      time: formatRelativeDate(recentRecord.date),
      href: `/spokedu-master/library/${recentRecord.programId}`,
    });
  }
  if (sessions[0]) {
    items.push({
      id: `spomove-${sessions[0].id}`,
      type: 'SPOMOVE',
      title: sessions[0].drillName,
      time: formatRelativeDate(sessions[0].date),
      href: '/spokedu-master/spomove',
    });
  }
  if (savedReports[0]) {
    items.push({
      id: `report-${savedReports[0].id}`,
      type: '안내문',
      title: savedReports[0].programTitle,
      time: formatRelativeDate(savedReports[0].createdAt),
      href: `/spokedu-master/report?program=${savedReports[0].programId}`,
    });
  }
  return items;
}

export default function DashboardView() {
  const {
    programs,
    programsLoaded,
    programsError,
    classRecords,
    sessions,
    reloadPrograms,
  } = useMasterStore();
  const profile = useProfile();
  const [mounted, setMounted] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [savedReports, setSavedReports] = useState<SavedExplanation[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const parsed = JSON.parse(window.localStorage.getItem(REPORT_STORAGE_KEY) ?? '[]') as SavedExplanation[];
      setSavedReports(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSavedReports([]);
    } finally {
      setReportsLoaded(true);
    }
  }, []);

  const programPool = useMemo(() => uniquePrograms(programs).sort(compareHomePrograms), [programs]);
  const weeklyPrograms = useMemo(() => selectWeeklyPrograms(programPool), [programPool]);
  const weeklyIds = useMemo(() => new Set(weeklyPrograms.map((program) => program.id)), [weeklyPrograms]);
  const featuredSpomove = useMemo(() => selectFeaturedSpomove(), []);
  const newPrograms = useMemo(() => {
    const candidates = programPool.filter((program) => !weeklyIds.has(program.id) && isHomeDisplayable(program));
    return [
      ...candidates.filter((program) => program.isNew),
      ...candidates.filter((program) => !program.isNew),
    ].slice(0, 5);
  }, [programPool, weeklyIds]);
  const continueItems = useMemo(
    () => buildContinueItems(classRecords, sessions, savedReports, programPool),
    [classRecords, programPool, savedReports, sessions],
  );
  const studentMemoCount = useMemo(
    () => classRecords.flatMap((record) => record.students).filter((student) => student.memo?.trim()).length,
    [classRecords],
  );

  useEffect(() => {
    if (programsLoaded && programPool.length >= 4 && weeklyPrograms.length < 4) {
      console.error('[SPOKEDU MASTER] Weekly recommendations could not be filled to four items.');
    }
  }, [programPool.length, programsLoaded, weeklyPrograms.length]);

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
          <Link href="/spokedu-master/library" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black text-slate-700"><BookOpen size={15} />수업안 찾기</Link>
          <Link href="/spokedu-master/spomove" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black text-slate-700"><MonitorPlay size={15} />SPOMOVE</Link>
          <Link href="/spokedu-master/report" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-black text-slate-700"><FileText size={15} />안내문</Link>
        </div>
      </header>

      <section data-dashboard-section="weekly" aria-labelledby="weekly-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600"><Sparkles size={13} />Weekly selection</p>
            <h2 id="weekly-heading" className="text-[22px] font-black tracking-[-0.03em] text-slate-950 sm:text-[26px]">이번 주 추천 프로그램</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate-500">관리자 추천을 우선하고, 운영 준비도가 높은 수업으로 4개를 완성합니다.</p>
          </div>
          {profile?.isAdmin ? (
            <Link href="/admin/spokedu-master/programs" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[12px] font-black text-indigo-600"><Settings2 size={14} />추천 관리</Link>
          ) : null}
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 md:overflow-visible lg:-mx-0 lg:grid-cols-4 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {weeklyPrograms.map((program, index) => (
            <div key={program.id} className="w-[82vw] max-w-[330px] shrink-0 snap-start md:w-auto md:max-w-none">
              <WeeklyProgramCard program={program} index={index} onPreview={setSelectedProgram} />
            </div>
          ))}
        </div>
        {hasRecommendationDataIssue ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800" role="status">
            추천 가능한 수업 데이터가 4개보다 적습니다. 관리자에서 이미지와 수업 정보를 확인해 주세요.
          </p>
        ) : null}
      </section>

      <ContinueSection items={continueItems} />

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

      {newPrograms.length > 0 ? (
        <section data-dashboard-section="new-programs">
          <SectionHeader
            eyebrow="Explore more"
            title="새로운 수업안"
            description="추천 프로그램과 겹치지 않는 새 콘텐츠를 더 살펴보세요."
            href="/spokedu-master/library"
            action="라이브러리 보기"
          />
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {newPrograms.map((program) => (
              <div key={program.id} className="w-[66vw] max-w-[270px] shrink-0 snap-start lg:w-auto lg:max-w-none">
                <CompactProgramCard program={program} onPreview={setSelectedProgram} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ActivityPanel
        reportCount={reportsLoaded ? savedReports.length : null}
        recordCount={classRecords.length}
        studentMemoCount={studentMemoCount}
        profile={profile}
      />

      {selectedProgram ? <HomeProgramPreview program={selectedProgram} onClose={() => setSelectedProgram(null)} /> : null}
    </main>
  );
}
