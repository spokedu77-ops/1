'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';
import { normalizeReactSpeedSec } from '../lib/reactTrainTiming';

const C = [
  { main: '#FF1744', rgb: '255,23,68', name: 'RED' },
  { main: '#FFD600', rgb: '255,214,0', name: 'YEL' },
  { main: '#2979FF', rgb: '41,121,255', name: 'BLU' },
  { main: '#00E676', rgb: '0,230,118', name: 'GRN' },
] as const;

type Seg = {
  ci: number;
  z: number;
  len: number;
  speed: number;
  fired: boolean;
  dead: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  dec: number;
  r: number;
};

type RushState = {
  running: boolean;
  timeLeft: number;
  stims: number;
  combo: number;
  maxCombo: number;
  laneCount: [number, number, number, number];
  segSpeed: number;
  spawnTimer: number;
  spawnInterval: number;
  lastTime: number;
  segments: Seg[];
  particles: Particle[];
  timer: ReturnType<typeof setInterval> | null;
  raf: number | null;
  W: number;
  H: number;
  playTop: number;
  playBot: number;
  vpX: number;
  vpY: number;
  hitY: number;
  railHalfW: number;
  railVPHalfW: number;
};

const css = `
.rrt{--bg:#04030A;position:fixed;inset:0;height:100dvh;max-height:100dvh;background:var(--bg);color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.rrt,.rrt *{box-sizing:border-box}
.rrt-hud{height:72px;display:flex;align-items:stretch;background:rgba(4,3,10,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30}
.rrt-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.rrt-hc.grow{flex:1;align-items:center;border-right:none}
.rrt-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.rrt-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.rrt-hv.warn{animation:rrtw .5s ease-in-out infinite}
@keyframes rrtw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.rrt-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer}
.rrt-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.rrt-play{position:relative;flex:1;min-height:0}
.rrt-cv{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:10}
.rrt-pads{position:absolute;bottom:0;left:0;right:0;height:clamp(70px,10vh,88px);z-index:20;display:flex;border-top:2px solid rgba(255,255,255,.05);padding-bottom:max(0px,env(safe-area-inset-bottom))}
.rrt-pad{flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;border-right:1px solid rgba(255,255,255,.04);transition:background .08s}
.rrt-pad:last-child{border-right:none}
.rrt-pad-dot{width:clamp(6px,1.2vw,10px);height:clamp(6px,1.2vw,10px);border-radius:50%;opacity:.18;transition:all .08s}
.rrt-pad-label{font-family:Bebas Neue,sans-serif;font-size:clamp(12px,2vw,18px);letter-spacing:.1em;opacity:.2;transition:opacity .08s}
.rrt-pad[data-c="0"] .rrt-pad-dot,.rrt-pad[data-c="0"] .rrt-pad-label{background:#FF1744;color:#FF1744}
.rrt-pad[data-c="1"] .rrt-pad-dot,.rrt-pad[data-c="1"] .rrt-pad-label{background:#FFD600;color:#FFD600}
.rrt-pad[data-c="2"] .rrt-pad-dot,.rrt-pad[data-c="2"] .rrt-pad-label{background:#2979FF;color:#2979FF}
.rrt-pad[data-c="3"] .rrt-pad-dot,.rrt-pad[data-c="3"] .rrt-pad-label{background:#00E676;color:#00E676}
.rrt-pad.lit .rrt-pad-dot{opacity:1;box-shadow:0 0 14px 3px currentColor;transform:scale(1.5)}
.rrt-pad.lit .rrt-pad-label{opacity:1}
.rrt-combo{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%) scale(.7);z-index:40;text-align:center;pointer-events:none;opacity:0;transition:opacity .08s,transform .15s cubic-bezier(.34,1.56,.64,1)}
.rrt-combo.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.rrt-combo-n{font-family:Bebas Neue,sans-serif;font-size:clamp(60px,12vw,110px);color:#fff;text-shadow:0 0 40px rgba(255,255,255,.5);line-height:1}
.rrt-combo-w{font-size:clamp(10px,1.8vw,14px);font-weight:700;letter-spacing:.35em;color:rgba(255,255,255,.4)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function project(g: RushState, z: number, laneOffset: number) {
  const t = Math.pow(z, 0.7);
  const x = g.vpX + laneOffset * (g.railHalfW * (1 - t) + g.railVPHalfW * t) * 2;
  const y = g.hitY - (g.hitY - g.vpY) * t;
  return { x, y };
}

export function RushReactionTraining({ durationSec, speedSec, onExit, onComplete }: Props) {
  const uid = useId();
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<RushState | null>(null);
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

    // z 이동 0.8 구간을 speedSec 동안 통과하도록 맞춘다.
    const normalizedSpeedSec = normalizeReactSpeedSec(speedSec);
    const segSpeed = 0.8 / normalizedSpeedSec;
    const spawnInterval = normalizedSpeedSec;

    const g: RushState = {
      running: true,
      timeLeft: Math.max(1, durationSec),
      stims: 0,
      combo: 0,
      maxCombo: 0,
      laneCount: [0, 0, 0, 0],
      segSpeed,
      spawnTimer: 0.6,
      spawnInterval,
      lastTime: performance.now(),
      segments: [],
      particles: [],
      timer: null,
      raf: null,
      W: 0,
      H: 0,
      playTop: 72,
      playBot: 0,
      vpX: 0,
      vpY: 0,
      hitY: 0,
      railHalfW: 0,
      railVPHalfW: 0,
    };
    gRef.current = g;

    let dpr = 1;
    const resize = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const result = setupCanvas(cv, w, h);
      dpr = result.dpr;
      g.W = result.cssW;
      g.H = result.cssH;
      const padH = Math.max(70, Math.min(88, h * 0.1));
      g.playTop = 72;
      g.playBot = h - padH;
      g.vpX = w / 2;
      g.vpY = g.playTop + (g.playBot - g.playTop) * 0.28;
      g.hitY = g.playBot - (g.playBot - g.playTop) * 0.12;
      g.railHalfW = w * 0.38;
      g.railVPHalfW = w * 0.018;
    };

    const updateHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };

    const flashPad = (lane: number) => {
      const p = padRefs.current[lane];
      if (!p) return;
      p.classList.add('lit');
      const pp = p as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
      clearTimeout(pp._t);
      pp._t = setTimeout(() => p.classList.remove('lit'), 260);
    };

    const onStim = (lane: number) => {
      g.stims += 1;
      g.combo += 1;
      g.laneCount[lane] += 1;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      if (hudStimsRef.current) hudStimsRef.current.textContent = String(g.stims);
      if (hudMaxRef.current) hudMaxRef.current.textContent = String(g.maxCombo);
      flashPad(lane);
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 10 + 3;
        g.particles.push({
          x: g.vpX + (Math.random() - 0.5) * g.railHalfW * 1.2,
          y: g.hitY,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 2,
          color: C[lane].main,
          life: 1,
          dec: 0.024 + Math.random() * 0.02,
          r: 2 + Math.random() * 5,
        });
      }
      if (g.combo >= 5 && g.combo % 5 === 0 && comboRef.current && comboNRef.current) {
        comboNRef.current.textContent = String(g.combo);
        comboRef.current.classList.remove('show');
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = comboRef.current;
            if (!el) return;
            el.classList.add('show');
            const rr = el as HTMLDivElement & { _t?: ReturnType<typeof setTimeout> };
            clearTimeout(rr._t);
            rr._t = setTimeout(() => el.classList.remove('show'), 650);
          })
        );
      }
    };

    const spawnSegment = () => {
      const active = new Set(g.segments.map((s) => s.ci));
      const avail = [0, 1, 2, 3].filter((i) => !active.has(i));
      if (!avail.length) return;
      const ci = avail[Math.floor(Math.random() * avail.length)] ?? 0;
      g.segments.push({
        ci,
        z: 0.82 + Math.random() * 0.15,
        len: 0.18,
        speed: g.segSpeed,
        fired: false,
        dead: false,
      });
    };

    const drawBackground = () => {
      const grd = ctx.createLinearGradient(0, g.playTop, 0, g.playBot);
      grd.addColorStop(0, '#04030A');
      grd.addColorStop(0.5, '#060412');
      grd.addColorStop(1, '#080616');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, g.W, g.H);
    };

    const drawRail = () => {
      const hitL = project(g, 0, -0.5);
      const hitR = project(g, 0, 0.5);
      const vpL = project(g, 1, -0.5);
      const vpR = project(g, 1, 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.beginPath();
      ctx.moveTo(vpL.x, vpL.y);
      ctx.lineTo(vpR.x, vpR.y);
      ctx.lineTo(hitR.x, hitR.y);
      ctx.lineTo(hitL.x, hitL.y);
      ctx.closePath();
      ctx.fill();
    };

    const drawSegment = (s: Seg) => {
      const zF = Math.max(0, s.z);
      const zB = Math.min(1.02, s.z + s.len);
      const pFL = project(g, zF, -0.5);
      const pFR = project(g, zF, 0.5);
      const pBL = project(g, zB, -0.5);
      const pBR = project(g, zB, 0.5);
      const col = C[s.ci];
      const near = 1 - Math.max(0, s.z);
      const grd = ctx.createLinearGradient(0, pFR.y, 0, pBR.y);
      grd.addColorStop(0, col.main);
      grd.addColorStop(1, `rgba(${col.rgb},0.5)`);
      ctx.save();
      ctx.shadowColor = col.main;
      ctx.shadowBlur = 20 * near;
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(pBL.x, pBL.y);
      ctx.lineTo(pBR.x, pBR.y);
      ctx.lineTo(pFR.x, pFR.y);
      ctx.lineTo(pFL.x, pFL.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawHitLine = () => {
      const pL = project(g, 0, -0.5);
      const pR = project(g, 0, 0.5);
      ctx.save();
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();
      ctx.restore();
    };

    const updateParticles = (dt: number) => {
      const t = dt * 60;
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.x += p.vx * t;
        p.y += p.vy * t;
        p.vy += 0.18 * t;
        p.vx *= Math.pow(0.97, t);
        p.life -= p.dec * t;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (p.life <= 0) g.particles.splice(i, 1);
      }
    };

    const drawTopFade = () => {
      const gd = ctx.createLinearGradient(0, 0, 0, 110);
      gd.addColorStop(0, '#04030A');
      gd.addColorStop(1, 'transparent');
      ctx.fillStyle = gd;
      ctx.fillRect(0, 0, g.W, 110);
    };

    const loop = (now: number) => {
      if (!g.running) return;
      const dt = Math.min((now - g.lastTime) / 1000, 0.05);
      g.lastTime = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, g.W, g.H);

      drawBackground();
      drawRail();

      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        spawnSegment();
        // N/N+1 간격 완화: 음수 지터 제거 + 추가 최소 간격 12%
        const relaxed = g.spawnInterval * (1.12 + Math.random() * 0.22);
        g.spawnTimer = relaxed;
      }

      g.segments.sort((a, b) => b.z - a.z);
      for (let i = g.segments.length - 1; i >= 0; i--) {
        const s = g.segments[i];
        s.speed = g.segSpeed;
        s.z -= s.speed * dt;
        if (!s.fired && s.z <= 0.02) {
          s.fired = true;
          s.dead = true;
          onStim(s.ci);
        }
        if (s.z + s.len < -0.1) s.dead = true;
        if (!s.dead) drawSegment(s);
        if (s.dead) g.segments.splice(i, 1);
      }

      drawHitLine();
      updateParticles(dt);
      drawTopFade();
      g.raf = requestAnimationFrame(loop);
    };

    resize();
    updateHudTime();
    if (hudStimsRef.current) hudStimsRef.current.textContent = '0';
    if (hudMaxRef.current) hudMaxRef.current.textContent = '0';
    const endsAtMs = performance.now() + durationSec * 1000;
    g.timer = setInterval(() => {
      const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
      if (g.timeLeft !== newLeft) { g.timeLeft = newLeft; updateHudTime(); }
      if (g.timeLeft <= 0) { if (g.timer) clearInterval(g.timer); g.timer = null; endGame(); }
    }, 250);
    g.raf = requestAnimationFrame(loop);

    const unbindResize = bindViewportResize(play, resize);
    return () => {
      unbindResize();
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
    };
  }, [durationSec, endGame, speedSec]);

  return (
    <div className="rrt">
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Noto+Sans+KR:wght@500;700;900&display=swap');",
        }}
      />
      <style>{css}</style>
      <div className="rrt-hud">
        <div className="rrt-hc">
          <div className="rrt-hk">Time</div>
          <div ref={hudTimeRef} className={`rrt-hv${warn ? ' warn' : ''}`} />
        </div>
        <div className="rrt-hc">
          <div className="rrt-hk">Stims</div>
          <div ref={hudStimsRef} className="rrt-hv" />
        </div>
        <div className="rrt-hc grow">
          <div className="rrt-hk">Max Streak</div>
          <div ref={hudMaxRef} className="rrt-hv" />
        </div>
        <div className="rrt-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="rrt-stop" onClick={stopGame}>
            STOP
          </button>
        </div>
      </div>

      <div ref={playRef} className="rrt-play">
        <canvas ref={cvRef} className="rrt-cv" />
        <div className="rrt-pads">
          {[0, 1, 2, 3].map((lane) => (
            <div
              key={uid + 'p' + lane}
              className="rrt-pad"
              data-c={lane}
              ref={(el) => {
                padRefs.current[lane] = el;
              }}
            >
              <div className="rrt-pad-dot" />
              <div className="rrt-pad-label">{C[lane].name}</div>
            </div>
          ))}
        </div>
        <div className="rrt-combo" ref={comboRef}>
          <div className="rrt-combo-n" ref={comboNRef}>
            0
          </div>
          <div className="rrt-combo-w">COMBO</div>
        </div>
      </div>
    </div>
  );
}
