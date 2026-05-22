'use client';

import { Bell, BookOpen, ChevronRight, Clock3, MapPin, MonitorPlay, Play, Sparkles, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Drill, Notification, Program } from '../types';

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

function getFocusItems(program: Program, limit = 3) {
  return getProgramFocus(program)
    .split('/')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function getProgramOutcome(program: Program) {
  const focusItems = getFocusItems(program, 3);
  return focusItems.length > 0 ? focusItems.join(' · ') : program.category;
}

function PlanStatusChip() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);

  if (!profile) return null;

  if (profile.isAdmin) {
    return (
      <Link
        href="/spokedu-master/profile"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
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
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 transition hover:bg-amber-100"
      >
        체험 {daysLeft}일 남음
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <Link
      href="/spokedu-master/profile"
      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100"
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
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:bg-slate-50"
      aria-label="알림 열기"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 ? <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-400" /> : null}
    </button>
  );
}

function HomeHero({ program, drill }: { program: Program; drill?: Drill }) {
  const heroImage = getHeroImage(program);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="overflow-hidden rounded-[22px] shadow-[0_2px_4px_rgba(15,23,42,0.04),0_24px_72px_rgba(15,23,42,0.12)]">
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr]">

        {/* 이미지 — 좌측 (desktop) / 상단 (mobile) */}
        <div className="relative min-h-[240px] overflow-hidden bg-slate-100 lg:min-h-[500px]">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={program.title}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
              loading="eager"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef2ff,#e0f2fe_52%,#f8fafc)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-800 backdrop-blur">
            {program.category}
          </span>
        </div>

        {/* 정보 패널 — 우측 (desktop) / 하단 (mobile) */}
        <div className="flex flex-col justify-between bg-white p-6 sm:p-8 lg:p-10 xl:p-12">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                오늘 대표 수업
              </span>
              {isSpomoveLinked(program) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  화면 활동 포함
                </span>
              ) : null}
            </div>

            <p className="text-sm font-black text-indigo-600">{program.grade} · {program.category}</p>
            <h1 className="mt-2 text-3xl font-black leading-[1.08] text-slate-950 sm:text-4xl lg:text-[2.75rem] xl:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 line-clamp-3 text-sm font-semibold leading-7 text-slate-500">
              {program.lessonDetail?.objective || program.description}
            </p>

            <div className="mt-6 flex flex-col gap-2 text-sm font-semibold text-slate-600">
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
                {program.duration}분 수업
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                {program.space}
              </span>
              <span className="pl-6 text-xs font-bold text-slate-400">{getProgramOutcome(program)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            <Link
              href={`/spokedu-master/class-mode/${program.id}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] transition hover:bg-indigo-500"
            >
              <Play className="h-4 w-4 fill-current" />
              수업 시작
            </Link>
            <Link
              href={spomoveHref}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <MonitorPlay className="h-4 w-4" />
              SPOMOVE 큰 화면
            </Link>
            <Link
              href={`/spokedu-master/library/${program.id}`}
              className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-slate-400 transition hover:text-slate-700"
            >
              <BookOpen className="h-4 w-4" />
              수업안 상세 보기
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

function ProgramPackageCard({ program, drill }: { program: Program; drill?: Drill }) {
  const focusItems = getFocusItems(program, 2);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <article className="flex min-h-[280px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(15,23,42,0.06),0_20px_44px_rgba(15,23,42,0.12)]">
      <Link href={`/spokedu-master/library/${program.id}`} className="relative h-44 shrink-0 overflow-hidden bg-slate-100">
        {getHeroImage(program) ? (
          <Image
            src={getHeroImage(program) as string}
            alt=""
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 768px) 45vw, 100vw"
            className="object-cover transition duration-500 hover:scale-105"
            loading="lazy"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef2ff,#e0e7ff_52%,#f0f9ff)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-800 backdrop-blur">
          {program.category}
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">
            {program.title}
          </h3>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span>{program.duration}분</span>
          <span className="text-slate-300">·</span>
          <span className="min-w-0 truncate">{program.grade}</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate">{program.space}</span>
        </div>

        <div className="mt-3 flex min-h-[24px] flex-wrap gap-1.5">
          {focusItems.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          <Link
            href={`/spokedu-master/class-mode/${program.id}`}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-extrabold text-white transition hover:bg-indigo-500"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            수업 시작
          </Link>
          {isSpomoveLinked(program) ? (
            <Link
              href={spomoveHref}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="SPOMOVE 큰 화면 실행"
            >
              <Zap className="h-3.5 w-3.5" />
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
    <article className="flex min-h-[280px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5">
      <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white">
        <MonitorPlay className="h-3.5 w-3.5" />
        SPOMOVE
      </span>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-5 flex h-20 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
          <span className="text-4xl font-black">{drill.icon || '◆'}</span>
        </div>
        <p className="text-xs font-bold tracking-[0.14em] text-indigo-300">큰 화면 추천</p>
        <h3 className="mt-3 text-2xl font-black leading-tight text-white">{drillTitle}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{drillCaption}</p>
      </div>
      <Link
        href={`/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-extrabold text-slate-950 transition hover:bg-indigo-50"
      >
        <Play className="h-4 w-4 fill-current" />
        큰 화면 실행
      </Link>
    </article>
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
              className={`rounded-2xl border p-4 ${notification.read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? 'bg-slate-300' : 'bg-indigo-400'}`} />
                <div>
                  <h3 className="text-sm font-black text-slate-950">{notification.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{notification.body}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">아직 새 알림이 없습니다.</div>
        )}
      </div>
      {notifications.some((n) => !n.read) ? (
        <button
          type="button"
          onClick={onMarkAllRead}
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-slate-50"
        >
          모두 읽음 처리
        </button>
      ) : null}
    </BottomSheet>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded, drills, drillsLoaded, notifications, markAllRead } = useMasterStore();
  const [mounted, setMounted] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const heroProgram = useMemo(() => pickHeroProgram(programs), [programs]);
  const heroDrill = useMemo(() => getPrimaryDrill(heroProgram, drills), [heroProgram, drills]);

  const weeklyPrograms = useMemo(() => {
    const pool = buildProgramPool(programs)
      .sort((a, b) => Number(b.isHot) - Number(a.isHot) || Number(b.isNew) - Number(a.isNew))
      .filter((program) => program.id !== heroProgram?.id);
    const picks = pool.slice(0, 3);
    if (picks.length < 3 && heroProgram) picks.push(heroProgram);
    return uniquePrograms(picks).slice(0, 3);
  }, [heroProgram, programs]);

  const weeklyDrill = useMemo(() => heroDrill ?? drills[0], [drills, heroDrill]);

  if (!mounted || !programsLoaded || !drillsLoaded || !heroProgram) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 overflow-y-auto bg-[#f4f6fb] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-400">SPOKEDU MASTER</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">오늘 수업</h1>
          </div>
          <div className="flex items-center gap-2">
            <PlanStatusChip />
            <NotificationButton onClick={() => setNotificationOpen(true)} />
          </div>
        </header>

        <HomeHero program={heroProgram} drill={heroDrill} />

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-indigo-500">주간 큐레이션</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">이번 주 바로 꺼내 쓰는 4선</h2>
            </div>
            <Link href="/spokedu-master/library" className="text-sm font-bold text-indigo-600 hover:text-indigo-500">
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
