'use client';

import Link from 'next/link';
import {
  Brain,
  ChevronRight,
  Goal,
  Maximize,
  MonitorPlay,
  Play,
  Smartphone,
  Sparkles,
  TimerReset,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Drill } from '../types';
import { formatReactionTime } from '../lib/utils';
import { useIsPro, useMasterStore, useStats } from '../store';

function getDrillIntent(drill: Drill) {
  const text = `${drill.name} ${drill.category}`;
  if (/기억|Memory|인지|집중|pattern|spatial/i.test(text)) return '기억 · 집중';
  if (/방향|전환|Diagonal|flow/i.test(text)) return '방향 전환';
  if (/속도|스피드|반응|Visual|Reaction|순발/i.test(text)) return '순발 반응';
  if (/팀|협동|릴레이/i.test(text)) return '협동 반응';
  return '몰입 전환';
}

function getDrillsByIntent(drills: Drill[], intent: string) {
  const matcher: Record<string, RegExp> = {
    warmup: /반응|속도|스피드|Visual|Reaction|순발|SR/i,
    transition: /방향|전환|Diagonal|flow|공간/i,
    finish: /기억|Memory|인지|집중|pattern|spatial|리듬|RC|SM/i,
  };
  const re = matcher[intent] ?? /./;
  const matched = drills.filter((drill) => re.test(`${drill.id} ${drill.name} ${drill.category} ${drill.engine?.mode ?? ''}`));
  return (matched.length ? matched : drills).slice(0, 3);
}

const DRILL_GRADIENTS = [
  'linear-gradient(145deg,#111827 0%,#312e81 52%,#4f46e5 100%)',
  'linear-gradient(145deg,#052e16 0%,#064e3b 52%,#059669 100%)',
  'linear-gradient(145deg,#150b2e 0%,#1e1b4b 52%,#7c3aed 100%)',
  'linear-gradient(145deg,#3f0000 0%,#7f1d1d 52%,#be123c 100%)',
];

function DrillCard({ drill, index, isLocked }: { drill: Drill; index: number; isLocked: boolean }) {
  return (
    <Link
      href={isLocked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
      className="relative flex min-h-[164px] flex-col justify-between overflow-hidden rounded-[18px] p-4 active:scale-[0.98]"
      style={{ background: DRILL_GRADIENTS[index % DRILL_GRADIENTS.length], border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 14px 34px rgba(0,0,0,0.28)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-[13px]" style={{ background: 'rgba(255,255,255,0.13)' }}>
          <Zap size={17} color="#fff" />
        </span>
        <span className="rounded-full px-2.5 py-1 text-[9px] font-black text-white/62" style={{ background: 'rgba(0,0,0,0.32)' }}>
          {drill.category}
        </span>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/45">{getDrillIntent(drill)}</p>
        <h2 className="mt-1 text-[18px] font-black leading-tight text-white" style={{ fontFamily: 'var(--spm-font-display)', wordBreak: 'keep-all' }}>{drill.name}</h2>
      </div>
      <div className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.16)' }}>
        <Play size={13} fill="#fff" color="#fff" />
      </div>
      {isLocked ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[18px] bg-black/62 backdrop-blur-[3px]">
          <span className="rounded-[10px] px-3 py-1.5 text-[10px] font-black" style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.28)', color: 'var(--spm-amb)' }}>PRO</span>
        </div>
      ) : null}
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
      <p className="text-[21px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: tone ?? 'var(--spm-t)' }}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{label}</p>
    </div>
  );
}

function IntentRow({ id, title, caption, icon: Icon, tone, drills, isPro }: {
  id: string;
  title: string;
  caption: string;
  icon: LucideIcon;
  tone: string;
  drills: Drill[];
  isPro: boolean;
}) {
  if (!drills.length) return null;
  const firstDrill = drills[0]!;
  const firstLocked = firstDrill.isPro && !isPro;

  return (
    <section id={id} className="scroll-mt-4 overflow-hidden rounded-[20px]" style={{ background: 'var(--spm-s1)', border: '1px solid var(--spm-br2)' }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--spm-br)' }}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: `${tone}20`, border: `1px solid ${tone}28` }}>
          <Icon size={19} color={tone} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{title}</h2>
          <p className="mt-0.5 text-[12px] font-semibold leading-5" style={{ color: 'var(--spm-t3)' }}>{caption}</p>
        </div>
        {!firstLocked ? (
          <Link
            href={`/spokedu-master/spomove/session?drill=${firstDrill.id}&mode=projector`}
            className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12px] font-black sm:flex"
            style={{ background: `${tone}18`, color: tone, border: `1px solid ${tone}28` }}
          >
            <Play size={12} fill={tone} /> 바로 실행
          </Link>
        ) : null}
      </div>

      <div className="grid gap-2 p-4 md:grid-cols-3">
        {drills.map((drill) => {
          const locked = drill.isPro && !isPro;
          return (
            <Link
              key={`${id}-${drill.id}`}
              href={locked ? '/spokedu-master/payment?plan=pro' : `/spokedu-master/spomove/session?drill=${drill.id}&mode=projector`}
              className="flex items-center gap-3 rounded-[15px] p-3.5 active:scale-[0.99]"
              style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]" style={{ background: `${tone}18` }}>
                <Zap size={17} color={tone} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[14px] font-black" style={{ color: 'var(--spm-t)' }}>{drill.name}</strong>
                <span className="mt-0.5 block text-[11px] font-semibold" style={{ color: 'var(--spm-t3)' }}>
                  {locked ? 'PRO 필요' : getDrillIntent(drill)}
                </span>
              </span>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: `${tone}18` }}>
                {locked ? <span className="text-[9px] font-black" style={{ color: tone }}>PRO</span> : <Play size={12} fill={tone} color={tone} />}
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
  const defaultDrillId = drills[0]?.id ?? 'SR-05';

  const warmupDrills = getDrillsByIntent(drills, 'warmup');
  const transitionDrills = getDrillsByIntent(drills, 'transition');
  const finishDrills = getDrillsByIntent(drills, 'finish');

  return (
    <div className="h-full overflow-y-auto pb-8" style={{ background: 'var(--spm-bg)' }}>
      <header className="px-[18px] pb-5 pt-[22px] sm:px-8 lg:px-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--spm-t3)' }}>screen movement engine</p>
        <h1 className="mt-1 text-[34px] font-black md:text-[46px]" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>SPOMOVE</h1>
        <p className="mt-2 max-w-[720px] text-[13px] font-medium leading-6 sm:text-[14px]" style={{ color: 'var(--spm-t2)' }}>
          설치 없이 브라우저에서 실행하는 화면 기반 반응훈련입니다. 모바일은 개인 반응 측정, 빔·TV·태블릿은 수업 전체가 함께 보는 큰 화면 활동으로 전환됩니다.
        </p>
      </header>

      <div className="grid gap-7 px-[18px] sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10">
        <main className="space-y-6">
          <section>
            <Link
              href={`/spokedu-master/spomove/session?drill=${defaultDrillId}&mode=projector`}
              className="flex min-h-[170px] items-center justify-between gap-4 overflow-hidden rounded-[24px] px-6 py-6 active:scale-[0.99] sm:px-8"
              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.96),rgba(139,92,246,0.82),rgba(236,72,153,0.62))', boxShadow: '0 24px 62px rgba(99,102,241,0.3)' }}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/55">quick start · projector mode</p>
                <h2 className="mt-2 text-[30px] font-black leading-tight text-white sm:text-[40px]" style={{ fontFamily: 'var(--spm-font-display)', letterSpacing: 0 }}>지금 큰 화면으로 실행</h2>
                <p className="mt-2 max-w-[560px] text-[13px] font-semibold leading-5 text-white/66">빔, TV, 태블릿에 띄우면 학생들이 신호를 보고 함께 움직입니다. 수업 전환, 워밍업, 마무리에 바로 씁니다.</p>
              </div>
              <span className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>
                <Play size={25} fill="#fff" color="#fff" />
              </span>
            </Link>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { href: `?drill=${defaultDrillId}&mode=projector`, Icon: MonitorPlay, label: '큰 화면', color: '#818cf8' },
                { href: `?drill=${defaultDrillId}&mode=mobile`, Icon: Smartphone, label: '모바일', color: '#10b981' },
                { href: `?drill=${defaultDrillId}&mode=class`, Icon: Maximize, label: '수업 모드', color: '#f59e0b' },
              ].map(({ href, Icon, label, color }) => (
                <Link
                  key={label}
                  href={`/spokedu-master/spomove/session${href}`}
                  className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] text-[12px] font-bold"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)', color: 'var(--spm-t)' }}
                >
                  <Icon size={15} color={color} />{label}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-1.5">
              <Sparkles size={13} color="var(--spm-amb)" />
              <p className="text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--spm-t3)' }}>right now flow</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '도입', sub: '3분 집중 전환', href: '#warmup', tone: '#818cf8', Icon: TimerReset },
                { label: '중간', sub: '반응 전환', href: '#transition', tone: '#10b981', Icon: Goal },
                { label: '마무리', sub: '참여 게임', href: '#finish', tone: '#f59e0b', Icon: Brain },
              ].map(({ label, sub, href, tone, Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-[15px] py-4 text-center active:scale-[0.98]"
                  style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-[11px]" style={{ background: `${tone}18` }}>
                    <Icon size={16} color={tone} />
                  </span>
                  <strong className="text-[13px]" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>{label}</strong>
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--spm-t3)' }}>{sub}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[20px] font-black" style={{ color: 'var(--spm-t)', fontFamily: 'var(--spm-font-display)' }}>수업 흐름별 SPOMOVE</h2>
              <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>드릴 목록이 아니라 수업 타이밍 기준</span>
            </div>
            <IntentRow id="warmup" title="도입 3분 집중 전환" caption="수업 시작 전 시선과 움직임을 한 번에 모읍니다." icon={TimerReset} tone="#818cf8" drills={warmupDrills} isPro={isPro} />
            <IntentRow id="transition" title="수업 중 반응 전환" caption="흐트러진 분위기를 신호, 방향, 순발 활동으로 다시 끌어올립니다." icon={Goal} tone="#10b981" drills={transitionDrills} isPro={isPro} />
            <IntentRow id="finish" title="마무리 참여 게임" caption="기억, 집중, 판단 활동으로 마지막까지 참여감을 유지합니다." icon={Brain} tone="#f59e0b" drills={finishDrills} isPro={isPro} />
          </section>

          <section>
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>전체 실행 모드</h2>
              <span className="text-[12px] font-medium" style={{ color: 'var(--spm-t3)' }}>{drills.length}개</span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {drills.map((drill, index) => (
                <DrillCard key={drill.id} drill={drill} index={index} isLocked={drill.isPro && !isPro} />
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[18px] p-5" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.14),var(--spm-s2))', border: '1px solid rgba(16,185,129,0.24)' }}>
            <MonitorPlay size={20} color="var(--spm-grn)" />
            <h2 className="mt-3 text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)', color: 'var(--spm-t)', letterSpacing: 0 }}>수업 공간에 맞게 실행합니다</h2>
            <p className="mt-2 text-[12px] font-medium leading-6" style={{ color: 'var(--spm-t2)' }}>
              모바일은 개인 반응, 큰 화면은 전체 참여, 수업 모드는 결과 노출을 줄인 몰입형 실행에 맞췄습니다.
            </p>
          </section>

          {stats.totalSessions > 0 ? (
            <section className="grid grid-cols-3 gap-2">
              <Metric label="세션" value={String(stats.totalSessions)} />
              <Metric label="평균" value={formatReactionTime(stats.avgRT)} tone="var(--spm-grn)" />
              <Metric label="최고" value={formatReactionTime(stats.bestRT)} />
            </section>
          ) : (
            <section className="rounded-[15px] p-4" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}>
              <p className="text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>아직 실행 기록이 없습니다</p>
              <p className="mt-1 text-[11px] font-medium leading-5" style={{ color: 'var(--spm-t3)' }}>첫 세션을 완료하면 반응 시간과 실행 기록이 여기에 표시됩니다.</p>
            </section>
          )}

          <section>
            <div className="mb-[14px] flex items-baseline justify-between">
              <h2 className="text-[18px] font-black" style={{ fontFamily: 'var(--spm-font-display)' }}>최근 실행</h2>
              <Link href="/spokedu-master/report" className="text-[12px] font-bold" style={{ color: 'var(--spm-acc)' }}>설명 문구</Link>
            </div>
            {recent.length > 0 ? (
              <div className="space-y-2">
                {recent.map((session) => (
                  <div key={session.id} className="rounded-[13px] p-3" style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br)' }}>
                    <p className="truncate text-[13px] font-bold" style={{ color: 'var(--spm-t)' }}>{session.drillName}</p>
                    <p className="mt-1 text-[10px] font-medium" style={{ color: 'var(--spm-t3)' }}>
                      {new Date(session.date).toLocaleDateString('ko-KR')} · {session.cueCount}회 · 평균 {formatReactionTime(session.avg)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <Link
                href={`/spokedu-master/spomove/session?drill=${defaultDrillId}`}
                className="flex items-center justify-between rounded-[15px] p-4"
                style={{ background: 'var(--spm-s2)', border: '1px solid var(--spm-br2)' }}
              >
                <span>
                  <strong className="block text-[14px]" style={{ color: 'var(--spm-t)' }}>첫 반응훈련을 시작해보세요</strong>
                  <span className="mt-1 block text-[12px]" style={{ color: 'var(--spm-t3)' }}>기록은 수업 설명과 리포트의 근거가 됩니다.</span>
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
