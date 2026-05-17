'use client';

import Link from 'next/link';
import { Bell, Bookmark, BookOpen, CalendarDays, Check, ChevronRight, FileText, Play, Timer, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { isSameDay } from 'date-fns';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { CategoryIcon, ProgramThumb } from '../components/ui/ProgramThumb';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Drill, Notification, Program } from '../types';

function useGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '좋은 오후예요';
  return '좋은 저녁이에요';
}

function PlanChip() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);
  const isPaid = profile?.plan === 'pro' || profile?.plan === 'team';
  const label = profile?.plan === 'team' ? 'Center' : profile?.plan === 'pro' ? 'Pro' : daysLeft > 0 ? `Trial ${daysLeft}일` : '체험 종료';
  return (
    <Link
      href="/spokedu-master/profile"
      className="rounded-full px-3 py-1.5 text-[11px] font-black"
      style={isPaid
        ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(16,185,129,0.18))', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.38)' }
        : { background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }
      }
    >
      {label}
    </Link>
  );
}

function TodayHero({ program }: { program: Program }) {
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const favorites = useMasterStore((state) => state.favorites);
  const isFav = favorites.includes(program.id);
  const hasThumbnail = !!program.thumbnailUrl;

  return (
    <section className="mb-6 px-[22px] sm:px-8 lg:px-10">
      <div
        className="relative overflow-hidden rounded-[22px]"
        style={{
          minHeight: 224,
          background: hasThumbnail ? '#0c0c14' : `linear-gradient(145deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})`,
          boxShadow: '0 24px 52px rgba(0,0,0,0.38)',
        }}
      >
        {hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
        ) : (
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 opacity-[0.07]" aria-hidden>
            <CategoryIcon category={program.category} size={160} color="#fff" strokeWidth={0.6} />
          </span>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: hasThumbnail
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.52) 58%, rgba(0,0,0,0.84) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.36) 100%)',
          }}
        />
        <div className="relative flex min-h-[224px] flex-col justify-between p-5 md:p-7">
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/70">
              오늘 추천 수업
            </span>
            <div className="flex gap-1.5">
              {program.isNew ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black text-emerald-950">NEW</span> : null}
              {program.isHot ? <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-amber-950">HOT</span> : null}
            </div>
          </div>
          <div>
            <h2
              className="max-w-[480px] text-[28px] font-black leading-[1.15] text-white md:text-[36px]"
              style={{ fontFamily: 'var(--spm-font-display)', wordBreak: 'keep-all', textShadow: '0 2px 16px rgba(0,0,0,0.45)' }}
            >
              {program.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[`${program.duration}분`, program.space, ...program.tags.slice(0, 2)].map((tag) => (
                <span key={tag} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/80" style={{ background: 'rgba(0,0,0,0.30)' }}>{tag}</span>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/spokedu-master/class-mode/${program.id}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-[13px] py-3 text-[14px] font-black text-white active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)' }}
              >
                <Play size={14} fill="#fff" />수업 시작
              </Link>
              <Link
                href="/spokedu-master/spomove"
                className="grid h-12 w-12 place-items-center rounded-[13px] active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
                aria-label="SPOMOVE 실행"
              >
                <Zap size={18} color="rgba(255,255,255,0.9)" />
              </Link>
              <button
                type="button"
                onClick={() => toggleFavorite(program.id)}
                className="grid h-12 w-12 place-items-center rounded-[13px] active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
                aria-label="즐겨찾기"
              >
                <Bookmark size={16} color="rgba(255,255,255,0.9)" fill={isFav ? '#fff' : 'none'} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBand({ programCount, favoriteCount, sessionCount }: { programCount: number; favoriteCount: number; sessionCount: number }) {
  const stats = [
    { label: '수업 프로그램', value: programCount },
    { label: '즐겨찾기', value: favoriteCount },
    { label: '수업 기록', value: sessionCount },
  ];
  return (
    <div className="mb-6 grid grid-cols-3 gap-2 px-[22px] sm:px-8 lg:px-10">
      {stats.map(({ label, value }) => (
        <div key={label} className="rounded-[14px] p-3.5 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <p className="text-[22px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{value}</p>
          <p className="mt-0.5 text-[10px] font-semibold leading-tight" style={{ color: 'var(--spm-t3)' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: '라이브러리', caption: '수업안 고르기', href: '/spokedu-master/library', Icon: BookOpen, bg: 'rgba(99,102,241,0.16)', ic: 'var(--spm-acc)' },
  { label: 'SPOMOVE', caption: '큰 화면 실행', href: '/spokedu-master/spomove', Icon: Zap, bg: 'rgba(16,185,129,0.14)', ic: 'var(--spm-grn)' },
  { label: '수업 도구', caption: '타이머·팀·뽑기', href: '/spokedu-master/class-tools', Icon: Timer, bg: 'rgba(245,158,11,0.13)', ic: 'var(--spm-amb)' },
] as const;

function QuickActions() {
  return (
    <section className="mb-6 grid grid-cols-3 gap-2 px-[22px] sm:px-8 lg:px-10">
      {QUICK_ACTIONS.map(({ label, caption, href, Icon, bg, ic }) => (
        <Link key={label} href={href} className="flex flex-col items-center gap-2.5 rounded-[16px] px-2 py-4 text-center active:scale-[0.97]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 place-items-center rounded-[14px]" style={{ background: bg }}>
            <Icon size={20} color={ic} />
          </span>
          <span>
            <strong className="block text-[13px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{label}</strong>
            <span className="mt-0.5 block text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3.5 flex items-center justify-between px-[22px] sm:px-8 lg:px-10">
      <h2 className="text-[19px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>{title}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>
          전체보기<ChevronRight size={13} />
        </Link>
      ) : null}
    </div>
  );
}

function ProgramCard({ program, used }: { program: Program; used: boolean }) {
  return (
    <Link href={`/spokedu-master/library/${program.id}`} className="flex gap-3 rounded-[16px] p-3 active:scale-[0.98]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <ProgramThumb program={program} size={58} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1 flex flex-wrap gap-1">
          {used ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--spm-grn)' }}>최근</span> : null}
          {program.isNew ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>NEW</span> : null}
          {program.isHot ? <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black" style={{ background: 'rgba(245,158,11,0.14)', color: 'var(--spm-amb)' }}>HOT</span> : null}
        </div>
        <h3 className="line-clamp-2 text-[14px] font-bold leading-tight" style={{ color: 'var(--spm-t)', wordBreak: 'keep-all' }}>{program.title}</h3>
        <p className="mt-1 text-[11px]" style={{ color: 'var(--spm-t3)' }}>{program.duration}분 · {program.grade}</p>
      </div>
      <ChevronRight size={15} className="mt-1 shrink-0" color="var(--spm-t3)" />
    </Link>
  );
}

const DRILL_BG = [
  'linear-gradient(145deg, #1a1744 0%, #312e81 50%, #4f46e5 100%)',
  'linear-gradient(145deg, #052e16 0%, #064e3b 50%, #059669 100%)',
  'linear-gradient(145deg, #150b2e 0%, #1e1b4b 50%, #7c3aed 100%)',
  'linear-gradient(145deg, #3f0000 0%, #7f1d1d 50%, #be123c 100%)',
];

function DrillTile({ drill, index }: { drill: Drill; index: number }) {
  return (
    <Link
      href={`/spokedu-master/spomove/session?drill=${drill.id}`}
      className="relative flex min-h-[118px] flex-col justify-between overflow-hidden rounded-[16px] p-4 active:scale-95"
      style={{ background: DRILL_BG[index % DRILL_BG.length], border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <Zap size={15} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
        </span>
        <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
          <Play size={10} fill="#fff" color="#fff" />
        </span>
      </div>
      <div>
        <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-white/45">{drill.category}</p>
        <p className="text-[14px] font-bold leading-[1.2] text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{drill.name}</p>
      </div>
    </Link>
  );
}

function TodayPlan({ lessons }: { lessons: ReturnType<typeof useMasterStore.getState>['lessons'] }) {
  const toggleLessonDone = useMasterStore((state) => state.toggleLessonDone);
  if (lessons.length === 0) return null;
  return (
    <section className="mb-6">
      <SectionHeader title="오늘 수업 계획" href="/spokedu-master/plan" />
      <div className="grid gap-2 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-10">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="flex items-center gap-3 rounded-[14px] p-3.5" style={{ background: 'var(--spm-s2)', border: `1px solid ${lesson.done ? 'var(--spm-br)' : lesson.color}22` }}>
            <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: lesson.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold" style={{ color: lesson.done ? 'var(--spm-t3)' : 'var(--spm-t)', textDecoration: lesson.done ? 'line-through' : 'none' }}>{lesson.title}</p>
              <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>{lesson.classId} · {lesson.period}교시 · {lesson.duration}분</p>
            </div>
            <button type="button" onClick={() => toggleLessonDone(lesson.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: lesson.done ? 'rgba(16,185,129,0.14)' : 'var(--spm-s3)' }} aria-label="완료">
              <Check size={15} color={lesson.done ? 'var(--spm-grn)' : 'var(--spm-t3)'} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationSheet({ open, notifications, onClose, onMarkAll }: { open: boolean; notifications: Notification[]; onClose: () => void; onMarkAll: () => void }) {
  return (
    <BottomSheet open={open} title="알림" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>최근 업데이트 {notifications.length}건</p>
          <button type="button" onClick={onMarkAll} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>모두 읽음</button>
        </div>
        <div className="space-y-2">
          {notifications.map((item) => (
            <div key={item.id} className="rounded-[14px] p-4" style={{ background: item.read ? 'var(--spm-s2)' : 'rgba(99,102,241,0.14)', border: item.read ? '1px solid var(--spm-br2)' : '1px solid rgba(99,102,241,0.28)' }}>
              <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong>
              <span className="mt-1 block text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{item.body}</span>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

export default function DashboardView() {
  const profile = useProfile();
  const programs = useMasterStore((state) => state.programs);
  const drills = useMasterStore((state) => state.drills);
  const lessons = useMasterStore((state) => state.lessons);
  const unreadCount = useUnreadCount();
  const classRecords = useMasterStore((state) => state.classRecords);
  const favorites = useMasterStore((state) => state.favorites);
  const notifications = useMasterStore((state) => state.notifications);
  const markAllRead = useMasterStore((state) => state.markAllRead);
  const programsLoaded = useMasterStore((state) => state.programsLoaded);
  const greeting = useGreeting();
  const [mounted, setMounted] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);
  const featuredPrograms = useMemo(() => {
    const favoriteList = programs.filter((p) => favorites.includes(p.id));
    return [...favoriteList, ...programs]
      .filter((p, i, list) => list.findIndex((item) => item.id === p.id) === i)
      .slice(0, 4);
  }, [favorites, programs]);

  if (!mounted || !programsLoaded) return <DashboardSkeleton />;

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const todayProgram = programs.length > 0 ? programs[dayOfYear % programs.length] : undefined;
  if (!todayProgram) return <DashboardSkeleton />;
  const todayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.date), now));

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="flex items-center justify-between px-[22px] pb-6 pt-[26px] sm:px-8 lg:px-10">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{greeting}</p>
          <h1 className="text-[28px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            {profile?.name ?? '선생님'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <PlanChip />
          <button
            type="button"
            onClick={() => setNotificationOpen(true)}
            className="relative grid h-11 w-11 place-items-center rounded-[12px]"
            style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}
            aria-label="알림"
          >
            <Bell size={18} color="var(--spm-t2)" />
            {unreadCount > 0 ? <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full" style={{ background: 'var(--spm-red)', border: '1.5px solid var(--spm-bg)' }} /> : null}
          </button>
        </div>
      </header>

      <TodayHero program={todayProgram} />

      <StatsBand
        programCount={programs.length}
        favoriteCount={favorites.length}
        sessionCount={classRecords.length}
      />

      <QuickActions />

      <TodayPlan lessons={todayLessons} />

      <section className="mb-6">
        <SectionHeader title="최근 사용과 즐겨찾기" href="/spokedu-master/library" />
        {usedProgramIds.size === 0 && favorites.length === 0 ? (
          <div className="px-[22px] sm:px-8 lg:px-10">
            <Link href="/spokedu-master/library" className="flex items-center gap-4 rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px dashed var(--spm-br3)' }}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <BookOpen size={19} color="var(--spm-acc)" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>아직 사용한 수업이 없습니다</strong>
                <span className="mt-1 block text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>라이브러리에서 첫 수업안을 골라보세요.</span>
              </span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
            {featuredPrograms.map((program) => <ProgramCard key={program.id} program={program} used={usedProgramIds.has(program.id)} />)}
          </div>
        )}
      </section>

      <section className="mb-6">
        <SectionHeader title="SPOMOVE 빠른 실행" href="/spokedu-master/spomove" />
        <div className="grid grid-cols-2 gap-2 px-[22px] sm:grid-cols-4 sm:px-8 lg:px-10">
          {drills.slice(0, 4).map((drill, index) => <DrillTile key={drill.id} drill={drill} index={index} />)}
        </div>
      </section>

      <section className="mb-3 grid grid-cols-2 gap-2 px-[22px] sm:px-8 lg:px-10">
        <Link
          href="/spokedu-master/report"
          className="flex items-center gap-3 rounded-[16px] p-4 active:scale-[0.99]"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.08))', border: '1px solid rgba(99,102,241,0.22)' }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <FileText size={18} color="#a5b4fc" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[13px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>설명 문구</strong>
            <span className="mt-0.5 block text-[10px] leading-5" style={{ color: 'var(--spm-t3)' }}>학부모·기관 문구 복사</span>
          </span>
        </Link>
        <Link
          href="/spokedu-master/plan"
          className="flex items-center gap-3 rounded-[16px] p-4 active:scale-[0.99]"
          style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(245,158,11,0.13)' }}>
            <CalendarDays size={18} color="var(--spm-amb)" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[13px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>수업 계획</strong>
            <span className="mt-0.5 block text-[10px] leading-5" style={{ color: 'var(--spm-t3)' }}>주간 일정 관리</span>
          </span>
        </Link>
      </section>

      <section className="px-[22px] sm:px-8 lg:hidden lg:px-10">
        <PwaInstallCard compact />
      </section>

      <NotificationSheet open={notificationOpen} notifications={notifications} onClose={() => { setNotificationOpen(false); markAllRead(); }} onMarkAll={markAllRead} />
    </div>
  );
}
