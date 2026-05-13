'use client';

import Link from 'next/link';
import { Bell, BookOpen, ChevronRight, FileText, Play, Star, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PwaInstallCard } from '../components/operations/PwaInstallCard';
import { BottomSheet } from '../components/ui/BottomSheet';
import { DRILLS, PROGRAMS, getTodayProgram } from '../lib/data';
import { getTrialDaysLeft } from '../lib/subscription';
import { useMasterStore, useProfile, useUnreadCount } from '../store';
import type { Notification, Program } from '../types';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '오후도 힘내세요';
  return '오늘도 수고하셨어요';
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-[14px] flex items-baseline justify-between px-[22px] sm:px-8 lg:px-10">
      <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
      {href ? <Link href={href} className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>전체보기</Link> : null}
    </div>
  );
}

function ThumbGrid({ colors, size = 58 }: { colors: [string, string, string, string]; size?: number }) {
  return <div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[10px]" style={{ width: size, height: size }} aria-hidden>{colors.map((color) => <span key={color} style={{ background: color }} />)}</div>;
}

function PlanChip() {
  const profile = useProfile();
  const daysLeft = getTrialDaysLeft(profile);
  const label = profile?.plan === 'team' ? 'Center' : profile?.plan === 'pro' ? 'Pro' : `Trial ${daysLeft}일`;
  return <Link href="/spokedu-master/profile" className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>{label}</Link>;
}

function ProgramCard({ program, used }: { program: Program; used: boolean }) {
  return (
    <Link href={`/spokedu-master/library/${program.id}`} className="flex min-h-[150px] flex-col justify-between rounded-[16px] p-4 active:scale-[0.98]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {program.isNew ? <span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ background: 'rgba(16,185,129,0.14)', color: 'var(--spm-grn)' }}>NEW</span> : null}
            {used ? <span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}>최근 사용</span> : null}
          </div>
          <h3 className="text-[17px] font-black leading-tight" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{program.title}</h3>
          <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>{program.description}</p>
        </div>
        <ThumbGrid colors={program.colors} />
      </div>
      <p className="mt-4 text-[11px] font-bold" style={{ color: 'var(--spm-t3)' }}>{program.grade} · {program.duration}분 · {program.space}</p>
    </Link>
  );
}

const LOOP_STEPS = [
  { title: '고르기', caption: '오늘 쓸 수업안', href: '/spokedu-master/library', Icon: BookOpen },
  { title: '움직이기', caption: 'SPOMOVE 실행', href: '/spokedu-master/spomove', Icon: Zap },
  { title: '설명하기', caption: '수업 의미 복사', href: '/spokedu-master/report', Icon: FileText },
] as const;

function ClassLoop() {
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <div className="rounded-[18px] p-4" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>today loop</p>
            <h2 className="mt-1 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>오늘 수업 루프</h2>
          </div>
          <span className="hidden text-[12px] font-semibold sm:inline" style={{ color: 'var(--spm-t3)' }}>준비에서 설명까지 한 흐름</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {LOOP_STEPS.map(({ title, caption, href, Icon }, index) => (
            <Link key={title} href={href} className="flex min-h-[86px] items-center gap-3 rounded-[14px] p-3 active:scale-[0.99]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: index === 0 ? 'rgba(99,102,241,0.16)' : index === 1 ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.13)' }}>
                <Icon size={18} color={index === 0 ? 'var(--spm-acc)' : index === 1 ? 'var(--spm-grn)' : 'var(--spm-amb)'} />
              </span>
              <span className="min-w-0">
                <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
                <span className="mt-1 block text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{caption}</span>
              </span>
              <ChevronRight className="ml-auto shrink-0" size={16} color="var(--spm-t3)" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TodayRecommendation() {
  const program = getTodayProgram();
  return (
    <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
      <div className="relative overflow-hidden rounded-[14px]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899]" />
        <div className="grid gap-4 p-[18px] md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <span className="mb-3 inline-flex items-center gap-[5px] rounded-[6px] px-[9px] py-[3px] text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--spm-grn)' }}>오늘 추천</span>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="mb-1 text-[20px] font-bold leading-[1.25]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0, wordBreak: 'keep-all' }}>{program.title}</h3>
                <p className="text-[11px] font-normal" style={{ color: 'var(--spm-t3)' }}>{program.duration}분 · {program.space} · {program.tags.slice(0, 2).join(' · ')}</p>
              </div>
              <ThumbGrid colors={program.colors} size={66} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_48px] gap-2 md:min-w-[260px]">
            <Link href={`/spokedu-master/library/${program.id}`} className="flex items-center justify-center gap-2 rounded-[10px] px-[18px] py-[13px] text-[14px] font-semibold text-white active:scale-[0.98]" style={{ background: 'var(--spm-acc)', boxShadow: '0 8px 24px var(--spm-acc-glow)', fontFamily: 'var(--spm-font-display)' }}><Play size={14} fill="white" />수업안 보기</Link>
            <Link href="/spokedu-master/spomove" className="grid place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }} aria-label="SPOMOVE 실행"><Zap size={17} color="var(--spm-t2)" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function DrillTile({ drill, index }: { drill: (typeof DRILLS)[number]; index: number }) {
  const gradients = ['linear-gradient(135deg,#312e81,#4f46e5)', 'linear-gradient(135deg,#064e3b,#059669)', 'linear-gradient(135deg,#1e1b4b,#7c3aed)', 'linear-gradient(135deg,#713f12,#be123c)'];
  return (
    <Link href={`/spokedu-master/spomove/session?drill=${drill.id}`} className="relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-[12px] p-[16px_14px] active:scale-95" style={{ background: gradients[index % gradients.length], border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between"><span className="grid h-[30px] w-[30px] place-items-center rounded-[8px]" style={{ background: 'rgba(255,255,255,0.1)' }}><Zap size={15} color="#fff" /></span><span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}><Play size={10} fill="#fff" color="#fff" /></span></div>
      <div><p className="mb-[3px] text-[9px] font-semibold uppercase tracking-[0.06em] text-white/45">{drill.category}</p><p className="text-[14px] font-semibold leading-[1.25] text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{drill.name}</p></div>
    </Link>
  );
}

function NotificationSheet({ open, notifications, onClose, onMarkAll }: { open: boolean; notifications: Notification[]; onClose: () => void; onMarkAll: () => void }) {
  return (
    <BottomSheet open={open} title="알림" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between"><p className="text-[12px] font-bold" style={{ color: 'var(--spm-t3)' }}>최근 업데이트 {notifications.length}건</p><button type="button" onClick={onMarkAll} className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: 'var(--spm-s2)', color: 'var(--spm-t2)', border: '1px solid var(--spm-br2)' }}>모두 읽음</button></div>
        <div className="space-y-2">{notifications.map((item) => <div key={item.id} className="rounded-[14px] p-4" style={{ background: item.read ? 'var(--spm-s2)' : 'rgba(99,102,241,0.14)', border: item.read ? '1px solid var(--spm-br2)' : '1px solid rgba(99,102,241,0.28)' }}><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{item.title}</strong><span className="mt-1 block text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{item.body}</span></div>)}</div>
      </div>
    </BottomSheet>
  );
}

export default function DashboardView() {
  const profile = useProfile();
  const unreadCount = useUnreadCount();
  const classRecords = useMasterStore((state) => state.classRecords);
  const favorites = useMasterStore((state) => state.favorites);
  const notifications = useMasterStore((state) => state.notifications);
  const markAllRead = useMasterStore((state) => state.markAllRead);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const usedProgramIds = useMemo(() => new Set(classRecords.map((record) => record.programId)), [classRecords]);
  const featuredPrograms = useMemo(() => {
    const favoritePrograms = PROGRAMS.filter((program) => favorites.includes(program.id));
    return [...favoritePrograms, ...PROGRAMS].filter((program, index, list) => list.findIndex((item) => item.id === program.id) === index).slice(0, 4);
  }, [favorites]);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-[22px] pt-[22px] sm:px-8 lg:px-10">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-0.5 text-[12px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{getGreeting()}</p>
            <h1 className="text-[24px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>{profile?.name ?? '선생님'}</h1>
            <p className="mt-1.5 text-[12px] font-medium leading-5" style={{ color: 'var(--spm-t2)' }}>수업 준비는 쉽게, 수업은 더 몰입감 있게.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <PlanChip />
            <button type="button" onClick={() => setNotificationOpen(true)} className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }} aria-label="알림">
              <Bell size={18} color="var(--spm-t2)" />
              {unreadCount > 0 ? <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full" style={{ background: 'var(--spm-red)', border: '1.5px solid var(--spm-bg)' }} /> : null}
            </button>
          </div>
        </div>
      </header>

      <ClassLoop />
      <SectionHeader title="오늘 추천 수업" href="/spokedu-master/library" />
      <TodayRecommendation />

      <SectionHeader title="최근 사용과 즐겨찾기" href="/spokedu-master/library" />
      <section className="mb-7 grid gap-3 px-[22px] sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-10">
        {featuredPrograms.map((program) => <ProgramCard key={program.id} program={program} used={usedProgramIds.has(program.id)} />)}
      </section>

      <section className="mb-7">
        <SectionHeader title="SPOMOVE 빠른 실행" href="/spokedu-master/spomove" />
        <div className="grid grid-cols-2 gap-2 px-[22px] sm:grid-cols-4 sm:px-8 lg:px-10">{DRILLS.slice(0, 4).map((drill, index) => <DrillTile key={drill.id} drill={drill} index={index} />)}</div>
      </section>

      <section className="mb-7 px-[22px] sm:px-8 lg:px-10">
        <Link href="/spokedu-master/report" className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(16,185,129,0.1))', border: '1px solid var(--spm-br2)' }}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: 'rgba(255,255,255,0.08)' }}><Star size={19} color="#a5b4fc" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>수업 설명 도구</strong><span className="mt-1 block text-[11px] leading-5" style={{ color: 'var(--spm-t3)' }}>학부모용, 기관용, 학교 수업기록용 문구를 복사해 바로 사용할 수 있습니다.</span></span>
          <ChevronRight size={18} color="var(--spm-t3)" />
        </Link>
      </section>

      <section className="px-[22px] sm:px-8 lg:hidden lg:px-10"><PwaInstallCard compact /></section>
      <NotificationSheet open={notificationOpen} notifications={notifications} onClose={() => setNotificationOpen(false)} onMarkAll={markAllRead} />
    </div>
  );
}
