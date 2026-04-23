'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo } from 'react';
import catalog, {
  type Core5Series,
  type Core5Program,
  type Core5Stage,
  type SeriesCode,
} from '@/app/lib/spomove/core5Catalog';

/* ─── lazy-load MemoryGameApp (SSR 불가) ─── */
const MemoryGameApp = dynamic(
  () => import('@/app/admin/memory-game/MemoryGameApp').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#020617', color: 'rgba(255,255,255,0.5)',
        fontFamily: 'sans-serif', fontSize: 14, letterSpacing: '0.1em',
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

type LaunchedEngine = { mode: string; level: number };

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

/* ─── StageChip — button, not Link ─── */
function StageChip({
  stage, label, engine, accent, onLaunch,
}: Core5Stage & { accent: string; onLaunch: (e: LaunchedEngine) => void }) {
  const ready = engine !== null;
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={() => ready && onLaunch(engine)}
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
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}60`;
        (e.currentTarget as HTMLElement).style.background  = `${accent}0a`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = T.border;
        (e.currentTarget as HTMLElement).style.background  = T.card;
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
      <span style={{ fontSize: 13, color: T.text, fontWeight: 500, flex: 1, lineHeight: 1.35, textAlign: 'left' }}>
        {label}
      </span>
      {ready ? (
        <span style={{ fontSize: 11, color: accent, opacity: 0.7, letterSpacing: '0.06em', fontWeight: 600 }}>
          ▶
        </span>
      ) : (
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em' }}>SOON</span>
      )}
    </button>
  );
}

/* ─── ProgramCard ─── */
function ProgramCard({
  program, accent, onLaunch,
}: { program: Core5Program; accent: string; onLaunch: (e: LaunchedEngine) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
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
            <StageChip key={s.stage} {...s} accent={accent} onLaunch={onLaunch} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── SeriesPanel ─── */
function SeriesPanel({
  series, onLaunch,
}: { series: Core5Series; onLaunch: (e: LaunchedEngine) => void }) {
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
          <ProgramCard key={p.programId} program={p} accent={series.accent} onLaunch={onLaunch} />
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
  const [activeTab,  setActiveTab]  = useState<SeriesCode | 'ALL'>('ALL');
  const [launched,   setLaunched]   = useState<LaunchedEngine | null>(null);

  const visibleSeries = useMemo(
    () => (activeTab === 'ALL' ? catalog : catalog.filter(s => s.code === activeTab)),
    [activeTab],
  );

  const totalPrograms = catalog.reduce((s, c) => s + c.programs.length, 0);
  const totalStages   = catalog.reduce(
    (s, c) => s + c.programs.reduce((a, p) => a + p.stages.length, 0), 0,
  );

  /* 훈련 종료(결과 확인 후 홈 버튼 등) → 카탈로그로 복귀 */
  const handleExit = () => setLaunched(null);

  /* ── MemoryGameApp 풀스크린 오버레이 ── */
  if (launched) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        {/* thin back bar */}
        <div style={{
          height: 44, flexShrink: 0,
          display: 'flex', alignItems: 'center', paddingLeft: 16,
          background: 'rgba(2,6,23,0.96)', borderBottom: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(16px)', zIndex: 10000,
        }}>
          <button
            type="button"
            onClick={handleExit}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: 'rgba(255,255,255,0.55)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            ← Training
          </button>
        </div>
        {/* MemoryGameApp */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <MemoryGameApp
            initialMode={launched.mode}
            initialLevel={launched.level}
          />
        </div>
      </div>
    );
  }

  /* ── 카탈로그 뷰 ── */
  return (
    <div style={{ background: T.bg, minHeight: '100vh', paddingBottom: 80 }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition: none !important; }
        }
        .spmt-tab:hover { background: rgba(255,255,255,0.06) !important; }
      `}</style>

      {/* ── header ── */}
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
              const series    = tab.code !== 'ALL' ? catalog.find(s => s.code === tab.code) : null;
              const accent    = series?.accent ?? 'rgba(255,255,255,0.6)';
              const isActive  = activeTab === tab.code;
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

      {/* ── catalog ── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '36px 32px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {visibleSeries.map(series => (
            <SeriesPanel key={series.code} series={series} onLaunch={setLaunched} />
          ))}
        </div>
      </main>
    </div>
  );
}
