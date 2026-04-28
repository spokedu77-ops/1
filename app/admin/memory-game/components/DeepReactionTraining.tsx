'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import {
  getReactTrainPerfProfile,
  perfParticleBudget,
  perfShadowMul,
  perfUseBackdropBlur,
  type ReactTrainPerfProfile,
} from '../lib/reactTrainPerf';

let DEEP_SHADOW_MUL = 1;
let DEEP_PERF: ReactTrainPerfProfile = 'high';
let DEEP_JELLY_BUB_CAP = 250;
let DEEP_AMBIENT_PROB = 0.06;
let DEEP_AMBIENT_CAP = 30;
let DEEP_AMBIENT_START = 18;

/** 0=RED(TL) 1=BLUE(TR) 2=GREEN(BL) 3=YELLOW(BR) */
const C = [
  { main: '#FF3D6B', rgb: '255,61,107',  name: 'RED'    },
  { main: '#2B8EFF', rgb: '43,142,255',  name: 'BLUE'   },
  { main: '#00FFB2', rgb: '0,255,178',   name: 'GREEN'  },
  { main: '#FFE033', rgb: '255,224,51',  name: 'YELLOW' },
] as const;

type ColorEntry = (typeof C)[number];

const REACT_TRAIN_SLOW_FACTOR = 2;

// 시지각 반응 5단계(심층): 게임 진행만 1.5배 느리게 (이펙트 지속시간은 별도 2배 스케일 유지)
const REACT_TRAIN_GAME_SLOW_FACTOR = 1.5;
const REACT_TRAIN_MIN_STIM_GAP_MS = 1000;

type LayoutState = {
  W: number; H: number; cx: number; cy: number; pad: number; inset: number;
  corners: { x: number; y: number }[];
};

type Ripple = { x: number; y: number; r: number; maxR: number; color: string; rgb: string; life: number; delay: number };

type GameRef = {
  running: boolean;
  timeLeft: number;
  elapsed: number;
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  spawnInt: number;
  lastSpawn: number;
  baseSpeedMult: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  cornerPulse: [number, number, number, number];
  waveOffset: number;
  jellies: Jellyfish[];
  particles: (JellyBubble | BurstBubble)[];
  ripples: Ripple[];
  bubbles: AmbientBubble[];
};

/* ─── helper: roundRect polyfill ─── */
function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  const ext = ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void };
  if (typeof ext.roundRect === 'function') {
    ext.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

/* ─── Ambient Bubble ─── */
class AmbientBubble {
  x = 0; y = 0; r = 0; vy = 0; vx = 0; life = 0; wobble = 0;
  constructor(private L: LayoutState, randomY = false) { this.reset(randomY); }
  reset(randomY = false) {
    this.x = Math.random() * this.L.W;
    this.y = randomY ? Math.random() * this.L.H : this.L.H + 10;
    this.r = 1.5 + Math.random() * 4;
    this.vy = -(0.3 + Math.random() * 0.6);
    this.vx = (Math.random() - 0.5) * 0.25;
    this.life = 0.15 + Math.random() * 0.35;
    this.wobble = Math.random() * Math.PI * 2;
  }
  update() {
    this.y += this.vy; this.wobble += 0.04;
    this.x += Math.sin(this.wobble) * 0.4 + this.vx;
    if (this.y < -10) this.reset();
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.strokeStyle = 'rgba(150,210,255,0.7)'; ctx.lineWidth = 0.8;
    ctx.shadowColor = 'rgba(43,142,255,0.5)'; ctx.shadowBlur = Math.max(0, Math.round(4 * DEEP_SHADOW_MUL));
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = this.life * 0.6; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(this.x - this.r * 0.3, this.y - this.r * 0.3, this.r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/* ─── JellyBubble (trail) ─── */
class JellyBubble {
  x: number; y: number; vx: number; vy: number; r: number; life: number; dec: number; color: string;
  constructor(x: number, y: number, color: string) {
    this.x = x + (Math.random() - 0.5) * 20; this.y = y + (Math.random() - 0.5) * 20;
    this.color = color; this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = -(Math.random() * 0.6 + 0.2); this.r = 0.8 + Math.random() * 2.2;
    this.life = 0.5 + Math.random() * 0.4; this.dec = 0.025 + Math.random() * 0.02;
  }
  update() { this.x += this.vx; this.y += this.vy; this.vy -= 0.01; this.life -= this.dec; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.globalAlpha = Math.max(0, this.life) * 0.6;
    ctx.strokeStyle = this.color; ctx.lineWidth = 0.8;
    ctx.shadowColor = this.color; ctx.shadowBlur = Math.max(0, Math.round(4 * DEEP_SHADOW_MUL));
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/* ─── BurstBubble (explosion) ─── */
class BurstBubble {
  x: number; y: number; vx: number; vy: number; r: number; life: number; dec: number;
  color: string; rgb: string; isRing: boolean;
  constructor(x: number, y: number, color: string, rgb: string) {
    this.x = x; this.y = y; this.color = color; this.rgb = rgb;
    const a = Math.random() * Math.PI * 2, spd = Math.random() * 9 + 2;
    this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
    this.life = 1; this.dec = 0.025 + Math.random() * 0.025;
    this.r = 1.5 + Math.random() * 4; this.isRing = Math.random() < 0.4;
  }
  update() { this.x += this.vx; this.y += this.vy; this.vy += 0.12; this.vx *= 0.97; this.vy *= 0.97; this.life -= this.dec; }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.globalAlpha = Math.max(0, this.life);
    ctx.shadowColor = this.color; ctx.shadowBlur = Math.max(0, Math.round(10 * DEEP_SHADOW_MUL));
    if (this.isRing) {
      ctx.strokeStyle = this.color; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
    } else {
      const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)');
      grd.addColorStop(0.4, `rgba(${this.rgb},0.8)`);
      grd.addColorStop(1, `rgba(${this.rgb},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/* ─── Jellyfish ─── */
type TentacleDef = { offset: number; phase: number; len: number };

class Jellyfish {
  ci: number; color: ColorEntry;
  x: number; y: number; tx: number; ty: number;
  vx: number; vy: number; speed: number;
  bw: number; bh: number;
  fired = false; dead = false;
  phase: number; phaseSpd: number;
  tentacles: TentacleDef[];
  bubbleTimer = 0;
  angle: number;

  constructor(colorIdx: number, L: LayoutState, speedLevel: number, baseSpeedMult: number) {
    this.ci = colorIdx;
    this.color = C[colorIdx];
    this.x = L.cx + (Math.random() - 0.5) * 30;
    this.y = L.cy + (Math.random() - 0.5) * 30;
    const corner = L.corners[colorIdx];
    this.tx = corner.x; this.ty = corner.y;
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = dx / dist; this.vy = dy / dist;
    this.speed = (Math.min(L.W, L.H) / 2.0 / 60) * (0.55 + (speedLevel - 1) * 0.17) * baseSpeedMult;
    this.bw = Math.min(L.W, L.H) * 0.055;
    this.bh = this.bw * 0.6;
    this.phase = Math.random() * Math.PI * 2;
    this.phaseSpd = 0.08 + Math.random() * 0.04;
    this.tentacles = Array.from({ length: 7 }, (_, i) => ({
      offset: (i / 6 - 0.5) * 1.6,
      phase: Math.random() * Math.PI * 2,
      len: this.bw * (0.7 + Math.random() * 0.5),
    }));
    this.angle = Math.atan2(dy, dx);
  }

  update(G: GameRef) {
    this.phase += this.phaseSpd;
    this.tentacles.forEach(t => { t.phase += 0.06; });
    this.x += this.vx * this.speed;
    this.y += this.vy * this.speed;
    this.bubbleTimer++;
    if (this.bubbleTimer % 4 === 0 && G.particles.length < DEEP_JELLY_BUB_CAP) {
      G.particles.push(new JellyBubble(this.x, this.y, this.color.main));
    }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    if (!this.fired && Math.sqrt(dx * dx + dy * dy) < this.speed + this.bw * 1.4) {
      this.fired = true; this.dead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    const pulse = Math.sin(this.phase);
    const scaleY = 1 + pulse * 0.12, scaleX = 1 - pulse * 0.07;
    const bw = this.bw, bh = this.bh;
    const col = this.color.main, rgb = this.color.rgb;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle - Math.PI / 2);

    // outer halo
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, bw * 2.8);
    halo.addColorStop(0, `rgba(${rgb},0.18)`);
    halo.addColorStop(0.5, `rgba(${rgb},0.06)`);
    halo.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, bw * 2.8, 0, Math.PI * 2); ctx.fill();

    // tentacles
    this.tentacles.forEach(t => {
      const tx0 = bw * t.offset * scaleX, ty0 = bh * 0.4 * scaleY;
      const wave = Math.sin(t.phase) * bw * 0.25;
      const tx1 = tx0 + wave, ty1 = ty0 + t.len * (0.9 + Math.sin(t.phase * 0.5) * 0.1);
      ctx.save();
      ctx.globalAlpha = 0.75 + pulse * 0.15;
      ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = Math.max(0, Math.round(14 * DEEP_SHADOW_MUL));
      ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx0, ty0);
      ctx.bezierCurveTo(tx0 + wave * 0.5, ty0 + t.len * 0.35, tx1 - wave * 0.3, ty0 + t.len * 0.7, tx1, ty1);
      ctx.stroke();
      ctx.globalAlpha = (0.75 + pulse * 0.15) * 0.7;
      ctx.fillStyle = col; ctx.shadowBlur = Math.max(0, Math.round(6 * DEEP_SHADOW_MUL));
      ctx.beginPath(); ctx.arc(tx1, ty1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // bell
    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.shadowColor = col; ctx.shadowBlur = Math.max(0, Math.round(bw * 2.2 * DEEP_SHADOW_MUL));
    const outerGlow = ctx.createRadialGradient(0, 0, bw * 0.3, 0, 0, bw * 1.4);
    outerGlow.addColorStop(0, `rgba(${rgb},0.0)`);
    outerGlow.addColorStop(0.7, `rgba(${rgb},0.35)`);
    outerGlow.addColorStop(1, `rgba(${rgb},0.0)`);
    ctx.fillStyle = outerGlow;
    ctx.beginPath(); ctx.ellipse(0, 0, bw * 1.4, bh * 1.4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${rgb},0.82)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, Math.PI, 0, true);
    ctx.quadraticCurveTo(bw * 0.72, bh * 0.55, 0, bh * 0.5);
    ctx.quadraticCurveTo(-bw * 0.72, bh * 0.55, -bw, 0);
    ctx.fill();

    const topGrd = ctx.createRadialGradient(-bw * 0.25, -bh * 0.55, 0, 0, -bh * 0.1, bw * 0.9);
    topGrd.addColorStop(0, 'rgba(255,255,255,0.92)');
    topGrd.addColorStop(0.3, 'rgba(255,255,255,0.45)');
    topGrd.addColorStop(0.7, `rgba(${rgb},0.15)`);
    topGrd.addColorStop(1, `rgba(${rgb},0.0)`);
    ctx.fillStyle = topGrd;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw, bh, 0, Math.PI, 0, true);
    ctx.quadraticCurveTo(bw * 0.72, bh * 0.55, 0, bh * 0.5);
    ctx.quadraticCurveTo(-bw * 0.72, bh * 0.55, -bw, 0);
    ctx.fill();

    ctx.shadowColor = col; ctx.shadowBlur = Math.max(0, Math.round(bw * 1.6 * DEEP_SHADOW_MUL));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, Math.PI, 0, true); ctx.stroke();

    ctx.shadowBlur = Math.max(0, Math.round(bw * 0.8 * DEEP_SHADOW_MUL)); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(0, 0, bw * 1.05, bh * 1.05, 0, Math.PI, 0, true); ctx.stroke();

    ctx.globalAlpha = 0.18; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.shadowBlur = 0;
    for (let r = -3; r <= 3; r++) {
      if (r === 0) continue;
      const rx = bw * r * 0.22;
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.quadraticCurveTo(rx * 1.1, -bh * 0.5, rx * 0.7, -bh * 0.9); ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }
}

/* ─── Props ─── */
export type DeepReactionProps = {
  durationSec: number;
  speedLevel: number;       // 1~7
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

/* ══ Component ══ */
export function DeepReactionTraining({ durationSec, speedLevel, onExit, onComplete }: DeepReactionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const comboPopRef = useRef<HTMLDivElement>(null);
  const gameScreenRef = useRef<HTMLDivElement>(null);

  const G = useRef<GameRef | null>(null);
  const L = useRef<LayoutState>({ W: 0, H: 0, cx: 0, cy: 0, pad: 0, inset: 0, corners: [] });
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const onExitRef = useRef(onExit);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);

  const perfProfile = useMemo(() => getReactTrainPerfProfile(), []);
  const perfShadowMulVal = useMemo(() => perfShadowMul(perfProfile), [perfProfile]);
  const perfBurst = useMemo(() => perfParticleBudget(perfProfile), [perfProfile]);
  const hudBackdropBlur = useMemo(() => perfUseBackdropBlur(perfProfile), [perfProfile]);

  /* layout */
  const calcLayout = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = cv.offsetWidth || window.innerWidth;
    const H = cv.offsetHeight || window.innerHeight;
    const pad = Math.min(W, H) * 0.14;
    const inset = Math.min(W, H) * 0.07;
    L.current = {
      W, H, cx: W / 2, cy: H / 2, pad, inset,
      corners: [
        { x: inset + pad / 2,   y: inset + pad / 2 },
        { x: W - inset - pad / 2, y: inset + pad / 2 },
        { x: inset + pad / 2,   y: H - inset - pad / 2 },
        { x: W - inset - pad / 2, y: H - inset - pad / 2 },
      ],
    };
  }, []);

  const resizeCv = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cv.offsetWidth || window.innerWidth;
    cv.height = cv.offsetHeight || window.innerHeight;
  }, []);

  /* ─── draw helpers ─── */
  const drawDeepBg = useCallback((ctx: CanvasRenderingContext2D, waveOffset: number) => {
    const { W, H, cx, cy } = L.current;
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#000D1F'); grd.addColorStop(0.35, '#011428');
    grd.addColorStop(0.7, '#011830'); grd.addColorStop(1, '#010E1E');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

    const ellipses = DEEP_PERF === 'low' ? 4 : DEEP_PERF === 'mid' ? 6 : 9;
    const beams = DEEP_PERF === 'low' ? 0 : DEEP_PERF === 'mid' ? 4 : 7;
    const sparks = DEEP_PERF === 'low' ? 10 : DEEP_PERF === 'mid' ? 18 : 28;
    const gridRows = DEEP_PERF === 'low' ? 4 : DEEP_PERF === 'mid' ? 6 : 8;
    const gridStep = DEEP_PERF === 'low' ? 10 : DEEP_PERF === 'mid' ? 8 : 6;

    ctx.save();
    for (let i = 0; i < ellipses; i++) {
      const bx = W * (0.05 + i * 0.12) + Math.sin(waveOffset * 0.008 + i * 0.7) * W * 0.04;
      const by = H * 0.05 + Math.cos(waveOffset * 0.006 + i * 0.9) * H * 0.06;
      const bw2 = W * 0.04 + Math.sin(waveOffset * 0.015 + i) * W * 0.018;
      const gr2 = ctx.createRadialGradient(bx, by, 0, bx, by, bw2 * 2.5);
      gr2.addColorStop(0, 'rgba(80,170,255,0.09)'); gr2.addColorStop(0.5, 'rgba(43,120,255,0.04)'); gr2.addColorStop(1, 'transparent');
      ctx.fillStyle = gr2;
      ctx.beginPath(); ctx.ellipse(bx, by, bw2 * 2, bw2 * 1.2, Math.sin(i) * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (beams > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < beams; i++) {
        const rx = W * (0.05 + i * 0.15) + Math.sin(waveOffset * 0.007 + i * 1.3) * W * 0.025;
        const rw = W * (0.025 + Math.sin(waveOffset * 0.011 + i) * 0.012);
        const gr3 = ctx.createLinearGradient(rx, 0, rx + rw * 0.5, H * 0.85);
        gr3.addColorStop(0, 'rgba(40,120,255,0.11)'); gr3.addColorStop(0.4, 'rgba(20,80,200,0.06)'); gr3.addColorStop(1, 'transparent');
        ctx.fillStyle = gr3;
        ctx.beginPath(); ctx.moveTo(rx - rw, 0); ctx.lineTo(rx + rw * 2, 0);
        ctx.lineTo(rx + rw * 3, H * 0.85); ctx.lineTo(rx - rw * 2, H * 0.85); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }

    ctx.save();
    for (let i = 0; i < sparks; i++) {
      const px = (Math.sin(i * 127.4 + waveOffset * 0.005) * 0.5 + 0.5) * W;
      const py = (Math.cos(i * 93.7 + waveOffset * 0.003) * 0.5 + 0.5) * H;
      const pr = 0.6 + Math.sin(i * 31 + waveOffset * 0.04) * 0.4;
      const pa = 0.08 + Math.sin(i * 17 + waveOffset * 0.06) * 0.05;
      ctx.globalAlpha = Math.max(0, pa);
      ctx.fillStyle = 'rgba(120,200,255,1)'; ctx.shadowColor = 'rgba(80,180,255,1)';
      ctx.shadowBlur = Math.max(0, Math.round(4 * DEEP_SHADOW_MUL));
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save(); ctx.globalAlpha = 0.06; ctx.strokeStyle = 'rgba(60,140,255,1)'; ctx.lineWidth = 1;
    for (let row = 0; row < gridRows; row++) {
      const baseY = (H / gridRows) * row + H / (gridRows * 2);
      ctx.beginPath(); let first = true;
      for (let x = 0; x <= W; x += gridStep) {
        const y = baseY + Math.sin(x * (0.012 + row * 0.002) + waveOffset * 0.025 + row * 0.8) * 8
          + Math.sin(x * (0.007 + row * 0.001) - waveOffset * 0.018 + row * 1.4) * 4;
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    const vig = ctx.createRadialGradient(cx, cy, H * 0.25, cx, cy, H * 0.85);
    vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,4,12,0.72)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  }, []);

  const drawCornerPads = useCallback((ctx: CanvasRenderingContext2D, cornerPulse: number[]) => {
    const { pad, corners } = L.current;
    corners.forEach((c, i) => {
      const pulse = cornerPulse[i];
      cornerPulse[i] = Math.max(0, pulse - 0.045);
      ctx.save();
      if (pulse > 0.01) { ctx.shadowColor = C[i].main; ctx.shadowBlur = Math.max(0, Math.round(50 * pulse * DEEP_SHADOW_MUL)); }
      ctx.fillStyle = `rgba(${C[i].rgb},${0.12 + pulse * 0.55})`;
      ctx.beginPath(); roundRect(ctx, c.x - pad / 2, c.y - pad / 2, pad, pad, pad * 0.2); ctx.fill();
      ctx.shadowBlur = pulse > 0.1 ? Math.max(0, Math.round(20 * pulse * DEEP_SHADOW_MUL)) : 0;
      ctx.strokeStyle = `rgba(${C[i].rgb},${0.3 + pulse * 0.7})`;
      ctx.lineWidth = 1.5 + pulse * 2.5;
      ctx.beginPath(); roundRect(ctx, c.x - pad / 2, c.y - pad / 2, pad, pad, pad * 0.2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.25 + pulse * 0.6; ctx.fillStyle = C[i].main;
      ctx.font = `900 ${pad * 0.22}px 'Bebas Neue', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(C[i].name, c.x, c.y);
      if (pulse > 0.4) {
        ctx.globalAlpha = pulse * 0.35; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); roundRect(ctx, c.x - pad / 2 + 4, c.y - pad / 2 + 4, pad - 8, pad - 8, pad * 0.16); ctx.fill();
      }
      ctx.restore();
    });
  }, []);

  /* ─── HUD helpers ─── */
  const updateHudTime = useCallback(() => {
    const g = G.current; if (!g || !hudTimeRef.current) return;
    const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
    const s = String(g.timeLeft % 60).padStart(2, '0');
    hudTimeRef.current.textContent = `${m}:${s}`;
    hudTimeRef.current.style.color = g.timeLeft <= 10 ? 'var(--dr-red)' : '';
    hudTimeRef.current.style.textShadow = g.timeLeft <= 10 ? '0 0 14px var(--dr-red)' : '';
  }, []);

  const showComboPop = useCallback((n: number) => {
    const pop = comboPopRef.current; const cn = comboNRef.current;
    if (!pop || !cn) return;
    cn.textContent = String(n);
    pop.classList.remove('dr-show');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pop.classList.add('dr-show');
      clearTimeout((pop as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t);
      (pop as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
        () => pop.classList.remove('dr-show'),
        650 * REACT_TRAIN_SLOW_FACTOR
      );
    }));
  }, []);

  const checkMilestone = useCallback((n: number) => {
    const MAP: Record<number, string> = { 10: '10 COMBO!', 25: '25 COMBO!', 50: '🪸 GREAT!', 100: '🌊 AMAZING!', 200: '✨ UNSTOPPABLE!' };
    const msg = MAP[n] ?? (n > 200 && n % 100 === 0 ? `${n} STREAK!` : null);
    if (!msg || !gameScreenRef.current) return;
    const el = document.createElement('div');
    el.className = 'dr-ms';
    el.style.top = '34%';
    el.style.color = C[n % 4].main;
    el.textContent = msg;
    gameScreenRef.current.appendChild(el);
    setTimeout(() => el.remove(), 900 * REACT_TRAIN_SLOW_FACTOR);
  }, []);

  /* ─── onStim ─── */
  const onStim = useCallback((ci: number, x: number, y: number) => {
    const g = G.current; if (!g) return;
    const now = performance.now();
    const last = (g as GameRef & { lastStimAtMs?: number }).lastStimAtMs ?? -Infinity;
    if (now - last < REACT_TRAIN_MIN_STIM_GAP_MS) return;
    (g as GameRef & { lastStimAtMs: number }).lastStimAtMs = now;
    g.stims++; g.combo++;
    if (g.combo > g.maxCombo) {
      g.maxCombo = g.combo;
      if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
    }
    (g.laneCount as number[])[ci]++;
    if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
    g.cornerPulse[ci] = 1.0;

    [0, 5, 11].map((d) => d * REACT_TRAIN_SLOW_FACTOR).forEach((delay) => {
      g.ripples.push({ x, y, r: 0, maxR: L.current.pad * 2.6, color: C[ci].main, rgb: C[ci].rgb, life: 1, delay });
    });
    const MAX_PARTICLES = Math.min(320, perfBurst.maxParticles);
    const burstColored = perfProfile === 'low' ? 9 : perfProfile === 'mid' ? 15 : 22;
    const burstWhite = perfProfile === 'low' ? 3 : perfProfile === 'mid' ? 6 : 10;
    const remaining = Math.max(0, MAX_PARTICLES - g.particles.length);
    const cN = Math.min(burstColored, remaining);
    for (let i = 0; i < cN; i++) g.particles.push(new BurstBubble(x, y, C[ci].main, C[ci].rgb));
    const remaining2 = Math.max(0, MAX_PARTICLES - g.particles.length);
    const wN = Math.min(burstWhite, remaining2);
    for (let i = 0; i < wN; i++) g.particles.push(new BurstBubble(x, y, '#ffffff', '255,255,255'));

    if (g.combo >= 5 && g.combo % 5 === 0) showComboPop(g.combo);
    checkMilestone(g.combo);
  }, [checkMilestone, perfBurst.maxParticles, perfProfile, showComboPop]);

  /* ─── applyAccel ─── */
  const applyAccel = useCallback(() => {
    const g = G.current; if (!g) return;
    g.spawnInt = Math.max(200, Math.floor(g.spawnInt * 0.88));
    g.baseSpeedMult *= 1.13;
    g.jellies.forEach(j => { j.speed *= 1.13; });
    if (hudTimeRef.current) {
      hudTimeRef.current.style.color = '#00FFB2';
      hudTimeRef.current.style.textShadow = '0 0 14px #00FFB2';
      setTimeout(() => {
        if (hudTimeRef.current) { hudTimeRef.current.style.color = ''; hudTimeRef.current.style.textShadow = ''; }
      }, 500 * REACT_TRAIN_SLOW_FACTOR);
    }
  }, []);

  /* ─── endGame ─── */
  const endGame = useCallback(() => {
    const g = G.current; if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    if (g.raf) cancelAnimationFrame(g.raf);
    onCompleteRef.current({ stims: g.stims, maxCombo: g.maxCombo, laneCount: g.laneCount });
  }, []);

  /* ─── main loop ─── */
  const loop = useCallback((now: number) => {
    const g = G.current; const cv = canvasRef.current;
    if (!g || !g.running || !cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, L.current.W, L.current.H);
    g.waveOffset += 0.4;

    drawDeepBg(ctx, g.waveOffset);

    // ambient bubbles
    if (Math.random() < DEEP_AMBIENT_PROB && g.bubbles.length < DEEP_AMBIENT_CAP) g.bubbles.push(new AmbientBubble(L.current));
    g.bubbles.forEach(b => { b.update(); b.draw(ctx); });

    drawCornerPads(ctx, g.cornerPulse as unknown as number[]);

    // spawn jelly
    if (now - g.lastSpawn >= g.spawnInt) {
      const active = new Set(g.jellies.map(j => j.ci));
      const avail = [0, 1, 2, 3].filter(i => !active.has(i));
      if (avail.length) {
        const ci = avail[Math.floor(Math.random() * avail.length)];
        const j = new Jellyfish(ci, L.current, speedLevel, g.baseSpeedMult);
        g.jellies.push(j);
        g.lastSpawn = now;
      }
    }

    // update jellies
    for (let i = g.jellies.length - 1; i >= 0; i--) {
      const j = g.jellies[i];
      j.update(g); j.draw(ctx);
      if (j.dead) {
        // 반응 간격이 확보되지 않으면, 제거하지 않고 "대기"시켜 다음 허용 타이밍에 터지게 한다.
        const before = (g as GameRef & { lastStimAtMs?: number }).lastStimAtMs ?? -Infinity;
        onStim(j.ci, j.tx, j.ty);
        const after = (g as GameRef & { lastStimAtMs?: number }).lastStimAtMs ?? -Infinity;
        if (after !== before) g.jellies.splice(i, 1);
      }
    }

    // ripples
    for (let i = g.ripples.length - 1; i >= 0; i--) {
      const rp = g.ripples[i];
      if (rp.delay > 0) { rp.delay--; continue; }
      rp.r += rp.maxR * 0.07; rp.life -= 0.055;
      if (rp.life <= 0) { g.ripples.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = rp.life * 0.75;
      ctx.strokeStyle = rp.color; ctx.shadowColor = rp.color;
      ctx.shadowBlur = Math.max(0, Math.round(18 * rp.life * DEEP_SHADOW_MUL));
      ctx.lineWidth = 2.5 * rp.life;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.12) {
        const wobble = rp.r + Math.sin(a * 6 + g.waveOffset * 0.05) * rp.r * 0.025;
        const px = rp.x + Math.cos(a) * wobble, py = rp.y + Math.sin(a) * wobble;
        a < 0.01 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }

    // particles
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i]; p.update(); p.draw(ctx);
      if (p.life <= 0) g.particles.splice(i, 1);
    }

    // HUD fade
    const hudH = 72;
    const grd = ctx.createLinearGradient(0, 0, 0, hudH + 20);
    grd.addColorStop(0, '#020B18'); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, L.current.W, hudH + 20);

    g.raf = requestAnimationFrame(loop);
  }, [drawDeepBg, drawCornerPads, onStim, speedLevel]);

  /* ─── mount / start ─── */
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    resizeCv(); calcLayout();

    DEEP_PERF = perfProfile;
    DEEP_SHADOW_MUL = perfShadowMulVal;
    if (perfProfile === 'low') {
      DEEP_JELLY_BUB_CAP = 120;
      DEEP_AMBIENT_PROB = 0.018;
      DEEP_AMBIENT_CAP = 14;
      DEEP_AMBIENT_START = 8;
    } else if (perfProfile === 'mid') {
      DEEP_JELLY_BUB_CAP = 190;
      DEEP_AMBIENT_PROB = 0.035;
      DEEP_AMBIENT_CAP = 22;
      DEEP_AMBIENT_START = 12;
    } else {
      DEEP_JELLY_BUB_CAP = 250;
      DEEP_AMBIENT_PROB = 0.06;
      DEEP_AMBIENT_CAP = 30;
      DEEP_AMBIENT_START = 18;
    }

    const g: GameRef = {
      running: true,
      timeLeft: durationSec, elapsed: 0,
      stims: 0, combo: 0, maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      spawnInt: Math.max(300, 1350 - (speedLevel - 1) * 150) * REACT_TRAIN_GAME_SLOW_FACTOR,
      lastSpawn: performance.now() - Math.max(300, 1350 - (speedLevel - 1) * 150) * REACT_TRAIN_GAME_SLOW_FACTOR,
      baseSpeedMult: 1 / REACT_TRAIN_GAME_SLOW_FACTOR,
      raf: null, timer: null,
      cornerPulse: [0, 0, 0, 0],
      waveOffset: 0,
      jellies: [], particles: [], ripples: [],
      bubbles: Array.from({ length: DEEP_AMBIENT_START }, () => new AmbientBubble(L.current, true)),
    };
    G.current = g;

    updateHudTime();
    g.timer = setInterval(() => {
      const gg = G.current; if (!gg || !gg.running) return;
      gg.timeLeft--; gg.elapsed++;
      updateHudTime();
      if (gg.elapsed >= 30 && gg.elapsed % 10 === 0) applyAccel();
      if (gg.timeLeft <= 0) endGame();
    }, 1000);

    g.raf = requestAnimationFrame(loop);

    const handleResize = () => { resizeCv(); calcLayout(); };
    window.addEventListener('resize', handleResize);
    return () => {
      const gg = G.current;
      if (gg) {
        gg.running = false;
        if (gg.timer) clearInterval(gg.timer);
        if (gg.raf) cancelAnimationFrame(gg.raf);
      }
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={gameScreenRef}
      style={{ position: 'fixed', inset: 0, background: '#020B18', overflow: 'hidden' }}
    >
      <style>{`
        :root { --dr-red:#FF3D6B; --dr-green:#00FFB2; --dr-blue:#2B8EFF; --dr-yellow:#FFE033; }
        .dr-hud { position:absolute; top:0; left:0; right:0; height:60px; z-index:50; display:flex; align-items:stretch; background:rgba(2,11,24,.92); ${
          hudBackdropBlur ? 'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' : ''
        } border-bottom:1px solid rgba(43,142,255,.12); padding:0 clamp(10px,2vw,26px); font-family:'Barlow Condensed',sans-serif; }
        .dr-hud-cell { display:flex; flex-direction:column; justify-content:center; padding:0 clamp(8px,1.8vw,20px); border-right:1px solid rgba(255,255,255,.05); }
        .dr-hud-cell.grow { flex:1; align-items:center; border-right:none; }
        .dr-hud-key { font-size:9px; font-weight:700; letter-spacing:.2em; color:rgba(255,255,255,.25); text-transform:uppercase; }
        .dr-hud-val { font-family:'Bebas Neue',cursive; font-size:clamp(20px,3.2vw,30px); letter-spacing:.04em; color:#fff; line-height:1.1; }
        .dr-stop-btn { align-self:center; margin-left:auto; padding:7px 15px; border-radius:9px; border:1px solid rgba(43,142,255,.25); background:transparent; color:rgba(255,255,255,.4); font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:.1em; cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:5px; }
        .dr-stop-btn:hover { background:rgba(43,142,255,.15); color:#fff; }
        .dr-combo-pop { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.7); z-index:60; text-align:center; pointer-events:none; opacity:0; transition:opacity .08s, transform .15s cubic-bezier(.34,1.56,.64,1); }
        .dr-combo-pop.dr-show { opacity:1; transform:translate(-50%,-50%) scale(1); }
        .dr-combo-n { font-family:'Bebas Neue',cursive; font-size:clamp(60px,12vw,110px); color:#fff; text-shadow:0 0 30px rgba(43,142,255,.8); line-height:1; }
        .dr-combo-w { font-size:clamp(10px,1.8vw,14px); font-weight:700; letter-spacing:.35em; color:rgba(255,255,255,.4); font-family:'Barlow Condensed',sans-serif; }
        @keyframes dr-ms { 0%{opacity:0;transform:translateX(-50%) scale(.5);}18%{opacity:1;transform:translateX(-50%) scale(1.1);}65%{opacity:1;transform:translateX(-50%) scale(1) translateY(-6px);}100%{opacity:0;transform:translateX(-50%) scale(.9) translateY(-44px);} }
        .dr-ms { position:absolute; left:50%; z-index:65; pointer-events:none; font-family:'Bebas Neue',cursive; font-size:clamp(22px,4.5vw,44px); letter-spacing:.1em; white-space:nowrap; text-shadow:0 0 20px currentColor; animation:dr-ms 1.7s ease-out forwards; }
      `}</style>

      {/* HUD */}
      <div className="dr-hud">
        <div className="dr-hud-cell">
          <div className="dr-hud-key">Time</div>
          <div className="dr-hud-val" ref={hudTimeRef}>
            {String(Math.floor(durationSec / 60)).padStart(2, '0')}:{String(durationSec % 60).padStart(2, '0')}
          </div>
        </div>
        <div className="dr-hud-cell">
          <div className="dr-hud-key">Stims</div>
          <div className="dr-hud-val" ref={hudStimsRef}>0</div>
        </div>
        <div className="dr-hud-cell grow">
          <div className="dr-hud-key">Max Streak</div>
          <div className="dr-hud-val" ref={hudMaxRef}>0</div>
        </div>
        <div className="dr-hud-cell" style={{ borderRight: 'none', borderLeft: '1px solid rgba(43,142,255,.12)' }}>
          <button className="dr-stop-btn" onClick={onExit} type="button">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="6" y="6" width="4" height="12" rx="1" /><rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', zIndex: 20 }} />

      {/* Combo */}
      <div className="dr-combo-pop" ref={comboPopRef}>
        <div className="dr-combo-n" ref={comboNRef}>0</div>
        <div className="dr-combo-w">COMBO</div>
      </div>
    </div>
  );
}
