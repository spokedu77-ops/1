'use client';

import Link from 'next/link';
import {
  Bell,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  MonitorPlay,
  Play,
  Search,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { isSameDay } from 'date-fns';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { CategoryIcon } from '../components/ui/ProgramThumb';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Drill, Lesson, Notification, Program } from '../types';

function useGreeting() {
  const [greeting, setGreeting] = useState('오늘 수업을 준비해볼까요');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? '좋은 아침이에요' : h < 18 ? '오늘 수업을 준비해볼까요' : '내일 수업까지 가볍게 정리해볼까요');
  }, []);

  return greeting;
}

function getHeroImage(program: Program) {
  return program.lessonDetail?.heroImageUrl || program.thumbnailUrl;
}

function hasSpomove(program: Program) {
  return program.tags.includes('SPOMOVE') || program.tags.includes('SPOMOVE 연계') || (program.lessonDetail?.relatedSpomoveIds?.length ?? 0) > 0;
}

function getProgramDrills(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  const direct = relatedIds
    .map((id) => drills.find((drill) => drill.id === id))
    .filter((drill): drill is Drill => Boolean(drill));
  if (direct.length > 0) return direct;

  const text = [program.title, program.category, program.description, ...program.tags].join(' ');
  const scored = drills
    .map((drill) => {
      let score = 0;
      const drillText = `${drill.name} ${drill.category}`;
      if (/펀스틱|펜싱|민첩|반응|방향|전환|스피드|순발|타이밍|거리/.test(text)) score += /스피드|반응|방향|전환|순발/.test(drillText) ? 4 : 0;
      if (/협동|팀|릴레이|전략|역할/.test(text)) score += /팀|협동/.test(drillText) ? 3 : 0;
      if (/균형|자세|멈춤|중심/.test(text)) score += /균형|스톱/.test(drillText) ? 3 : 0;
      if (/리듬|표현|음악|박자/.test(text)) score += /리듬/.test(drillText) ? 3 : 0;
      return { drill, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.filter((item) => item.score > 0).map((item) => item.drill).slice(0, 2);
}

function getBestProgramDrill(program: Program, drills: Drill[]) {
  return getProgramDrills(program, drills)[0] ?? drills[0];
}

function getPackageReason(program: Program, drill?: Drill) {
  const focus = program.lessonDetail?.developmentFocus || program.tags.slice(0, 2).join(' · ') || program.category;
  if (!drill) return `${focus} 중심으로 바로 실행할 수 있는 수업 패키지입니다.`;
  return `${focus} 수업에 ${drill.name}을 연결해 준비, 실행, 설명까지 한 번에 이어갑니다.`;
}

function PlanChip() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);
  const isPaid = profile?.plan === 'pro' || profile?.plan === 'team';
  const label = profile?.plan === 'team' ? 'Center' : profile?.plan === 'pro' ? 'Pro' : daysLeft > 0 ? `Trial D-${daysLeft}` : '체험 종료';

  return (
    <Link
      href="/spokedu-master/profile"
      className="rounded-full px-3 py-1.5 text-[11px] font-black"
      style={
        isPaid
          ? { background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(16,185,129,0.18))', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.38)' }
          : { background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }
      }
    >
      {label}
    </Link>
  );
}

function TodayHero({ program, lesson, drill }: { program: Program; lesson?: Lesson; drill?: Drill }) {
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const favorites = useMasterStore((state) => state.favorites);
  const image = getHeroImage(program);
  const isFav = favorites.includes(program.id);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="px-[18px] sm:px-8 lg:px-10">
      <div
        className="relative overflow-hidden rounded-[22px]"
        style={{
          minHeight: 360,
          background: image ? '#090a12' : `linear-gradient(145deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})`,
          boxShadow: '0 24px 70px rgba(0,0,0,0.38)',
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
        ) : (
          <span className="pointer-events-none absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-[0.08]" aria-hidden>
            <CategoryIcon category={program.category} size={220} color="#fff" strokeWidth={0.5} />
          </span>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,14,0.92)_0%,rgba(5,6,14,0.74)_42%,rgba(5,6,14,0.2)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,6,14,0.86)_0%,rgba(5,6,14,0.06)_62%)]" />

        <div className="relative z-10 flex min-h-[360px] flex-col justify-between p-5 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/80">
                {lesson ? `${lesson.classId} · ${lesson.period}교시` : '오늘 추천'}
              </span>
              <span className="rounded-full bg-indigo-400/18 px-3 py-1 text-[10px] font-black text-indigo-100">
                {program.category}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleFavorite(program.id)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-black/28 backdrop-blur active:scale-[0.97]"
              style={{ border: '1px solid rgba(255,255,255,0.16)' }}
              aria-label="즐겨찾기"
            >
              <Bookmark size={16} color="rgba(255,255,255,0.92)" fill={isFav ? '#fff' : 'none'} />
            </button>
          </div>

          <div className="max-w-[680px]">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/52">SPOKEDU MASTER PACKAGE</p>
            <h2 className="text-[30px] font-black leading-[1.05] text-white sm:text-[42px] lg:text-[52px]" style={{ fontFamily: 'var(--spm-font-display)', wordBreak: 'keep-all' }}>
              {program.title}
            </h2>
            <p className="mt-4 max-w-[600px] text-[14px] font-semibold leading-6 text-white/72 sm:text-[15px]">
              {program.description || getPackageReason(program, drill)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[program.grade, `${program.duration}분`, program.space].map((tag) => (
                <span key={tag} className="rounded-full bg-black/34 px-3 py-1 text-[11px] font-bold text-white/78">{tag}</span>
              ))}
              {drill ? <span className="rounded-full bg-indigo-500/48 px-3 py-1 text-[11px] font-black text-white">연결 SPOMOVE · {drill.name}</span> : null}
            </div>

            <div className="mt-6 grid gap-2 sm:flex">
              <Link
                href={`/spokedu-master/class-mode/${program.id}`}
                className="flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-[15px] px-6 text-[15px] font-black text-white active:scale-[0.98]"
                style={{ background: 'var(--spm-acc)', boxShadow: '0 14px 34px rgba(99,102,241,0.42)' }}
              >
                <Play size={15} fill="#fff" /> 수업 시작
              </Link>
              <Link
                href={spomoveHref}
                className="flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-[15px] px-5 text-[14px] font-black text-white active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}
              >
                <MonitorPlay size={16} /> 큰 화면 실행
              </Link>
              <Link
                href={`/spokedu-master/library/${program.id}`}
                className="flex h-13 min-h-[52px] items-center justify-center rounded-[15px] px-5 text-[14px] font-black text-white/88 active:scale-[0.98]"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.14)' }}
              >
                수업안 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickActionGrid({ programCount, spomoveCount }: { programCount: number; spomoveCount: number }) {
  const actions = [
    { href: '/spokedu-master/library', Icon: Search, title: '수업 찾기', sub: `${programCount}개 프로그램`, tone: 'var(--spm-acc)', bg: 'rgba(99,102,241,0.14)' },
    { href: '/spokedu-master/spomove', Icon: Zap, title: 'SPOMOVE', sub: `${spomoveCount}개 연계 가능`, tone: 'var(--spm-grn)', bg: 'rgba(16,185,129,0.12)' },
    { href: '/spokedu-master/report', Icon: FileText, title: '설명 문구', sub: '학부모·기관용 복사', tone: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ] as const;

  return (
    <section className="grid gap-3 px-[18px] pt-4 sm:grid-cols-3 sm:px-8 lg:px-10">
      {actions.map(({ href, Icon, title, sub, tone, bg }) => (
        <Link key={title} href={href} className="flex items-center gap-3 rounded-[18px] p-4 active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px]" style={{ background: bg }}>
            <Icon size={20} color={tone} />
          </span>
          <span className="min-w-0">
            <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
            <span className="mt-0.5 block truncate text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{sub}</span>
          </span>
          <ChevronRight className="ml-auto shrink-0" size={16} color="var(--spm-t3)" />
        </Link>
      ))}
    </section>
  );
}

function PackageCard({ program, drill, label }: { program: Program; drill?: Drill; label: string }) {
  const image = getHeroImage(program);
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <article className="min-w-[276px] rounded-[18px] p-3 sm:min-w-0" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <Link
        href={`/spokedu-master/library/${program.id}`}
        className="relative block h-[156px] overflow-hidden rounded-[15px]"
        style={{ background: image ? '#111' : `linear-gradient(155deg, ${program.colors[0]}, ${program.colors[1]} 55%, ${program.colors[2]})` }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-[1.04]" loading="lazy" />
        ) : (
          <span className="pointer-events-none absolute right-[-14px] top-[-2px] opacity-[0.1]" aria-hidden>
            <CategoryIcon category={program.category} size={140} color="#fff" strokeWidth={0.55} />
          </span>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.1)_70%)]" />
        <span className="absolute left-3 top-3 rounded-full bg-black/38 px-2.5 py-1 text-[10px] font-black text-white/78">{label}</span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/48">{program.category}</p>
          <h3 className="mt-1 line-clamp-2 text-[17px] font-black leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)', wordBreak: 'keep-all' }}>
            {program.title}
          </h3>
        </div>
      </Link>
      <div className="mt-3">
        <p className="line-clamp-2 min-h-[40px] text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>
          {getPackageReason(program, drill)}
        </p>
        <div className="mt-3 grid grid-cols-[1fr_0.9fr] gap-2">
          <Link href={`/spokedu-master/class-mode/${program.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            <Play size={12} fill="#fff" /> 시작
          </Link>
          <Link href={spomoveHref} className="flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
            <MonitorPlay size={13} /> 실행
          </Link>
        </div>
      </div>
    </article>
  );
}

function PackageRail({ title, caption, programs, drills }: { title: string; caption: string; programs: Program[]; drills: Drill[] }) {
  if (!programs.length) return null;

  return (
    <section className="pt-6">
      <div className="mb-3 flex items-end justify-between gap-3 px-[18px] sm:px-8 lg:px-10">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles size={13} color="var(--spm-amb)" />
            <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>curated packages</p>
          </div>
          <h2 className="text-[18px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
          <p className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{caption}</p>
        </div>
        <Link href="/spokedu-master/library" className="shrink-0 text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>더 보기</Link>
      </div>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-[18px] sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-8 lg:px-10">
        {programs.slice(0, 3).map((program, index) => (
          <PackageCard
            key={program.id}
            program={program}
            drill={getBestProgramDrill(program, drills)}
            label={index === 0 ? '추천' : index === 1 ? '빠른 수업' : 'SPOMOVE 연계'}
          />
        ))}
      </div>
    </section>
  );
}

function TodayPlan({ lessons, programs }: { lessons: Lesson[]; programs: Program[] }) {
  const toggleLessonDone = useMasterStore((state) => state.toggleLessonDone);
  if (lessons.length === 0) return null;

  const findProgramId = (lessonTitle: string) => {
    const stem = lessonTitle.split(':')[0] ?? lessonTitle;
    return programs.find((p) => stem.includes(p.title.split(':')[0] ?? '') || p.title.includes(stem))?.id;
  };

  return (
    <section className="px-[18px] pt-6 sm:px-8 lg:px-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>오늘 일정</h2>
        <Link href="/spokedu-master/plan" className="flex items-center gap-0.5 text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>
          전체보기<ChevronRight size={13} />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.slice(0, 3).map((lesson) => {
          const programId = findProgramId(lesson.title);
          const launchHref = programId ? `/spokedu-master/class-mode/${programId}` : '/spokedu-master/class-record';
          return (
            <div key={lesson.id} className="flex items-center gap-3 rounded-[15px] p-3.5" style={{ background: 'var(--spm-s2)', border: `1px solid ${lesson.done ? 'var(--spm-br2)' : `${lesson.color}44`}` }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]" style={{ background: `${lesson.color}22` }}>
                <Clock3 size={16} color={lesson.color} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold" style={{ color: lesson.done ? 'var(--spm-t3)' : 'var(--spm-t)', textDecoration: lesson.done ? 'line-through' : 'none' }}>{lesson.title}</p>
                <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'var(--spm-t3)' }}>{lesson.classId} · {lesson.period}교시 · {lesson.duration}분</p>
              </div>
              {!lesson.done ? (
                <Link href={launchHref} className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-acc)' }} aria-label="수업 시작">
                  <Play size={13} color="#fff" fill="#fff" />
                </Link>
              ) : null}
              <button type="button" onClick={() => toggleLessonDone(lesson.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: lesson.done ? 'rgba(16,185,129,0.14)' : 'var(--spm-s3)' }} aria-label="완료">
                <Check size={15} color={lesson.done ? 'var(--spm-grn)' : 'var(--spm-t3)'} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SubscriptionValue({ programs, drills }: { programs: Program[]; drills: Drill[] }) {
  const completePrograms = programs.filter((program) => program.lessonDetail?.rules?.length || program.lessonDetail?.briefingNotes?.length).length;
  const spomovePrograms = programs.filter(hasSpomove).length;
  const stats = [
    { label: '완성형 패키지', value: String(completePrograms || programs.length), icon: BookOpen },
    { label: 'SPOMOVE 연계', value: String(spomovePrograms), icon: Zap },
    { label: '즉시 실행 드릴', value: String(drills.length), icon: Timer },
  ];

  return (
    <section className="grid gap-2 px-[18px] pt-4 sm:grid-cols-3 sm:px-8 lg:px-10">
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-[16px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
          <Icon size={16} color="var(--spm-grn)" />
          <strong className="mt-3 block text-[24px] font-black leading-none" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{value}</strong>
          <span className="mt-1 block text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{label}</span>
        </div>
      ))}
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
          {notifications.length === 0 ? (
            <p className="rounded-[14px] p-4 text-[13px] font-semibold" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t3)' }}>새 알림이 없습니다.</p>
          ) : notifications.map((item) => (
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
  const quickPrograms = useMemo(() => {
    const favList = programs.filter((program) => favorites.includes(program.id));
    const recentList = programs.filter((program) => usedProgramIds.has(program.id) && !favorites.includes(program.id));
    const spomoveList = programs.filter(hasSpomove);
    const rest = programs.filter((program) => !favorites.includes(program.id) && !usedProgramIds.has(program.id));
    return [...favList, ...recentList, ...spomoveList, ...rest]
      .filter((program, index, list) => list.findIndex((item) => item.id === program.id) === index)
      .slice(0, 3);
  }, [favorites, programs, usedProgramIds]);

  const packagePrograms = useMemo(() => {
    const withSpomove = programs.filter((program) => getProgramDrills(program, drills).length > 0);
    const short = programs.filter((program) => program.duration <= 18);
    return [...quickPrograms, ...withSpomove, ...short, ...programs]
      .filter((program, index, list) => list.findIndex((item) => item.id === program.id) === index)
      .slice(0, 3);
  }, [drills, programs, quickPrograms]);

  if (!mounted || !programsLoaded) return <DashboardSkeleton />;

  const now = new Date();
  const todayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.date), now));
  const firstUndoneTodayLesson = todayLessons.find((lesson) => !lesson.done);
  const heroFromPlan = firstUndoneTodayLesson
    ? programs.find((program) => {
      const lessonStem = firstUndoneTodayLesson.title.split(':')[0] ?? firstUndoneTodayLesson.title;
      const programStem = program.title.split(':')[0] ?? program.title;
      return lessonStem.includes(programStem) || programStem.includes(lessonStem);
    })
    : undefined;
  const todayProgram = heroFromPlan ?? packagePrograms[0] ?? programs[0];
  if (!todayProgram) return <DashboardSkeleton />;
  const todayDrill = getBestProgramDrill(todayProgram, drills);
  const spomoveCount = programs.filter(hasSpomove).length;

  return (
    <div className="h-full overflow-y-auto pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="flex items-center justify-between px-[18px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{greeting}</p>
          <h1 className="truncate text-[27px] font-black leading-tight sm:text-[32px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            {profile?.name ? `${profile.name}님` : '선생님'}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PlanChip />
          <button
            type="button"
            onClick={() => setNotificationOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-[12px]"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
            aria-label="알림"
          >
            <Bell size={17} color="var(--spm-t2)" />
            {unreadCount > 0 ? <span className="absolute right-[7px] top-[7px] h-[6px] w-[6px] rounded-full" style={{ background: 'var(--spm-red)', border: '1.5px solid var(--spm-bg)' }} /> : null}
          </button>
        </div>
      </header>

      <TodayHero program={todayProgram} lesson={firstUndoneTodayLesson} drill={todayDrill} />
      <QuickActionGrid programCount={programs.length} spomoveCount={spomoveCount} />
      <SubscriptionValue programs={programs} drills={drills} />
      <PackageRail title="오늘 바로 쓸 수업 패키지" caption="라이브러리 수업안과 SPOMOVE 실행을 한 흐름으로 연결했습니다." programs={packagePrograms} drills={drills} />
      <TodayPlan lessons={todayLessons} programs={programs} />

      <section className="px-[18px] pt-6 sm:px-8 lg:hidden lg:px-10">
        <PwaInstallCard compact />
      </section>

      <NotificationSheet
        open={notificationOpen}
        notifications={notifications}
        onClose={() => { setNotificationOpen(false); markAllRead(); }}
        onMarkAll={markAllRead}
      />
    </div>
  );
}
