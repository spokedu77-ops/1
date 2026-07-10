'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';
import { speedSecToMs } from '../lib/reactTrainTiming';

const COLORS = [
  { main: '#FF1744', name: 'RED' },
  { main: '#FFD600', name: 'YEL' },
  { main: '#2979FF', name: 'BLU' },
  { main: '#00E676', name: 'GRN' },
] as const;

type PulseGameState = {
  running: boolean;
  timeLeft: number;
  pulsePeriod: number;
  lastPulseAt: number;
  maxR: number;
  centerX: number;
  centerY: number;
  W: number;
  H: number;
  rings: PulseRing[];
  particles: PulseParticle[];
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  timer: ReturnType<typeof setInterval> | null;
  raf: number | null;
};

class PulseRing {
  lane: number;
  startAt: number;
  duration: number;
  progress = 0;
  fired = false;
  dead = false;

  constructor(lane: number, startAt: number, duration: number) {
    this.lane = lane;
    this.startAt = startAt;
    this.duration = duration;
  }

  update(now: number) {
    const t = Math.min(1, (now - this.startAt) / this.duration);
    this.progress = t;
    if (!this.fired && t >= 0.96) {
      this.fired = true;
      this.dead = true;
    }
  }
}

class PulseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  dec: number;
  radius: number;

  constructor(x: number, y: number, centerX: number, centerY: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    const toCenter = Math.atan2(centerY - y, centerX - x);
    const spread = (Math.random() - 0.5) * 1.8;
    const speed = 3 + Math.random() * 7;
    this.vx = Math.cos(toCenter + spread) * speed;
    this.vy = Math.sin(toCenter + spread) * speed;
    this.life = 1;
    this.dec = 0.02 + Math.random() * 0.02;
    this.radius = 1.5 + Math.random() * 4.5;
  }

  update(dt: number) {
    const t = dt * 60;
    this.x += this.vx * t;
    this.y += this.vy * t;
    this.vx *= Math.pow(0.97, t);
    this.vy = this.vy * Math.pow(0.97, t) + 0.12 * t;
    this.life -= this.dec * t;
  }
}

const css = `
.prt{--bg:#07070F;position:fixed;inset:0;height:100dvh;max-height:100dvh;background:var(--bg);color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.prt,.prt *{box-sizing:border-box}
.prt-hud{height:72px;display:flex;align-items:stretch;background:rgba(7,7,15,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:20}
.prt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.prt-hc.grow{flex:1;align-items:center;border-right:none}
.prt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.prt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.prt-hv.warn{animation:prtw .5s ease-in-out infinite}
@keyframes prtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.prt-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer}
.prt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.prt-play{position:relative;flex:1;min-height:0}
.prt-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
.prt-pads{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;pointer-events:none}
.prt-pad{opacity:0;transition:opacity .06s}
.prt-pad.lit{opacity:1}
.prt-pad[data-l="0"]{background:radial-gradient(ellipse 82% 82% at 20% 20%, rgba(255,23,68,.55) 0%, transparent 72%)}
.prt-pad[data-l="1"]{background:radial-gradient(ellipse 82% 82% at 80% 20%, rgba(255,214,0,.55) 0%, transparent 72%)}
.prt-pad[data-l="2"]{background:radial-gradient(ellipse 82% 82% at 20% 80%, rgba(41,121,255,.55) 0%, transparent 72%)}
.prt-pad[data-l="3"]{background:radial-gradient(ellipse 82% 82% at 80% 80%, rgba(0,230,118,.55) 0%, transparent 72%)}
.prt-label{position:absolute;font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(16px,3vw,28px);letter-spacing:.1em;opacity:.14;transition:opacity .08s;pointer-events:none}
.prt-label.lit{opacity:1}
.prt-label.l0{top:16px;left:16px;color:#FF1744}
.prt-label.l1{top:16px;right:16px;color:#FFD600}
.prt-label.l2{bottom:max(16px,env(safe-area-inset-bottom));left:16px;color:#2979FF}
.prt-label.l3{bottom:max(16px,env(safe-area-inset-bottom));right:16px;color:#00E676}
.prt-combo{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%) scale(.7);opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1);pointer-events:none;z-index:15;text-align:center}
.prt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.prt-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(72px,14vw,132px);line-height:1;color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5)}
.prt-combo-w{font-size:clamp(10px,1.8vw,15px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.45)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

export function PulseReactionTraining({ durationSec, speedSec, onExit, onComplete }: Props) {
  const uid = useId();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<PulseGameState | null>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudStimsRef = useRef<HTMLDivElement>(null);
  const hudMaxRef = useRef<HTMLDivElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const comboNRef = useRef<HTMLDivElement>(null);
  const padRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [warn, setWarn] = useState(false);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    if (g.raf != null) cancelAnimationFrame(g.raf);
    const stats: ReactTrainCompleteStats = {
      stims: g.stims,
      maxCombo: g.maxCombo,
      laneCount: [...g.laneCount] as [number, number, number, number],
    };
    onComplete(stats);
  }, [onComplete]);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.timer) clearInterval(g.timer);
    if (g.raf != null) cancelAnimationFrame(g.raf);
    onExit();
  }, [onExit]);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const pulsePeriod = speedSecToMs(speedSec, { minMs: 700, maxMs: 6000 });
    const g: PulseGameState = {
      running: true,
      timeLeft: Math.max(1, durationSec),
      pulsePeriod,
      lastPulseAt: 0,
      maxR: 0,
      centerX: 0,
      centerY: 0,
      W: 0,
      H: 0,
      rings: [],
      particles: [],
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      timer: null,
      raf: null,
    };
    gRef.current = g;

    const cornerPos = (lane: number) => {
      if (lane === 0) return { x: 0, y: 0 };
      if (lane === 1) return { x: g.W, y: 0 };
      if (lane === 2) return { x: 0, y: g.H };
      return { x: g.W, y: g.H };
    };

    const resize = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const result = setupCanvas(cv, w, h);
      dpr = result.dpr;
      g.W = result.cssW;
      g.H = result.cssH;
      g.centerX = g.W / 2;
      g.centerY = g.H / 2;
      g.maxR = Math.sqrt(g.centerX * g.centerX + g.centerY * g.centerY);
    };

    const updateHud = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };

    const lightLane = (lane: number) => {
      const pad = padRefs.current[lane];
      const label = labelRefs.current[lane];
      if (pad) {
        pad.classList.add('lit');
        const p = pad as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
        clearTimeout(p._t);
        p._t = setTimeout(() => pad.classList.remove('lit'), 220);
      }
      if (label) {
        label.classList.add('lit');
        const l = label as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
        clearTimeout(l._t);
        l._t = setTimeout(() => label.classList.remove('lit'), 220);
      }
    };

    const onStim = (lane: number) => {
      g.stims++;
      g.combo++;
      g.laneCount[lane]++;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);

      lightLane(lane);
      const corner = cornerPos(lane);
      const laneColor = COLORS[lane]?.main ?? '#fff';
      for (let i = 0; i < 28; i++) g.particles.push(new PulseParticle(corner.x, corner.y, g.centerX, g.centerY, laneColor));
      for (let i = 0; i < 8; i++) g.particles.push(new PulseParticle(corner.x, corner.y, g.centerX, g.centerY, '#ffffff'));

      if (g.combo >= 5 && g.combo % 5 === 0 && comboRef.current && comboNRef.current) {
        comboNRef.current.textContent = String(g.combo);
        comboRef.current.classList.remove('show');
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = comboRef.current;
            if (!el) return;
            el.classList.add('show');
            const t = el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
            clearTimeout(t._t);
            t._t = setTimeout(() => el.classList.remove('show'), 650);
          })
        );
      }
    };

    const drawBg = () => {
      const vig = ctx.createRadialGradient(g.centerX, g.centerY, g.maxR * 0.2, g.centerX, g.centerY, g.maxR);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, g.W, g.H);
    };

    const drawCore = () => {
      const now = performance.now();
      const phase = ((now - g.lastPulseAt) % g.pulsePeriod + g.pulsePeriod) % g.pulsePeriod;
      const p = phase / g.pulsePeriod;
      const pulse = p < 0.16 ? p / 0.16 : Math.max(0, 1 - (p - 0.16) / 0.34);
      const r = Math.max(6, Math.min(g.W, g.H) * 0.025) * (1 + pulse * 0.35);

      const glow = ctx.createRadialGradient(g.centerX, g.centerY, 0, g.centerX, g.centerY, r * 5);
      glow.addColorStop(0, `rgba(255,255,255,${0.06 + pulse * 0.08})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(g.centerX, g.centerY, r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = r * 2 * (1 + pulse);
      const core = ctx.createRadialGradient(g.centerX, g.centerY, 0, g.centerX, g.centerY, r);
      core.addColorStop(0, '#fff');
      core.addColorStop(0.5, 'rgba(255,255,255,0.86)');
      core.addColorStop(1, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(g.centerX, g.centerY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const spawnRings = (now: number) => {
      if (now - g.lastPulseAt < g.pulsePeriod) return;
      g.lastPulseAt = now;
      const active = new Set(g.rings.filter((r) => !r.dead).map((r) => r.lane));
      const available = [0, 1, 2, 3].filter((lane) => !active.has(lane));
      if (!available.length) return;
      const lane = available[Math.floor(Math.random() * available.length)] ?? 0;
      g.rings.push(new PulseRing(lane, now, g.pulsePeriod));
    };

    const updateRings = (now: number) => {
      for (let i = g.rings.length - 1; i >= 0; i--) {
        const ring = g.rings[i];
        ring.update(now);
        if (!ring.dead) {
          const radius = ring.progress * g.maxR;
          const alpha =
            ring.progress < 0.1 ? ring.progress / 0.1 : ring.progress > 0.8 ? (1 - ring.progress) / 0.2 : 1;
          const width = Math.max(4, Math.min(g.W, g.H) * 0.022) * (1 - ring.progress * 0.4);
          const color = COLORS[ring.lane]?.main ?? '#fff';
          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.shadowColor = color;
          ctx.shadowBlur = width * 3;
          ctx.beginPath();
          ctx.arc(g.centerX, g.centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (ring.fired) {
          onStim(ring.lane);
          ring.fired = false;
        }
        if (ring.dead) g.rings.splice(i, 1);
      }
    };

    const updateParticles = (dt: number) => {
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.update(dt);
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    };

    let lastFrameMs = 0;
    let dpr = 1;
    const loop = (now: number) => {
      if (!g.running) return;
      const dt = lastFrameMs > 0 ? Math.min((now - lastFrameMs) / 1000, 0.05) : 1 / 60;
      lastFrameMs = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, g.W, g.H);
      drawBg();
      spawnRings(now);
      updateRings(now);
      updateParticles(dt);
      drawCore();
      g.raf = requestAnimationFrame(loop);
    };

    resize();
    updateHud();
    if (hudStimsRef.current) hudStimsRef.current.textContent = '0';
    if (hudMaxRef.current) hudMaxRef.current.textContent = '0';
    g.lastPulseAt = performance.now() - g.pulsePeriod;
    const endsAtMs = performance.now() + durationSec * 1000;
    g.timer = setInterval(() => {
      const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
      if (g.timeLeft !== newLeft) { g.timeLeft = newLeft; updateHud(); }
      if (g.timeLeft <= 0) { if (g.timer) clearInterval(g.timer); g.timer = null; endGame(); }
    }, 250);
    g.raf = requestAnimationFrame(loop);

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
    };
  }, [durationSec, endGame, speedSec]);

  return (
    <div className="prt">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');",
        }}
      />
      <style>{css}</style>
      <div className="prt-hud">
        <div className="prt-hc">
          <div className="prt-hk">Time</div>
          <div ref={hudTimeRef} className={`prt-hv${warn ? ' warn' : ''}`} />
        </div>
        <div className="prt-hc">
          <div className="prt-hk">Stims</div>
          <div ref={hudStimsRef} className="prt-hv" />
        </div>
        <div className="prt-hc grow">
          <div className="prt-hk">Max Streak</div>
          <div ref={hudMaxRef} className="prt-hv" />
        </div>
        <div className="prt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="prt-stop" onClick={stopGame}>
            STOP
          </button>
        </div>
      </div>

      <div ref={playRef} className="prt-play">
        <canvas ref={cvRef} className="prt-cv" />
        <div className="prt-pads">
          {[0, 1, 2, 3].map((lane) => (
            <div
              key={uid + lane}
              className="prt-pad"
              data-l={lane}
              ref={(el) => {
                padRefs.current[lane] = el;
              }}
            />
          ))}
        </div>

        {COLORS.map((color, i) => (
          <div
            key={uid + 'lbl' + i}
            className={`prt-label l${i}`}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
          >
            {color.name}
          </div>
        ))}

        <div className="prt-combo" ref={comboRef}>
          <div className="prt-combo-n" ref={comboNRef}>
            0
          </div>
          <div className="prt-combo-w">COMBO</div>
        </div>
      </div>
    </div>
  );
}
