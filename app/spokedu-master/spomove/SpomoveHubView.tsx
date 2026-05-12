'use client';

import Link from 'next/link';
import { ChevronRight, ClipboardCheck, Download, MonitorPlay, Play, Smartphone, Trophy, Zap } from 'lucide-react';
import { DRILLS } from '../lib/data';
import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';

function DrillCard({ drill, index, isLocked }: { drill: (typeof DRILLS)[number]; index: number; isLocked: boolean }) {
  const gradients = ['linear-gradient(135deg,#312e81,#4f46e5)', 'linear-gradient(135deg,#064e3b,#059669)', 'linear-gradient(135deg,#1e1b4b,#7c3aed)', 'linear-gradient(135deg,#713f12,#be123c)'];
  return (
    <Link href={isLocked ? '/spokedu-master/profile' : `/spokedu-master/spomove/session?drill=${drill.id}`} className="relative min-h-[136px] overflow-hidden rounded-[14px] p-4 active:scale-[0.98]" style={{ background: gradients[index % gradients.length], border: '1px solid rgba(255,255,255,0.07)' }}>
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
        <h2 className="mt-1 text-[18px] font-bold leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{drill.name}</h2>
      </div>
      {isLocked ? (
        <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-black/55 backdrop-blur-[3px]">
          <span className="rounded-[7px] px-3 py-1.5 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.13)', border: '1px solid rgba(245,158,11,0.28)', color: 'var(--spm-amb)' }}>PRO 잠금</span>
        </div>
      ) : null}
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
    </div>
  );
}

function LaunchCard({ title, desc, href, icon: Icon, tone }: { title: string; desc: string; href: string; icon: typeof MonitorPlay; tone: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[14px] p-4 active:scale-[0.98]" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: `${tone}24` }}>
        <Icon size={20} color={tone} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>{title}</strong>
        <span className="mt-1 block text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>{desc}</span>
      </span>
      <ChevronRight size={17} color="var(--spm-t3)" />
    </Link>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const stats = useStats();
  const recent = sessions.slice(0, 3);

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>reaction training</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>SPOMOVE</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          설치 없이 웹에서 바로 실행하고, PWA로 홈 화면에 고정하면 수업 중 주소창 없이 사용할 수 있습니다.
        </p>
      </header>

      <div className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <main className="space-y-7">
          <section className="grid gap-2 md:grid-cols-3">
            <LaunchCard title="프로젝터 실행" desc="교실/체육관 화면에 띄우는 전체화면 모드" href="/spokedu-master/spomove/session?drill=speed-track&mode=projector" icon={MonitorPlay} tone="#818cf8" />
            <LaunchCard title="모바일 빠른 실행" desc="스마트폰이나 태블릿에서 바로 반응 기록" href="/spokedu-master/spomove/session?drill=speed-track&mode=mobile" icon={Smartphone} tone="#10b981" />
            <LaunchCard title="수업 기록과 실행" desc="세션 종료 후 학생 출석/동작 기록으로 이동" href="/spokedu-master/spomove/session?drill=speed-track&mode=class" icon={ClipboardCheck} tone="#f59e0b" />
          </section>

          <section>
            <Link href="/spokedu-master/spomove/session?drill=speed-track" className="flex min-h-[132px] items-center justify-between gap-4 overflow-hidden rounded-[18px] p-5 active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.75), rgba(236,72,153,0.58))', boxShadow: '0 18px 42px rgba(99,102,241,0.22)' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">quick start</p>
                <h2 className="mt-2 text-[25px] font-black text-white" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>바로 측정하기</h2>
                <p className="mt-1 text-[12px] font-semibold text-white/65">기본 색상/방향 신호 20회</p>
              </div>
              <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <Play size={22} color="#fff" fill="#fff" />
              </span>
            </Link>
          </section>

          <section>
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>훈련 모드</h2>
              <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{DRILLS.length}개</span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {DRILLS.map((drill, index) => <DrillCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} />)}
            </div>
          </section>
        </main>

        <aside className="space-y-7">
          <section className="rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), var(--spm-s2))', border: '1px solid rgba(16,185,129,0.24)' }}>
            <Download size={20} color="var(--spm-grn)" />
            <h2 className="mt-3 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>홈 화면에 추가하면 수업장이 빨라집니다</h2>
            <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
              브라우저 공유 메뉴에서 홈 화면 추가를 선택하면 수업 중 주소창 없이 바로 실행할 수 있습니다.
            </p>
          </section>

          <section className="grid grid-cols-3 gap-2">
            <Metric label="세션" value={String(stats.totalSessions)} />
            <Metric label="평균" value={formatReactionTime(stats.avgRT)} tone="var(--spm-grn)" />
            <Metric label="최고" value={formatReactionTime(stats.bestRT)} />
          </section>

          <section>
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>최근 기록</h2>
              <Link href="/spokedu-master/report" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>리포트</Link>
            </div>
            {recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: 'var(--spm-s3)' }}>
                      <Trophy size={17} color="var(--spm-amb)" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{session.drillName}</p>
                      <p className="mt-0.5 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>{new Date(session.date).toLocaleDateString('ko-KR')} / {session.cueCount} cues</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-grn)' }}>{formatReactionTime(session.avg)}</p>
                      <p className="text-[9px] font-semibold" style={{ color: 'var(--spm-t3)' }}>BEST {formatReactionTime(session.best)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Link href="/spokedu-master/spomove/session" className="flex items-center justify-between rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <span>
                  <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>아직 세션이 없어요</strong>
                  <span className="mt-1 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>첫 반응훈련을 시작해 기록을 쌓아보세요.</span>
                </span>
                <ChevronRight size={18} color="var(--spm-t3)" />
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
