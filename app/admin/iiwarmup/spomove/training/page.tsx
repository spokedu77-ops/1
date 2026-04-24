'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import catalog, {
  type Core5Series,
  type Core5Program,
  type Core5Stage,
  type SeriesCode,
} from '@/app/lib/spomove/core5Catalog';
import type { MemoryGameAutoLaunch } from '@/app/admin/memory-game/MemoryGameApp';

/* ─── MemoryGameApp: SSR 비활성, 클라이언트 전용 ─── */
const MemoryGameApp = dynamic(
  () => import('@/app/admin/memory-game/MemoryGameApp').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#020617', color: 'rgba(255,255,255,0.35)',
        fontFamily: 'sans-serif', fontSize: 12, letterSpacing: '0.14em', fontWeight: 600,
      }}>
        LOADING…
      </div>
    ),
  },
);

/* ─── design tokens ─── */
const T = {
  bg:          '#0a0a0a',
  surface:     '#111111',
  card:        '#161616',
  border:      'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.15)',
  muted:       'rgba(255,255,255,0.32)',
  text:        'rgba(255,255,255,0.88)',
  textDim:     'rgba(255,255,255,0.48)',
};

/* ─── 훈련 설정 타입 ─── */
type LaunchSettings = {
  speed: number;
  timeMode: 'time' | 'reps';
  duration: number;
  targetReps: number;
};

/* ─── 페이지 단계 ─── */
type PagePhase =
  | { tag: 'catalog' }
  | { tag: 'settings'; stage: Core5Stage; program: Core5Program; series: Core5Series }
  | { tag: 'training'; engine: { mode: string; level: number }; launch: LaunchSettings };

/* ══ TrainingPortal ── autoLaunch로 바로 훈련 시작 ══ */
function TrainingPortal({
  engine,
  launch,
  onClose,
}: {
  engine: { mode: string; level: number };
  launch: LaunchSettings;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const autoLaunch: MemoryGameAutoLaunch = {
    speed:      launch.speed,
    timeMode:   launch.timeMode,
    duration:   launch.duration,
    targetReps: launch.targetReps,
    warmup:     0,
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', flexDirection: 'column',
      background: '#020617',
    }}>
      <MemoryGameApp
        key={`${engine.mode}-${engine.level}-${launch.speed}-${launch.duration}-${launch.targetReps}`}
        initialMode={engine.mode}
        initialLevel={engine.level}
        autoLaunch={autoLaunch}
      />
      {/* 종료 버튼: 훈련 중 항상 접근 가능하도록 좌상단 고정 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="훈련 종료"
        style={{
          position: 'fixed', top: 10, left: 10, zIndex: 100000,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', letterSpacing: '0.06em',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.85)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)';
        }}
      >
        ✕ 종료
      </button>
    </div>,
    document.body,
  );
}

/* ══ SettingsPanel ── 새 UI로 훈련 설정 ══ */
function SettingsPanel({
  stage, program, series,
  onStart, onBack,
}: {
  stage: Core5Stage;
  program: Core5Program;
  series: Core5Series;
  onStart: (s: LaunchSettings) => void;
  onBack: () => void;
}) {
  const isReactTrain = stage.engine?.mode === 'reactTrain';

  const [speed,      setSpeed]      = useState(4.0);
  const [timeMode,   setTimeMode]   = useState<'time' | 'reps'>(isReactTrain ? 'time' : 'reps');
  const [duration,   setDuration]   = useState(60);
  const [targetReps, setTargetReps] = useState(20);

  const speedLabel = useMemo(() => {
    if (speed <= 2)     return '빠름';
    if (speed <= 4)     return '보통';
    if (speed <= 6)     return '약간 느림';
    return '느림';
  }, [speed]);

  const timePills  = [30, 60, 90, 120, 180];
  const repsPills  = [10, 20, 30, 50];

  const handleStart = useCallback(() => {
    onStart({ speed, timeMode, duration, targetReps });
  }, [speed, timeMode, duration, targetReps, onStart]);

  return (
    <div style={{
      background: T.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 상단 바 */}
      <header style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 24px',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: 'transparent', color: T.muted,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.06em',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderHover;
            (e.currentTarget as HTMLButtonElement).style.color = T.text;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
            (e.currentTarget as HTMLButtonElement).style.color = T.muted;
          }}
        >
          ← 목록
        </button>
        <span style={{ fontSize: 11, color: T.muted, letterSpacing: '0.12em', fontWeight: 600 }}>
          {series.code} · {program.programId} · STAGE {stage.stage}
        </span>
      </header>

      {/* 설정 카드 */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px 80px',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%', maxWidth: 480,
          display: 'flex', flexDirection: 'column', gap: 0,
        }}>

          {/* 스테이지 헤더 */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                padding: '3px 9px', borderRadius: 6,
                background: `${series.accent}18`, border: `1px solid ${series.accent}35`,
                fontSize: 10, fontWeight: 800, color: series.accent, letterSpacing: '0.1em',
              }}>
                {series.code}
              </span>
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, letterSpacing: '0.06em' }}>
                {program.title}
              </span>
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 900, color: T.text,
              margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              {stage.label}
            </h1>
            <p style={{ fontSize: 12, color: T.textDim, margin: '6px 0 0', letterSpacing: '0.03em' }}>
              STAGE {stage.stage} · {program.programId}
            </p>
          </div>

          {/* 구분선 */}
          <div style={{ height: 1, background: T.border, marginBottom: 28 }} />

          {/* ── 신호 속도 ── */}
          <section style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 800, color: T.muted,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                신호 속도
              </label>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: series.accent, fontVariantNumeric: 'tabular-nums' }}>
                  {speed.toFixed(1)}
                </span>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>초 / 신호</span>
                <span style={{
                  marginLeft: 6,
                  padding: '2px 8px', borderRadius: 5,
                  background: `${series.accent}18`, border: `1px solid ${series.accent}30`,
                  fontSize: 10, fontWeight: 700, color: series.accent, letterSpacing: '0.06em',
                }}>
                  {speedLabel}
                </span>
              </div>
            </div>

            {/* 슬라이더 */}
            <div style={{ position: 'relative' }}>
              <style>{`
                .spmt-slider {
                  -webkit-appearance: none;
                  width: 100%;
                  height: 4px;
                  border-radius: 2px;
                  outline: none;
                  cursor: pointer;
                  background: linear-gradient(
                    to right,
                    ${series.accent} 0%,
                    ${series.accent} ${((speed - 1) / 7) * 100}%,
                    rgba(255,255,255,0.1) ${((speed - 1) / 7) * 100}%,
                    rgba(255,255,255,0.1) 100%
                  );
                }
                .spmt-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 20px; height: 20px;
                  border-radius: 50%;
                  background: #fff;
                  box-shadow: 0 0 0 3px ${series.accent}60, 0 2px 8px rgba(0,0,0,0.5);
                  cursor: pointer;
                  transition: box-shadow 0.15s;
                }
                .spmt-slider::-webkit-slider-thumb:hover {
                  box-shadow: 0 0 0 5px ${series.accent}50, 0 2px 12px rgba(0,0,0,0.6);
                }
              `}</style>
              <input
                type="range"
                className="spmt-slider"
                min={1} max={8} step={0.5}
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>빠름</span>
                <span style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>느림</span>
              </div>
            </div>
          </section>

          {/* ── 분량 ── */}
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <label style={{
                fontSize: 11, fontWeight: 800, color: T.muted,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                분량
              </label>

              {/* 시간 / 횟수 토글 — reactTrain만 표시 */}
              {isReactTrain && (
                <div style={{
                  display: 'flex', gap: 2,
                  background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3,
                }}>
                  {(['time', 'reps'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTimeMode(m)}
                      style={{
                        padding: '4px 12px', borderRadius: 6,
                        background: timeMode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
                        border: 'none', color: timeMode === m ? T.text : T.muted,
                        fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', letterSpacing: '0.06em',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {m === 'time' ? '시간' : '횟수'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 분량 선택 pills */}
            {(isReactTrain ? timeMode === 'time' : false) ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {timePills.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDuration(s)}
                    style={{
                      flex: '1 1 auto', minWidth: 70,
                      padding: '11px 8px', borderRadius: 10,
                      border: `1.5px solid ${duration === s ? series.accent : T.border}`,
                      background: duration === s ? `${series.accent}16` : T.card,
                      color: duration === s ? series.accent : T.muted,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: duration === s ? 800 : 500,
                      cursor: 'pointer', letterSpacing: '0.02em',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                    }}
                  >
                    {s}초
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {repsPills.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetReps(r)}
                    style={{
                      flex: '1 1 auto', minWidth: 70,
                      padding: '11px 8px', borderRadius: 10,
                      border: `1.5px solid ${targetReps === r ? series.accent : T.border}`,
                      background: targetReps === r ? `${series.accent}16` : T.card,
                      color: targetReps === r ? series.accent : T.muted,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: targetReps === r ? 800 : 500,
                      cursor: 'pointer', letterSpacing: '0.02em',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                    }}
                  >
                    {r}회
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── 시작 버튼 ── */}
          <button
            type="button"
            onClick={handleStart}
            style={{
              width: '100%', padding: '17px 24px',
              borderRadius: 14, border: 'none',
              background: series.accent,
              color: '#000',
              fontFamily: 'inherit', fontSize: 15, fontWeight: 900,
              cursor: 'pointer', letterSpacing: '0.08em',
              boxShadow: `0 4px 24px ${series.accent}50`,
              transition: 'opacity 0.15s, transform 0.12s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px) scale(0.98)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
          >
            훈련 시작 ▶
          </button>

        </div>
      </div>
    </div>
  );
}

/* ─── SeriesBadge ─── */
function SeriesBadge({ code, accent }: { code: string; accent: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 40, height: 40, borderRadius: 10,
      background: `${accent}18`, border: `1px solid ${accent}40`,
      color: accent, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em',
      flexShrink: 0,
    }}>
      {code}
    </span>
  );
}

/* ─── StageChip ─── */
function StageChip({
  stage, label, engine, accent,
  onSelect,
}: Core5Stage & { accent: string; onSelect: (s: Core5Stage) => void }) {
  const ready = engine !== null;
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => { if (ready) onSelect({ stage, label, engine }); }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 10,
        background: T.card, border: `1px solid ${T.border}`,
        cursor: ready ? 'pointer' : 'default',
        opacity: ready ? 1 : 0.4,
        transition: 'border-color 0.15s, background 0.15s',
        fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        if (!ready) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent}60`;
        (e.currentTarget as HTMLButtonElement).style.background  = `${accent}0a`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = T.border;
        (e.currentTarget as HTMLButtonElement).style.background  = T.card;
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: ready ? `${accent}22` : 'rgba(255,255,255,0.06)',
        border: `1px solid ${ready ? `${accent}40` : T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono, monospace)', fontSize: 10, fontWeight: 700,
        color: ready ? accent : T.muted,
      }}>
        {stage}
      </span>
      <span style={{
        fontSize: 13, color: T.text, fontWeight: 500,
        flex: 1, lineHeight: 1.35, textAlign: 'left',
      }}>
        {label}
      </span>
      {ready ? (
        <span style={{ fontSize: 11, color: accent, opacity: 0.7, letterSpacing: '0.06em', fontWeight: 600 }}>▶</span>
      ) : (
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em' }}>SOON</span>
      )}
    </button>
  );
}

/* ─── ProgramCard ─── */
function ProgramCard({
  program, accent, series,
  onSelect,
}: {
  program: Core5Program;
  accent: string;
  series: Core5Series;
  onSelect: (stage: Core5Stage, program: Core5Program, series: Core5Series) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden',
      background: T.surface, transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = T.borderHover)}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = T.border)}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', background: 'transparent', border: 0,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: `${accent}14`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800, color: accent, letterSpacing: '0.05em',
        }}>
          {program.programId.split('-')[1]}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: T.muted, letterSpacing: '0.1em', marginBottom: 2, fontWeight: 600 }}>
            {program.programId}
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.3 }}>
            {program.title}
          </p>
        </div>
        <span style={{
          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.muted, fontSize: 12, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {program.stages.map(s => (
            <StageChip
              key={s.stage}
              {...s}
              accent={accent}
              onSelect={stage => onSelect(stage, program, series)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SeriesPanel ─── */
function SeriesPanel({
  series,
  onSelect,
}: {
  series: Core5Series;
  onSelect: (stage: Core5Stage, program: Core5Program, series: Core5Series) => void;
}) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <SeriesBadge code={series.code} accent={series.accent} />
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: T.muted, fontWeight: 700, marginBottom: 1 }}>
            {series.code}
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0, letterSpacing: '-0.01em' }}>
            {series.title}
          </h2>
          <p style={{ fontSize: 12, color: T.textDim, margin: 0 }}>{series.subtitle}</p>
        </div>
        <span style={{
          marginLeft: 'auto', padding: '3px 10px', borderRadius: 100,
          background: `${series.accent}14`, border: `1px solid ${series.accent}30`,
          fontSize: 11, fontWeight: 700, color: series.accent, letterSpacing: '0.06em',
        }}>
          {series.programs.length} PROGRAMS
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 10,
      }}>
        {series.programs.map(p => (
          <ProgramCard
            key={p.programId}
            program={p}
            accent={series.accent}
            series={series}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Series tab bar ─── */
const TABS: { code: SeriesCode | 'ALL'; label: string }[] = [
  { code: 'ALL', label: 'All'          },
  { code: 'SR',  label: 'Spatial'      },
  { code: 'IC',  label: 'Interference' },
  { code: 'RS',  label: 'Rule'         },
  { code: 'SM',  label: 'Memory'       },
  { code: 'RC',  label: 'Rhythm'       },
];

/* ══ Page ══ */
export default function SpomoveTrainingPage() {
  const [activeTab, setActiveTab] = useState<SeriesCode | 'ALL'>('ALL');
  const [phase, setPhase] = useState<PagePhase>({ tag: 'catalog' });

  const visibleSeries = useMemo(
    () => (activeTab === 'ALL' ? catalog : catalog.filter(s => s.code === activeTab)),
    [activeTab],
  );

  const totalPrograms = catalog.reduce((s, c) => s + c.programs.length, 0);
  const totalStages   = catalog.reduce(
    (s, c) => s + c.programs.reduce((a, p) => a + p.stages.length, 0), 0,
  );

  const handleSelect = useCallback(
    (stage: Core5Stage, program: Core5Program, series: Core5Series) => {
      setPhase({ tag: 'settings', stage, program, series });
    },
    [],
  );

  const handleStart = useCallback((launch: LaunchSettings) => {
    setPhase(prev => {
      if (prev.tag !== 'settings' || !prev.stage.engine) return prev;
      return { tag: 'training', engine: prev.stage.engine, launch };
    });
  }, []);

  /* ── 설정 패널 ── */
  if (phase.tag === 'settings') {
    return (
      <SettingsPanel
        stage={phase.stage}
        program={phase.program}
        series={phase.series}
        onStart={handleStart}
        onBack={() => setPhase({ tag: 'catalog' })}
      />
    );
  }

  /* ── 훈련 포털 (카탈로그 위에 오버레이) ── */
  return (
    <>
      {phase.tag === 'training' && (
        <TrainingPortal
          engine={phase.engine}
          launch={phase.launch}
          onClose={() => setPhase({ tag: 'catalog' })}
        />
      )}

      {/* ── 카탈로그 뷰 ── */}
      <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { transition: none !important; }
          }
          .spmt-tab:hover { background: rgba(255,255,255,0.06) !important; }
        `}</style>

        {/* header */}
        <header style={{
          borderBottom: `1px solid ${T.border}`, padding: '24px 32px 20px',
          position: 'sticky', top: 0, background: T.bg, zIndex: 20,
          backdropFilter: 'blur(20px)',
        }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', color: T.muted, fontWeight: 700, marginBottom: 4 }}>
                  SPOMOVE
                </p>
                <h1 style={{
                  fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: T.text,
                  margin: 0, letterSpacing: '-0.025em', lineHeight: 1,
                }}>
                  Training
                </h1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {([
                  { n: '5',                   label: 'SERIES'   },
                  { n: String(totalPrograms), label: 'PROGRAMS' },
                  { n: String(totalStages),   label: 'STAGES'   },
                ] as const).map(({ n, label }) => (
                  <div key={label} style={{
                    padding: '5px 12px', borderRadius: 100,
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'baseline', gap: 6,
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{n}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* tabs */}
            <nav style={{ display: 'flex', gap: 4, marginTop: 18, overflowX: 'auto' }}>
              {TABS.map(tab => {
                const series   = tab.code !== 'ALL' ? catalog.find(s => s.code === tab.code) : null;
                const accent   = series?.accent ?? 'rgba(255,255,255,0.6)';
                const isActive = activeTab === tab.code;
                return (
                  <button
                    key={tab.code}
                    type="button"
                    className="spmt-tab"
                    onClick={() => setActiveTab(tab.code)}
                    style={{
                      padding: '7px 16px', borderRadius: 9, border: 'none',
                      background: isActive
                        ? (series ? `${accent}20` : 'rgba(255,255,255,0.1)')
                        : 'transparent',
                      color: isActive ? (series ? accent : T.text) : T.muted,
                      fontWeight: isActive ? 700 : 500, fontSize: 13,
                      cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em',
                      outline: isActive
                        ? `1.5px solid ${series ? `${accent}50` : 'rgba(255,255,255,0.2)'}`
                        : 'none',
                      outlineOffset: 0,
                      transition: 'background 0.15s, color 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* catalog */}
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 32px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {visibleSeries.map(series => (
              <SeriesPanel key={series.code} series={series} onSelect={handleSelect} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
