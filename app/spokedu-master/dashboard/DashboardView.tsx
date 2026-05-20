'use client';

import { isSameDay } from 'date-fns';
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  MonitorPlay,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Drill, Lesson, Notification, Program } from '../types';

function pickHeroProgram(programs: Program[]) {
  return (
    programs.find((program) => program.isHot && isSpomoveLinked(program)) ||
    programs.find((program) => program.isHot) ||
    programs.find((program) => program.isNew) ||
    programs[0]
  );
}

function isSpomoveLinked(program: Program) {
  return Boolean(program.lessonDetail?.relatedSpomoveIds?.length) || program.tags.some((tag) => tag.toUpperCase().includes('SPOMOVE'));
}


function getPrimaryDrill(program: Program | undefined, drills: Drill[]) {
  if (!program || drills.length === 0) return undefined;
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id)) ?? drills[0];
}

function getHeroImage(program: Program | undefined) {
  return program?.lessonDetail?.heroImageUrl || program?.thumbnailUrl;
}

function formatLessonTime(lesson: Lesson) {
  return `${lesson.period}교시 · ${lesson.duration}분`;
}

function PlanStatusChip() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);

  if (!profile) return null;

  if (profile.plan === 'free' && daysLeft > 0) {
    return (
      <Link
        href="/spokedu-master/profile"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/15"
      >
        체험 {daysLeft}일 남음
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <Link
      href="/spokedu-master/profile"
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-300/15"
    >
      MASTER 활성
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function NotificationButton({ onClick }: { onClick: () => void }) {
  const unreadCount = useUnreadCount();

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-100 transition hover:bg-white/[0.1]"
      aria-label="알림 열기"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? (
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-[#070812] bg-rose-400" />
      ) : null}
    </button>
  );
}

function HomeHero({ program, drill }: { program: Program; drill?: Drill }) {
  const heroImage = getHeroImage(program);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="grid min-h-[360px] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-400/12 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                오늘 추천 패키지
              </span>
              {isSpomoveLinked(program) ? (
                <span className="inline-flex items-center rounded-full bg-emerald-400/12 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                  SPOMOVE 연동
                </span>
              ) : null}
            </div>

            <h1 className="max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              수업 준비는 쉽게,
              <br />
              수업은 더 몰입감 있게.
            </h1>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/spokedu-master/class-mode/${program.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-950 transition hover:bg-slate-100"
            >
              <Play className="h-4 w-4 fill-current" />
              수업 시작
            </Link>
            <Link
              href={spomoveHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-5 text-sm font-bold text-white transition hover:bg-white/[0.12]"
            >
              <MonitorPlay className="h-4 w-4" />
              큰 화면 실행
            </Link>
            <Link
              href={`/spokedu-master/library/${program.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
            >
              <BookOpen className="h-4 w-4" />
              수업안 보기
            </Link>
          </div>
        </div>

        <div className="relative min-h-[280px] overflow-hidden border-t border-white/10 lg:border-l lg:border-t-0">
          {heroImage ? (
            <Image
              src={heroImage}
              alt=""
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
              loading="eager"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.5),transparent_36%),linear-gradient(135deg,#10172a,#172554_48%,#020617)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <div className="rounded-3xl border border-white/12 bg-slate-950/72 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Selected Program</p>
                  <h2 className="mt-1 line-clamp-2 text-xl font-black text-white">{program.title}</h2>
                </div>
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <CategoryIcon category={program.category} size={22} />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="대상" value={program.grade} />
                <MiniStat label="시간" value={`${program.duration}분`} />
                <MiniStat label="공간" value={program.space} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[62px] rounded-2xl bg-white/[0.06] px-2 py-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white">{value}</p>
    </div>
  );
}

// Peloton + Apple Fitness+ 참고: 홈에서 운동 직접 실행, 색상으로 카테고리 즉각 구분
function SpomoveDrillCard({ drill }: { drill: Drill }) {
  return (
    <article
      className="flex min-h-[152px] flex-col overflow-hidden rounded-3xl border border-white/10 p-5"
      style={{ backgroundColor: drill.bgColor }}
    >
      <span className="mb-3 inline-block w-fit rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
        {drill.category}
      </span>
      <h3 className="flex-1 text-base font-black leading-snug text-white">{drill.name}</h3>
      <Link
        href={`/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-2xl bg-white/15 text-[13px] font-extrabold text-white transition hover:bg-white/25"
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        바로 실행
      </Link>
    </article>
  );
}

function SpomoveQuickLaunch({ drills }: { drills: Drill[] }) {
  const topDrills = drills.slice(0, 4);
  if (topDrills.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">SPOMOVE</p>
          <h2 className="mt-1 text-xl font-black text-white">드릴 바로 실행</h2>
        </div>
        <Link href="/spokedu-master/spomove" className="text-sm font-bold text-indigo-200 hover:text-white">
          전체 보기
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {topDrills.map((drill) => (
          <SpomoveDrillCard key={drill.id} drill={drill} />
        ))}
      </div>
    </section>
  );
}

function ProgramPackageCard({ program, drill }: { program: Program; drill?: Drill }) {
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <article className="flex min-h-[264px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055]">
      <Link href={`/spokedu-master/library/${program.id}`} className="relative h-32 overflow-hidden bg-slate-900">
        {getHeroImage(program) ? (
          <Image
            src={getHeroImage(program) as string}
            alt=""
            fill
            sizes="(min-width: 1024px) 28vw, (min-width: 768px) 32vw, 100vw"
            className="object-cover transition duration-500 hover:scale-105"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-indigo-500/30 via-slate-900 to-emerald-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
          {program.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-base font-black leading-snug text-white">{program.title}</h3>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link
            href={`/spokedu-master/class-mode/${program.id}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-extrabold text-slate-950"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            시작
          </Link>
          {isSpomoveLinked(program) ? (
            <Link
              href={spomoveHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-200"
            >
              <Zap className="h-3.5 w-3.5" />
              SPOMOVE
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function TodayLessons({ lessons }: { lessons: Lesson[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">Today</p>
          <h2 className="mt-1 text-xl font-black text-white">오늘 수업</h2>
        </div>
        <Link href="/spokedu-master/library" className="text-sm font-bold text-indigo-200 hover:text-white">
          수업 찾기
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {lessons.length > 0 ? (
          lessons.slice(0, 3).map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.045] p-4">
              <span className="h-11 w-1.5 rounded-full" style={{ background: lesson.color || '#6366f1' }} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-white">{lesson.title}</h3>
                <p className="mt-1 text-xs text-slate-400">{formatLessonTime(lesson)}</p>
              </div>
              {lesson.done ? (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-200">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-slate-300">
                  <Clock3 className="h-4 w-4" />
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-5">
            <p className="mb-3 text-sm leading-6 text-slate-400">오늘 예정된 수업이 없습니다.</p>
            <Link
              href="/spokedu-master/library"
              className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3 text-xs font-bold text-white transition hover:bg-white/[0.1]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              수업 찾기
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function NotificationSheet({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}: {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
}) {
  return (
    <BottomSheet open={isOpen} onClose={onClose} title="알림">
      <div className="space-y-3">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 ${
                notification.read ? 'border-white/8 bg-white/[0.035]' : 'border-indigo-300/25 bg-indigo-400/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? 'bg-slate-600' : 'bg-indigo-300'}`} />
                <div>
                  <h3 className="text-sm font-black text-white">{notification.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{notification.body}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-5 text-sm text-slate-400">
            아직 새 알림이 없습니다.
          </div>
        )}
      </div>
      {notifications.some((notification) => !notification.read) ? (
        <button
          type="button"
          onClick={onMarkAllRead}
          className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950"
        >
          모두 읽음 처리
        </button>
      ) : null}
    </BottomSheet>
  );
}

export default function DashboardView() {
  const profile = useProfile();
  const { programs, drills, lessons, notifications, markAllRead } = useMasterStore();
  const [mounted, setMounted] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayLessons = useMemo(() => {
    const today = new Date();
    return lessons.filter((lesson) => isSameDay(new Date(lesson.date), today));
  }, [lessons]);

  const heroProgram = useMemo(() => pickHeroProgram(programs), [programs]);
  const heroDrill = useMemo(() => getPrimaryDrill(heroProgram, drills), [heroProgram, drills]);

  const recommendedPrograms = useMemo(() => {
    return programs
      .filter((program) => program.id !== heroProgram?.id)
      .sort((a, b) => Number(b.isHot) - Number(a.isHot) || Number(b.isNew) - Number(a.isNew))
      .slice(0, 3);
  }, [heroProgram?.id, programs]);

  if (!mounted || !heroProgram) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-400">SPOKEDU MASTER</p>
            <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
              {profile?.name ?? '선생님'}님, 오늘 수업을 바로 준비해볼까요?
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <PlanStatusChip />
            <NotificationButton onClick={() => setNotificationOpen(true)} />
          </div>
        </header>

        <HomeHero program={heroProgram} drill={heroDrill} />

        <SpomoveQuickLaunch drills={drills} />

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">Recommended</p>
                <h2 className="mt-1 text-xl font-black text-white">오늘 쓸 만한 패키지</h2>
              </div>
              <Link href="/spokedu-master/library" className="text-sm font-bold text-indigo-200 hover:text-white">
                전체 보기
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {recommendedPrograms.map((program) => (
                <ProgramPackageCard key={program.id} program={program} drill={getPrimaryDrill(program, drills)} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <TodayLessons lessons={todayLessons} />
            <PwaInstallCard compact />
          </div>
        </section>
      </main>

      <NotificationSheet
        isOpen={isNotificationOpen}
        onClose={() => setNotificationOpen(false)}
        notifications={notifications}
        onMarkAllRead={markAllRead}
      />
    </>
  );
}
