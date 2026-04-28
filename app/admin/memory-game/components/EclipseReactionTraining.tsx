'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { getReactTrainPerfProfile, perfShadowMul, perfUseBackdropBlur } from '../lib/reactTrainPerf';

const BG = '#06060C';
const HUD_H = 60;

/** 0=RED(TL) 1=BLUE(TR) 2=GREEN(BL) 3=YELLOW(BR) */
const C = [
  { main: '#FF1744', rgb: '255,23,68', name: 'RED' },
  { main: '#2979FF', rgb: '41,121,255', name: 'BLUE' },
  { main: '#00E676', rgb: '0,230,118', name: 'GREEN' },
  { main: '#FFD600', rgb: '255,214,0', name: 'YELLOW' },
] as const;

const SPD_NAMES = ['매우 느림', '느림', '약간 느림', '보통', '약간 빠름', '빠름', '매우 빠름'];

const MIN_STIM_GAP_MS = 1000;

type Layout = {
  W: number;
  H: number;
  maxR: number;
  origins: Array<{ x: number; y: number }>;
};

type Eclipse = {
  ci: number;
  startMs: number;
  durationMs: number;
  fired: boolean;
  dead: boolean;
};

type Game = {
  running: boolean;
  timeLeft: number;
  spd: number;
  eclipses: Eclipse[];
  lastSpawn: number;
  spawnInt: number;
  eclipseDur: number;
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  lastStimAtMs: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtTime(sec: number) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function smoothstep(t: number) {
  // 0..1
  return t * t * (3 - 2 * t);
}

export type EclipseReactionProps = {
  durationSec: number;
  speedLevel: number; // 1..7
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function EclipseReactionTraining({ durationSec, speedLevel, onExit, onComplete }: EclipseReactionProps) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<Game | null>(null);
  const LRef = useRef<Layout | null>(null);

  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [hudTimeWarn, setHudTimeWarn] = useState(false);

  const lv = useMemo(() => clamp(speedLevel, 1, 7), [speedLevel]);
  const spName = SPD_NAMES[lv - 1] ?? '보통';

  const perfProfile = useMemo(() => getReactTrainPerfProfile(), []);
  const perfShadowMulVal = useMemo(() => perfShadowMul(perfProfile), [perfProfile]);
  const hudBackdropBlur = useMemo(() => perfUseBackdropBlur(perfProfile), [perfProfile]);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    if (g.raf != null) cancelAnimationFrame(g.raf);
    onExit();
  }, [onExit]);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) {
      clearInterval(g.timer);
      g.timer = null;
    }
    if (g.raf != null) {
      cancelAnimationFrame(g.raf);
      g.raf = null;
    }
    onComplete({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, [onComplete]);

  const updateHud = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    if (hudTimeRef.current) hudTimeRef.current.textContent = fmtTime(g.timeLeft);
    setHudTimeWarn(g.timeLeft <= 10);
    if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
    if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
  }, []);

  const fireStim = useCallback((ci: number) => {
    const g = gRef.current;
    if (!g) return;
    const now = performance.now();
    if (now - g.lastStimAtMs < MIN_STIM_GAP_MS) return;
    g.lastStimAtMs = now;

    g.stims++;
    g.combo++;
    if (g.combo > g.maxCombo) g.maxCombo = g.combo;
    g.laneCount[ci]++;
    if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
    if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);

    const lbl = labelRefs.current[ci];
    if (lbl) {
      lbl.classList.add('lit');
      clearTimeout((lbl as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t);
      (lbl as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => lbl.classList.remove('lit'), 250);
    }
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;

    const eclipseShadowBlur = Math.max(0, Math.round(24 * perfShadowMulVal));

    const resizeCv = () => {
      const w = cv.offsetWidth || window.innerWidth;
      const h = cv.offsetHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      cv.width = w;
      cv.height = h;
      LRef.current = {
        W: w,
        H: h,
        maxR: Math.sqrt(w * w + h * h),
        origins: [
          { x: 0, y: 0 },
          { x: w, y: 0 },
          { x: 0, y: h },
          { x: w, y: h },
        ],
      };
    };

    resizeCv();

    const g: Game = {
      running: true,
      timeLeft: durationSec,
      spd: lv,
      eclipses: [],
      lastSpawn: 0,
      spawnInt: 0,
      eclipseDur: 0,
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      lastStimAtMs: -Infinity,
      raf: null,
      timer: null,
    };
    gRef.current = g;

    // lv1: slow (3.5s), lv7: fast (1.2s)
    g.eclipseDur = Math.max(1200, 3500 - (lv - 1) * 383);
    // spawn interval: allow overlap a bit, but not too dense
    g.spawnInt = Math.max(900, Math.floor(g.eclipseDur * 0.75));
    g.lastSpawn = performance.now() - g.spawnInt;

    updateHud();
    g.timer = setInterval(() => {
      const gg = gRef.current;
      if (!gg || !gg.running) return;
      gg.timeLeft--;
      updateHud();
      if (gg.timeLeft <= 0) endGame();
    }, 1000);

    const drawBg = (ctx: CanvasRenderingContext2D, L: Layout) => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, L.W, L.H);
      // subtle corner hint
      for (let i = 0; i < 4; i++) {
        const o = L.origins[i]!;
        const sz = Math.min(L.W, L.H) * 0.07;
        const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, sz);
        grd.addColorStop(0, `rgba(${C[i].rgb},0.10)`);
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(o.x, o.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const spawnEclipse = (now: number, L: Layout) => {
      if (now - g.lastSpawn < g.spawnInt) return;
      const active = new Set(g.eclipses.filter((e) => !e.dead).map((e) => e.ci));
      const avail = [0, 1, 2, 3].filter((i) => !active.has(i));
      if (avail.length === 0) return;
      const ci = avail[Math.floor(Math.random() * avail.length)]!;
      g.eclipses.push({ ci, startMs: now, durationMs: g.eclipseDur, fired: false, dead: false });
      g.lastSpawn = now;
    };

    const updateEclipses = (ctx: CanvasRenderingContext2D, now: number, L: Layout) => {
      for (let i = g.eclipses.length - 1; i >= 0; i--) {
        const e = g.eclipses[i]!;
        const col = C[e.ci];
        const o = L.origins[e.ci]!;
        const t = clamp((now - e.startMs) / e.durationMs, 0, 1);
        const r = L.maxR * smoothstep(t);
        const triggerR = L.maxR * 0.58;

        if (!e.fired && r >= triggerR) {
          e.fired = true;
          e.dead = true;
          fireStim(e.ci);
        }
        if (t >= 1) e.dead = true;

        if (!e.dead) {
          ctx.save();
          const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
          grd.addColorStop(0, `rgba(${col.rgb}, 0.55)`);
          grd.addColorStop(0.65, `rgba(${col.rgb}, 0.35)`);
          grd.addColorStop(0.88, `rgba(${col.rgb}, 0.55)`);
          grd.addColorStop(0.95, `rgba(${col.rgb}, 0.90)`);
          grd.addColorStop(1, `rgba(${col.rgb}, 0.0)`);
          ctx.fillStyle = grd;
          ctx.shadowColor = col.main;
          ctx.shadowBlur = eclipseShadowBlur;
          ctx.beginPath();
          ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (e.dead) g.eclipses.splice(i, 1);
      }
    };

    const loop = (now: number) => {
      const gg = gRef.current;
      const L = LRef.current;
      if (!gg || !gg.running || !L) return;
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      drawBg(ctx, L);
      spawnEclipse(now, L);
      updateEclipses(ctx, now, L);

      gg.raf = requestAnimationFrame(loop);
    };

    g.raf = requestAnimationFrame(loop);

    const onResize = () => resizeCv();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      const gg = gRef.current;
      if (gg?.timer) clearInterval(gg.timer);
      if (gg?.raf != null) cancelAnimationFrame(gg.raf);
      if (gg) gg.running = false;
    };
  }, [durationSec, endGame, fireStim, lv, perfShadowMulVal, updateHud]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, overflow: 'hidden', zIndex: 300 }}>
      <style>{`
        .ecl-hud{position:absolute;top:0;left:0;right:0;height:${HUD_H}px;z-index:50;display:flex;align-items:stretch;background:rgba(6,6,12,.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(10px,2vw,26px);font-family:'Barlow Condensed',Noto Sans KR,sans-serif;}
        .ecl-cell{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(8px,1.8vw,20px);border-right:1px solid rgba(255,255,255,.05)}
        .ecl-cell.grow{flex:1;align-items:center;border-right:none}
        .ecl-k{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.25);text-transform:uppercase}
        .ecl-v{font-family:'Bebas Neue','Barlow Condensed',sans-serif;font-size:clamp(20px,3.2vw,30px);letter-spacing:.04em;color:#fff;line-height:1.1}
        @keyframes twarn{0%,100%{color:${C[0].main};text-shadow:0 0 12px ${C[0].main}}50%{color:#fff;text-shadow:none}}
        .ecl-warn{animation:twarn 1s ease-in-out infinite}
        .ecl-stop{align-self:center;margin-left:auto;padding:7px 15px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:.1em;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px}
        .ecl-stop:hover{background:rgba(255,255,255,.07);color:#fff}
        .ecl-lbl{position:absolute;font-family:'Bebas Neue',sans-serif;font-size:clamp(14px,2.5vw,24px);letter-spacing:.1em;pointer-events:none;z-index:35;opacity:.12;transition:opacity .06s}
        .ecl-lbl.lit{opacity:1}
      `}</style>
      {!hudBackdropBlur ? (
        <style>{`.ecl-hud{backdrop-filter:none;-webkit-backdrop-filter:none}`}</style>
      ) : null}

      <div className="ecl-hud">
        <div className="ecl-cell">
          <div className="ecl-k">Time</div>
          <div className={`ecl-v${hudTimeWarn ? ' ecl-warn' : ''}`} ref={hudTimeRef} />
        </div>
        <div className="ecl-cell">
          <div className="ecl-k">Stims</div>
          <div className="ecl-v" ref={hudStimsRef} />
        </div>
        <div className="ecl-cell grow">
          <div className="ecl-k">Mode</div>
          <div className="ecl-v" style={{ fontSize: 'clamp(14px,2.6vw,20px)' }}>
            ECLIPSE · {spName}
          </div>
        </div>
        <div className="ecl-cell" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="ecl-stop" onClick={stopGame}>
            STOP
          </button>
        </div>
      </div>

      <canvas ref={cvRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 20 }} />

      <div
        className="ecl-lbl"
        style={{ top: HUD_H + 10, left: 14, color: C[0].main }}
        ref={(el) => {
          labelRefs.current[0] = el;
        }}
      >
        RED
      </div>
      <div
        className="ecl-lbl"
        style={{ top: HUD_H + 10, right: 14, color: C[1].main }}
        ref={(el) => {
          labelRefs.current[1] = el;
        }}
      >
        BLU
      </div>
      <div
        className="ecl-lbl"
        style={{ bottom: 14, left: 14, color: C[2].main }}
        ref={(el) => {
          labelRefs.current[2] = el;
        }}
      >
        GRN
      </div>
      <div
        className="ecl-lbl"
        style={{ bottom: 14, right: 14, color: C[3].main }}
        ref={(el) => {
          labelRefs.current[3] = el;
        }}
      >
        YEL
      </div>

      {/* HUD 초기값 */}
      <div style={{ display: 'none' }}>{/* hydration-safe */}</div>
    </div>
  );
}

