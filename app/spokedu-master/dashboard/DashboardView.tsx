'use client';

import { isSameDay } from 'date-fns';
import { Bell, BookOpen, Check, ChevronRight, Clock3, FileText, MapPin, MonitorPlay, Play, Sparkles, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { PROGRAMS as STATIC_PROGRAMS } from '../lib/data';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Drill, Lesson, Notification, Program } from '../types';

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

function getProgramValueChips(program: Program) {
  const chips = [
    program.lessonDetail?.relatedSpomoveIds?.length ? 'SPOMOVE' : null,
    program.lessonDetail?.rules?.length ? `${program.lessonDetail.rules.length}단계` : null,
    program.lessonDetail?.parentNote ? '안내문' : null,
    program.lessonDetail?.setupNotes?.length ? '배치도' : null,
  ].filter(Boolean) as string[];
  return chips.slice(0, 3);
}

function getHeroSubtitle(program: Program) {
  const focusItems = getFocusItems(program, 2);
  const focus = focusItems.length > 0 ? focusItems.join(' · ') : program.category;
  return `${program.duration}분 안에 바로 운영하는 ${program.category} 수업입니다. ${focus} 흐름까지 정리되어 있어 준비 시간이 줄어듭니다.`;
}

function getProgramOutcome(program: Program) {
  const focusItems = getFocusItems(program, 3);
  return focusItems.length > 0 ? focusItems.join(' · ') : program.category;
}

function getProgramCardSummary(program: Program) {
  const focusItems = getFocusItems(program, 2);
  const focus = focusItems.length > 0 ? focusItems.join(' · ') : program.category;
  return `${program.duration}분 · ${program.space} · ${focus}`;
}

function getActionLabel(program: Program) {
  if (isSpomoveLinked(program)) return '수업안과 화면 활동이 연결됨';
  if (program.lessonDetail?.parentNote) return '수업 후 설명 문구까지 준비됨';
  return '오늘 바로 진행 가능한 수업안';
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
  const focusItems = getFocusItems(program, 4);
  const valueChips = getProgramValueChips(program);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.09)]">
      <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px]">
        <div className="flex min-h-[380px] flex-col justify-between p-5 sm:p-8 lg:p-10">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                오늘 대표 수업
              </span>
              {isSpomoveLinked(program) ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  화면 활동 포함
                </span>
              ) : null}
            </div>

            <p className="text-sm font-black text-indigo-600">{getActionLabel(program)}</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black leading-[1.08] text-slate-950 sm:text-4xl lg:text-5xl">
              {program.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-600 sm:text-[15px]">
              {getHeroSubtitle(program)}
            </p>
            <div className="mt-6 grid max-w-2xl grid-cols-2 gap-2 md:grid-cols-4" aria-label="수업 핵심 정보">
              <MiniStat label="대상" value={program.grade} />
              <MiniStat label="시간" value={`${program.duration}분`} />
              <MiniStat label="공간" value={program.space} />
              <MiniStat label="초점" value={getProgramOutcome(program)} />
            </div>
            {valueChips.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2" aria-label="패키지 구성">
                {valueChips.map((chip) => (
                  <span key={chip} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-600">
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/spokedu-master/class-mode/${program.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(79,70,229,0.25)] transition hover:bg-indigo-500"
            >
              <Play className="h-4 w-4 fill-current" />
              수업 시작
            </Link>
            <Link
              href={spomoveHref}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
            >
              <MonitorPlay className="h-4 w-4" />
              큰 화면 실행
            </Link>
            <Link
              href={`/spokedu-master/library/${program.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-500 transition hover:text-slate-900"
            >
              <BookOpen className="h-4 w-4" />
              상세 보기
            </Link>
          </div>
        </div>

        <div className="relative min-h-[300px] overflow-hidden bg-slate-100 lg:min-h-full">
          {heroImage ? (
            <Image src={heroImage} alt="" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" loading="eager" unoptimized />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef2ff,#e0f2fe_52%,#f8fafc)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <div className="rounded-[18px] border border-white/25 bg-white/88 p-4 shadow-[0_18px_46px_rgba(15,23,42,0.2)] backdrop-blur-md">
              <p className="text-[11px] font-black tracking-[0.14em] text-slate-400">수업 핵심</p>
              <p className="mt-2 text-sm font-black leading-5 text-slate-950">{program.lessonDetail?.objective || program.description}</p>
              {focusItems.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {focusItems.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[62px] min-w-0 flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-1 text-xs font-black text-slate-950">{value}</p>
    </div>
  );
}

function ProgramPackageCard({ program, drill }: { program: Program; drill?: Drill }) {
  const valueChips = getProgramValueChips(program);
  const focusItems = getFocusItems(program, 2);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <article className="flex min-h-[316px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
      <Link href={`/spokedu-master/library/${program.id}`} className="relative h-40 overflow-hidden" style={{ background: 'var(--spm-s3)' }}>
        {getHeroImage(program) ? (
          <>
            <Image
              src={getHeroImage(program) as string}
              alt=""
              fill
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 45vw, 100vw"
              className="object-cover transition duration-500 hover:scale-105"
              loading="lazy"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--spm-s3) 0%, var(--spm-s4) 100%)' }} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-800 backdrop-blur">
          {program.category}
        </span>
        <span className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur">
          <BookOpen className="h-4 w-4" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[44px] text-base font-black leading-snug text-slate-950">{program.title}</h3>
        <p className="mt-2 line-clamp-2 min-h-[40px] text-xs font-semibold leading-5 text-slate-500">
          {getProgramCardSummary(program)}
        </p>
        <div className="mt-3 flex min-h-[24px] flex-wrap gap-1.5">
          {focusItems.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-2 flex min-h-[24px] flex-wrap gap-1.5">
          {valueChips.map((chip) => (
            <span key={chip} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-black text-indigo-600">
              {chip}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          <PackageStat icon={<Clock3 className="h-3.5 w-3.5" />} value={`${program.duration}분`} />
          <PackageStat icon={<MapPin className="h-3.5 w-3.5" />} value={program.space} />
          <PackageStat icon={<FileText className="h-3.5 w-3.5" />} value={program.lessonDetail?.rules?.length ? `${program.lessonDetail.rules.length}단계` : '수업안'} />
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href={`/spokedu-master/class-mode/${program.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-extrabold text-white">
            <Play className="h-3.5 w-3.5 fill-current" />
            수업 시작
          </Link>
          {isSpomoveLinked(program) ? (
            <Link href={spomoveHref} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500" aria-label="SPOMOVE 큰 화면 실행">
              <Zap className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PackageStat({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg bg-slate-50 px-2 text-center text-[11px] font-bold text-slate-500">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

function WeeklySpomoveCard({ drill }: { drill: Drill }) {
  const drillTitle = drill.name || drill.category || 'SPOMOVE';
  const drillCaption = drill.description || `${drill.category} 수업에서 바로 실행할 수 있는 큰 화면 반응 훈련입니다.`;

  return (
    <article className="flex min-h-[316px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5">
      <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-[11px] font-black text-white">
        <MonitorPlay className="h-3.5 w-3.5" />
        SPOMOVE
      </span>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-5 flex h-20 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
          <span className="text-4xl font-black">{drill.icon || '◆'}</span>
        </div>
        <p className="text-xs font-bold tracking-[0.14em] text-indigo-100">큰 화면 추천</p>
        <h3 className="mt-3 text-2xl font-black leading-tight text-white">{drillTitle}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-indigo-100/75">{drillCaption}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-white/12 px-3 py-2 text-center text-[11px] font-black text-indigo-50">{drill.tag || drill.category}</span>
          <span className="rounded-xl bg-white/12 px-3 py-2 text-center text-[11px] font-black text-indigo-50">{drill.enName || 'Class Mode'}</span>
        </div>
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

function TodayFlow({ lessons, heroProgram, heroDrill }: { lessons: Lesson[]; heroProgram: Program; heroDrill?: Drill }) {
  const spomoveHref = heroDrill
    ? `/spokedu-master/spomove/session?drill=${heroDrill.id}&mode=projector&program=${heroProgram.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-indigo-500">오늘 진행</p>
          <h2 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">수업 시작까지 3단계</h2>
        </div>
        <Link href="/spokedu-master/library" className="text-sm font-bold text-indigo-600 hover:text-indigo-500">
          라이브러리
        </Link>
      </div>

      <div className="mt-5">
        {lessons.length > 0 ? (
          <div className="space-y-3">
            {lessons.slice(0, 3).map((lesson) => (
              <div key={lesson.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="h-11 w-1.5 rounded-full" style={{ background: lesson.color || '#6366f1' }} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-slate-950">{lesson.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatLessonTime(lesson)}</p>
                </div>
                {lesson.done ? (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400">
                    <Clock3 className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <FlowStep
              number="01"
              title="수업안 확인"
              body={`${heroProgram.duration}분 흐름과 준비물을 먼저 봅니다.`}
              href={`/spokedu-master/library/${heroProgram.id}`}
              icon={<BookOpen className="h-4 w-4" />}
            />
            <FlowStep
              number="02"
              title="큰 화면 실행"
              body="SPOMOVE로 수업 집중을 빠르게 끌어올립니다."
              href={spomoveHref}
              icon={<MonitorPlay className="h-4 w-4" />}
            />
            <FlowStep
              number="03"
              title="설명 문구"
              body="수업 후 보호자·기관용 문구를 바로 정리합니다."
              href={`/spokedu-master/report?program=${heroProgram.id}`}
              icon={<FileText className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function FlowStep({ number, title, body, href, icon }: { number: string; title: string; body: string; href: string; icon: ReactNode }) {
  return (
    <Link href={href} className="group flex min-h-[116px] flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-black tracking-[0.16em] text-slate-400">{number}</span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">{icon}</span>
      </span>
      <span>
        <strong className="block text-sm font-black text-slate-950">{title}</strong>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{body}</span>
      </span>
    </Link>
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
            <div key={notification.id} className={`rounded-2xl border p-4 ${notification.read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50'}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? 'bg-slate-600' : 'bg-indigo-300'}`} />
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
      {notifications.some((notification) => !notification.read) ? (
        <button type="button" onClick={onMarkAllRead} className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950">
          모두 읽음 처리
        </button>
      ) : null}
    </BottomSheet>
  );
}

export default function DashboardView() {
  const { programs, programsLoaded, drills, drillsLoaded, lessons, notifications, markAllRead } = useMasterStore();
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
      <main className="mx-auto flex h-full w-full max-w-7xl flex-col gap-6 overflow-y-auto bg-[#f5f7fb] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-12">
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

        <TodayFlow lessons={todayLessons} heroProgram={heroProgram} heroDrill={heroDrill} />

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
