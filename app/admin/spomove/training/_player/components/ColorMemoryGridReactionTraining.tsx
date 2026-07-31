'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { setupCanvas } from '../lib/canvasUtils';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

const COLORS = [
  { name: 'RED', hex: '#ff3333' },
  { name: 'YELLOW', hex: '#ffcc00' },
  { name: 'BLUE', hex: '#3366ff' },
  { name: 'GREEN', hex: '#33cc33' },
] as const;

const GRID_SIZE = 4;
const MEMORIZE_MS = 3000;
const SEARCH_MS = 5000;
const REVEAL_MS = 1200;
const INTRO_FLASH_MS = 150;
const REVEAL_FLASH_MS = 220;

type Phase = 'MEMORIZE' | 'SEARCH' | 'REVEAL';

type Tile = {
  x: number;
  y: number;
  size: number;
  colorIdx: number;
  hiddenColorIdx: number;
  isTarget: boolean;
  pulse: number;
};

type Game = {
  running: boolean;
  phase: Phase;
  phaseStartMs: number;
  round: number;
  durationLeft: number;
  gridSize: number;
  targetIdx: number;
  tiles: Tile[];
  laneCount: [number, number, number, number];
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  roundTimer: ReturnType<typeof setTimeout> | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.cmgrid{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#0a0a0f;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.cmgrid,.cmgrid *{box-sizing:border-box}
.cmgrid-hud{height:72px;display:flex;align-items:stretch;background:rgba(10,10,15,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.1);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.cmgrid-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.1)}
.cmgrid-hc.grow{flex:1;align-items:center;border-right:none}
.cmgrid-hk{font-size:9px;font-weight:800;letter-spacing:.18em;color:rgba(255,255,255,.45);text-transform:uppercase}
.cmgrid-hv{font-size:clamp(22px,3.5vw,34px);font-weight:1000;letter-spacing:.04em;color:#fff;line-height:1.1;text-shadow:0 0 18px rgba(255,255,255,.22)}
.cmgrid-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(248,113,113,.45);background:rgba(220,38,38,.16);color:rgba(255,255,255,.82);font-size:13px;font-weight:800;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.cmgrid-play{position:relative;flex:1;min-height:0}
.cmgrid-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.cmgrid-vignette{position:absolute;inset:0;z-index:15;pointer-events:none;background:radial-gradient(circle at 50% 24%,rgba(236,72,153,.18),transparent 34%),linear-gradient(180deg,rgba(10,10,15,.1),rgba(10,10,15,.42))}
.cmgrid-flash{position:absolute;inset:0;z-index:22;pointer-events:none;background:#fff;opacity:0;transition:opacity .15s ease-out;mix-blend-mode:screen}
.cmgrid-center{position:absolute;left:50%;top:50%;z-index:24;pointer-events:none;transform:translate(-50%,-50%) scale(.5);opacity:0;transition:opacity .18s ease,transform .22s cubic-bezier(.34,1.56,.64,1);text-align:center;white-space:nowrap;font-size:clamp(44px,8vw,104px);line-height:.9;font-weight:1000;color:#fff;text-shadow:0 0 34px rgba(0,0,0,.95),0 0 20px rgba(255,255,255,.72),0 0 44px rgba(236,72,153,.8)}
.cmgrid-center.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.cmgrid-status{position:absolute;left:50%;top:clamp(10px,1.8vw,16px);transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;padding:6px 16px;border-radius:999px;background:rgba(10,10,15,.68);border:1px solid rgba(255,255,255,.16);font-family:monospace;font-size:clamp(10px,1.35vw,13px);letter-spacing:.06em;color:#f9a8d4;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.24);backdrop-filter:blur(10px)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export function ColorMemoryGridReactionTraining({
  durationSec,
  onComplete,
}: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<Game | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (g.roundTimer) clearTimeout(g.roundTimer);
    onCompleteRef.current({
      stims: Math.max(0, g.round - 1),
      maxCombo: Math.max(0, g.round - 1),
      laneCount: [...g.laneCount],
    });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const g: Game = {
      running: true,
      phase: 'MEMORIZE',
      phaseStartMs: performance.now(),
      round: 1,
      durationLeft: Math.max(5, Math.round(durationSec)),
      gridSize: GRID_SIZE,
      targetIdx: 0,
      tiles: [],
      laneCount: [0, 0, 0, 0],
      raf: null,
      timer: null,
      roundTimer: null,
    };
    gRef.current = g;

    const setStatus = (text: string, color = '#f9a8d4') => {
      if (!statusRef.current) return;
      statusRef.current.textContent = text;
      statusRef.current.style.color = color;
    };
    const cue = (text: string, ms = 680) => {
      const el = centerRef.current;
      if (!el) return;
      el.textContent = text;
      el.classList.add('show');
      window.setTimeout(() => el.classList.remove('show'), ms);
    };
    const flash = (color = '#ffffff', opacity = '0.78', ms = 140) => {
      const el = flashRef.current;
      if (!el) return;
      el.style.background = color;
      el.style.opacity = opacity;
      window.setTimeout(() => {
        if (flashRef.current) flashRef.current.style.opacity = '0';
      }, ms);
    };

    const layoutTiles = () => {
      const W = play.clientWidth || window.innerWidth;
      const H = play.clientHeight || window.innerHeight;
      const n = g.gridSize;
      const usable = Math.min(W * 0.78, H * 0.72);
      const gap = Math.max(8, usable * 0.025);
      const size = (usable - gap * (n - 1)) / n;
      const startX = (W - usable) / 2;
      const startY = (H - usable) / 2 + H * 0.02;
      g.tiles = Array.from({ length: n * n }, (_, idx) => {
        const colorIdx = Math.floor(Math.random() * COLORS.length);
        return {
          x: startX + (idx % n) * (size + gap),
          y: startY + Math.floor(idx / n) * (size + gap),
          size,
          colorIdx,
          hiddenColorIdx: Math.floor(Math.random() * COLORS.length),
          isTarget: false,
          pulse: Math.random() * Math.PI * 2,
        };
      });
      g.targetIdx = Math.floor(Math.random() * g.tiles.length);
      const target = g.tiles[g.targetIdx]!;
      target.isTarget = true;
      target.hiddenColorIdx = target.colorIdx;
    };

    const startRound = () => {
      if (!g.running) return;
      setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      layoutTiles();
      g.phase = 'MEMORIZE';
      g.phaseStartMs = performance.now();
      if (roundRef.current) roundRef.current.textContent = String(g.round);
      setStatus(`색을 기억하세요 · ${g.gridSize}x${g.gridSize}`, '#f9a8d4');
      flash('#ffffff', '0.78', INTRO_FLASH_MS);
      cue('기억하세요');
      g.roundTimer = setTimeout(() => {
        if (!g.running) return;
        g.phase = 'SEARCH';
        g.phaseStartMs = performance.now();
        setStatus('색이 바뀐 타일을 찾으세요', '#86efac');
        cue('찾아보세요', 620);
        g.roundTimer = setTimeout(() => {
          if (!g.running) return;
          g.phase = 'REVEAL';
          g.phaseStartMs = performance.now();
          const tile = g.tiles[g.targetIdx]!;
          g.laneCount[tile.colorIdx]++;
          flash(COLORS[tile.colorIdx]!.hex, '0.86', REVEAL_FLASH_MS);
          cue('정답!', 760);
          setStatus(`${COLORS[tile.colorIdx]!.name} · 원래 색`, '#e5e7eb');
          g.round += 1;
          g.roundTimer = setTimeout(startRound, REVEAL_MS);
        }, SEARCH_MS);
      }, MEMORIZE_MS);
    };

    const draw = () => {
      if (!g.running) return;
      g.raf = requestAnimationFrame(draw);
      const { cssW: W, cssH: H } = setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, Math.max(W, H) * 0.72);
      bg.addColorStop(0, 'rgba(190,24,93,.26)');
      bg.addColorStop(0.42, 'rgba(76,29,149,.16)');
      bg.addColorStop(1, 'rgba(10,10,15,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const now = performance.now();
      g.tiles.forEach((tile) => {
        const showOriginal = g.phase === 'MEMORIZE' || g.phase === 'REVEAL';
        const colorIdx = showOriginal ? tile.colorIdx : tile.hiddenColorIdx;
        const color = COLORS[colorIdx]!.hex;
        const pulse = tile.isTarget && g.phase === 'REVEAL' ? 1 + Math.sin(now * 0.018) * 0.06 : 1;
        const s = tile.size * pulse;
        const x = tile.x + (tile.size - s) / 2;
        const y = tile.y + (tile.size - s) / 2;
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = tile.isTarget && g.phase === 'REVEAL' ? 34 : 16;
        ctx.fillStyle = color;
        roundRect(ctx, x, y, s, s, Math.max(10, s * 0.12));
        ctx.fill();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#fff';
        roundRect(ctx, x + s * 0.12, y + s * 0.1, s * 0.28, s * 0.2, s * 0.08);
        ctx.fill();
        ctx.restore();
      });
    };

    const resize = () => {
      setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      layoutTiles();
    };
    const unbind = bindViewportResize(play, resize);
    startRound();
    draw();
    g.timer = setInterval(() => {
      if (!g.running) return;
      g.durationLeft -= 1;
      if (timeRef.current) timeRef.current.textContent = String(Math.max(0, g.durationLeft));
      if (g.durationLeft <= 0) complete();
    }, 1000);
    if (timeRef.current) timeRef.current.textContent = String(g.durationLeft);

    return () => {
      unbind();
      g.running = false;
      if (g.raf != null) cancelAnimationFrame(g.raf);
      if (g.timer) clearInterval(g.timer);
      if (g.roundTimer) clearTimeout(g.roundTimer);
    };
  }, [complete, durationSec]);

  return (
    <div className="cmgrid">
      <style>{css}</style>
      <div className="cmgrid-hud">
        <div className="cmgrid-hc">
          <div className="cmgrid-hk">ROUND</div>
          <div className="cmgrid-hv" ref={roundRef}>1</div>
        </div>
        <div className="cmgrid-hc grow">
          <div className="cmgrid-hv" style={{ fontSize: 'clamp(13px,2vw,20px)' }}>색 기억 그리드</div>
          <div className="cmgrid-hk">Visual Reaction 8</div>
        </div>
        <div className="cmgrid-hc">
          <div className="cmgrid-hk">TIME</div>
          <div className="cmgrid-hv" ref={timeRef}>0</div>
        </div>
        <div className="cmgrid-hc" style={{ borderRight: 'none' }}>
          <button type="button" className="cmgrid-stop" onClick={complete}>STOP</button>
        </div>
      </div>
      <div ref={playRef} className="cmgrid-play">
        <canvas className="cmgrid-canvas" ref={cvRef} />
        <div className="cmgrid-vignette" />
        <div className="cmgrid-flash" ref={flashRef} aria-hidden />
        <div className="cmgrid-center" ref={centerRef} aria-hidden />
        <div className="cmgrid-status" ref={statusRef} />
      </div>
    </div>
  );
}
