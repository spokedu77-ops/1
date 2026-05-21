'use client';

import { isSameDay } from 'date-fns';
import { Bell, BookOpen, Check, ChevronRight, Clock3, MonitorPlay, Play, Sparkles, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { BottomSheet } from '../components/ui/BottomSheet';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Drill, Lesson, Notification, Program } from '../types';

function thisMonthCount<T extends { date: string }>(items: T[]) {
  const now = new Date();
  return items.filter((item) => {
    const d = new Date(item.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

function isSpomoveLinked(program: Program) {
  return Boolean(program.lessonDetail?.relatedSpomoveIds?.length) || program.tags.some((tag) => tag.toUpperCase().includes('SPOMOVE'));
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

function pickHeroProgram(programs: Program[]) {
  const pool = buildProgramPool(programs);
  return (
    pool.find((program) => program.isHot && isSpomoveLinked(program)) ||
    pool.find((program) => program.isHot) ||
    pool.find((program) => program.isNew) ||
    pool[0]
  );
}

function getPrimaryDrill(program: Program | undefined, drills: Drill[]) {
  if (!program || drills.length === 0) return undefined;
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  return drills.find((drill) => relatedIds.includes(drill.id)) ?? drills[0];
}

function getHeroImage(program: Program | undefined) {
  return program?.lessonDetail?.heroImageUrl || program?.thumbnailUrl;
}

function getProgramFocus(program: Program) {
  return program.lessonDetail?.developmentFocus || program.category;
}

function formatLessonTime(lesson: Lesson) {
  return `${lesson.period}교시 · ${lesson.duration}분`;
}

function PlanStatusChip() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);

  if (!profile) return null;

  if (profile.isAdmin) {
    return (
      <Link
        href="/spokedu-master/profile"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/50 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
      >
        관리자 패스
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  if (profile.plan === 'free' && daysLeft > 0) {
    return (
      <Link
        href="/spokedu-master/profile"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
      >
        체험 {daysLeft}일 남음
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <Link
      href="/spokedu-master/profile"
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
    >
      플랜 확인
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
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white transition hover:bg-[var(--spm-bg)]"
      style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t2)' }}
      aria-label="알림 열기"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-400" /> : null}
    </button>
  );
}

function HomeHero({ program }: { program: Program }) {
  const heroImage = getHeroImage(program);
  const focus = getProgramFocus(program);
  const hasSpomove = isSpomoveLinked(program);

  return (
    <section
      className="overflow-hidden rounded-[28px] border bg-white"
      style={{ borderColor: 'var(--spm-br2)', boxShadow: '0 4px 24px rgba(15,23,42,0.07)' }}
    >
      <div className="grid lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-10">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                <Sparkles className="h-3.5 w-3.5" />
                오늘의 대표 수업
              </span>
              {hasSpomove ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t2)' }}>
                  <MonitorPlay className="h-3 w-3" />
                  SPOMOVE
                </span>
              ) : null}
            </div>
            <h1 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl" style={{ color: 'var(--spm-t)' }}>
              수업 준비는 쉽게,
              <br />
              수업은 더 몰입감 있게.
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7" style={{ color: 'var(--spm-t2)' }}>
              {program.title} — 준비물, 진행 단계, 설명 문구, SPOMOVE 실행까지 한 번에.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <MiniStat label="대상" value={program.grade} />
              <MiniStat label="시간" value={`${program.duration}분`} />
              <MiniStat label="초점" value={focus} />
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/spokedu-master/class-mode/${program.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-extrabold text-white transition"
              style={{ background: 'var(--spm-acc)' }}
            >
              <Play className="h-4 w-4 fill-current" />
              수업 시작
            </Link>
            <Link
              href={`/spokedu-master/library/${program.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-6 text-sm font-bold transition"
              style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-s2)', color: 'var(--spm-t)' }}
            >
              <BookOpen className="h-4 w-4" />
              수업안 보기
            </Link>
          </div>
        </div>

        <div
          className="relative min-h-[260px] overflow-hidden border-t lg:border-l lg:border-t-0"
          style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-s2)' }}
        >
          {heroImage ? (
            <Image src={heroImage} alt="" fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover" loading="eager" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <CategoryIcon category={program.category} size={72} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-bg)' }}>
      <p className="text-[10px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      <p className="mt-0.5 line-clamp-2 text-xs font-black leading-4" style={{ color: 'var(--spm-t)' }}>{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="flex flex-col rounded-2xl border bg-white px-5 py-4" style={{ borderColor: 'var(--spm-br2)' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{label}</p>
      <p className="mt-2 text-3xl font-black" style={{ color: 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--spm-t2)' }}>{sub}</p>
    </div>
  );
}

function ProgramPackageCard({ program, drill }: { program: Program; drill?: Drill }) {
  const focus = getProgramFocus(program);
  const heroImg = getHeroImage(program);
  const hasSpomove = isSpomoveLinked(program);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <article
      className="flex flex-col overflow-hidden rounded-3xl border bg-white transition hover:-translate-y-0.5"
      style={{ borderColor: 'var(--spm-br2)', boxShadow: '0 2px 12px rgba(15,23,42,0.07)' }}
    >
      <Link href={`/spokedu-master/library/${program.id}`} className="relative h-48 shrink-0 overflow-hidden rounded-t-3xl" style={{ background: 'var(--spm-s3)' }}>
        {heroImg ? (
          <Image
            src={heroImg}
            alt=""
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 768px) 45vw, 100vw"
            className="object-cover transition duration-500 hover:scale-105"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--spm-s3) 0%, var(--spm-s4) 100%)' }}>
            <CategoryIcon category={program.category} size={56} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {hasSpomove ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-1 text-[10px] font-black text-white">
            <MonitorPlay className="h-3 w-3" />
            SPOMOVE
          </span>
        ) : null}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.55)' }}>{program.category}</p>
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-white">{program.title}</h3>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-xs leading-5" style={{ color: 'var(--spm-t2)' }}>{focus}</p>
        <div className="mt-auto flex gap-2 pt-4">
          <Link
            href={`/spokedu-master/class-mode/${program.id}`}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            <Play className="h-4 w-4 fill-current" />
            수업 시작
          </Link>
          {hasSpomove ? (
            <Link
              href={spomoveHref}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition hover:opacity-70"
              style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t2)' }}
            >
              <Zap className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function WeeklySpomoveCard({ drill }: { drill: Drill }) {
  const drillTitle = drill.name || drill.category || 'SPOMOVE';
  const drillCaption = drill.description || `${drill.category} 수업에서 바로 실행할 수 있는 큰 화면 반응 훈련입니다.`;

  return (
    <article
      className="flex flex-col overflow-hidden rounded-3xl border bg-white transition hover:-translate-y-0.5"
      style={{ borderColor: 'var(--spm-br2)', boxShadow: '0 2px 12px rgba(15,23,42,0.07)' }}
    >
      <div className="relative h-48 shrink-0 overflow-hidden rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4f46e5 100%)' }}>
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.1]">
          <MonitorPlay size={140} color="#fff" strokeWidth={0.6} />
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white/90 backdrop-blur">
          <MonitorPlay className="h-3 w-3" />
          SPOMOVE
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.55)' }}>큰 화면 활동</p>
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-white">{drillTitle}</h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-xs leading-5" style={{ color: 'var(--spm-t2)' }}>{drillCaption}</p>
        <div className="mt-auto pt-4">
          <Link
            href={`/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold text-white"
            style={{ background: 'var(--spm-acc)' }}
          >
            <Play className="h-4 w-4 fill-current" />
            큰 화면 실행
          </Link>
        </div>
      </div>
    </article>
  );
}

function TodayLessons({ lessons }: { lessons: Lesson[] }) {
  return (
    <section className="rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: 'var(--spm-br2)' }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-acc)' }}>Today</p>
          <h2 className="mt-1 text-xl font-black" style={{ color: 'var(--spm-t)' }}>오늘 수업</h2>
        </div>
        <Link href="/spokedu-master/library" className="text-sm font-bold transition" style={{ color: 'var(--spm-acc)' }}>
          수업 찾기
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {lessons.length > 0 ? (
          lessons.slice(0, 3).map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-4 rounded-2xl border p-4" style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)' }}>
              <span className="h-11 w-1.5 rounded-full" style={{ background: lesson.color || '#6366f1' }} />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black" style={{ color: 'var(--spm-t)' }}>{lesson.title}</h3>
                <p className="mt-1 text-xs" style={{ color: 'var(--spm-t3)' }}>{formatLessonTime(lesson)}</p>
              </div>
              {lesson.done ? (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t3)' }}>
                  <Clock3 className="h-4 w-4" />
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-5" style={{ borderColor: 'var(--spm-br2)', background: 'var(--spm-bg)' }}>
            <p className="mb-3 text-sm leading-6" style={{ color: 'var(--spm-t2)' }}>오늘 등록된 수업이 없습니다.</p>
            <Link href="/spokedu-master/library" className="inline-flex h-9 items-center gap-1.5 rounded-2xl border bg-white px-3 text-xs font-bold transition" style={{ borderColor: 'var(--spm-br2)', color: 'var(--spm-t)' }}>
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
            <div key={notification.id} className="rounded-2xl border p-4" style={{ borderColor: notification.read ? 'var(--spm-br)' : 'rgba(99,102,241,0.3)', background: notification.read ? 'var(--spm-bg)' : 'rgba(99,102,241,0.06)' }}>
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: notification.read ? 'var(--spm-t3)' : 'var(--spm-acc)' }} />
                <div>
                  <h3 className="text-sm font-black" style={{ color: 'var(--spm-t)' }}>{notification.title}</h3>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--spm-t2)' }}>{notification.body}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: 'var(--spm-br)', background: 'var(--spm-bg)', color: 'var(--spm-t2)' }}>아직 새 알림이 없습니다.</div>
        )}
      </div>
      {notifications.some((notification) => !notification.read) ? (
        <button type="button" onClick={onMarkAllRead} className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950">
          모두 읽음 처리
        </button>
      ) : null}
    </BottomSheet>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded, drills, drillsLoaded, lessons, notifications, markAllRead, sessions, classRecords } = useMasterStore();
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

  const weeklyPrograms = useMemo(() => {
    const pool = buildProgramPool(programs).filter((program) => program.id !== heroProgram?.id);
    return pool
      .sort((a, b) => Number(b.isHot) - Number(a.isHot) || Number(b.isNew) - Number(a.isNew))
      .slice(0, 3);
  }, [heroProgram?.id, programs]);

  const weeklyDrill = useMemo(() => heroDrill ?? drills[0], [drills, heroDrill]);

  const monthClassCount = useMemo(() => thisMonthCount(classRecords), [classRecords]);
  const monthSpomoveCount = useMemo(() => thisMonthCount(sessions), [sessions]);

  if (!mounted || !programsLoaded || !drillsLoaded || !heroProgram) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--spm-t3)' }}>SPOKEDU MASTER</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl" style={{ color: 'var(--spm-t)' }}>오늘 수업</h1>
          </div>
          <div className="flex items-center gap-2">
            <PlanStatusChip />
            <NotificationButton onClick={() => setNotificationOpen(true)} />
          </div>
        </header>

        <HomeHero program={heroProgram} />

        <section className="grid grid-cols-3 gap-3">
          <StatCard label="이번 달 수업" value={monthClassCount} sub="수업 기록" />
          <StatCard label="이번 달 SPOMOVE" value={monthSpomoveCount} sub="세션 기록" />
          <StatCard label="수업 패키지" value={programs.length} sub="전체 라이브러리" />
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-acc)' }}>Ready This Week</p>
              <h2 className="mt-1 text-xl font-black" style={{ color: 'var(--spm-t)' }}>이번 주 수업 준비 끝내는 4선</h2>
            </div>
            <Link href="/spokedu-master/library" className="text-sm font-bold transition" style={{ color: 'var(--spm-acc)' }}>
              전체 보기
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {weeklyPrograms.map((program) => (
              <ProgramPackageCard key={program.id} program={program} drill={getPrimaryDrill(program, drills)} />
            ))}
            {weeklyDrill ? <WeeklySpomoveCard drill={weeklyDrill} /> : null}
          </div>
        </section>

        <TodayLessons lessons={todayLessons} />
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
