'use client';

/**
 * 시지각 반응 · 색 기억 그리드 (Visual Reaction 8 / engine 12)
 * 원본 「도플갱어의 방」변화맹 테스트 메커니즘을 SPOMOVE HUD·톤에 맞게 이식.
 * — MEMORIZE 3s → SEARCH 7s(단 1칸만 색 변경 · FLICKER|ONESHOT) → REVEAL 3.5s
 * — 정답 색 = 바뀐(새) 색 (패드 반응 기준)
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { setupCanvas } from '../lib/canvasUtils';
import { getAudioCtx } from '../lib/audio';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

const COLORS = [
  { name: '빨강', hex: '#ff3333', glow: '#ff9999' },
  { name: '노랑', hex: '#ffcc00', glow: '#ffee99' },
  { name: '파랑', hex: '#3366ff', glow: '#99b3ff' },
  { name: '초록', hex: '#33cc33', glow: '#99ff99' },
] as const;

const MEMORIZE_MS = 3000;
const SEARCH_MS = 7000;
const REVEAL_MS = 3500;
const FLICKER_CYCLE_MS = 1000;

export type ColorMemoryGridSize = 3 | 4 | 5;
export type ColorMemoryGridMode = 'flicker' | 'oneshot';

type Phase = 'MEMORIZE' | 'SEARCH' | 'REVEAL';

type Tile = {
  x: number;
  y: number;
  size: number;
  colorIdx: number;
  newColorIdx: number | null;
  isTarget: boolean;
  scale: number;
};

type Game = {
  running: boolean;
  phase: Phase;
  phaseStartMs: number;
  round: number;
  durationLeft: number;
  gridSize: ColorMemoryGridSize;
  gameMode: ColorMemoryGridMode;
  targetIdx: number;
  tiles: Tile[];
  laneCount: [number, number, number, number];
  lastTickSec: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  gridSize?: ColorMemoryGridSize;
  gameMode?: ColorMemoryGridMode;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.cmgrid{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#0a0a0f;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden;user-select:none;touch-action:none}
.cmgrid,.cmgrid *{box-sizing:border-box}
.cmgrid-hud{height:72px;display:flex;align-items:stretch;background:rgba(10,10,15,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.1);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.cmgrid-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.1)}
.cmgrid-hc.grow{flex:1;align-items:center;border-right:none}
.cmgrid-hk{font-size:9px;font-weight:800;letter-spacing:.18em;color:rgba(255,255,255,.45);text-transform:uppercase}
.cmgrid-hv{font-size:clamp(22px,3.5vw,34px);font-weight:1000;letter-spacing:.04em;color:#fff;line-height:1.1;text-shadow:0 0 18px rgba(255,255,255,.22)}
.cmgrid-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(248,113,113,.45);background:rgba(220,38,38,.16);color:rgba(255,255,255,.82);font-size:13px;font-weight:800;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.cmgrid-play{position:relative;flex:1;min-height:0}
.cmgrid-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.cmgrid-flash{position:absolute;inset:0;z-index:22;pointer-events:none;background:#fff;opacity:0;transition:opacity .15s ease-out}
.cmgrid-flash.on{opacity:1;transition:none}
.cmgrid-center{position:absolute;left:50%;top:50%;z-index:24;pointer-events:none;transform:translate(-50%,-50%) scale(.5);opacity:0;transition:opacity .18s ease,transform .22s cubic-bezier(.175,.885,.32,1.275);text-align:center;white-space:nowrap;font-size:clamp(44px,8vw,104px);line-height:.9;font-weight:1000;color:#fff;text-shadow:0 0 34px rgba(0,0,0,.95),0 0 20px rgba(255,255,255,.72)}
.cmgrid-center.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.cmgrid-center.num{font-size:clamp(72px,20vw,180px);text-shadow:0 0 40px rgba(255,255,255,.8)}
.cmgrid-center.pill{font-size:clamp(22px,5vw,48px);background:rgba(0,0,0,.5);padding:.35em .9em;border-radius:999px;backdrop-filter:blur(10px);text-shadow:0 0 20px rgba(0,0,0,1)}
.cmgrid-status{position:absolute;left:50%;top:clamp(10px,1.8vw,16px);transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;padding:6px 16px;border-radius:999px;background:rgba(10,10,15,.68);border:1px solid rgba(255,255,255,.16);font-family:monospace;font-size:clamp(10px,1.35vw,13px);letter-spacing:.06em;color:#f9a8d4;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.24);backdrop-filter:blur(10px)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

function normalizeGridSize(v: unknown): ColorMemoryGridSize {
  if (v === 3 || v === 5) return v;
  return 4;
}

function normalizeGameMode(v: unknown): ColorMemoryGridMode {
  return v === 'oneshot' ? 'oneshot' : 'flicker';
}

function playSfx(type: 'tick' | 'flash' | 'reveal') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  if (type === 'tick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
    return;
  }
  if (type === 'flash') {
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    noise.start(t);
    return;
  }
  [523.25, 659.25, 1046.5].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, t + i * 0.1);
    gain.gain.setValueAtTime(0.18, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.5);
  });
}

export function ColorMemoryGridReactionTraining({
  durationSec,
  gridSize: gridSizeProp = 4,
  gameMode: gameModeProp = 'flicker',
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
  const centerTextRef = useRef('');

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (flashRef.current) flashRef.current.classList.remove('on');
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
      gridSize: normalizeGridSize(gridSizeProp),
      gameMode: normalizeGameMode(gameModeProp),
      targetIdx: 0,
      tiles: [],
      laneCount: [0, 0, 0, 0],
      lastTickSec: -1,
      raf: null,
      timer: null,
    };
    gRef.current = g;

    const setStatus = (text: string, color = '#f9a8d4') => {
      if (!statusRef.current) return;
      statusRef.current.textContent = text;
      statusRef.current.style.color = color;
    };

    const showMessage = (text: string, kind: 'num' | 'pill' | 'plain' = 'plain') => {
      const el = centerRef.current;
      if (!el) return;
      if (centerTextRef.current === text) {
        el.classList.add('show');
        return;
      }
      centerTextRef.current = text;
      el.textContent = text;
      el.classList.remove('show', 'num', 'pill');
      if (kind === 'num') el.classList.add('num');
      if (kind === 'pill') el.classList.add('pill');
      void el.offsetWidth;
      el.classList.add('show');
    };

    const hideMessage = () => {
      centerTextRef.current = '';
      centerRef.current?.classList.remove('show', 'num', 'pill');
      if (centerRef.current) centerRef.current.style.color = '#fff';
    };

    const setFlash = (on: boolean) => {
      flashRef.current?.classList.toggle('on', on);
    };

    const layoutTiles = (keepColors: boolean) => {
      const W = play.clientWidth || window.innerWidth;
      const H = play.clientHeight || window.innerHeight;
      const n = g.gridSize;
      const maxGrid = Math.min(W, H) * 0.85;
      const cell = maxGrid / n;
      const gap = cell * 0.1;
      const size = cell - gap;
      const offsetX = (W - maxGrid) / 2 + gap / 2;
      const offsetY = (H - maxGrid) / 2 + gap / 2 + 12;

      if (keepColors && g.tiles.length === n * n) {
        g.tiles.forEach((tile, idx) => {
          const c = idx % n;
          const r = Math.floor(idx / n);
          tile.x = offsetX + c * cell;
          tile.y = offsetY + r * cell;
          tile.size = size;
        });
        return;
      }

      g.tiles = [];
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          g.tiles.push({
            x: offsetX + c * cell,
            y: offsetY + r * cell,
            size,
            colorIdx: Math.floor(Math.random() * COLORS.length),
            newColorIdx: null,
            isTarget: false,
            scale: 0,
          });
        }
      }
      g.targetIdx = Math.floor(Math.random() * g.tiles.length);
      const target = g.tiles[g.targetIdx]!;
      target.isTarget = true;
      let next = Math.floor(Math.random() * (COLORS.length - 1));
      if (next >= target.colorIdx) next += 1;
      target.newColorIdx = next;
    };

    const startRound = () => {
      if (!g.running) return;
      setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      layoutTiles(false);
      g.phase = 'MEMORIZE';
      g.phaseStartMs = performance.now();
      g.lastTickSec = -1;
      hideMessage();
      setFlash(false);
      if (roundRef.current) roundRef.current.textContent = String(g.round);
      setStatus(`기억 · ${g.gridSize}×${g.gridSize} · ${g.gameMode === 'flicker' ? '깜빡이' : '원샷'}`, '#f9a8d4');
    };

    const draw = (now: number) => {
      if (!g.running) return;
      g.raf = requestAnimationFrame(draw);
      const elapsed = now - g.phaseStartMs;
      const { cssW: W, cssH: H } = setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);

      g.tiles.forEach((tile) => {
        if (g.phase === 'MEMORIZE' && tile.scale < 1) {
          tile.scale += (1 - tile.scale) * 0.2;
        }

        let currentScale = tile.scale;
        let opacity = 1;
        let renderIdx = tile.colorIdx;

        if (g.phase === 'SEARCH' && tile.isTarget && tile.newColorIdx != null) {
          if (g.gameMode === 'flicker') {
            if ((elapsed % FLICKER_CYCLE_MS) > FLICKER_CYCLE_MS / 2) {
              renderIdx = tile.newColorIdx;
            }
          } else {
            renderIdx = tile.newColorIdx;
          }
        } else if (g.phase === 'REVEAL') {
          if (!tile.isTarget) {
            currentScale *= 0.8;
            opacity = 0.2;
          } else if (tile.newColorIdx != null) {
            renderIdx = tile.newColorIdx;
            currentScale = 1 + Math.sin(now * 0.01) * 0.1;
          }
        }

        const color = COLORS[renderIdx]!;
        const s = tile.size * currentScale;
        ctx.save();
        ctx.translate(tile.x + tile.size / 2, tile.y + tile.size / 2);
        ctx.globalAlpha = opacity;
        if (g.phase === 'REVEAL' && tile.isTarget) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = color.glow;
        }
        ctx.fillStyle = color.hex;
        ctx.beginPath();
        ctx.roundRect(-s / 2, -s / 2, s, s, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.roundRect(-s / 2 + 2, -s / 2 + 2, s - 4, s * 0.3, 8);
        ctx.fill();
        ctx.restore();
      });

      // ── 상태 머신 (원본 타이밍) ──
      if (g.phase === 'MEMORIZE') {
        const timeLeft = Math.ceil(3 - elapsed / 1000);
        if (elapsed > 500 && timeLeft > 0) {
          showMessage(String(timeLeft), 'num');
          const sec = Math.floor(elapsed / 1000);
          if (sec !== g.lastTickSec) {
            g.lastTickSec = sec;
            playSfx('tick');
          }
        }
        if (elapsed >= MEMORIZE_MS) {
          g.phase = 'SEARCH';
          g.phaseStartMs = now;
          g.lastTickSec = -1;
          hideMessage();
          playSfx('flash');
          setStatus('바뀐 색깔은? · 해당 색 패드로', '#86efac');
        }
      } else if (g.phase === 'SEARCH') {
        if (g.gameMode === 'flicker') {
          const cycle = elapsed % FLICKER_CYCLE_MS;
          setFlash((cycle > 400 && cycle < 500) || (cycle > 900 && cycle < 1000));
        } else {
          setFlash(elapsed < 150);
        }

        const timeLeft = Math.ceil((SEARCH_MS - elapsed) / 1000);
        if (elapsed < 1000) {
          showMessage('바뀐 색깔은?', 'pill');
        } else if (timeLeft > 0) {
          showMessage(String(timeLeft), 'num');
          if (timeLeft <= 3) {
            const sec = Math.floor(elapsed / 1000);
            if (sec !== g.lastTickSec) {
              g.lastTickSec = sec;
              playSfx('tick');
            }
          }
        }

        if (elapsed >= SEARCH_MS) {
          g.phase = 'REVEAL';
          g.phaseStartMs = now;
          setFlash(false);
          playSfx('reveal');
          const target = g.tiles[g.targetIdx]!;
          const newIdx = target.newColorIdx ?? target.colorIdx;
          g.laneCount[newIdx]++;
          const ans = COLORS[newIdx]!;
          showMessage(`정답: ${ans.name}`, 'pill');
          if (centerRef.current) centerRef.current.style.color = ans.glow;
          setStatus(`${ans.name} · 바뀐 색`, '#e5e7eb');
        }
      } else if (g.phase === 'REVEAL') {
        if (elapsed >= REVEAL_MS) {
          g.round += 1;
          startRound();
        }
      }
    };

    const resize = () => {
      setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      layoutTiles(g.phase === 'MEMORIZE' ? false : true);
    };
    const unbind = bindViewportResize(play, resize);
    getAudioCtx();
    startRound();
    g.raf = requestAnimationFrame(draw);
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
      setFlash(false);
    };
  }, [complete, durationSec, gameModeProp, gridSizeProp]);

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
        <div className="cmgrid-flash" ref={flashRef} aria-hidden />
        <div className="cmgrid-center" ref={centerRef} aria-hidden />
        <div className="cmgrid-status" ref={statusRef} />
      </div>
    </div>
  );
}
