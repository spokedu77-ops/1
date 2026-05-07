'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import type { ReactTrainCompleteStats } from './VisualReactionTraining';

const C = [
  { main: '#FF1744', rgb: '255,23,68', name: 'RED' },
  { main: '#FFD600', rgb: '255,214,0', name: 'YEL' },
  { main: '#2979FF', rgb: '41,121,255', name: 'BLU' },
  { main: '#00E676', rgb: '0,230,118', name: 'GRN' },
] as const;

type SweepParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  dec: number;
  r: number;
};

type SweepState = {
  running: boolean;
  timeLeft: number;
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  lineDur: number;
  lineStart: number;
  lineX: number;
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
  playTop: number;
  playBottom: number;
  playH: number;
  colorLastFired: [number, number, number, number];
  colColors: number[];
  particles: SweepParticle[];
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

const css = `
.swt{--bg:#06060C;position:fixed;inset:0;background:var(--bg);color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.swt,.swt *{box-sizing:border-box}
.swt-hud{height:72px;display:flex;align-items:stretch;background:rgba(6,6,12,.94);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30}
.swt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.swt-hc.grow{flex:1;align-items:center;border-right:none}
.swt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.swt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.swt-hv.warn{animation:swtw .5s ease-in-out infinite}
@keyframes swtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.swt-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer}
.swt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.swt-play{position:relative;flex:1;min-height:0}
.swt-cv{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:10}
.swt-pads{position:absolute;bottom:0;left:0;right:0;height:clamp(72px,10vh,90px);z-index:20;display:flex;border-top:2px solid rgba(255,255,255,.06)}
.swt-pad{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;border-right:1px solid rgba(255,255,255,.04);transition:background .06s}
.swt-pad:last-child{border-right:none}
.swt-pad-dot{width:clamp(6px,1.2vw,10px);height:clamp(6px,1.2vw,10px);border-radius:50%;opacity:.18;transition:all .06s}
.swt-pad-label{font-family:Bebas Neue,sans-serif;font-size:clamp(12px,2vw,18px);letter-spacing:.1em;opacity:.2;transition:opacity .06s}
.swt-pad[data-c="0"] .swt-pad-dot,.swt-pad[data-c="0"] .swt-pad-label{background:#FF1744;color:#FF1744}
.swt-pad[data-c="1"] .swt-pad-dot,.swt-pad[data-c="1"] .swt-pad-label{background:#FFD600;color:#FFD600}
.swt-pad[data-c="2"] .swt-pad-dot,.swt-pad[data-c="2"] .swt-pad-label{background:#2979FF;color:#2979FF}
.swt-pad[data-c="3"] .swt-pad-dot,.swt-pad[data-c="3"] .swt-pad-label{background:#00E676;color:#00E676}
.swt-pad.lit .swt-pad-dot{opacity:1;box-shadow:0 0 14px 3px currentColor;transform:scale(1.5)}
.swt-pad.lit .swt-pad-label{opacity:1}
.swt-combo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.7);z-index:40;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.swt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.swt-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,12vw,110px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
.swt-combo-w{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.4)}
`;

type Props = {
  durationSec: number;
  speedLevel: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i];
    out[i] = out[j] as T;
    out[j] = t as T;
  }
  return out;
}

export function SweepReactionTraining({ durationSec, speedLevel, onExit, onComplete }: Props) {
  const uid = useId();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SweepState | null>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const padRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [warn, setWarn] = useState(false);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    if (g.raf != null) cancelAnimationFrame(g.raf);
    onExit();
  }, [onExit]);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    if (g.raf != null) cancelAnimationFrame(g.raf);
    onComplete({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, [onComplete]);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const lv = Math.max(1, Math.min(7, Math.round(speedLevel)));
    // 원본(5000~1800ms) 대비 1.5배 느리게: 7500~2700ms
    const lineDur = Math.max(2700, 7500 - (lv - 1) * 800);

    const g: SweepState = {
      running: true,
      timeLeft: Math.max(1, durationSec),
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      lineDur,
      lineStart: performance.now(),
      lineX: 0,
      cols: 12,
      rows: 6,
      tileW: 50,
      tileH: 50,
      playTop: 72,
      playBottom: 0,
      playH: 0,
      colorLastFired: [-1, -1, -1, -1],
      colColors: [],
      particles: [],
      raf: null,
      timer: null,
    };
    gRef.current = g;

    const rebuildField = () => {
      const order = shuffle([0, 1, 2, 3]);
      g.colColors = [];
      for (let i = 0; i < 4; i++) {
        const start = Math.round((g.cols * i) / 4);
        const end = Math.round((g.cols * (i + 1)) / 4);
        const ci = order[i] ?? 0;
        for (let c = start; c < end; c++) g.colColors[c] = ci;
      }
    };

    const resize = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      cv.width = w;
      cv.height = h;
      const padH = Math.max(72, Math.min(90, h * 0.1));
      g.playTop = 72;
      g.playBottom = h - padH;
      g.playH = g.playBottom - g.playTop;
      g.cols = Math.max(8, Math.round(w / 62));
      g.rows = Math.max(4, Math.round(g.playH / 62));
      g.tileW = w / g.cols;
      g.tileH = g.playH / g.rows;
      rebuildField();
    };

    const setHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };

    const flashPad = (lane: number) => {
      const pad = padRefs.current[lane];
      if (!pad) return;
      pad.classList.add('lit');
      const p = pad as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
      clearTimeout(p._t);
      p._t = setTimeout(() => pad.classList.remove('lit'), 260);
    };

    const spawnBurst = (x: number, y: number, color: string) => {
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 7;
        g.particles.push({
          x,
          y: y + (Math.random() - 0.5) * g.playH,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          color,
          life: 1,
          dec: 0.025 + Math.random() * 0.02,
          r: 2 + Math.random() * 4,
        });
      }
    };

    const onStim = (lane: number, col: number) => {
      g.stims += 1;
      g.combo += 1;
      g.laneCount[lane] += 1;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
      flashPad(lane);
      const cx = (col + 0.5) * g.tileW;
      const my = g.playTop + g.playH / 2;
      spawnBurst(cx, my, C[lane]?.main ?? '#fff');

      if (g.combo >= 5 && g.combo % 5 === 0 && comboRef.current && comboNRef.current) {
        comboNRef.current.textContent = String(g.combo);
        comboRef.current.classList.remove('show');
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = comboRef.current;
            if (!el) return;
            el.classList.add('show');
            const r = el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
            clearTimeout(r._t);
            r._t = setTimeout(() => el.classList.remove('show'), 650);
          })
        );
      }
    };

    const drawField = () => {
      for (let c = 0; c < g.cols; c++) {
        const ci = g.colColors[c] ?? 0;
        const x = c * g.tileW;
        const isPast = x + g.tileW < g.lineX;
        const isLine = x <= g.lineX && g.lineX < x + g.tileW;
        const alpha = isPast ? 0.12 : 0.5;
        for (let r = 0; r < g.rows; r++) {
          const y = g.playTop + r * g.tileH;
          ctx.fillStyle = `rgba(${C[ci].rgb},${alpha})`;
          ctx.fillRect(x + 2, y + 2, Math.max(2, g.tileW - 4), Math.max(2, g.tileH - 4));
        }
        if (isLine) {
          ctx.save();
          ctx.shadowColor = C[ci].main;
          ctx.shadowBlur = 30;
          ctx.fillStyle = `rgba(${C[ci].rgb},0.25)`;
          ctx.fillRect(x, g.playTop, g.tileW, g.playH);
          ctx.restore();
        }
      }
    };

    const drawTimeline = () => {
      const x = g.lineX;
      ctx.save();
      const trailW = Math.min(x, 90);
      const tg = ctx.createLinearGradient(x - trailW, 0, x, 0);
      tg.addColorStop(0, 'transparent');
      tg.addColorStop(1, 'rgba(255,255,255,0.08)');
      ctx.fillStyle = tg;
      ctx.fillRect(x - trailW, g.playTop, trailW, g.playH);

      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 22;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(x - 1, g.playTop, 3, g.playH);
      ctx.restore();
    };

    const checkLineHits = () => {
      const col = Math.floor(g.lineX / g.tileW);
      if (col < 0 || col >= g.cols) return;
      const ci = g.colColors[col] ?? 0;
      if (g.colorLastFired[ci] !== -1) return;
      g.colorLastFired[ci] = col;
      onStim(ci, col);
    };

    const updateParticles = () => {
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.vx *= 0.97;
        p.life -= p.dec;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    };

    const drawTopFade = () => {
      const grd = ctx.createLinearGradient(0, 0, 0, 110);
      grd.addColorStop(0, '#06060C');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cv.width, 110);
    };

    const loop = (now: number) => {
      if (!g.running) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const elapsed = now - g.lineStart;
      const progress = elapsed / g.lineDur;
      g.lineX = progress * cv.width;
      if (g.lineX >= cv.width) {
        g.lineStart = now;
        g.lineX = 0;
        g.colorLastFired = [-1, -1, -1, -1];
        rebuildField();
      }

      drawField();
      checkLineHits();
      drawTimeline();
      updateParticles();
      drawTopFade();
      g.raf = requestAnimationFrame(loop);
    };

    resize();
    setHudTime();
    if (hudStimsRef.current) hudStimsRef.current.textContent = '0';
    if (hudMaxRef.current) hudMaxRef.current.textContent = '0';

    g.timer = setInterval(() => {
      g.timeLeft -= 1;
      setHudTime();
      if (g.timeLeft <= 0) endGame();
    }, 1000);
    g.raf = requestAnimationFrame(loop);

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
    };
  }, [durationSec, endGame, speedLevel]);

  return (
    <div className="swt">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');",
        }}
      />
      <style>{css}</style>
      <div className="swt-hud">
        <div className="swt-hc">
          <div className="swt-hk">Time</div>
          <div ref={hudTimeRef} className={`swt-hv${warn ? ' warn' : ''}`} />
        </div>
        <div className="swt-hc">
          <div className="swt-hk">Stims</div>
          <div ref={hudStimsRef} className="swt-hv" />
        </div>
        <div className="swt-hc grow">
          <div className="swt-hk">Max Streak</div>
          <div ref={hudMaxRef} className="swt-hv" />
        </div>
        <div className="swt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="swt-stop" onClick={stopGame}>
            STOP
          </button>
        </div>
      </div>

      <div ref={playRef} className="swt-play">
        <canvas ref={cvRef} className="swt-cv" />
        <div className="swt-pads">
          {[0, 1, 2, 3].map((lane) => (
            <div
              key={uid + 'p' + lane}
              className="swt-pad"
              data-c={lane}
              ref={(el) => {
                padRefs.current[lane] = el;
              }}
            >
              <div className="swt-pad-dot" />
              <div className="swt-pad-label">{C[lane].name}</div>
            </div>
          ))}
        </div>

        <div className="swt-combo" ref={comboRef}>
          <div className="swt-combo-n" ref={comboNRef}>
            0
          </div>
          <div className="swt-combo-w">COMBO</div>
        </div>
      </div>
    </div>
  );
}
