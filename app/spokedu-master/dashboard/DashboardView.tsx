'use client';

import Link from 'next/link';
import { Bell, Bookmark, BookOpen, CalendarDays, Check, ChevronRight, FileText, MonitorPlay, Play, Sparkles, Timer, Zap } from 'lucide-react';
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
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요');
  }, []);
  return greeting;
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
        ? { background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(16,185,129,0.18))', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.38)' }
        : { background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}
    >
      {label}
    </Link>
  );
}

function getProgramDrills(program: Program, drills: Drill[]) {
  const relatedIds = program.lessonDetail?.relatedSpomoveIds ?? [];
  const direct = relatedIds
    .map((id) => drills.find((drill) => drill.id === id))
    .filter((drill): drill is Drill => Boolean(drill));
  if (direct.length > 0) return direct;

  const programText = [program.title, program.category, program.description, ...program.tags].join(' ');
  const scored = drills
    .map((drill) => {
      let score = 0;
      if (/반응|민첩|순발|방향|신호|스피드/.test(programText)) score += /반응|방향|속도|스피드|Visual|Reaction/i.test(`${drill.name} ${drill.category}`) ? 3 : 0;
      if (/집중|기억|인지|색|판단/.test(programText)) score += /집중|기억|색|Memory|인지/i.test(`${drill.name} ${drill.category}`) ? 3 : 0;
      if (/점프|균형|협동|워밍업/.test(programText)) score += /점프|균형|신호|반응/i.test(`${drill.name} ${drill.category}`) ? 2 : 0;
      score += drill.isPro === program.isPro ? 0.5 : 0;
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
  if (!drill) return `${focus} 중심 수업안입니다.`;
  return `${focus} 수업에 ${drill.name}을(를) 도입·전환 활동으로 붙일 수 있습니다.`;
}

/* ── 히어로 ── 홈은 수업안 + 연결 SPOMOVE 패키지를 먼저 보여준다 */
function TodayHero({ program, lesson, drill }: { program: Program; lesson?: Lesson; drill?: Drill }) {
  const toggleFavorite = useMasterStore((state) => state.toggleFavorite);
  const favorites = useMasterStore((state) => state.favorites);
  const isFav = favorites.includes(program.id);
  const hasThumb = !!program.thumbnailUrl;
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <section className="mb-5 px-[22px] sm:px-8 lg:px-10">
      <div
        className="relative overflow-hidden rounded-[18px]"
        style={{
          aspectRatio: '16/9',
          maxHeight: 360,
          background: hasThumb
            ? '#0c0c14'
            : `linear-gradient(145deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})`,
          boxShadow: '0 18px 44px rgba(0,0,0,0.36)',
        }}
      >
        {hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
        ) : (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.07]" aria-hidden>
            <CategoryIcon category={program.category} size={140} color="#fff" strokeWidth={0.6} />
          </span>
        )}

        {/* 스크림 */}
        <div
          className="absolute inset-0"
          style={{
            background: hasThumb
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.46) 52%, rgba(0,0,0,0.82) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.44) 100%)',
          }}
        />

        {/* 콘텐츠 */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/70">
              {lesson ? `${lesson.classId} · ${lesson.period}교시` : '오늘 추천 수업'}
            </span>
            <div className="flex gap-1.5">
              {program.isNew ? <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[9px] font-black text-emerald-950">NEW</span> : null}
              {program.isHot ? <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black text-amber-950">HOT</span> : null}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/48">오늘 수업 패키지 · {program.category}</p>
            <h2
              className="mt-0.5 max-w-[520px] text-[20px] font-black leading-[1.15] text-white sm:text-[26px] md:text-[32px]"
              style={{ fontFamily: 'var(--spm-font-display)', wordBreak: 'keep-all', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}
            >
              {program.title}
            </h2>
            <p className="mt-2 line-clamp-2 max-w-[560px] text-[12px] font-semibold leading-5 text-white/64 sm:text-[13px]">
              {getPackageReason(program, drill)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[program.grade, `${program.duration}분`, program.space].map((tag) => (
                <span key={tag} className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/75" style={{ background: 'rgba(0,0,0,0.28)' }}>{tag}</span>
              ))}
              {drill ? <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/85" style={{ background: 'rgba(99,102,241,0.5)' }}>연결 SPOMOVE · {drill.name}</span> : null}
            </div>

            {/* CTA 버튼 */}
            <div className="mt-3 flex gap-2">
              <Link
                href={`/spokedu-master/class-mode/${program.id}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-[12px] py-2.5 text-[13px] font-black text-white active:scale-[0.98]"
                style={{ background: 'rgba(99,102,241,0.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(99,102,241,0.4)' }}
              >
                <Play size={13} fill="#fff" />수업 시작
              </Link>
              <Link
                href={spomoveHref}
                className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[12px] px-3 text-[12px] font-black text-white active:scale-[0.97]"
                style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.14)' }}
                aria-label="연결 SPOMOVE 실행"
              >
                <Zap size={14} color="rgba(255,255,255,0.9)" />SPOMOVE
              </Link>
              <button
                type="button"
                onClick={() => toggleFavorite(program.id)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] active:scale-[0.97]"
                style={{ background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.14)' }}
                aria-label="즐겨찾기"
              >
                <Bookmark size={15} color="rgba(255,255,255,0.9)" fill={isFav ? '#fff' : 'none'} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 빠른 실행 — 라이브러리 3 + SPOMOVE 1, 한 줄 ── */
const DRILL_GRAD = [
  'linear-gradient(145deg,#1a1744 0%,#312e81 55%,#4f46e5 100%)',
  'linear-gradient(145deg,#052e16 0%,#064e3b 55%,#059669 100%)',
  'linear-gradient(145deg,#150b2e 0%,#1e1b4b 55%,#7c3aed 100%)',
  'linear-gradient(145deg,#3f0000 0%,#7f1d1d 55%,#be123c 100%)',
];

function ProgramTile({ program }: { program: Program }) {
  const hasThumb = !!program.thumbnailUrl;
  return (
    <Link
      href={`/spokedu-master/class-mode/${program.id}`}
      className="relative shrink-0 overflow-hidden rounded-[13px] active:scale-[0.97] sm:w-full"
      style={{
        width: 134,
        height: 106,
        background: hasThumb
          ? '#111'
          : `linear-gradient(155deg, ${program.colors[0]} 0%, ${program.colors[1]} 55%, ${program.colors[2]} 100%)`,
      }}
    >
      {hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="pointer-events-none absolute right-[-10px] top-[5%] opacity-[0.1]">
          <CategoryIcon category={program.category} size={108} color="#fff" strokeWidth={0.55} />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.88) 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5">
        <p className="text-[8px] font-black uppercase tracking-[0.07em] text-white/45">{program.category}</p>
        <p className="line-clamp-2 text-[12px] font-bold leading-[1.25] text-white">{program.title}</p>
      </div>
      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/15">
        <Play size={9} fill="#fff" color="#fff" />
      </span>
    </Link>
  );
}

function DrillTile({ drill, index }: { drill: Drill; index: number }) {
  return (
    <Link
      href={`/spokedu-master/spomove/session?drill=${drill.id}`}
      className="relative shrink-0 overflow-hidden rounded-[13px] active:scale-[0.97] sm:w-full"
      style={{ width: 134, height: 106, background: DRILL_GRAD[index % DRILL_GRAD.length] }}
    >
      <span className="absolute right-[-10px] top-[5%] opacity-[0.1]">
        <Zap size={108} color="#fff" strokeWidth={0.55} />
      </span>
      <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5">
        <p className="text-[8px] font-black uppercase tracking-[0.07em] text-white/45">SPOMOVE</p>
        <p className="line-clamp-2 text-[12px] font-bold leading-[1.25] text-white">{drill.name}</p>
      </div>
      <div className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: 'rgba(255,255,255,0.14)' }}>
        <Zap size={13} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
      </div>
    </Link>
  );
}

function QuickLaunch({ programs, drill }: { programs: Program[]; drill: Drill | undefined }) {
  const items = programs.slice(0, 3);
  if (items.length === 0 && !drill) return null;
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between px-[22px] sm:px-8 lg:px-10">
        <h2 className="text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>빠른 실행</h2>
        <Link href="/spokedu-master/library" className="flex items-center gap-0.5 text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>
          전체보기<ChevronRight size={13} />
        </Link>
      </div>
      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto px-[22px] sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-8 lg:px-10">
        {items.map((program) => <ProgramTile key={program.id} program={program} />)}
        {drill ? <DrillTile drill={drill} index={0} /> : null}
      </div>
    </section>
  );
}

function PackageCard({ program, drill, label }: { program: Program; drill?: Drill; label: string }) {
  const hasThumb = !!program.thumbnailUrl;
  const spomoveHref = drill
    ? `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector&program=${program.id}`
    : '/spokedu-master/spomove';

  return (
    <article className="min-w-[252px] rounded-[16px] p-3 sm:min-w-0" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div
        className="relative h-[112px] overflow-hidden rounded-[13px]"
        style={{
          background: hasThumb ? '#111' : `linear-gradient(155deg, ${program.colors[0]} 0%, ${program.colors[1]} 55%, ${program.colors[2]} 100%)`,
        }}
      >
        {hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="pointer-events-none absolute right-[-12px] top-[-4px] opacity-[0.1]" aria-hidden>
            <CategoryIcon category={program.category} size={126} color="#fff" strokeWidth={0.55} />
          </span>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.78))' }} />
        <span className="absolute left-2 top-2 rounded-full bg-black/35 px-2 py-1 text-[9px] font-black text-white/75">{label}</span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.08em] text-white/45">{program.category}</p>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)', wordBreak: 'keep-all' }}>{program.title}</h3>
        </div>
      </div>
      <div className="mt-3">
        <p className="line-clamp-2 min-h-[40px] text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t2)' }}>{getPackageReason(program, drill)}</p>
        <div className="mt-3 flex items-center gap-2 rounded-[12px] px-3 py-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <Zap size={14} color="#a5b4fc" />
          <span className="min-w-0 flex-1 truncate text-[11px] font-black" style={{ color: '#c4b5fd' }}>{drill?.name ?? 'SPOMOVE 선택'}</span>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_0.82fr] gap-2">
          <Link href={`/spokedu-master/class-mode/${program.id}`} className="flex h-10 items-center justify-center gap-1.5 rounded-[11px] text-[12px] font-black text-white" style={{ background: 'var(--spm-acc)' }}>
            <Play size={12} fill="#fff" />수업 시작
          </Link>
          <Link href={spomoveHref} className="flex h-10 items-center justify-center gap-1.5 rounded-[11px] text-[12px] font-black" style={{ background: 'var(--spm-s3)', color: 'var(--spm-t)' }}>
            <MonitorPlay size={13} />큰 화면
          </Link>
        </div>
      </div>
    </article>
  );
}

function PackageRail({ title, caption, programs, drills }: { title: string; caption: string; programs: Program[]; drills: Drill[] }) {
  if (!programs.length) return null;
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-end justify-between gap-3 px-[22px] sm:px-8 lg:px-10">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles size={13} color="var(--spm-amb)" />
            <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>curated packages</p>
          </div>
          <h2 className="text-[17px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
          <p className="mt-1 text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{caption}</p>
        </div>
        <Link href="/spokedu-master/library" className="shrink-0 text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>더 보기</Link>
      </div>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto px-[22px] sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-8 lg:px-10">
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

/* ── 오늘 수업 계획 ── */
function TodayPlan({ lessons, programs }: { lessons: ReturnType<typeof useMasterStore.getState>['lessons']; programs: Program[] }) {
  const toggleLessonDone = useMasterStore((state) => state.toggleLessonDone);
  if (lessons.length === 0) return null;

  const findProgramId = (lessonTitle: string) => {
    const stem = lessonTitle.split(':')[0] ?? lessonTitle;
    return programs.find((p) => stem.includes(p.title.split(':')[0] ?? '') || p.title.includes(stem))?.id;
  };

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between px-[22px] sm:px-8 lg:px-10">
        <h2 className="text-[16px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>오늘 수업 계획</h2>
        <Link href="/spokedu-master/plan" className="flex items-center gap-0.5 text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>
          전체보기<ChevronRight size={13} />
        </Link>
      </div>
      <div className="grid gap-2 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-10">
        {lessons.map((lesson) => {
          const programId = findProgramId(lesson.title);
          const launchHref = programId ? `/spokedu-master/class-mode/${programId}` : '/spokedu-master/class-record';
          return (
            <div key={lesson.id} className="flex items-center gap-3 rounded-[13px] p-3.5" style={{ background: 'var(--spm-s2)', border: `1px solid ${lesson.done ? 'var(--spm-br)' : lesson.color}22` }}>
              <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: lesson.color }} />
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

/* ── 알림 시트 ── */
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

/* ── 컴팩트 네비 칩 ── */
function NavChips({ programCount }: { programCount: number }) {
  return (
    <section className="mb-4 flex gap-2 px-[22px] sm:px-8 lg:px-10">
      {([
        { label: '라이브러리', sub: `${programCount}개 수업`, href: '/spokedu-master/library', Icon: BookOpen, ic: 'var(--spm-acc)' },
        { label: 'SPOMOVE', sub: '큰 화면 실행', href: '/spokedu-master/spomove', Icon: Zap, ic: 'var(--spm-grn)' },
        { label: '수업 도구', sub: '타이머·팀·뽑기', href: '/spokedu-master/class-tools', Icon: Timer, ic: 'var(--spm-amb)' },
      ] as const).map(({ label, sub, href, Icon, ic }) => (
        <Link key={label} href={href} className="flex flex-1 items-center gap-2 rounded-[12px] px-3 py-2.5 active:scale-[0.97]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
          <Icon size={15} color={ic} strokeWidth={2} />
          <span className="min-w-0">
            <strong className="block truncate text-[11px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{label}</strong>
            <span className="mt-0.5 block truncate text-[9px] font-semibold leading-none" style={{ color: 'var(--spm-t3)' }}>{sub}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

/* ── 유틸리티 링크 ── */
function UtilityRow() {
  return (
    <section className="mb-4 flex gap-2 px-[22px] sm:px-8 lg:px-10">
      <Link href="/spokedu-master/report" className="flex flex-1 items-center gap-2.5 rounded-[12px] px-3 py-2.5 active:scale-[0.99]" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.11),rgba(16,185,129,0.06))', border: '1px solid rgba(99,102,241,0.18)' }}>
        <FileText size={14} color="#a5b4fc" />
        <span className="min-w-0">
          <strong className="block truncate text-[12px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>설명 문구</strong>
          <span className="mt-0.5 block truncate text-[9px] font-semibold leading-none" style={{ color: 'var(--spm-t3)' }}>학부모·기관 문구 복사</span>
        </span>
      </Link>
      <Link href="/spokedu-master/plan" className="flex flex-1 items-center gap-2.5 rounded-[12px] px-3 py-2.5 active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <CalendarDays size={14} color="var(--spm-amb)" />
        <span className="min-w-0">
          <strong className="block truncate text-[12px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>수업 계획</strong>
          <span className="mt-0.5 block truncate text-[9px] font-semibold leading-none" style={{ color: 'var(--spm-t3)' }}>주간 일정 관리</span>
        </span>
      </Link>
    </section>
  );
}

/* ── 메인 ── */
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

  const usedProgramIds = useMemo(() => new Set(classRecords.map((r) => r.programId)), [classRecords]);

  /* 즐겨찾기 우선, 최근 사용 다음, 나머지 프로그램으로 채움 */
  const quickPrograms = useMemo(() => {
    const favList = programs.filter((p) => favorites.includes(p.id));
    const recentList = programs.filter((p) => usedProgramIds.has(p.id) && !favorites.includes(p.id));
    const rest = programs.filter((p) => !favorites.includes(p.id) && !usedProgramIds.has(p.id));
    return [...favList, ...recentList, ...rest]
      .filter((p, i, list) => list.findIndex((item) => item.id === p.id) === i)
      .slice(0, 3);
  }, [favorites, programs, usedProgramIds]);

  const packagePrograms = useMemo(() => {
    const withSpomove = programs.filter((program) => getProgramDrills(program, drills).length > 0);
    const short = programs.filter((program) => program.duration <= 18);
    return [...withSpomove, ...quickPrograms, ...short, ...programs]
      .filter((program, index, list) => list.findIndex((item) => item.id === program.id) === index)
      .slice(0, 3);
  }, [drills, programs, quickPrograms]);

  if (!mounted || !programsLoaded) return <DashboardSkeleton />;

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const todayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.date), now));
  const firstUndoneTodayLesson = todayLessons.find((l) => !l.done);
  const heroFromPlan = firstUndoneTodayLesson
    ? programs.find((p) => firstUndoneTodayLesson.title.includes(p.title.split(':')[0] ?? '') || p.title.includes(firstUndoneTodayLesson.title.split(':')[0] ?? ''))
    : undefined;
  const todayProgram = heroFromPlan ?? (programs.length > 0 ? programs[dayOfYear % programs.length] : undefined);
  if (!todayProgram) return <DashboardSkeleton />;
  const todayDrill = getBestProgramDrill(todayProgram, drills);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      {/* 헤더 */}
      <header className="flex items-center justify-between px-[22px] pb-5 pt-[24px] sm:px-8 lg:px-10">
        <div>
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>{greeting}</p>
          <h1 className="text-[26px] font-black leading-tight sm:text-[30px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}>
            {profile?.name ?? '선생님'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
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

      {/* 히어로 — 16:9 비율 고정 */}
      <TodayHero program={todayProgram} lesson={firstUndoneTodayLesson} drill={todayDrill} />

      <PackageRail title="오늘 바로 쓸 수업 패키지" caption="커리큘럼과 SPOMOVE를 한 번에 실행" programs={packagePrograms} drills={drills} />

      {/* 컴팩트 네비 칩 */}
      <NavChips programCount={programs.length} />

      {/* 오늘 수업 계획 — 콘텐츠 우선순위 1 */}
      <TodayPlan lessons={todayLessons} programs={programs} />

      {/* 빠른 실행 — 콘텐츠 우선순위 2 */}
      <QuickLaunch programs={quickPrograms} drill={drills[0]} />

      {/* 유틸리티 */}
      <UtilityRow />

      <section className="px-[22px] sm:px-8 lg:hidden lg:px-10">
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
