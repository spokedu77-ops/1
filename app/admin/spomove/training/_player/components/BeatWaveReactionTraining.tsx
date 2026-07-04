'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';
import { normalizeReactSpeedSec, speedSecToMs } from '../lib/reactTrainTiming';
import { staticPerfTier, PerfMonitor } from '../lib/reactTrainPerf';

const C = [
  { name: '빨강', short: 'RED', hex: '#ff2d3d', dim: '#2a0508', textColor: '#fff' },
  { name: '노랑', short: 'YEL', hex: '#ffd43b', dim: '#2e2305', textColor: '#1a1200' },
  { name: '초록', short: 'GRN', hex: '#22c55e', dim: '#052512', textColor: '#fff' },
  { name: '파랑', short: 'BLU', hex: '#3b82f6', dim: '#051830', textColor: '#fff' },
] as const;

type BwBeat = {
  colorIdx: number;
  hitAt: number;
  spawnAt: number;
  travel: number;
  hit: boolean;
  pinged: boolean;
  dead: boolean;
};

type BwParticle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
};

type BwGame = {
  running: boolean;
  timeLeft: number;
  beats: BwBeat[];
  particles: BwParticle[];
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  lastColor: number;
  repeatCount: number;
  flashQuad: number;
  flashAlpha: number;
  shake: number;
  coachScale: number;
  coachOpacity: number;
  coachUntil: number;
  nextHitAt: number;
  currentInterval: number;
  minInterval: number;
  endsAtMs: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  isLow: boolean;
  cx: number; cy: number;
  targetR: number;
  W: number; H: number;
  dpr: number;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.bwt{position:fixed;inset:0;background:#020308;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.bwt,.bwt *{box-sizing:border-box}
.bwt-hud{height:72px;display:flex;align-items:stretch;background:rgba(2,3,8,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30;flex-shrink:0}
.bwt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.bwt-hc.grow{flex:1;align-items:center;border-right:none}
.bwt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.bwt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.bwt-hv.warn{animation:bwtw .5s ease-in-out infinite}
@keyframes bwtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.bwt-btns{align-self:center;margin-left:auto;display:flex;gap:8px}
.bwt-sound{padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.45);font-size:12px;font-weight:700;letter-spacing:.08em;cursor:pointer;font-family:inherit}
.bwt-sound:hover{background:rgba(255,255,255,.07);color:#fff}
.bwt-stop{padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit}
.bwt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.bwt-play{position:relative;flex:1;min-height:0}
.bwt-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.bwt-coach{position:absolute;inset:0;z-index:14;display:grid;place-items:center;pointer-events:none;text-align:center;padding:24px}
.bwt-card{padding:clamp(10px,1.6vw,18px) clamp(16px,2.6vw,30px);border:1px solid rgba(255,255,255,.12);border-radius:clamp(16px,2.8vw,26px);background:rgba(3,6,15,.18);backdrop-filter:blur(4px);box-shadow:0 14px 54px rgba(0,0,0,.22);transition:border-color .16s,box-shadow .16s}
.bwt-card-title{margin:0;font-size:clamp(28px,6.5vw,82px);line-height:.92;letter-spacing:-.08em;font-weight:1000;text-shadow:0 0 22px currentColor}
.bwt-card-sub{margin:8px 0 0;font-size:clamp(12px,2vw,24px);line-height:1;font-weight:900;letter-spacing:-.05em;color:rgba(255,255,255,.8)}
.bwt-combo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.7);z-index:40;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.bwt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.bwt-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,12vw,110px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
.bwt-combo-w{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.4)}
.bwt-cue{position:absolute;bottom:clamp(10px,2.2vw,20px);left:50%;transform:translateX(-50%);z-index:15;display:flex;align-items:center;gap:clamp(6px,1.1vw,10px);padding:9px clamp(12px,2vw,18px);border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(4,7,17,.68);backdrop-filter:blur(20px);pointer-events:none;white-space:nowrap}
.bwt-cue-label{color:rgba(255,255,255,.6);font-weight:800;letter-spacing:.1em;font-size:clamp(9px,1.1vw,12px)}
.bwt-chip{width:clamp(30px,5vw,52px);aspect-ratio:1;border-radius:12px;border:2px solid rgba(255,255,255,.26);display:grid;place-items:center;font-weight:900;font-size:clamp(10px,1.6vw,16px);letter-spacing:.04em;transition:transform .12s}
.bwt-chip.main{transform:scale(1.16);border-color:#fff}
`;

export function BeatWaveReactionTraining({ durationSec, speedLevel, speedSec, onExit, onComplete }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const coachTitleRef = useRef<HTMLDivElement>(null);
  const coachSubRef = useRef<HTMLDivElement>(null);
  const coachCardRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const gRef = useRef<BwGame | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(true);
  const perfRef = useRef<PerfMonitor | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  const onExitRef = useRef(onExit);
  useEffect(() => { onExitRef.current = onExit; }, [onExit]);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);

  const lv = Math.max(1, Math.min(7, Math.round(speedLevel)));
  const normalizedSpeedSec = normalizeReactSpeedSec(speedSec);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (audioCtxRef.current) void audioCtxRef.current.suspend();
    onExitRef.current();
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (audioCtxRef.current) void audioCtxRef.current.suspend();
    onCompleteRef.current({ stims: g.stims, maxCombo: g.maxCombo, laneCount: [...g.laneCount] as [number, number, number, number] });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;
    const drawCtx = cv.getContext('2d');
    if (!drawCtx) return;

    perfRef.current = new PerfMonitor();
    const interval = speedSecToMs(normalizedSpeedSec, { minMs: 400, maxMs: 3500 });
    const minInterval = lv >= 6 ? speedSecToMs(normalizedSpeedSec * 0.58, { minMs: 380, maxMs: 3500 }) : interval;
    const travelMult = 1.95 + lv * 0.035;

    const g: BwGame = {
      running: true,
      timeLeft: durationSec,
      beats: [], particles: [],
      stims: 0, combo: 0, maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      lastColor: -1, repeatCount: 0,
      flashQuad: -1, flashAlpha: 0,
      shake: 0, coachScale: 1, coachOpacity: 0.62, coachUntil: 0,
      nextHitAt: 0, currentInterval: interval, minInterval, endsAtMs: 0,
      raf: null, timer: null,
      isLow: staticPerfTier === 'low',
      cx: 0, cy: 0, targetR: 260, W: 0, H: 0, dpr: 1,
    };
    gRef.current = g;

    const calcLayout = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const r = setupCanvas(cv, w, h);
      g.dpr = r.dpr; g.W = r.cssW; g.H = r.cssH;
      g.cx = w / 2; g.cy = h / 2;
      g.targetR = Math.max(185, Math.min(430, Math.min(w, h) * 0.38));
    };

    const ensureAudio = () => {
      if (!soundOnRef.current) return;
      if (!audioCtxRef.current) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current.state === 'suspended') void audioCtxRef.current.resume();
    };

    const playTone = (ci: number) => {
      if (!soundOnRef.current || !audioCtxRef.current) return;
      const ac = audioCtxRef.current;
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(([523.25, 587.33, 659.25, 783.99] as const)[ci as 0|1|2|3], t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(ac.destination);
      osc.start(t); osc.stop(t + 0.28);
    };

    const playKick = (ci: number) => {
      if (!soundOnRef.current || !audioCtxRef.current) return;
      const ac = audioCtxRef.current;
      const t = ac.currentTime;
      const sub = ac.createOscillator();
      const sg = ac.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, t);
      sub.frequency.exponentialRampToValueAtTime(42, t + 0.25);
      sg.gain.setValueAtTime(0, t);
      sg.gain.linearRampToValueAtTime(0.52, t + 0.012);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      sub.connect(sg).connect(ac.destination);
      sub.start(t); sub.stop(t + 0.38);
      const click = ac.createOscillator();
      const cg = ac.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(([1047, 1175, 1319, 1568] as const)[ci as 0|1|2|3], t);
      cg.gain.setValueAtTime(0, t);
      cg.gain.linearRampToValueAtTime(0.17, t + 0.006);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      click.connect(cg).connect(ac.destination);
      click.start(t); click.stop(t + 0.1);
    };

    const updateHudTime = () => {
      const sec = g.timeLeft;
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(sec <= 10);
    };

    const updateCue = (now: number) => {
      const el = cueRef.current;
      if (!el) return;
      const upcoming = g.beats
        .filter(b => !b.hit && !b.dead && b.hitAt >= now - 80)
        .sort((a, b) => a.hitAt - b.hitAt)
        .slice(0, 5);
      let html = '<span class="bwt-cue-label">NEXT</span>';
      upcoming.forEach((beat, i) => {
        const c = C[beat.colorIdx as 0|1|2|3];
        html += `<div class="bwt-chip${i === 0 ? ' main' : ''}" style="background:${c.hex};color:${c.textColor}">${c.short}</div>`;
      });
      el.innerHTML = html;
    };

    const showCombo = (n: number) => {
      const pop = comboRef.current;
      const cn = comboNRef.current;
      if (!pop || !cn) return;
      cn.textContent = String(n);
      pop.classList.remove('show');
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        pop.classList.add('show');
        const el = pop as HTMLDivElement & { _ct?: ReturnType<typeof setTimeout> };
        clearTimeout(el._ct);
        el._ct = setTimeout(() => pop.classList.remove('show'), 660);
      }));
    };

    const spawnParticles = (ci: number) => {
      if (g.isLow) return;
      const col = C[ci as 0|1|2|3].hex;
      for (let i = 0; i < 22; i++) {
        const angle = (Math.PI * 2 * i / 22) + Math.random() * 0.22;
        const spd = 2 + Math.random() * 4.8;
        g.particles.push({
          x: g.cx + Math.cos(angle) * g.targetR,
          y: g.cy + Math.sin(angle) * g.targetR,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          life: 1, color: col, size: 2.5 + Math.random() * 5,
        });
      }
    };

    const scheduleBeats = (now: number) => {
      while (g.nextHitAt < now + 5500) {
        let ci: number;
        if (g.lastColor >= 0 && g.repeatCount >= 1) {
          const cands = [0, 1, 2, 3].filter(x => x !== g.lastColor);
          ci = cands[Math.floor(Math.random() * cands.length)]!;
          g.repeatCount = 0;
        } else {
          ci = Math.floor(Math.random() * 4);
          g.repeatCount = ci === g.lastColor ? g.repeatCount + 1 : 0;
        }
        g.lastColor = ci;
        const travel = Math.max(700, Math.min(2800, g.currentInterval * travelMult));
        g.beats.push({ colorIdx: ci, hitAt: g.nextHitAt, spawnAt: g.nextHitAt - travel, travel, hit: false, pinged: false, dead: false });
        g.nextHitAt += g.currentInterval;
        if (lv >= 6) g.currentInterval = Math.max(g.currentInterval * 0.988, g.minInterval);
      }
    };

    const triggerBeat = (beat: BwBeat, now: number) => {
      beat.hit = true;
      const ci = beat.colorIdx as 0|1|2|3;
      const color = C[ci];
      g.stims++;
      g.combo++;
      g.laneCount[ci]++;
      if (g.combo > g.maxCombo) {
        g.maxCombo = g.combo;
        if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
      }
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      g.flashQuad = ci;
      g.flashAlpha = 1;
      g.shake = g.isLow ? 0 : Math.min(5 + lv, 10);
      g.coachScale = 1.1;
      g.coachOpacity = 0.92;
      g.coachUntil = now + 380;
      if (coachTitleRef.current) {
        coachTitleRef.current.textContent = color.name;
        (coachTitleRef.current as HTMLElement).style.color = color.hex;
      }
      if (coachSubRef.current) coachSubRef.current.textContent = '이동!';
      if (coachCardRef.current) {
        coachCardRef.current.style.borderColor = color.hex;
        coachCardRef.current.style.boxShadow = `0 0 32px ${color.hex}44,0 14px 54px rgba(0,0,0,.22)`;
      }
      if (g.combo >= 5 && g.combo % 5 === 0) showCombo(g.combo);
      spawnParticles(ci);
      playKick(ci);
    };

    const drawBase = (ctx: CanvasRenderingContext2D) => {
      const { W, H, cx, cy } = g;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C[0].dim; ctx.fillRect(0, 0, cx, cy);
      ctx.fillStyle = C[1].dim; ctx.fillRect(cx, 0, W - cx, cy);
      ctx.fillStyle = C[2].dim; ctx.fillRect(0, cy, cx, H - cy);
      ctx.fillStyle = C[3].dim; ctx.fillRect(cx, cy, W - cx, H - cy);

      if (g.flashQuad >= 0 && g.flashAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = g.flashAlpha;
        ctx.fillStyle = C[g.flashQuad as 0|1|2|3].hex;
        const q = g.flashQuad;
        if (q === 0) ctx.fillRect(0, 0, cx, cy);
        else if (q === 1) ctx.fillRect(cx, 0, W - cx, cy);
        else if (q === 2) ctx.fillRect(0, cy, cx, H - cy);
        else ctx.fillRect(cx, cy, W - cx, H - cy);
        ctx.restore();
        g.flashAlpha *= 0.84;
        if (g.flashAlpha < 0.01) { g.flashAlpha = 0; g.flashQuad = -1; }
      }

      if (!g.isLow) {
        const grad = ctx.createRadialGradient(cx, cy, g.targetR * 0.28, cx, cy, Math.max(W, H) * 0.72);
        grad.addColorStop(0, 'rgba(255,255,255,.02)');
        grad.addColorStop(0.45, 'rgba(0,0,0,.08)');
        grad.addColorStop(1, 'rgba(0,0,0,.44)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      const dw = Math.max(8, Math.min(W, H) * 0.014);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = dw;
      ctx.beginPath();
      ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
      ctx.moveTo(0, cy); ctx.lineTo(W, cy);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (!g.isLow) {
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const fs = Math.max(44, Math.min(W, H) * 0.085);
        ctx.font = `900 ${fs}px Barlow Condensed,sans-serif`;
        ctx.globalAlpha = 0.13;
        const qp: [number, number][] = [[cx * .5, cy * .55], [cx * 1.5, cy * .55], [cx * .5, cy * 1.45], [cx * 1.5, cy * 1.45]];
        C.forEach((c, i) => { ctx.fillStyle = c.hex; ctx.fillText(c.name, qp[i]![0], qp[i]![1]); });
        ctx.restore();
      }
    };

    const drawTargetRing = (ctx: CanvasRenderingContext2D, now: number) => {
      const { cx, cy, targetR } = g;
      ctx.save();
      ctx.translate(cx, cy);
      const pulse = 1 + Math.sin(now / 240) * 0.01;
      ctx.scale(pulse, pulse);
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(0, 0, targetR + 10, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 20;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, targetR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.46)'; ctx.lineWidth = 8;
      ctx.setLineDash([28, 12]); ctx.stroke(); ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(0, 0, Math.max(36, targetR * 0.19), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    };

    const drawBeat = (ctx: CanvasRenderingContext2D, beat: BwBeat, now: number) => {
      if (now < beat.spawnAt) return;
      const progress = (now - beat.spawnAt) / beat.travel;
      if (progress >= 1 && !beat.hit) triggerBeat(beat, now);
      if (progress > 1.22) { beat.dead = true; return; }
      if (!beat.pinged && progress > 0.02) { beat.pinged = true; playTone(beat.colorIdx); }

      const ci = beat.colorIdx as 0|1|2|3;
      const color = C[ci];
      const after = Math.max(0, progress - 1);
      const alpha = progress <= 1 ? 1 : Math.max(0, 1 - after * 4.2);
      const radius = g.targetR * Math.min(progress, 1.055);
      const approach = Math.max(0, Math.min(1, (progress - 0.66) / 0.34));
      const lw = Math.max(24, Math.min(36, 35 - progress * 4)) + approach * 12;

      ctx.save();
      ctx.translate(g.cx, g.cy);

      if (!g.isLow) {
        ctx.globalAlpha = alpha * (0.22 + approach * 0.14);
        ctx.shadowColor = color.hex; ctx.shadowBlur = 55 + approach * 65;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color.hex; ctx.lineWidth = lw * 2.1;
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      ctx.shadowColor = color.hex; ctx.shadowBlur = g.isLow ? 0 : 40 + approach * 75;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color.hex; ctx.lineWidth = lw;
      ctx.stroke();

      ctx.shadowBlur = g.isLow ? 0 : 8; ctx.shadowColor = '#fff';
      ctx.globalAlpha = alpha * 0.84;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(4, radius - lw * 0.33), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.82)';
      ctx.lineWidth = Math.max(3.5, Math.min(8.5, lw * 0.18));
      ctx.stroke();

      if (approach > 0 && !g.isLow) {
        ctx.shadowColor = color.hex; ctx.shadowBlur = 50;
        ctx.globalAlpha = approach * 0.66;
        ctx.beginPath();
        ctx.arc(0, 0, g.targetR + 13, 0, Math.PI * 2);
        ctx.strokeStyle = color.hex; ctx.lineWidth = 22;
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawParticles = (ctx: CanvasRenderingContext2D) => {
      if (!g.particles.length) return;
      ctx.save();
      for (const p of g.particles) {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        p.life *= 0.91;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12; ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      g.particles = g.particles.filter(p => p.life > 0.04);
    };

    let lastCueMs = 0;
    const loop = (now: number) => {
      if (!g.running) return;
      const perf = perfRef.current;
      if (perf) { perf.tick(now); if (perf.isLow) g.isLow = true; }

      drawCtx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      scheduleBeats(now);

      drawCtx.save();
      if (g.shake > 0) {
        drawCtx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
        g.shake *= 0.76;
        if (g.shake < 0.4) g.shake = 0;
      }
      drawBase(drawCtx);
      drawTargetRing(drawCtx, now);
      for (const beat of g.beats) drawBeat(drawCtx, beat, now);
      g.beats = g.beats.filter(b => !b.dead);
      drawParticles(drawCtx);
      drawCtx.restore();

      g.coachScale += (1 - g.coachScale) * 0.12;
      g.coachOpacity += ((now < g.coachUntil ? 0.92 : 0.44) - g.coachOpacity) * 0.08;
      const card = coachCardRef.current;
      if (card) {
        card.style.transform = `scale(${g.coachScale.toFixed(3)})`;
        card.style.opacity = g.coachOpacity.toFixed(3);
      }
      if (now > g.coachUntil && g.coachUntil > 0 && coachSubRef.current?.textContent === '이동!') {
        coachSubRef.current.textContent = '다음 이동 준비';
      }

      if (now - lastCueMs > 90) { lastCueMs = now; updateCue(now); }

      g.raf = requestAnimationFrame(loop);
    };

    const startId = window.setTimeout(() => {
      if (!g.running) return;
      calcLayout();
      const nowMs = performance.now();
      const firstTravel = Math.max(700, Math.min(2800, interval * travelMult));
      g.nextHitAt = nowMs + firstTravel + 420 + (7 - lv) * 16;
      g.endsAtMs = durationSec > 0 ? nowMs + durationSec * 1000 : Infinity;
      updateHudTime();
      if (hudStimsRef.current) hudStimsRef.current.textContent = '0';
      if (hudMaxRef.current) hudMaxRef.current.textContent = '0';
      ensureAudio();
      g.timer = durationSec > 0 ? setInterval(() => {
        const left = Math.max(0, Math.ceil((g.endsAtMs - performance.now()) / 1000));
        if (left !== g.timeLeft) { g.timeLeft = left; updateHudTime(); }
        if (left <= 0) { clearInterval(g.timer!); g.timer = null; endGame(); }
      }, 250) : null;
      g.raf = requestAnimationFrame(loop);
    }, 60);

    const onResize = () => calcLayout();
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(startId);
      window.removeEventListener('resize', onResize);
      g.running = false;
      if (g.raf != null) cancelAnimationFrame(g.raf);
      if (g.timer) clearInterval(g.timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationSec, lv, normalizedSpeedSec]);

  return (
    <div className="bwt">
      <style>{css}</style>
      <div className="bwt-hud">
        <div className="bwt-hc">
          <div className="bwt-hk">TIME</div>
          <div ref={hudTimeRef} className={`bwt-hv${warn ? ' warn' : ''}`}>00:00</div>
        </div>
        <div className="bwt-hc">
          <div className="bwt-hk">STIMS</div>
          <div ref={hudStimsRef} className="bwt-hv">0</div>
        </div>
        <div className="bwt-hc grow">
          <div className="bwt-hk">MAX STREAK</div>
          <div ref={hudMaxRef} className="bwt-hv">0</div>
        </div>
        <div className="bwt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <div className="bwt-btns">
            <button type="button" className="bwt-sound" onClick={() => setSoundOn(v => !v)}>
              {soundOn ? '소리 ON' : '소리 OFF'}
            </button>
            <button type="button" className="bwt-stop" onClick={stopGame}>STOP</button>
          </div>
        </div>
      </div>
      <div ref={playRef} className="bwt-play">
        <canvas ref={cvRef} className="bwt-canvas" />
        <div className="bwt-coach">
          <div ref={coachCardRef} className="bwt-card">
            <div ref={coachTitleRef} className="bwt-card-title" style={{ color: '#fff' }}>READY</div>
            <div ref={coachSubRef} className="bwt-card-sub">패드 위에 서면 시작</div>
          </div>
        </div>
        <div ref={cueRef} className="bwt-cue">
          <span className="bwt-cue-label">NEXT</span>
        </div>
        <div ref={comboRef} className="bwt-combo">
          <div ref={comboNRef} className="bwt-combo-n">0</div>
          <div className="bwt-combo-w">COMBO</div>
        </div>
      </div>
    </div>
  );
}
