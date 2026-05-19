'use client';

import Link from 'next/link';
import { Brain, ChevronRight, Goal, Maximize, MonitorPlay, Play, Smartphone, Sparkles, TimerReset, Zap, type LucideIcon } from 'lucide-react';
import type { Drill } from '../types';
import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';

function getDrillIntent(drill: Drill) {
  const text = `${drill.name} ${drill.category}`;
  if (/기억|Memory|인지|색|집중/i.test(text)) return '기억·집중';
  if (/방향|대각|Diagonal|전환/i.test(text)) return '방향 전환';
  if (/속도|스피드|반응|Visual|Reaction/i.test(text)) return '순발 반응';
  return '몰입 전환';
}

function getDrillsByIntent(drills: Drill[], intent: string) {
  const matcher: Record<string, RegExp> = {
    warmup: /반응|속도|스피드|Visual|Reaction|색/i,
    transition: /방향|대각|전환|Diagonal|flow/i,
    finish: /기억|Memory|인지|집중|pattern|spatial/i,
  };
  const re = matcher[intent] ?? /./;
  const matched = drills.filter((d) => re.test(`${d.name} ${d.category} ${d.engine?.mode ?? ''}`));
  return (matched.length ? matched : drills).slice(0, 3);
}

const DRILL_GRADIENTS = [
  'linear-gradient(145deg,#1a1744 0%,#312e81 50%,#4f46e5 100%)',
  'linear-gradient(145deg,#052e16 0%,#064e3b 50%,#059669 100%)',
  'linear-gradient(145deg,#150b2e 0%,#1e1b4b 50%,#7c3aed 100%)',
  'linear-gradient(145deg,#3f0000 0%,#7f1d1d 50%,#be123c 100%)',
];

/* Peloton 클래스 카드 스타일 — 그라디언트 배경 + 카테고리 배지 + intent 레이블 */
function DrillCard({ drill, index, isLocked }: { drill: Drill; index: number; isLocked: boolean }) {
  return (
    <Link
      href={isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}`}
      className="relative flex min-h-[152px] flex-col justify-between overflow-hidden rounded-[16px] p-4 active:scale-[0.97]"
      style={{ background: DRILL_GRADIENTS[index % DRILL_GRADIENTS.length], border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 28px rgba(0,0,0,0.3)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.13)' }}>
          <Zap size={16} color="#fff" />
        </span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-black text-white/55" style={{ background: 'rgba(0,0,0,0.32)' }}>
          {drill.category}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-black text-white/45">{getDrillIntent(drill)}</p>
        <h2 className="mt-1 text-[18px] font-bold leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)' }}>{drill.name}</h2>
      </div>
      <div className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.16)' }}>
        <Play size={12} fill="#fff" color="#fff" />
      </div>
      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-black/60 backdrop-blur-[3px]">
          <span className="rounded-[8px] px-3 py-1.5 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.28)', color: 'var(--spm-amb)' }}>PRO 잠금</span>
        </div>
      ) : null}
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[12px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[20px] font-bold" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
    </div>
  );
}

/* Apple Fitness+ 카테고리 섹션 스타일 — 헤더에 "바로 실행" CTA + 드릴 카드 3개 */
function IntentRow({ id, title, caption, icon: Icon, tone, drills, isPro }: {
  id: string; title: string; caption: string; icon: LucideIcon; tone: string; drills: Drill[]; isPro: boolean;
}) {
  if (!drills.length) return null;
  const firstDrill = drills[0]!;
  const firstLocked = firstDrill.isPro && !isPro;

  return (
    <section id={id} className="scroll-mt-4 overflow-hidden rounded-[18px]" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>

      {/* 섹션 헤더 + ClassDojo 스타일 즉시 실행 링크 */}
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--spm-br)' }}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]" style={{ background: `${tone}20`, border: `1px solid ${tone}28` }}>
          <Icon size={18} color={tone} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
          <p className="mt-0.5 text-[11px] font-semibold leading-4" style={{ color: 'var(--spm-t3)' }}>{caption}</p>
        </div>
        {!firstLocked ? (
          <Link
            href={`/spokedu-master/spomove/session?drill=${firstDrill.id}&mode=projector`}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-black"
            style={{ background: `${tone}18`, color: tone, border: `1px solid ${tone}28` }}
          >
            <Play size={11} fill={tone} />바로 실행
          </Link>
        ) : null}
      </div>

      {/* 드릴 카드 */}
      <div className="grid gap-2 p-4 md:grid-cols-3">
        {drills.map((drill) => {
          const locked = drill.isPro && !isPro;
          return (
            <Link
              key={`${id}-${drill.id}`}
              href={locked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
              className="flex items-center gap-3 rounded-[14px] p-3.5 active:scale-[0.99]"
              style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: `${tone}18` }}>
                <Zap size={17} color={tone} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{drill.name}</strong>
                <span className="mt-0.5 block text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                  {locked ? 'PRO 필요' : getDrillIntent(drill)}
                </span>
              </span>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: `${tone}18` }}>
                {locked
                  ? <span className="text-[9px] font-black" style={{ color: tone }}>PRO</span>
                  : <Play size={12} fill={tone} color={tone} />}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function SpomoveHubView() {
  const isPro = useIsPro();
  const sessions = useMasterStore((state) => state.sessions);
  const drills = useMasterStore((state) => state.drills);
  const stats = useStats();
  const recent = sessions.slice(0, 3);
  const defaultDrillId = drills[0]?.id ?? 'speed-track';

  const warmupDrills = getDrillsByIntent(drills, 'warmup');
  const transitionDrills = getDrillsByIntent(drills, 'transition');
  const finishDrills = getDrillsByIntent(drills, 'finish');

  return (
    <div className="h-full overflow-y-auto pb-7" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[22px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>screen movement engine</p>
        <h1 className="mt-1 text-[32px] font-black md:text-[42px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>SPOMOVE</h1>
        <p className="mt-2 max-w-[680px] text-[13px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
          설치 없이 브라우저에서 바로 실행하는 화면 기반 반응훈련입니다. 빔·TV·태블릿·모바일. 수업 도입부터 마무리까지 연결합니다.
        </p>
      </header>

      <div className="grid gap-7 px-[22px] sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <main className="space-y-5">

          {/* ── 즉시 실행 히어로 ── Apple Fitness+ 스타일: 대형 CTA + 모드 3버튼 */}
          <section>
            <Link
              href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`}
              className="flex min-h-[148px] items-center justify-between gap-4 overflow-hidden rounded-[20px] px-6 py-5 active:scale-[0.99]"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.96),rgba(139,92,246,0.82),rgba(236,72,153,0.62))', boxShadow: '0 20px 52px rgba(99,102,241,0.28)' }}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">quick start · projector mode</p>
                <h2 className="mt-2 text-[28px] font-black leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>지금 큰 화면으로 실행</h2>
                <p className="mt-1.5 text-[12px] font-semibold text-white/60">빔·TV에 연결하면 즉시 시작 · 앱 설치 없음</p>
              </div>
              <span className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <Play size={24} fill="#fff" color="#fff" />
              </span>
            </Link>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {[
                { href: `?drill=${defaultDrillId}&mode=projector`, Icon: MonitorPlay, label: '큰화면', color: '#818cf8' },
                { href: `?drill=${defaultDrillId}&mode=mobile`,    Icon: Smartphone,  label: '모바일', color: '#10b981' },
                { href: `?drill=${defaultDrillId}&mode=class`,     Icon: Maximize,    label: '수업모드', color: '#f59e0b' },
              ].map(({ href, Icon, label, color }) => (
                <Link key={label} href={`/spokedu-master/spomove/session${href}`}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-[13px] text-[12px] font-bold"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}>
                  <Icon size={14} color={color} />{label}
                </Link>
              ))}
            </div>
          </section>

          {/* ── 수업 타이밍 앵커 네비게이션 ── Headspace "Right Now" 스타일 상황 선택 */}
          <section>
            <div className="mb-3 flex items-center gap-1.5">
              <Sparkles size={13} color="var(--spm-amb)" />
              <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>지금 수업 어디쯤인가요?</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '도입', sub: '3분 집중 전환', href: '#warmup', tone: '#818cf8', Icon: TimerReset },
                { label: '중간', sub: '반응 전환',     href: '#transition', tone: '#10b981', Icon: Goal },
                { label: '마무리', sub: '참여 게임',   href: '#finish', tone: '#f59e0b', Icon: Brain },
              ].map(({ label, sub, href, tone, Icon }) => (
                <a key={href} href={href}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-[14px] py-4 text-center active:scale-[0.97]"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                  <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: `${tone}18` }}>
                    <Icon size={16} color={tone} />
                  </span>
                  <strong className="text-[13px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{label}</strong>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{sub}</span>
                </a>
              ))}
            </div>
          </section>

          {/* ── 수업 흐름별 SPOMOVE ── */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[19px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>수업 흐름별 SPOMOVE</h2>
              <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>드릴 목록이 아닌 수업 타이밍 기준</span>
            </div>
            <IntentRow id="warmup" title="도입 3분 집중 전환" caption="수업 시작 전 시선과 움직임을 한 번에 모읍니다." icon={TimerReset} tone="#818cf8" drills={warmupDrills} isPro={isPro} />
            <IntentRow id="transition" title="수업 중 반응 전환" caption="늘어진 분위기를 신호·방향·순발 활동으로 다시 끌어올립니다." icon={Goal} tone="#10b981" drills={transitionDrills} isPro={isPro} />
            <IntentRow id="finish" title="마무리 참여 게임" caption="기억, 집중, 판단 활동으로 마지막까지 참여감을 유지합니다." icon={Brain} tone="#f59e0b" drills={finishDrills} isPro={isPro} />
          </section>

          {/* ── 전체 훈련 목록 ── */}
          <section>
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>전체 훈련 모드</h2>
              <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{drills.length}개</span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {drills.map((drill, index) => (
                <DrillCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} />
              ))}
            </div>
          </section>

        </main>

        {/* 사이드바 */}
        <aside className="space-y-5">
          <section className="rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.14),var(--spm-s2))', border: '1px solid rgba(16,185,129,0.24)' }}>
            <MonitorPlay size={20} color="var(--spm-grn)" />
            <h2 className="mt-3 text-[17px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 공간에 맞게 실행합니다</h2>
            <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>모바일은 개인 터치 반응, Projector와 Class Mode는 학생 전체가 함께 보는 큰 화면 활동에 맞춰 UI를 줄입니다.</p>
          </section>

          {stats.totalSessions > 0 ? (
            <section className="grid grid-cols-3 gap-2">
              <Metric label="세션" value={String(stats.totalSessions)} />
              <Metric label="평균" value={formatReactionTime(stats.avgRT)} tone="var(--spm-grn)" />
              <Metric label="최고" value={formatReactionTime(stats.bestRT)} />
            </section>
          ) : (
            <section className="rounded-[14px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>아직 실행 기록이 없습니다</p>
              <p className="mt-1 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>첫 세션을 완료하면 반응 시간과 세션 기록이 여기에 표시됩니다.</p>
            </section>
          )}

          <section>
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--spm-font-display)' }}>최근 실행</h2>
              <Link href="/spokedu-master/report" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>설명 문구</Link>
            </div>
            {recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map((session) => (
                  <div key={session.id} className="rounded-[12px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                    <p className="truncate text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{session.drillName}</p>
                    <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>
                      {new Date(session.date).toLocaleDateString('ko-KR')} · {session.cueCount}회 · 평균 {formatReactionTime(session.avg)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <Link href={`/spokedu-master/spomove/session?drill=${defaultDrillId}`}
                className="flex items-center justify-between rounded-[14px] p-4"
                style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
                <span>
                  <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>아직 실행 기록이 없습니다</strong>
                  <span className="mt-1 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>첫 반응훈련을 시작해보세요.</span>
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
