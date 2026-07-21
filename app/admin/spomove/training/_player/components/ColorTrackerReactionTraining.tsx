'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { LongPressButton } from './LongPressButton';
import { setupCanvas } from '../lib/canvasUtils';

export const COLOR_TRACKER_ROUND_OPTIONS = [2, 3, 5, 10] as const;

export function normalizeColorTrackerRounds(value: number): number {
  const n = Math.round(Number.isFinite(value) ? value : 5);
  if ((COLOR_TRACKER_ROUND_OPTIONS as readonly number[]).includes(n)) return n;
  return COLOR_TRACKER_ROUND_OPTIONS.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best));
}

/** 4분할: 좌상 빨 · 우상 노 · 좌하 초 · 우하 파 */
const QUADRANTS = [
  { bg: 'rgba(255,61,79,0.24)', label: '빨', name: '빨강', accent: '#ff3d4f' },
  { bg: 'rgba(255,214,0,0.24)', label: '노', name: '노랑', accent: '#ffd600' },
  { bg: 'rgba(0,230,118,0.24)', label: '초', name: '초록', accent: '#00e676' },
  { bg: 'rgba(41,121,255,0.24)', label: '파', name: '파랑', accent: '#2979ff' },
] as const;

const BALL_BLACK = '#08080e';
const BALL_WHITE = '#ffffff';
const WALL_RESTITUTION = 1.08;
const BALL_RESTITUTION = 1.05;
const FLASH_DURATION_MS = 90;
const ROUND_COUNTDOWN_STEP_MS = 1000;
const MIN_SPEED_RATIO = 0.78;
const MAX_SPEED_RATIO = 1.22;

export type ColorTrackerTier = 1 | 2 | 3;

type Phase = 'COUNTDOWN' | 'REVEAL' | 'SCRAMBLE' | 'GUESS' | 'ANSWER';

class TrackerBall {
  x: number;
  y: number;
  vx: number;
  vy: number;

  constructor(x: number, y: number, angle: number, speed: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  clampSpeed(minSpeed: number, maxSpeed: number) {
    const cur = Math.hypot(this.vx, this.vy);
    if (cur < 0.001) {
      const a = Math.random() * Math.PI * 2;
      this.vx = Math.cos(a) * minSpeed;
      this.vy = Math.sin(a) * minSpeed;
      return;
    }
    if (cur < minSpeed) {
      const scale = minSpeed / cur;
      this.vx *= scale;
      this.vy *= scale;
    } else if (cur > maxSpeed) {
      const scale = maxSpeed / cur;
      this.vx *= scale;
      this.vy *= scale;
    }
  }

  move(radius: number, w: number, h: number, wallChaos = 0) {
    this.x += this.vx;
    this.y += this.vy;
    const bounce = (nx: number, ny: number, chaos: number) => {
      const dot = this.vx * nx + this.vy * ny;
      if (dot >= 0) return;
      this.vx -= (1 + WALL_RESTITUTION) * dot * nx;
      this.vy -= (1 + WALL_RESTITUTION) * dot * ny;
      if (chaos > 0) {
        const a = (Math.random() - 0.5) * chaos * 0.12;
        [this.vx, this.vy] = rotateVec(this.vx, this.vy, a);
      }
    };
    if (this.x - radius < 0) {
      this.x = radius;
      bounce(1, 0, wallChaos);
    } else if (this.x + radius > w) {
      this.x = w - radius;
      bounce(-1, 0, wallChaos);
    }
    if (this.y - radius < 0) {
      this.y = radius;
      bounce(0, 1, wallChaos);
    } else if (this.y + radius > h) {
      this.y = h - radius;
      bounce(0, -1, wallChaos);
    }
  }
}

function rotateVec(vx: number, vy: number, angle: number): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [vx * c - vy * s, vx * s + vy * c];
}

function resolveCollisions(balls: TrackerBall[], radius: number, chaosAmp: number, sepBoost = 1) {
  const minDist = radius * 2;
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i]!;
      const b = balls[j]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      if (dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      const push = (overlap / 2) * sepBoost;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;

      const dvx = a.vx - b.vx;
      const dvy = a.vy - b.vy;
      const p = dvx * nx + dvy * ny;
      if (p < 0) {
        const impulse = (-(1 + BALL_RESTITUTION) * p) / 2;
        a.vx += impulse * nx;
        a.vy += impulse * ny;
        b.vx -= impulse * nx;
        b.vy -= impulse * ny;
      }

      if (chaosAmp > 0) {
        const chaos = (Math.random() - 0.5) * chaosAmp * 0.08;
        [a.vx, a.vy] = rotateVec(a.vx, a.vy, chaos);
        [b.vx, b.vy] = rotateVec(b.vx, b.vy, -chaos);
      }
    }
  }
}

type TierParams = {
  ballCount: number;
  chaosAmp: number;
  revealMs: number;
  scrambleMs: number;
  answerMs: number;
  speedFactor: number;
  wallChaos: number;
  collisionPasses: number;
  sepBoost: number;
  scrambleFlash: boolean;
};

/** L1=구 L2, L2=구 L3, L3=구 L3+추적 중 전체 화면 간헐 플래시 */
function tierParams(tier: ColorTrackerTier): TierParams {
  if (tier === 1) {
    return {
      ballCount: 9,
      chaosAmp: 0.18,
      revealMs: 3700,
      scrambleMs: 9000,
      answerMs: 1600,
      speedFactor: 1.57,
      wallChaos: 0.08,
      collisionPasses: 2,
      sepBoost: 1.08,
      scrambleFlash: false,
    };
  }
  if (tier === 2) {
    return {
      ballCount: 13,
      chaosAmp: 0.28,
      revealMs: 2350,
      scrambleMs: 12600,
      answerMs: 1600,
      speedFactor: 2.35,
      wallChaos: 0.12,
      collisionPasses: 3,
      sepBoost: 1.12,
      scrambleFlash: false,
    };
  }
  return {
    ballCount: 13,
    chaosAmp: 0.32,
    revealMs: 2350,
    scrambleMs: 12600,
    answerMs: 1600,
    speedFactor: 2.35,
    wallChaos: 0.12,
    collisionPasses: 3,
    sepBoost: 1.12,
    scrambleFlash: true,
  };
}

function tierBadge(tier: ColorTrackerTier): string {
  if (tier === 1) return 'L1 · 입문';
  if (tier === 2) return 'L2 · 기본';
  return 'L3 · 집중';
}

function buildFlashSchedule(scrambleMs: number): number[] {
  const count = 3 + Math.floor(Math.random() * 3);
  const minGap = 850;
  const latestStart = scrambleMs - FLASH_DURATION_MS - 250;
  const times: number[] = [];
  let cursor = 700 + Math.random() * 500;
  for (let i = 0; i < count && cursor < latestStart; i++) {
    times.push(cursor);
    cursor += minGap + Math.random() * Math.max(400, scrambleMs / (count + 1));
  }
  return times;
}

function isFlashActive(flashSchedule: number[], elapsedMs: number): boolean {
  return flashSchedule.some((t) => elapsedMs >= t && elapsedMs < t + FLASH_DURATION_MS);
}

type PanelArena = {
  balls: TrackerBall[];
  targetIdx: number;
  targetQuadrantIdx: number;
  W: number;
  H: number;
  ballRadius: number;
  targetSpeed: number;
  minSpeed: number;
  maxSpeed: number;
};

type TrackerGame = {
  running: boolean;
  dualPanel: boolean;
  targetRounds: number;
  phase: Phase;
  phaseStartMs: number;
  revealMs: number;
  scrambleMs: number;
  answerMs: number;
  chaosAmp: number;
  wallChaos: number;
  collisionPasses: number;
  sepBoost: number;
  scrambleFlash: boolean;
  flashSchedule: number[];
  panels: PanelArena[];
  rounds: number;
  laneCount: [number, number, number, number];
  raf: number | null;
  roundCdTimer: ReturnType<typeof setTimeout> | null;
  pendingRoundStart: (() => void) | null;
};

type Props = {
  targetRounds: number;
  tier?: ColorTrackerTier;
  dualPanel?: boolean;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

function quadrantIndexOf(x: number, y: number, w: number, h: number): number {
  const left = x < w / 2;
  const top = y < h / 2;
  if (top && left) return 0;
  if (top && !left) return 1;
  if (!top && left) return 2;
  return 3;
}

const css = `
.ctrk{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#111;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.ctrk,.ctrk *{box-sizing:border-box}
.ctrk-hud{height:72px;display:flex;align-items:stretch;background:rgba(10,10,14,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.ctrk-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.ctrk-hc.grow{flex:1;align-items:center;border-right:none}
.ctrk-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.ctrk-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.ctrk-hv.warn{animation:ctrkw .5s ease-in-out infinite}
@keyframes ctrkw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.ctrk-tier{font-size:clamp(10px,1.3vw,12px);font-weight:800;letter-spacing:.14em;color:#a78bfa;margin-top:2px}
.ctrk-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.ctrk-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.ctrk-play{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.ctrk-play--dual{flex-direction:row}
.ctrk-panel{position:relative;flex:1;min-width:0;min-height:0}
.ctrk-panel-label{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:12;font-size:10px;font-weight:800;letter-spacing:.18em;color:rgba(255,255,255,.32);pointer-events:none}
.ctrk-divider{width:3px;flex-shrink:0;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.18),rgba(255,255,255,.04))}
.ctrk-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ctrk-overlay{position:absolute;inset:0;z-index:20;pointer-events:none;display:flex;flex-direction:column;align-items:center}
.ctrk-msg{margin-top:8%;font-size:clamp(14px,2.6vw,24px);font-weight:900;color:#fff;text-shadow:0 0 16px rgba(0,0,0,.85);background:rgba(0,0,0,.55);padding:8px 22px;border-radius:999px;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
.ctrk-cd{position:absolute;inset:0;z-index:25;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);pointer-events:none}
.ctrk-cd-n{font-size:clamp(100px,24vw,200px);font-weight:900;color:#f97316;line-height:1;animation:ctrkcd .45s ease-out}
@keyframes ctrkcd{from{transform:scale(1.35);opacity:.2}to{transform:scale(1);opacity:1}}
.ctrk-reveal{position:absolute;left:50%;bottom:max(clamp(14px,3.5vh,32px),env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:auto}
.ctrk-reveal-hint{font-size:11px;font-weight:700;color:rgba(255,255,255,.34);letter-spacing:.08em}
${REACT_TRAIN_VIEWPORT_CSS}
`;

export function ColorTrackerReactionTraining({
  targetRounds,
  tier = 2,
  dualPanel = false,
  onExit,
  onComplete,
}: Props) {
  const trackerTier: ColorTrackerTier = tier === 1 || tier === 3 ? tier : 2;
  const totalRounds = normalizeColorTrackerRounds(targetRounds);
  const params = useMemo(() => tierParams(trackerTier), [trackerTier]);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const cvLeftRef = useRef<HTMLCanvasElement>(null);
  const cvRightRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const panelRightRef = useRef<HTMLDivElement>(null);
  const hudRoundRef = useRef<HTMLDivElement>(null);
  const hudTierRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const [roundCountdown, setRoundCountdown] = useState<number | null>(null);
  const [showRevealBtn, setShowRevealBtn] = useState(false);
  const revealAnswerRef = useRef<(() => void) | null>(null);
  const gRef = useRef<TrackerGame | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const revealAnswer = useCallback(() => {
    revealAnswerRef.current?.();
  }, []);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
    setRoundCountdown(null);
    setShowRevealBtn(false);
    onCompleteRef.current({
      stims: g.rounds,
      maxCombo: g.rounds,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
    setRoundCountdown(null);
    setShowRevealBtn(false);
    onCompleteRef.current({
      stims: g.rounds,
      maxCombo: g.rounds,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  useEffect(() => {
    const panelCount = dualPanel ? 2 : 1;
    const canvases = dualPanel
      ? [cvLeftRef.current, cvRightRef.current]
      : [cvRef.current];
    const panelEls = dualPanel
      ? [panelLeftRef.current, panelRightRef.current]
      : [playRef.current];
    if (canvases.some((cv) => !cv) || panelEls.some((el) => !el)) return;

    const makePanel = (): PanelArena => ({
      balls: [],
      targetIdx: 0,
      targetQuadrantIdx: 0,
      W: 0,
      H: 0,
      ballRadius: 24,
      targetSpeed: 2,
      minSpeed: 1.2,
      maxSpeed: 3.5,
    });

    const g: TrackerGame = {
      running: true,
      dualPanel,
      targetRounds: totalRounds,
      phase: 'COUNTDOWN',
      phaseStartMs: 0,
      revealMs: params.revealMs,
      scrambleMs: params.scrambleMs,
      answerMs: params.answerMs,
      chaosAmp: params.chaosAmp,
      wallChaos: params.wallChaos,
      collisionPasses: params.collisionPasses,
      sepBoost: params.sepBoost,
      scrambleFlash: params.scrambleFlash,
      flashSchedule: [],
      panels: Array.from({ length: panelCount }, makePanel),
      rounds: 0,
      laneCount: [0, 0, 0, 0],
      raf: null,
      roundCdTimer: null,
      pendingRoundStart: null,
    };
    gRef.current = g;

    const calcLayout = () => {
      for (let i = 0; i < panelCount; i++) {
        const el = panelEls[i]!;
        const cv = canvases[i]!;
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (w <= 0 || h <= 0) continue;
        const r = setupCanvas(cv, w, h);
        const panel = g.panels[i]!;
        panel.W = r.cssW;
        panel.H = r.cssH;
        const minDim = Math.min(panel.W, panel.H);
        panel.ballRadius = Math.max(12, minDim * 0.028);
        panel.targetSpeed = Math.max(1.6, minDim * 0.0021) * params.speedFactor;
        panel.minSpeed = panel.targetSpeed * MIN_SPEED_RATIO;
        panel.maxSpeed = panel.targetSpeed * MAX_SPEED_RATIO;
      }
    };

    const updateHudRound = () => {
      const current =
        g.phase === 'ANSWER' ? g.rounds : Math.min(g.rounds + 1, g.targetRounds);
      if (hudRoundRef.current) hudRoundRef.current.textContent = `${current} / ${g.targetRounds}`;
    };
    updateHudRound();
    if (hudTierRef.current) hudTierRef.current.textContent = tierBadge(trackerTier);

    const setMsg = (text: string) => {
      if (msgRef.current) msgRef.current.textContent = text;
    };

    const formatAnswerMsg = () => {
      if (!g.dualPanel) {
        const q = QUADRANTS[g.panels[0]!.targetQuadrantIdx]!;
        return `정답 · ${q.name}(${q.label}) 구역`;
      }
      const left = QUADRANTS[g.panels[0]!.targetQuadrantIdx]!;
      const right = QUADRANTS[g.panels[1]!.targetQuadrantIdx]!;
      return `정답 · LEFT ${left.label} · RIGHT ${right.label}`;
    };

    revealAnswerRef.current = () => {
      if (!g.running || g.phase !== 'GUESS') return;
      g.phase = 'ANSWER';
      g.phaseStartMs = performance.now();
      g.rounds += 1;
      g.panels.forEach((panel) => {
        g.laneCount[panel.targetQuadrantIdx]++;
      });
      updateHudRound();
      setMsg(formatAnswerMsg());
      setShowRevealBtn(false);
    };

    let scrambleSecShown = -1;

    const spawnBalls = (panel: PanelArena) => {
      const radius = panel.ballRadius;
      const count = params.ballCount;
      const list: TrackerBall[] = [];
      for (let i = 0; i < count; i++) {
        let x = 0;
        let y = 0;
        let attempts = 0;
        let overlapping = true;
        while (overlapping && attempts < 120) {
          overlapping = false;
          x = radius * 2 + Math.random() * (panel.W - radius * 4);
          y = radius * 2 + Math.random() * (panel.H - radius * 4);
          for (const b of list) {
            if (Math.hypot(x - b.x, y - b.y) < radius * 2.2) {
              overlapping = true;
              break;
            }
          }
          attempts++;
        }
        const angle = Math.random() * Math.PI * 2;
        list.push(new TrackerBall(x, y, angle, panel.targetSpeed));
      }
      panel.balls = list;
      panel.targetIdx = Math.floor(Math.random() * count);
    };

    const beginRound = () => {
      g.panels.forEach(spawnBalls);
      g.phase = 'REVEAL';
      g.phaseStartMs = performance.now();
      g.flashSchedule = [];
      setShowRevealBtn(false);
      updateHudRound();
      setMsg(g.dualPanel ? '각 패널의 흰 공을 기억하세요' : '흰 공 하나를 기억하세요');
    };

    const scheduleRoundCountdown = (onDone: () => void) => {
      if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
      g.phase = 'COUNTDOWN';
      g.pendingRoundStart = onDone;
      updateHudRound();
      let c = 3;
      setRoundCountdown(3);
      setMsg('다음 라운드 준비');
      const tick = () => {
        if (!gRef.current?.running) return;
        c -= 1;
        if (c > 0) {
          setRoundCountdown(c);
          g.roundCdTimer = setTimeout(tick, ROUND_COUNTDOWN_STEP_MS);
        } else {
          setRoundCountdown(null);
          g.roundCdTimer = null;
          onDone();
        }
      };
      g.roundCdTimer = setTimeout(tick, ROUND_COUNTDOWN_STEP_MS);
    };

    const drawBackground = (ctx: CanvasRenderingContext2D, panel: PanelArena) => {
      const halfW = panel.W / 2;
      const halfH = panel.H / 2;
      ctx.fillStyle = '#0a0a0e';
      ctx.fillRect(0, 0, panel.W, panel.H);
      ctx.fillStyle = QUADRANTS[0].bg;
      ctx.fillRect(0, 0, halfW, halfH);
      ctx.fillStyle = QUADRANTS[1].bg;
      ctx.fillRect(halfW, 0, halfW, halfH);
      ctx.fillStyle = QUADRANTS[2].bg;
      ctx.fillRect(0, halfH, halfW, halfH);
      ctx.fillStyle = QUADRANTS[3].bg;
      ctx.fillRect(halfW, halfH, halfW, halfH);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(halfW, 0);
      ctx.lineTo(halfW, panel.H);
      ctx.moveTo(0, halfH);
      ctx.lineTo(panel.W, halfH);
      ctx.stroke();

      const pad = Math.max(10, panel.W * 0.028);
      ctx.font = `900 ${Math.max(16, panel.W * 0.038)}px Barlow Condensed, Noto Sans KR, sans-serif`;
      ctx.textBaseline = 'middle';
      const labels: [number, number, number][] = [
        [pad, pad, 0],
        [panel.W - pad, pad, 1],
        [pad, panel.H - pad, 2],
        [panel.W - pad, panel.H - pad, 3],
      ];
      labels.forEach(([x, y, idx]) => {
        const q = QUADRANTS[idx]!;
        ctx.textAlign = idx === 1 || idx === 3 ? 'right' : 'left';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillText(q.label, x + (idx === 1 || idx === 3 ? 2 : -2), y + 2);
        ctx.fillStyle = q.accent;
        ctx.fillText(q.label, x, y);
      });

      if (g.phase === 'GUESS') {
        const pulse = 0.35 + Math.abs(Math.sin(performance.now() / 280)) * 0.25;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.35})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.strokeRect(halfW * 0.06, halfH * 0.06, panel.W * 0.88, panel.H * 0.88);
        ctx.setLineDash([]);
      }
    };

    const drawScreenDistractionFlash = (
      ctx: CanvasRenderingContext2D,
      panel: PanelArena,
      scrambleElapsed: number,
    ) => {
      if (!g.scrambleFlash || g.phase !== 'SCRAMBLE') return;
      if (!isFlashActive(g.flashSchedule, scrambleElapsed)) return;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.96;
      ctx.fillRect(0, 0, panel.W, panel.H);
      ctx.restore();
    };

    const drawBall = (
      ctx: CanvasRenderingContext2D,
      panel: PanelArena,
      ball: TrackerBall,
      isTarget: boolean,
    ) => {
      const r = panel.ballRadius;
      const frozen = g.phase === 'GUESS' || g.phase === 'ANSWER';
      ctx.save();

      if (g.phase === 'REVEAL' && isTarget) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = BALL_WHITE;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (g.phase === 'ANSWER' && isTarget) {
        const pulse = Math.abs(Math.sin(performance.now() / 160)) * 0.35;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 18 + pulse * 20;
        ctx.fillStyle = BALL_WHITE;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r * (1.12 + pulse * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = QUADRANTS[panel.targetQuadrantIdx]?.accent ?? '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r * 1.45, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = g.phase === 'ANSWER' && !isTarget ? 0.28 : 1;
        ctx.fillStyle = BALL_BLACK;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = frozen ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = frozen ? 2.5 : 2;
        ctx.stroke();
      }

      if (g.phase === 'REVEAL' && !isTarget) {
        ctx.fillStyle = BALL_BLACK;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    };

    const loop = (now: number) => {
      if (!gRef.current?.running) return;

      if (g.phase !== 'COUNTDOWN') {
        const elapsed = now - g.phaseStartMs;
        if (g.phase === 'REVEAL' && elapsed >= g.revealMs) {
          g.phase = 'SCRAMBLE';
          g.phaseStartMs = now;
          scrambleSecShown = -1;
          if (g.scrambleFlash) g.flashSchedule = buildFlashSchedule(g.scrambleMs);
        } else if (g.phase === 'SCRAMBLE' && elapsed >= g.scrambleMs) {
          g.phase = 'GUESS';
          g.phaseStartMs = now;
          g.panels.forEach((panel) => {
            const target = panel.balls[panel.targetIdx];
            if (target) {
              panel.targetQuadrantIdx = quadrantIndexOf(target.x, target.y, panel.W, panel.H);
            }
          });
          setMsg('빨·노·초·파 — 어디 구역인지 맞춰보세요!');
          setShowRevealBtn(true);
        } else if (g.phase === 'ANSWER' && elapsed >= g.answerMs) {
          if (g.rounds >= g.targetRounds) {
            endGame();
            return;
          }
          scheduleRoundCountdown(beginRound);
        }

        if (g.phase === 'SCRAMBLE') {
          const leftSec = Math.max(0, Math.ceil((g.scrambleMs - elapsed) / 1000));
          if (leftSec !== scrambleSecShown) {
            scrambleSecShown = leftSec;
            setMsg(
              leftSec > 0
                ? `추적 ${leftSec}초 · 눈으로 끝까지 따라가세요`
                : '추적 종료',
            );
          }
          g.panels.forEach((panel) => {
            for (let pass = 0; pass < g.collisionPasses; pass++) {
              resolveCollisions(panel.balls, panel.ballRadius, g.chaosAmp, g.sepBoost);
            }
            panel.balls.forEach((b) => {
              b.move(panel.ballRadius, panel.W, panel.H, g.wallChaos);
              b.clampSpeed(panel.minSpeed, panel.maxSpeed);
            });
          });
        }
      }

      for (let i = 0; i < panelCount; i++) {
        const ctx = canvases[i]!.getContext('2d');
        if (!ctx) continue;
        const panel = g.panels[i]!;
        const scrambleElapsed = g.phase === 'SCRAMBLE' ? now - g.phaseStartMs : 0;
        drawBackground(ctx, panel);
        panel.balls.forEach((b, bi) => {
          if (bi !== panel.targetIdx) drawBall(ctx, panel, b, false);
        });
        const target = panel.balls[panel.targetIdx];
        if (target) drawBall(ctx, panel, target, true);
        drawScreenDistractionFlash(ctx, panel, scrambleElapsed);
      }

      g.raf = requestAnimationFrame(loop);
    };

    const startId = window.setTimeout(() => {
      calcLayout();
      beginRound();
      g.raf = requestAnimationFrame(loop);
    }, 60);

    const unbindResize = bindViewportResize(playRef.current, () => calcLayout());

    return () => {
      clearTimeout(startId);
      unbindResize();
      g.running = false;
      if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
      setRoundCountdown(null);
      setShowRevealBtn(false);
      revealAnswerRef.current = null;
    };
  }, [dualPanel, endGame, params, totalRounds, trackerTier]);

  return (
    <div className="ctrk">
      <style>{css}</style>
      <div className="ctrk-hud">
        <div className="ctrk-hc">
          <div className="ctrk-hk">Round</div>
          <div className="ctrk-hv" ref={hudRoundRef} />
        </div>
        <div className="ctrk-hc grow">
          <div className="ctrk-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            흰 공을 찾아라
          </div>
          <div className="ctrk-tier" ref={hudTierRef} />
        </div>
        <div className="ctrk-hc" style={{ borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,.05)' }}>
          <button type="button" className="ctrk-stop" onClick={stopGame}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden>
              <rect x="6" y="6" width="4" height="12" rx="1" />
              <rect x="14" y="6" width="4" height="12" rx="1" />
            </svg>
            STOP
          </button>
        </div>
      </div>
      <div ref={playRef} className={`ctrk-play${dualPanel ? ' ctrk-play--dual' : ''}`}>
        {dualPanel ? (
          <>
            <div ref={panelLeftRef} className="ctrk-panel">
              <div className="ctrk-panel-label">LEFT</div>
              <canvas className="ctrk-canvas" ref={cvLeftRef} />
            </div>
            <div className="ctrk-divider" aria-hidden />
            <div ref={panelRightRef} className="ctrk-panel">
              <div className="ctrk-panel-label">RIGHT</div>
              <canvas className="ctrk-canvas" ref={cvRightRef} />
            </div>
          </>
        ) : (
          <canvas className="ctrk-canvas" ref={cvRef} />
        )}
        <div className="ctrk-overlay">
          <div className="ctrk-msg" ref={msgRef} />
        </div>
        {showRevealBtn ? (
          <div className="ctrk-reveal">
            <LongPressButton onTrigger={revealAnswer} label="정답 공개" />
            <div className="ctrk-reveal-hint">
              {dualPanel
                ? '학생이 각 패널 구역을 말한 뒤 버튼을 누르세요'
                : '학생이 구역을 말한 뒤 버튼을 누르세요'}
            </div>
          </div>
        ) : null}
        {roundCountdown !== null ? (
          <div className="ctrk-cd">
            <div key={roundCountdown} className="ctrk-cd-n">
              {roundCountdown}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
