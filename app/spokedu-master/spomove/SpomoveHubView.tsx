'use client';

import Link from 'next/link';
import { ChevronRight, Maximize, MonitorPlay, Play, Smartphone, TimerReset, Zap, type LucideIcon } from 'lucide-react';
import type { Drill } from '../types';
import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';

function DrillCard({ drill, index, isLocked }: { drill: Drill; index: number; isLocked: boolean }) {
  const gradients = ['linear-gradient(145deg,#1a1744 0%,#312e81 50%,#4f46e5 100%)', 'linear-gradient(145deg,#052e16 0%,#064e3b 50%,#059669 100%)', 'linear-gradient(145deg,#150b2e 0%,#1e1b4b 50%,#7c3aed 100%)', 'linear-gradient(145deg,#3f0000 0%,#7f1d1d 50%,#be123c 100%)'];
  return (
    <Link href={isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}`} className="relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[16px] p-4 active:scale-[0.98]" style={{ background: gradients[index % gradients.length], border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}>
      <div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-[11px]" style={{ background: 'rgba(255,255,255,0.12)' }}><Zap size={19} color="#fff" /></span><span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.14)' }}><Play size={13} color="#fff" fill="#fff" /></span></div>
      <div><p className="text-[9px] font-bold uppercase tracking-[0.09em] text-white/45">{drill.category}</p><h2 className="mt-1 text-[18px] font-bold leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{drill.name}</h2></div>
      {isLocked ? <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-black/55 backdrop-blur-[3px]"><span className="rounded-[7px] px-3 py-1.5 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.13)', border: '1px solid rgba(245,158,11,0.28)', color: 'var(--spm-amb)' }}>PRO 잠금</span></div> : null}
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><p className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>{value}</p><p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p></div>;
}

function LaunchCard({ title, desc, href, icon: Icon, tone }: { title: string; desc: string; href: string; icon: LucideIcon; tone: string }) {
  return <Link href={href} className="flex items-center gap-3 rounded-[14px] p-4 active:scale-[0.98]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: `${tone}24` }}><Icon size={20} color={tone} /></span><span className="min-w-0 flex-1"><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{title}</strong><span className="mt-1 block text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span></span><ChevronRight size={17} color="var(--spm-t3)" /></Link>;
}

function UseCaseCard({ title, caption, icon: Icon }: { title: string; caption: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <span className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.14)' }}>
        <Icon size={18} color="var(--spm-acc)" />
      </span>
      <h3 className="mt-4 text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{title}</h3>
      <p className="mt-1 text-[11px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{caption}</p>
    </div>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const drills = useMasterStore((state) => state.drills);
  const stats = useStats();
  const recent = sessions.slice(0, 3);
  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>screen movement engine</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>SPOMOVE</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>설치 없이 웹에서 바로 실행하는 화면 기반 반응훈련입니다. 빔, TV, 태블릿, 모바일에서 수업 전 집중 전환과 몰입을 만듭니다.</p>
      </header>
      <div className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <main className="space-y-7">
          <section className="grid gap-2 md:grid-cols-3">
            <UseCaseCard title="수업 전 3분 집중 전환" caption="아이들이 화면 신호를 보며 몸과 시선을 수업으로 모읍니다." icon={TimerReset} />
            <UseCaseCard title="16:9 큰 화면 활동" caption="프로젝터, TV, 노트북에서 앱 UI를 덜어낸 신호 화면으로 실행합니다." icon={MonitorPlay} />
            <UseCaseCard title="라이브러리와 연결" caption="수업안 상세에서 관련 SPOMOVE를 바로 실행할 수 있습니다." icon={Zap} />
          </section>
          <section className="grid gap-2 md:grid-cols-3">
            <LaunchCard title="큰 화면 실행" desc="빔, TV, 노트북에서 16:9 화면으로 바로 시작" href="/spokedu-master/spomove/session?drill=speed-track&mode=projector" icon={MonitorPlay} tone="#818cf8" />
            <LaunchCard title="모바일 빠른 실행" desc="폰이나 태블릿으로 워밍업과 마무리 활동 진행" href="/spokedu-master/spomove/session?drill=speed-track&mode=mobile" icon={Smartphone} tone="#10b981" />
            <LaunchCard title="Class Mode" desc="학생 전체가 보는 수업용 화면으로 전환" href="/spokedu-master/spomove/session?drill=speed-track&mode=class" icon={Maximize} tone="#f59e0b" />
          </section>
          <section>
            <Link href="/spokedu-master/spomove/session?drill=speed-track&mode=projector" className="flex min-h-[132px] items-center justify-between gap-4 overflow-hidden rounded-[18px] p-5 active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.75), rgba(236,72,153,0.58))', boxShadow: '0 18px 42px rgba(99,102,241,0.22)' }}>
              <div><p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">quick start</p><h2 className="mt-2 text-[25px] font-black text-white" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>바로 큰 화면으로 실행</h2><p className="mt-1 text-[12px] font-semibold text-white/65">기본 색상/방향 신호 20회</p></div>
              <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}><Play size={22} color="#fff" fill="#fff" /></span>
            </Link>
          </section>
          <section>
            <div className="mb-[14px] flex items-baseline justify-between"><h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>훈련 모드</h2><span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{drills.length}개</span></div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{drills.map((drill, index) => <DrillCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} />)}</div>
          </section>
        </main>
        <aside className="space-y-7">
          <section className="rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), var(--spm-s2))', border: '1px solid rgba(16,185,129,0.24)' }}><MonitorPlay size={20} color="var(--spm-grn)" /><h2 className="mt-3 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 공간에 맞게 실행합니다</h2><p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>모바일은 개인 터치 반응, Projector와 Class Mode는 학생 전체가 함께 보는 큰 화면 활동에 맞춰 UI를 줄입니다.</p></section>
          {stats.totalSessions > 0 ? (
            <section className="grid grid-cols-3 gap-2"><Metric label="세션" value={String(stats.totalSessions)} /><Metric label="평균" value={formatReactionTime(stats.avgRT)} tone="var(--spm-grn)" /><Metric label="최고" value={formatReactionTime(stats.bestRT)} /></section>
          ) : (
            <section className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>아직 실행 기록이 없습니다</p>
              <p className="mt-1 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>첫 세션을 완료하면 반응 시간과 세션 기록이 여기에 표시됩니다.</p>
            </section>
          )}
          <section>
            <div className="mb-[14px] flex items-baseline justify-between"><h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>최근 실행</h2><Link href="/spokedu-master/report" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>설명 문구</Link></div>
            {recent.length > 0 ? <div className="space-y-2">{recent.map((session) => <div key={session.id} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}><p className="truncate text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{session.drillName}</p><p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>{new Date(session.date).toLocaleDateString('ko-KR')} · {session.cueCount}회 · 평균 {formatReactionTime(session.avg)}</p></div>)}</div> : <Link href="/spokedu-master/spomove/session?drill=speed-track" className="flex items-center justify-between rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}><span><strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>아직 실행 기록이 없습니다</strong><span className="mt-1 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>첫 반응훈련을 시작해보세요.</span></span><ChevronRight size={18} color="var(--spm-t3)" /></Link>}
          </section>
        </aside>
      </div>
    </div>
  );
}
