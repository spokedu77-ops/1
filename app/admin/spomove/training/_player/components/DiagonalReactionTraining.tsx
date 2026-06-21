'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';
import { normalizeReactSpeedSec, speedSecToMs } from '../lib/reactTrainTiming';

const HUD_H = 64;
const BG = '#06060E';

/** 0 빨 TL · 1 파 TR · 2 초 BL · 3 노 BR */
const C = [
  { main: '#FF1744', rgb: '255,23,68' },
  { main: '#2979FF', rgb: '41,121,255' },
  { main: '#00E676', rgb: '0,230,118' },
  { main: '#FFD600', rgb: '255,214,0' },
] as const;

type LayoutState = {
  W: number;
  H: number;
  cx: number;
  cy: number;
  padSize: number;
  gap: number;
  pads: { x: number; y: number }[];
  corners: { x: number; y: number }[];
  half: number;
};

type Shockwave = {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  rgb: string;
  life: number;
  delay: number;
};

type GameState = {
  running: boolean;
  timeLeft: number;
  spd: number;
  speedSec: number;
  tiles: Tile[];
  particles: (Particle | MeteorSpark)[];
  shockwaves: Shockwave[];
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  spawnInt: number;
  lastSpawn: number;
  /** 마지막으로 applyAccel이 발생한 초(s) — 중복 실행 방지 */
  lastAccelSec: number;
  /** RAF 기준 세션 시작 타임스탬프 (ms) */
  startAtMs: number;
  /** 세션 종료 타임스탬프 (ms) — setInterval 대신 RAF 루프에서 체크 */
  endsAtMs: number;
  baseSpeedMult: number;
  raf: number | null;
  padPulse: number[];
};

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === 'function') {
    (ctx as CanvasRenderingContext2D & { roundRect: (a: number, b: number, c: number, d: number, e: number) => void }).roundRect(
      x,
      y,
      w,
      h,
      rr
    );
  } else {
    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;
    ctx.moveTo(x0 + rr, y0);
    ctx.lineTo(x1 - rr, y0);
    ctx.quadraticCurveTo(x1, y0, x1, y0 + rr);
    ctx.lineTo(x1, y1 - rr);
    ctx.quadraticCurveTo(x1, y1, x1 - rr, y1);
    ctx.lineTo(x0 + rr, y1);
    ctx.quadraticCurveTo(x0, y1, x0, y1 - rr);
    ctx.lineTo(x0, y0 + rr);
    ctx.quadraticCurveTo(x0, y0, x0 + rr, y0);
  }
  ctx.closePath();
}

class MeteorSpark {
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  dec: number;
  r: number;
  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const spread = (Math.random() - 0.5) * 2.2;
    this.vx = spread * 0.8 + (Math.random() - 0.5) * 0.5;
    this.vy = spread * 0.8 + (Math.random() - 0.5) * 0.5;
    this.life = 0.6 + Math.random() * 0.4;
    this.dec = 0.045 + Math.random() * 0.03;
    this.r = 1.2 + Math.random() * 2.2;
  }
  update(deltaSec: number) {
    const t = deltaSec * 60;
    this.x += this.vx * t;
    this.y += this.vy * t;
    this.life -= this.dec * t;
    this.vx *= Math.pow(0.92, t);
    this.vy *= Math.pow(0.92, t);
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = this.life > 0.5 ? '#ffffff' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  dec: number;
  r: number;
  grav: number;
  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const a = Math.random() * Math.PI * 2;
    const spd = Math.random() * 11 + 3;
    this.vx = Math.cos(a) * spd;
    this.vy = Math.sin(a) * spd;
    this.life = 1;
    this.dec = Math.random() * 0.03 + 0.018;
    this.r = Math.random() * 5 + 2;
    this.grav = 0.18;
  }
  update(deltaSec: number) {
    const t = deltaSec * 60;
    this.x += this.vx * t;
    this.y += this.vy * t;
    this.vy += this.grav * t;
    this.life -= this.dec * t;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Tile {
  ci: number;
  color: (typeof C)[number];
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  /** 초당 픽셀 속도 (delta time 적용) */
  speedPps: number;
  size: number;
  fired: boolean;
  dead: boolean;
  trail: { x: number; y: number }[];
  trailMax: number;
  sparkTimer: number;

  constructor(colorIdx: number, L: LayoutState, g: GameState) {
    this.ci = colorIdx;
    this.color = C[colorIdx];
    const corner = L.corners[colorIdx];
    const target = L.pads[colorIdx];
    this.x = corner.x;
    this.y = corner.y;
    this.tx = target.x;
    this.ty = target.y;
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = dx / dist;
    this.vy = dy / dist;
    this.speedPps = (dist / g.speedSec) * (g.baseSpeedMult || 1);
    this.size = Math.min(L.W, L.H) * 0.055;
    this.fired = false;
    this.dead = false;
    this.trail = [];
    this.trailMax = 20;
    this.sparkTimer = 0;
  }

  update(L: LayoutState, g: GameState, deltaSec: number, onStim: (ci: number, x: number, y: number) => void) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailMax) this.trail.shift();
    const stepPx = this.speedPps * deltaSec;
    this.x += this.vx * stepPx;
    this.y += this.vy * stepPx;
    this.sparkTimer++;
    if (this.sparkTimer % 3 === 0 && g.particles.length < 180) {
      g.particles.push(new MeteorSpark(this.x, this.y, this.color.main));
    }
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!this.fired && dist < stepPx + this.size * 1.2) {
      this.fired = true;
      this.dead = true;
      onStim(this.ci, this.tx, this.ty);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    const col = this.color.main;
    const rgb = this.color.rgb;
    const tlen = this.trail.length;
    if (tlen < 2) return;
    ctx.save();
    for (let i = 1; i < tlen; i++) {
      const t0 = this.trail[i - 1]!;
      const t1 = this.trail[i]!;
      const frac = i / tlen;
      const alpha = frac * frac * 0.9;
      const lw = frac * this.size * 1.8;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.shadowColor = col;
      ctx.shadowBlur = lw * 2.5;
      ctx.stroke();
    }
    const tailStart = this.trail[Math.max(0, tlen - 12)]!;
    ctx.beginPath();
    ctx.moveTo(tailStart.x, tailStart.y);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = this.size * 0.45;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = this.size * 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.save();
    const hx = this.x;
    const hy = this.y;
    const hr = this.size;
    const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr * 3.2);
    halo.addColorStop(0, `rgba(${rgb},0.45)`);
    halo.addColorStop(0.4, `rgba(${rgb},0.18)`);
    halo.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = halo;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(hx, hy, hr * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = col;
    ctx.shadowBlur = hr * 4;
    const mid = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr * 1.4);
    mid.addColorStop(0, `rgba(${rgb},0.9)`);
    mid.addColorStop(0.6, col);
    mid.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.arc(hx, hy, hr * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = hr * 2;
    ctx.shadowColor = '#ffffff';
    const core = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr * 0.55);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.5, '#ffffff');
    core.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(hx, hy, hr * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const css = `
.drt{--bg:${BG};font-family:Barlow Condensed,Noto Sans KR,sans-serif}
.drt,.drt *{box-sizing:border-box}
.drt{position:fixed;inset:0;background:var(--bg);color:#fff;z-index:300;display:flex;flex-direction:column;overflow:hidden}
#drt #drt-hud{height:${HUD_H}px;flex-shrink:0;z-index:50;display:flex;align-items:stretch;background:rgba(6,6,14,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(10px,2vw,28px)}
#drt .drt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(8px,1.8vw,22px);border-right:1px solid rgba(255,255,255,.05)}
#drt .drt-hc.drt-grow{flex:1;align-items:center;border-right:none}
#drt .drt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.26);text-transform:uppercase}
#drt .drt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(20px,3.2vw,32px);letter-spacing:.04em;color:#fff;line-height:1.1}
#drt .drt-stop{align-self:center;margin-left:auto;padding:7px 15px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.1em;cursor:pointer;display:flex;align-items:center;gap:5px}
#drt .drt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
#drt #drt-combo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.7);z-index:60;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
#drt #drt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
#drt .drt-cn{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,13vw,120px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
#drt .drt-cw{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.4)}
@keyframes drtw{0%,100%{color:#ef4444;text-shadow:0 0 14px #ef4444}50%{color:#fff;text-shadow:none}}
#drt #drt-mtime.warn{animation:drtw .5s ease-in-out infinite}
@keyframes drtms{0%{opacity:0;transform:translateX(-50%) scale(.5)}18%{opacity:1;transform:translateX(-50%) scale(1.12)}65%{opacity:1;transform:translateX(-50%) scale(1) translateY(-6px)}100%{opacity:0;transform:translateX(-50%) scale(.9) translateY(-44px)}}
#drt .drt-ms{position:absolute;left:50%;z-index:65;pointer-events:none;font-family:Bebas Neue,sans-serif;font-size:clamp(24px,5vw,48px);letter-spacing:.1em;white-space:nowrap;text-shadow:0 0 22px currentColor;animation:drtms .85s ease-out forwards}
`;

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function DiagonalReactionTraining({ durationSec, speedLevel, speedSec, onExit, onComplete }: Props) {
  const playAreaRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<GameState | null>(null);
  const LRef = useRef<LayoutState | null>(null);
  const onCompleteRef = useRef(onComplete);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const milestoneRootRef = useRef<HTMLDivElement>(null);
  const [hudTimeWarn, setHudTimeWarn] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const lv = Math.max(1, Math.min(7, speedLevel));
  const normalizedSpeedSec = normalizeReactSpeedSec(speedSec);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) {
      cancelAnimationFrame(g.raf);
      g.raf = null;
    }
    onCompleteRef.current({
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) {
      cancelAnimationFrame(g.raf);
      g.raf = null;
    }
    onExit();
  }, [onExit]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;

    const g: GameState = {
      running: true,
      timeLeft: durationSec,
      spd: lv,
      speedSec: normalizedSpeedSec,
      tiles: [],
      particles: [],
      shockwaves: [],
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      spawnInt: speedSecToMs(normalizedSpeedSec, { minMs: 500, maxMs: 6000 }),
      lastSpawn: 0,
      lastAccelSec: 0,
      startAtMs: 0,
      endsAtMs: 0,
      baseSpeedMult: 1,
      raf: null,
      padPulse: [0, 0, 0, 0],
    };
    gRef.current = g;

    const calcLayout = () => {
      const W = cvCssW > 0 ? cvCssW : cv.width;
      const H = cvCssH > 0 ? cvCssH : cv.height;
      const cx = W / 2;
      const cy = H / 2;
      const padSize = Math.min(W, H) * 0.18;
      const gap = padSize * 0.06;
      const half = padSize + gap / 2;
      LRef.current = {
        W,
        H,
        cx,
        cy,
        padSize,
        gap,
        half,
        pads: [
          { x: cx - padSize / 2 - gap / 2, y: cy - padSize / 2 - gap / 2 },
          { x: cx + padSize / 2 + gap / 2, y: cy - padSize / 2 - gap / 2 },
          { x: cx - padSize / 2 - gap / 2, y: cy + padSize / 2 + gap / 2 },
          { x: cx + padSize / 2 + gap / 2, y: cy + padSize / 2 + gap / 2 },
        ],
        corners: [
          { x: -80, y: -80 },
          { x: W + 80, y: -80 },
          { x: -80, y: H + 80 },
          { x: W + 80, y: H + 80 },
        ],
      };
    };

    let dpr = 1;
    let cvCssW = 0;
    let cvCssH = 0;
    const resizeCv = (play: HTMLDivElement) => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const result = setupCanvas(cv, w, h);
      dpr = result.dpr;
      cvCssW = result.cssW;
      cvCssH = result.cssH;
    };

    const onStim = (ci: number, x: number, y: number) => {
      g.stims++;
      g.combo++;
      if (g.combo > g.maxCombo) {
        g.maxCombo = g.combo;
        if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
      }
      g.laneCount[ci]++;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      g.padPulse[ci] = 1;
      const L = LRef.current;
      if (!L) return;
      const col = C[ci];
      g.shockwaves.push({
        x,
        y,
        r: 0,
        maxR: L.padSize * 2.8,
        color: col.main,
        rgb: col.rgb,
        life: 1,
        delay: 0,
      });
      g.shockwaves.push({
        x,
        y,
        r: 0,
        maxR: L.padSize * 2.0,
        color: '#ffffff',
        rgb: '255,255,255',
        life: 0.7,
        delay: 4,
      });
      g.shockwaves.push({
        x,
        y,
        r: 0,
        maxR: L.padSize * 3.6,
        color: col.main,
        rgb: col.rgb,
        life: 0.5,
        delay: 8,
      });
      for (let i = 0; i < 30; i++) g.particles.push(new Particle(x, y, col.main));
      for (let i = 0; i < 8; i++) g.particles.push(new Particle(x, y, '#ffffff'));
      if (g.combo >= 5 && g.combo % 5 === 0) {
        const pop = comboRef.current;
        const nEl = comboNRef.current;
        if (pop && nEl) {
          nEl.textContent = String(g.combo);
          pop.classList.remove('show');
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              pop.classList.add('show');
              const po = pop as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
              clearTimeout(po._t);
              po._t = setTimeout(() => pop.classList.remove('show'), 650);
            })
          );
        }
      }
      const MAP: Record<number, string> = {
        10: '10 COMBO!',
        25: '25 COMBO!',
        50: '50 COMBO!',
        100: '100 COMBO!',
        200: '200 COMBO!',
      };
      const msg = MAP[g.combo] ?? (g.combo > 200 && g.combo % 100 === 0 ? `${g.combo} STREAK!` : null);
      if (!msg) return;
      const root = milestoneRootRef.current;
      if (!root) return;
      const m = document.createElement('div');
      m.className = 'drt-ms';
      m.style.top = '30%';
      m.style.color = C[g.combo % 4].main;
      m.textContent = msg;
      root.appendChild(m);
      setTimeout(() => m.remove(), 900);
    };

    const applyAccel = () => {
      const boost = 0.93;
      g.spawnInt = Math.max(280, Math.floor(g.spawnInt * boost));
      g.baseSpeedMult = (g.baseSpeedMult || 1) * (1 / boost);
      const el = hudTimeRef.current;
      if (el) {
        el.style.color = '#FFD600';
        setTimeout(() => {
          el.style.color = '';
        }, 400);
      }
    };

    const updateHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setHudTimeWarn(g.timeLeft <= 10);
    };

    const drawBg = (ctx: CanvasRenderingContext2D) => {
      const L = LRef.current;
      if (!L) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(L.cx, L.cy);
        ctx.lineTo(L.corners[i].x, L.corners[i].y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawCenterPads = (ctx: CanvasRenderingContext2D) => {
      const L = LRef.current;
      if (!L) return;
      const ps = L.padSize;
      const gap = L.gap;
      for (let i = 0; i < 4; i++) {
        const p = L.pads[i]!;
        const pulse = g.padPulse[i];
        g.padPulse[i] = Math.max(0, pulse - 0.04);
        ctx.save();
        if (pulse > 0.01) {
          ctx.shadowColor = C[i].main;
          ctx.shadowBlur = 40 * pulse;
        }
        const alpha = 0.18 + pulse * 0.65;
        ctx.fillStyle = `rgba(${C[i].rgb},${alpha})`;
        fillRoundRect(ctx, p.x - ps / 2, p.y - ps / 2, ps, ps, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${C[i].rgb},${0.35 + pulse * 0.65})`;
        ctx.lineWidth = 2 + pulse * 3;
        fillRoundRect(ctx, p.x - ps / 2, p.y - ps / 2, ps, ps, 10);
        ctx.stroke();
        if (pulse > 0.3) {
          ctx.globalAlpha = pulse * 0.5;
          ctx.fillStyle = '#ffffff';
          fillRoundRect(ctx, p.x - ps / 2 + 4, p.y - ps / 2 + 4, ps - 8, ps - 8, 8);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = gap;
      ctx.beginPath();
      ctx.moveTo(L.cx - L.half, L.cy);
      ctx.lineTo(L.cx + L.half, L.cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(L.cx, L.cy - L.half);
      ctx.lineTo(L.cx, L.cy + L.half);
      ctx.stroke();
      ctx.restore();
    };

    const spawnTiles = (now: number) => {
      if (now - g.lastSpawn < g.spawnInt) return;
      const active = new Set(g.tiles.map((t) => t.ci));
      const available = [0, 1, 2, 3].filter((i) => !active.has(i));
      if (available.length === 0) return;
      const L = LRef.current;
      if (!L) return;
      const ci = available[Math.floor(Math.random() * available.length)]!;
      g.tiles.push(new Tile(ci, L, g));
      g.lastSpawn = now;
    };

    const updateShockwaves = (ctx: CanvasRenderingContext2D, deltaSec: number) => {
      const t = deltaSec * 60;
      for (let i = g.shockwaves.length - 1; i >= 0; i--) {
        const s = g.shockwaves[i]!;
        if (s.delay > 0) {
          s.delay -= t;
          continue;
        }
        s.r += s.maxR * 0.08 * t;
        s.life -= 0.055 * t;
        if (s.life <= 0) {
          g.shockwaves.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = s.life * 0.85;
        ctx.strokeStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 28 * s.life;
        ctx.lineWidth = 4 * s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawTopFade = (ctx: CanvasRenderingContext2D) => {
      const L = LRef.current;
      if (!L) return;
      const fadeH = 72;
      const grdB = ctx.createLinearGradient(0, L.H - fadeH, 0, L.H);
      grdB.addColorStop(0, 'transparent');
      grdB.addColorStop(1, BG);
      ctx.fillStyle = grdB;
      ctx.fillRect(0, L.H - fadeH, L.W, fadeH);
      const g2 = ctx.createLinearGradient(0, 0, 0, fadeH + 30);
      g2.addColorStop(0, BG);
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, L.W, fadeH + 30);
    };

    let lastFrameMs = 0;
    const loop = (now: number) => {
      if (!gRef.current?.running) return;
      const deltaSec = lastFrameMs > 0 ? Math.min((now - lastFrameMs) / 1000, 0.05) : 1 / 60;
      lastFrameMs = now;

      // endsAt 기반 타이머 (setInterval 대신 RAF 루프에서 직접 계산)
      const remainingSec = Math.max(0, (g.endsAtMs - now) / 1000);
      const newTimeLeft = Math.ceil(remainingSec);
      if (g.timeLeft !== newTimeLeft) {
        g.timeLeft = newTimeLeft;
        updateHudTime();
      }
      // 45s·60s·75s... 마다 가속 (초 단위로 한 번만)
      const elapsedSec = Math.floor((now - g.startAtMs) / 1000);
      if (elapsedSec >= 45 && elapsedSec !== g.lastAccelSec && elapsedSec % 15 === 0) {
        g.lastAccelSec = elapsedSec;
        applyAccel();
      }
      if (remainingSec <= 0) {
        endGame();
        return;
      }

      const ctx2 = cv.getContext('2d');
      if (!ctx2) return;
      const L = LRef.current;
      if (!L) return;
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, L.W, L.H);
      drawBg(ctx2);
      drawCenterPads(ctx2);
      spawnTiles(now);
      for (let i = g.tiles.length - 1; i >= 0; i--) {
        const t = g.tiles[i]!;
        const Ln = LRef.current;
        if (!Ln) break;
        t.update(Ln, g, deltaSec, onStim);
        t.draw(ctx2);
        if (t.dead) g.tiles.splice(i, 1);
      }
      updateShockwaves(ctx2, deltaSec);
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i]!;
        p.update(deltaSec);
        p.draw(ctx2);
        if (p.life <= 0) g.particles.splice(i, 1);
      }
      drawTopFade(ctx2);
      g.raf = requestAnimationFrame(loop);
    };

    const onWinResize = () => {
      const play = playAreaRef.current;
      if (!play) return;
      resizeCv(play);
      calcLayout();
      g.spawnInt = speedSecToMs(normalizedSpeedSec, { minMs: 500, maxMs: 6000 });
    };

    const startId = window.setTimeout(() => {
      const play = playAreaRef.current;
      if (play) {
        resizeCv(play);
        calcLayout();
        g.spawnInt = speedSecToMs(normalizedSpeedSec, { minMs: 500, maxMs: 6000 });
      }
      const nowMs = performance.now();
      g.startAtMs = nowMs;
      g.endsAtMs = nowMs + durationSec * 1000;
      g.lastAccelSec = 0;
      g.lastSpawn = nowMs;
      updateHudTime();
      if (hudStimsRef.current) hudStimsRef.current.textContent = '0';
      if (hudMaxRef.current) hudMaxRef.current.textContent = '0';
      g.raf = requestAnimationFrame(loop);
    }, 60);

    window.addEventListener('resize', onWinResize);

    return () => {
      clearTimeout(startId);
      window.removeEventListener('resize', onWinResize);
      g.running = false;
      if (g.raf != null) cancelAnimationFrame(g.raf);
    };
  }, [durationSec, endGame, lv, onExit, normalizedSpeedSec]);

  return (
    <div className="drt" id="drt">
      <style
        dangerouslySetInnerHTML={{
          __html: `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@600;700;900&family=Noto+Sans+KR:wght@700;900&display=swap');`,
        }}
      />
      <style>{css}</style>
      <div id="drt-hud">
        <div className="drt-hc">
          <div className="drt-hk">Time</div>
          <div className={`drt-hv${hudTimeWarn ? ' warn' : ''}`} ref={hudTimeRef} id="drt-mtime" />
        </div>
        <div className="drt-hc">
          <div className="drt-hk">Stims</div>
          <div className="drt-hv" ref={hudStimsRef} />
        </div>
        <div className="drt-hc drt-grow">
          <div className="drt-hk">Max Streak</div>
          <div className="drt-hv" ref={hudMaxRef} />
        </div>
        <div className="drt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="drt-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playAreaRef} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
        <canvas ref={cvRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />
        <div ref={milestoneRootRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div
          id="drt-combo"
          ref={comboRef}
          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}
        >
          <div className="drt-cn" ref={comboNRef}>
            0
          </div>
          <div className="drt-cw">COMBO</div>
        </div>
      </div>
      <style>{`#drt #drt-mtime.warn{animation:drtw .5s ease-in-out infinite}`}</style>
    </div>
  );
}
