'use client';

import Link from 'next/link';
import { ChevronRight, Play, Trophy, Zap } from 'lucide-react';
import { DRILLS } from '../lib/data';
import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';

function DrillCard({ drill, index, isLocked }: { drill: (typeof DRILLS)[number]; index: number; isLocked: boolean }) {
  const gradients = [
    'linear-gradient(135deg,#312e81,#4f46e5)',
    'linear-gradient(135deg,#064e3b,#059669)',
    'linear-gradient(135deg,#1e1b4b,#7c3aed)',
    'linear-gradient(135deg,#713f12,#be123c)',
  ];

  return (
    <Link
      href={isLocked ? '/spokedu-master/profile' : `/spokedu-master/spomove/session?drill=${drill.id}`}
      className="relative min-h-[136px] overflow-hidden rounded-[14px] p-4 active:scale-[0.97]"
      style={{ background: gradients[index % gradients.length], border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <Zap size={19} color="#fff" />
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }}>
          <Play size={13} color="#fff" fill="#fff" />
        </span>
      </div>
      <div className="absolute inset-x-4 bottom-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.09em] text-white/45">{drill.category}</p>
        <h2
          className="mt-1 text-[18px] font-bold leading-tight tracking-[-0.04em] text-white"
          style={{ fontFamily: 'var(--spm-font-display)' }}
        >
          {drill.name}
        </h2>
      </div>
      {isLocked ? (
        <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-black/55 backdrop-blur-[3px]">
          <span
            className="rounded-[7px] px-3 py-1.5 text-[10px] font-black tracking-[0.04em]"
            style={{ background: 'rgba(245,158,11,0.13)', border: '1px solid rgba(245,158,11,0.28)', color: 'var(--spm-amb)' }}
          >
            PRO 잠금
          </span>
        </div>
      ) : null}
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[18px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
        {label}
      </p>
    </div>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const stats = useStats();
  const recent = sessions.slice(0, 3);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>
          reaction training
        </p>
        <h1
          className="mt-1 text-[32px] font-black tracking-[-0.06em]"
          style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)' }}
        >
          SPOMOVE
        </h1>
        <p className="mt-2 max-w-[300px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          수업 도입, 집중 전환, 반응속도 기록을 한 번에 실행합니다.
        </p>
      </header>

      <section className="mb-7 grid grid-cols-3 gap-2 px-[22px]">
        <Metric label="세션" value={String(stats.totalSessions)} />
        <Metric label="평균" value={formatReactionTime(stats.avgRT)} tone="var(--spm-grn)" />
        <Metric label="최고" value={formatReactionTime(stats.bestRT)} />
      </section>

      <section className="mb-7 px-[22px]">
        <Link
          href="/spokedu-master/spomove/session?drill=speed-track"
          className="flex min-h-[118px] items-center justify-between gap-4 overflow-hidden rounded-[16px] p-5 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.75), rgba(236,72,153,0.58))',
            boxShadow: '0 18px 42px rgba(99,102,241,0.22)',
          }}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">quick start</p>
            <h2
              className="mt-2 text-[23px] font-black tracking-[-0.05em] text-white"
              style={{ fontFamily: 'var(--spm-font-display)' }}
            >
              바로 측정하기
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-white/60">기본 색상/방향 큐 20회</p>
          </div>
          <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <Play size={22} color="#fff" fill="#fff" />
          </span>
        </Link>
      </section>

      <section className="mb-7">
        <div className="mb-[14px] flex items-baseline justify-between px-[22px]">
          <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)' }}>
            훈련 모드
          </h2>
          <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>
            {DRILLS.length}개
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 px-[22px]">
          {DRILLS.map((drill, index) => (
            <DrillCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} />
          ))}
        </div>
      </section>

      <section className="mb-7 px-[22px]">
        <div className="mb-[14px] flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold tracking-[-0.03em]" style={{ fontFamily: 'var(--spm-font-display)' }}>
            최근 기록
          </h2>
          <Link href="/spokedu-master/report" className="text-[12px] font-medium" style={{ color: 'var(--spm-acc)' }}>
            리포트
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-[12px] p-3"
                style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }}>
                  <Trophy size={17} color="var(--spm-amb)" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>
                    {session.drillName}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>
                    {new Date(session.date).toLocaleDateString('ko-KR')} / {session.cueCount} cues
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-grn)' }}>
                    {formatReactionTime(session.avg)}
                  </p>
                  <p className="text-[9px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                    BEST {formatReactionTime(session.best)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Link
            href="/spokedu-master/spomove/session"
            className="flex items-center justify-between rounded-[14px] p-4"
            style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
          >
            <span>
              <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>
                아직 세션이 없어요
              </strong>
              <span className="mt-1 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>
                첫 반응훈련을 시작해 기록을 쌓아보세요.
              </span>
            </span>
            <ChevronRight size={18} color="var(--spm-t3)" />
          </Link>
        )}
      </section>
    </div>
  );
}
