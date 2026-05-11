'use client';

import Link from 'next/link';
import { Bell, ChevronRight, Lock, MoreHorizontal, Play, Zap } from 'lucide-react';
import { DRILLS, PROGRAMS } from '../lib/data';
import { useIsPro, useMasterStore, useProfile, useStats, useUnreadCount } from '../store';

function ThumbGrid({ colors, size = 66 }: { colors: [string, string, string, string]; size?: number }) {
  return (
    <div
      className="grid shrink-0 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-[10px]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {colors.map((color) => (
        <span key={color} style={{ background: color }} />
      ))}
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-[14px] flex items-baseline justify-between px-[22px]">
      <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)' }}>
        {title}
      </h2>
      {href ? (
        <Link href={href} className="text-[12px] font-medium tracking-[-0.01em]" style={{ color: 'var(--spm-acc)' }}>
          전체보기
        </Link>
      ) : null}
    </div>
  );
}

function KpiCard({ value, label, delta }: { value: string; label: string; delta: string }) {
  return (
    <div
      className="rounded-[12px] p-[13px]"
      style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
    >
      <p
        className="text-[20px] font-bold leading-none tracking-[-0.03em]"
        style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>
        {label}
      </p>
      <p className="mt-1 text-[9px] font-semibold" style={{ color: 'var(--spm-grn)' }}>
        {delta}
      </p>
    </div>
  );
}

function ProBanner() {
  return (
    <Link
      href="/spokedu-master/profile"
      className="mx-[22px] mb-6 flex items-center gap-2.5 rounded-[10px] px-[14px] py-[11px]"
      style={{
        background: 'linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
        border: '1px solid rgba(245,158,11,0.18)',
      }}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px]" style={{ background: 'rgba(245,158,11,0.15)' }}>
        <Lock size={14} color="var(--spm-amb)" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[12px] font-bold tracking-[-0.01em]" style={{ color: 'var(--spm-amb)' }}>
          PRO로 업그레이드
        </strong>
        <span className="mt-0.5 block text-[10px]" style={{ color: 'rgba(245,158,11,0.5)' }}>
          전체 153개 수업안과 리포트 기능 해제
        </span>
      </span>
      <ChevronRight size={16} color="rgba(245,158,11,0.45)" />
    </Link>
  );
}

function TodayClassCard() {
  const lessons = useMasterStore((state) => state.lessons);
  const todayLesson = lessons[0];
  const program = PROGRAMS.find((item) => todayLesson?.title.includes(item.title.split(' ')[0])) ?? PROGRAMS[0];

  return (
    <section className="mb-7 px-[22px]">
      <div
        className="relative overflow-hidden rounded-[14px]"
        style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
      >
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899]" />
        <div className="p-[18px] pb-4">
          <span
            className="mb-3 inline-flex items-center gap-[5px] rounded-[6px] px-[9px] py-[3px] text-[10px] font-bold tracking-[0.04em]"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: 'var(--spm-grn)',
            }}
          >
            <span className="h-[5px] w-[5px] animate-pulse rounded-full" style={{ background: 'var(--spm-grn)' }} />
            {todayLesson?.classId ?? '3학년 A반'} 진행 중
          </span>

          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="mb-1 text-[20px] font-bold leading-[1.2] tracking-[-0.04em]"
                style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}
              >
                {todayLesson?.title ?? '8자 드릴 - 민첩성 트레이닝'}
              </h3>
              <p className="text-[11px] font-normal tracking-[0.01em]" style={{ color: 'var(--spm-t3)' }}>
                {todayLesson ? `${todayLesson.period}교시 / ${todayLesson.duration}분 / ${program.space}` : '3교시 / 15분 / 좁은 공간'}
              </p>
            </div>
            <ThumbGrid colors={program.colors} />
          </div>

          <div className="grid grid-cols-[1fr_44px] gap-2">
            <Link
              href="/spokedu-master/spomove/session"
              className="flex items-center justify-center gap-2 rounded-[10px] px-[18px] py-[13px] text-[14px] font-semibold tracking-[-0.02em] text-white active:scale-[0.96]"
              style={{
                background: 'var(--spm-acc)',
                boxShadow: '0 8px 24px var(--spm-acc-glow)',
                fontFamily: 'var(--spm-font-display)',
              }}
            >
              <Play size={14} fill="white" />
              수업 시작하기
            </Link>
            <Link
              href="/spokedu-master/library"
              className="grid place-items-center rounded-[10px]"
              style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}
              aria-label="수업 상세 보기"
            >
              <MoreHorizontal size={16} color="var(--spm-t2)" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function DrillTile({ drill, index }: { drill: (typeof DRILLS)[number]; index: number }) {
  const gradients = [
    'linear-gradient(135deg,#312e81,#4f46e5)',
    'linear-gradient(135deg,#064e3b,#059669)',
    'linear-gradient(135deg,#1e1b4b,#7c3aed)',
    'linear-gradient(135deg,#713f12,#be123c)',
  ];

  return (
    <Link
      href={`/spokedu-master/spomove/session?drill=${drill.id}`}
      className="relative flex min-h-[100px] flex-col justify-between overflow-hidden rounded-[12px] p-[16px_14px] active:scale-95"
      style={{ background: gradients[index % gradients.length], border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[8px]" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <Zap size={15} color="#fff" />
        </span>
        <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Play size={10} fill="#fff" color="#fff" />
        </span>
      </div>
      <div>
        <p className="mb-[3px] text-[9px] font-semibold uppercase tracking-[0.06em] text-white/45">{drill.category}</p>
        <p
          className="text-[13px] font-semibold leading-[1.25] tracking-[-0.02em] text-white"
          style={{ fontFamily: 'var(--spm-font-display)' }}
        >
          {drill.name}
        </p>
      </div>
      {drill.isPro ? (
        <span className="absolute right-2 top-2 rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-bold text-white/70">
          PRO
        </span>
      ) : null}
    </Link>
  );
}

function RecommendationCard({ program, rank }: { program: (typeof PROGRAMS)[number]; rank: number }) {
  return (
    <Link
      href={`/spokedu-master/library/${program.id}`}
      className="relative h-[186px] w-[130px] shrink-0 overflow-hidden rounded-[14px]"
      style={{ background: `linear-gradient(135deg, ${program.colors[0]}, ${program.colors[1]}, ${program.colors[2]})` }}
    >
      <span
        className="absolute bottom-[-13px] left-[-4px] text-[52px] font-bold leading-none tracking-[-0.08em]"
        style={{
          fontFamily: 'var(--spm-font-display)',
          color: 'rgba(13,13,20,0.74)',
          WebkitTextStroke: '1px rgba(255,255,255,0.18)',
        }}
      >
        {rank}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pl-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-white/45">{program.category}</p>
        <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-tight tracking-[-0.02em] text-white">{program.title}</p>
      </div>
      {program.isPro ? (
        <span className="absolute right-2 top-2 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-bold text-white/80">
          PRO
        </span>
      ) : null}
    </Link>
  );
}

export default function DashboardView() {
  const profile = useProfile();
  const isPro = useIsPro();
  const stats = useStats();
  const unreadCount = useUnreadCount();
  const lessons = useMasterStore((state) => state.lessons);
  const activeClasses = new Set(lessons.map((lesson) => lesson.classId)).size;

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="flex items-center justify-between px-[22px] pb-[18px] pt-[22px]">
        <div>
          <p className="mb-1 text-[12px] italic tracking-[0.01em]" style={{ color: 'var(--spm-t3)' }}>
            좋은 아침이에요
          </p>
          <h1
            className="text-[22px] font-bold tracking-[-0.04em]"
            style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}
          >
            {profile?.name ?? '선생님'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative grid h-[38px] w-[38px] place-items-center rounded-[10px]"
            style={{ background: 'var(--spm-s3)', border: '1px solid var(--spm-br2)' }}
            aria-label="알림"
          >
            <Bell size={18} color="var(--spm-t2)" />
            {unreadCount > 0 ? (
              <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full" style={{ background: 'var(--spm-red)', border: '1.5px solid var(--spm-bg)' }} />
            ) : null}
          </button>
          <Link
            href="/spokedu-master/profile"
            className="grid h-10 w-10 place-items-center rounded-full text-[14px] font-bold text-white"
            style={{ background: profile?.avatarColor ?? '#312e81', fontFamily: 'var(--spm-font-display)' }}
          >
            {(profile?.name ?? '선생님').slice(0, 1)}
          </Link>
        </div>
      </header>

      {!isPro ? <ProBanner /> : null}

      <section className="mb-7 grid grid-cols-2 gap-2 px-[22px]">
        <KpiCard value="153" label="프로그램" delta="+8 신규" />
        <KpiCard value={String(activeClasses || 3)} label="진행 반" delta="오늘 2개" />
        <KpiCard value={String(Math.max(stats.thisWeekSessions, 8))} label="주간 추천" delta="맞춤 갱신" />
        <KpiCard value={String(Math.max(stats.totalCues, 41))} label="SPOMOVE" delta={stats.avgRT ? `${stats.avgRT}ms 평균` : '측정 준비'} />
      </section>

      <SectionHeader title="오늘 수업" href="/spokedu-master/plan" />
      <TodayClassCard />

      <section className="mb-7">
        <SectionHeader title="SPOMOVE" href="/spokedu-master/spomove" />
        <div className="grid grid-cols-2 gap-2 px-[22px]">
          {DRILLS.slice(0, 4).map((drill, index) => (
            <DrillTile key={drill.id} drill={drill} index={index} />
          ))}
        </div>
      </section>

      <section className="mb-7">
        <SectionHeader title="이번 주 추천" href="/spokedu-master/library" />
        <div className="flex gap-[9px] overflow-x-auto px-[22px]">
          {PROGRAMS.slice(0, 5).map((program, index) => (
            <RecommendationCard key={program.id} program={program} rank={index + 1} />
          ))}
        </div>
      </section>
    </div>
  );
}
