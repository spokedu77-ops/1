'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';
import { setupCanvas } from '../lib/canvasUtils';

/** 4분할: 좌상 빨 · 우상 노 · 좌하 초 · 우하 파 */
const QUADRANTS = [
  { bg: 'rgba(255,61,79,0.24)', label: '빨', name: '빨강', accent: '#ff3d4f' },
  { bg: 'rgba(255,214,0,0.24)', label: '노', name: '노랑', accent: '#ffd600' },
  { bg: 'rgba(0,230,118,0.24)', label: '초', name: '초록', accent: '#00e676' },
  { bg: 'rgba(41,121,255,0.24)', label: '파', name: '파랑', accent: '#2979ff' },
] as const;

const BALL_BLACK = '#08080e';
const BALL_WHITE = '#ffffff';

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

  normalizeSpeed(targetSpeed: number) {
    const cur = Math.hypot(this.vx, this.vy);
    if (cur < 0.001) {
      const a = Math.random() * Math.PI * 2;
      this.vx = Math.cos(a) * targetSpeed;
      this.vy = Math.sin(a) * targetSpeed;
      return;
    }
    const scale = targetSpeed / cur;
    this.vx *= scale;
    this.vy *= scale;
  }

  move(radius: number, w: number, h: number, wallChaos = 0) {
    this.x += this.vx;
    this.y += this.vy;
    const bounce = (nx: number, ny: number, chaos: number) => {
      const dot = this.vx * nx + this.vy * ny;
      this.vx -= 2 * dot * nx;
      this.vy -= 2 * dot * ny;
      if (chaos > 0) {
        const a = (Math.random() - 0.5) * chaos;
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
      if (p <= 0) {
        a.vx -= p * nx;
        a.vy -= p * ny;
        b.vx += p * nx;
        b.vy += p * ny;
      }

      const chaos = (Math.random() - 0.5) * chaosAmp;
      [a.vx, a.vy] = rotateVec(a.vx, a.vy, chaos);
      [b.vx, b.vy] = rotateVec(b.vx, b.vy, -chaos);
    }
  }
}

type TierParams = {
  ballCount: number;
  chaosAmp: number;
  revealMs: number;
  scrambleMs: number;
  guessMs: number;
  answerMs: number;
  speedMul: number;
  wallChaos: number;
  collisionPasses: number;
  sepBoost: number;
};

function tierParams(tier: ColorTrackerTier, lv: number, fallTimeSec: number): TierParams {
  const ballBase = tier === 1 ? 4 : tier === 2 ? 5 : 7;
  const revealMul = tier === 1 ? 1.35 : tier === 2 ? 1 : 0.82;
  const scrambleMul = tier === 1 ? 0.88 : tier === 2 ? 1 : 1.14;
  return {
    ballCount: ballBase + lv,
    chaosAmp: tier === 1 ? 0.5 : tier === 2 ? 0.95 : 1.45,
    revealMs: Math.round((900 + fallTimeSec * 700) * revealMul),
    scrambleMs: Math.round((5200 + (6 - fallTimeSec) * 1400 + lv * 250) * scrambleMul),
    guessMs: tier === 1 ? 3200 : tier === 2 ? 2600 : 2200,
    answerMs: 1600,
    speedMul: tier === 1 ? 0.94 : tier === 2 ? 1.14 : 1.42,
    wallChaos: tier === 1 ? 0.1 : tier === 2 ? 0.24 : 0.42,
    collisionPasses: tier === 1 ? 1 : tier === 2 ? 2 : 3,
    sepBoost: tier === 1 ? 1.05 : tier === 2 ? 1.18 : 1.32,
  };
}

function tierBadge(tier: ColorTrackerTier): string {
  if (tier === 1) return 'L1 · 입문';
  if (tier === 2) return 'L2 · 기본';
  return 'L3 · 집중';
}

type TrackerGame = {
  running: boolean;
  timeLeft: number;
  phase: Phase;
  phaseStartMs: number;
  revealMs: number;
  scrambleMs: number;
  guessMs: number;
  answerMs: number;
  chaosAmp: number;
  wallChaos: number;
  collisionPasses: number;
  sepBoost: number;
  targetSpeed: number;
  ballRadius: number;
  targetIdx: number;
  targetQuadrantIdx: number;
  balls: TrackerBall[];
  rounds: number;
  laneCount: [number, number, number, number];
  W: number;
  H: number;
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  roundCdTimer: ReturnType<typeof setTimeout> | null;
  pendingRoundStart: (() => void) | null;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  tier?: ColorTrackerTier;
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
.ctrk{position:fixed;inset:0;background:#111;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden}
.ctrk,.ctrk *{box-sizing:border-box}
.ctrk-hud{height:72px;display:flex;align-items:stretch;background:rgba(10,10,14,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);padding:0 clamp(12px,2.5vw,30px);z-index:30;flex-shrink:0}
.ctrk-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.05)}
.ctrk-hc.grow{flex:1;align-items:center;border-right:none}
.ctrk-hk{font-size:9px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.28);text-transform:uppercase}
.ctrk-hv{font-family:Bebas Neue,Barlow Condensed,sans-serif;font-size:clamp(22px,3.5vw,34px);letter-spacing:.04em;color:#fff;line-height:1.1}
.ctrk-hv.warn{animation:ctrkw .5s ease-in-out infinite}
@keyframes ctrkw{0%,100%{color:#ef4444;text-shadow:0 0 16px #ef4444}50%{color:#fff;text-shadow:none}}
.ctrk-tier{font-size:clamp(10px,1.3vw,12px);font-weight:800;letter-spacing:.14em;color:#a78bfa;margin-top:2px}
.ctrk-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px}
.ctrk-stop:hover{background:rgba(255,255,255,.07);color:#fff}
.ctrk-play{position:relative;flex:1;min-height:0}
.ctrk-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ctrk-msg{position:absolute;left:50%;top:8%;transform:translateX(-50%);z-index:20;font-size:clamp(14px,2.6vw,24px);font-weight:900;color:#fff;text-shadow:0 0 16px rgba(0,0,0,.85);background:rgba(0,0,0,.55);padding:8px 22px;border-radius:999px;pointer-events:none;white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
.ctrk-cd{position:absolute;inset:0;z-index:25;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);pointer-events:none}
.ctrk-cd-n{font-size:clamp(100px,24vw,200px);font-weight:900;color:#f97316;line-height:1;animation:ctrkcd .45s ease-out}
@keyframes ctrkcd{from{transform:scale(1.35);opacity:.2}to{transform:scale(1);opacity:1}}
`;

export function ColorTrackerReactionTraining({ durationSec, speedLevel, speedSec, tier = 2, onExit, onComplete }: Props) {
  const trackerTier: ColorTrackerTier = tier === 1 || tier === 3 ? tier : 2;
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const hudTimeRef = useRef<HTMLDivElement>(null);
  const hudRoundsRef = useRef<HTMLDivElement>(null);
  const hudTierRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const [warn, setWarn] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState<number | null>(null);
  const gRef = useRef<TrackerGame | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const fallTimeSec = Math.max(1, Math.min(6, Number.isFinite(speedSec) ? speedSec : 4));
  const lv = Math.max(1, Math.min(7, Math.round(Number.isFinite(speedLevel) ? speedLevel : 4)));
  const params = useMemo(() => tierParams(trackerTier, lv, fallTimeSec), [trackerTier, lv, fallTimeSec]);

  const stopGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
    setRoundCountdown(null);
    onExitRef.current();
  }, []);

  const endGame = useCallback(() => {
    const g = gRef.current;
    if (!g) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
    if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
    setRoundCountdown(null);
    onCompleteRef.current({
      stims: g.rounds,
      maxCombo: g.rounds,
      laneCount: [...g.laneCount] as [number, number, number, number],
    });
  }, []);

  useEffect(() => {
    const cv = cvRef.current;
    const play = playRef.current;
    if (!cv || !play) return;

    const g: TrackerGame = {
      running: true,
      timeLeft: durationSec,
      phase: 'COUNTDOWN',
      phaseStartMs: 0,
      revealMs: params.revealMs,
      scrambleMs: params.scrambleMs,
      guessMs: params.guessMs,
      answerMs: params.answerMs,
      chaosAmp: params.chaosAmp,
      wallChaos: params.wallChaos,
      collisionPasses: params.collisionPasses,
      sepBoost: params.sepBoost,
      targetSpeed: 2,
      ballRadius: 24,
      targetIdx: 0,
      targetQuadrantIdx: 0,
      balls: [],
      rounds: 0,
      laneCount: [0, 0, 0, 0],
      W: 0,
      H: 0,
      raf: null,
      timer: null,
      roundCdTimer: null,
      pendingRoundStart: null,
    };
    gRef.current = g;

    const calcLayout = () => {
      const w = play.clientWidth;
      const h = play.clientHeight;
      if (w <= 0 || h <= 0) return;
      const r = setupCanvas(cv, w, h);
      g.W = r.cssW;
      g.H = r.cssH;
      const minDim = Math.min(g.W, g.H);
      g.ballRadius = Math.max(14, minDim * 0.028);
      g.targetSpeed = Math.max(1.6, minDim * 0.0021) * (0.82 + lv * 0.14) * params.speedMul;
    };

    const updateHudTime = () => {
      const m = String(Math.floor(g.timeLeft / 60)).padStart(2, '0');
      const s = String(g.timeLeft % 60).padStart(2, '0');
      if (hudTimeRef.current) hudTimeRef.current.textContent = `${m}:${s}`;
      setWarn(g.timeLeft <= 10);
    };
    updateHudTime();
    if (hudRoundsRef.current) hudRoundsRef.current.textContent = '0';
    if (hudTierRef.current) hudTierRef.current.textContent = tierBadge(trackerTier);

    const setMsg = (text: string) => {
      if (msgRef.current) msgRef.current.textContent = text;
    };

    let scrambleSecShown = -1;

    const spawnBalls = () => {
      const radius = g.ballRadius;
      const count = params.ballCount;
      const list: TrackerBall[] = [];
      for (let i = 0; i < count; i++) {
        let x = 0;
        let y = 0;
        let attempts = 0;
        let overlapping = true;
        while (overlapping && attempts < 120) {
          overlapping = false;
          x = radius * 2 + Math.random() * (g.W - radius * 4);
          y = radius * 2 + Math.random() * (g.H - radius * 4);
          for (const b of list) {
            if (Math.hypot(x - b.x, y - b.y) < radius * 2.2) {
              overlapping = true;
              break;
            }
          }
          attempts++;
        }
        const angle = Math.random() * Math.PI * 2;
        list.push(new TrackerBall(x, y, angle, g.targetSpeed));
      }
      g.balls = list;
      g.targetIdx = Math.floor(Math.random() * count);
    };

    const beginRound = () => {
      spawnBalls();
      g.phase = 'REVEAL';
      g.phaseStartMs = performance.now();
      setMsg('흰 공 하나를 기억하세요');
    };

    const scheduleRoundCountdown = (onDone: () => void) => {
      if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
      g.phase = 'COUNTDOWN';
      g.pendingRoundStart = onDone;
      let c = 3;
      setRoundCountdown(3);
      setMsg('다음 라운드 준비');
      const tick = () => {
        if (!gRef.current?.running) return;
        c -= 1;
        if (c > 0) {
          setRoundCountdown(c);
          g.roundCdTimer = setTimeout(tick, 650);
        } else {
          setRoundCountdown(null);
          g.roundCdTimer = null;
          onDone();
        }
      };
      g.roundCdTimer = setTimeout(tick, 650);
    };

    const drawBackground = (ctx: CanvasRenderingContext2D) => {
      const halfW = g.W / 2;
      const halfH = g.H / 2;
      ctx.fillStyle = '#0a0a0e';
      ctx.fillRect(0, 0, g.W, g.H);
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
      ctx.lineTo(halfW, g.H);
      ctx.moveTo(0, halfH);
      ctx.lineTo(g.W, halfH);
      ctx.stroke();

      const pad = Math.max(12, g.W * 0.028);
      ctx.font = `900 ${Math.max(18, g.W * 0.038)}px Barlow Condensed, Noto Sans KR, sans-serif`;
      ctx.textBaseline = 'middle';
      const labels: [number, number, number][] = [
        [pad, pad, 0],
        [g.W - pad, pad, 1],
        [pad, g.H - pad, 2],
        [g.W - pad, g.H - pad, 3],
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
        ctx.strokeRect(halfW * 0.06, halfH * 0.06, g.W * 0.88, g.H * 0.88);
        ctx.setLineDash([]);
      }
    };

    const drawBall = (ctx: CanvasRenderingContext2D, ball: TrackerBall, isTarget: boolean) => {
      const r = g.ballRadius;
      const frozen = g.phase === 'GUESS' || g.phase === 'ANSWER';
      ctx.save();

      if (g.phase === 'REVEAL' && isTarget) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 24;
        ctx.fillStyle = BALL_WHITE;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if ((g.phase === 'GUESS' || g.phase === 'ANSWER') && isTarget) {
        const pulse = Math.abs(Math.sin(performance.now() / 160)) * 0.35;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 18 + pulse * 20;
        ctx.fillStyle = BALL_WHITE;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r * (1.12 + pulse * 0.12), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = QUADRANTS[g.targetQuadrantIdx]?.accent ?? '#fff';
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
      const ctx = cv.getContext('2d');
      if (!ctx) return;

      if (g.phase !== 'COUNTDOWN') {
        const elapsed = now - g.phaseStartMs;
        if (g.phase === 'REVEAL' && elapsed >= g.revealMs) {
          g.phase = 'SCRAMBLE';
          g.phaseStartMs = now;
          scrambleSecShown = -1;
        } else if (g.phase === 'SCRAMBLE' && elapsed >= g.scrambleMs) {
          g.phase = 'GUESS';
          g.phaseStartMs = now;
          g.targetQuadrantIdx = quadrantIndexOf(g.balls[g.targetIdx]!.x, g.balls[g.targetIdx]!.y, g.W, g.H);
          setMsg('빨·노·초·파 — 어디 구역인지 맞춰보세요!');
        } else if (g.phase === 'GUESS' && elapsed >= g.guessMs) {
          g.phase = 'ANSWER';
          g.phaseStartMs = now;
          g.rounds++;
          g.laneCount[g.targetQuadrantIdx]++;
          if (hudRoundsRef.current) hudRoundsRef.current.textContent = String(g.rounds);
          setMsg(`정답 · ${QUADRANTS[g.targetQuadrantIdx].name}(${QUADRANTS[g.targetQuadrantIdx].label}) 구역`);
        } else if (g.phase === 'ANSWER' && elapsed >= g.answerMs) {
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
          for (let pass = 0; pass < g.collisionPasses; pass++) {
            resolveCollisions(g.balls, g.ballRadius, g.chaosAmp, g.sepBoost);
          }
          g.balls.forEach((b) => {
            b.normalizeSpeed(g.targetSpeed);
            b.move(g.ballRadius, g.W, g.H, g.wallChaos);
          });
        }
      }

      drawBackground(ctx);
      g.balls.forEach((b, i) => {
        if (i !== g.targetIdx) drawBall(ctx, b, false);
      });
      if (g.balls[g.targetIdx]) drawBall(ctx, g.balls[g.targetIdx]!, true);

      g.raf = requestAnimationFrame(loop);
    };

    const startId = window.setTimeout(() => {
      calcLayout();
      beginRound();
      const endsAtMs = performance.now() + durationSec * 1000;
      g.timer = setInterval(() => {
        const newLeft = Math.max(0, Math.ceil((endsAtMs - performance.now()) / 1000));
        if (g.timeLeft !== newLeft) {
          g.timeLeft = newLeft;
          updateHudTime();
        }
        if (g.timeLeft <= 0) {
          if (g.timer) clearInterval(g.timer);
          g.timer = null;
          endGame();
        }
      }, 250);
      g.raf = requestAnimationFrame(loop);
    }, 60);

    const onWinResize = () => calcLayout();
    window.addEventListener('resize', onWinResize);

    return () => {
      clearTimeout(startId);
      window.removeEventListener('resize', onWinResize);
      g.running = false;
      if (g.timer) clearInterval(g.timer);
      if (g.roundCdTimer) clearTimeout(g.roundCdTimer);
      if (g.raf != null) cancelAnimationFrame(g.raf);
      setRoundCountdown(null);
    };
  }, [durationSec, endGame, lv, params, trackerTier]);

  return (
    <div className="ctrk">
      <style>{css}</style>
      <div className="ctrk-hud">
        <div className="ctrk-hc">
          <div className="ctrk-hk">Time</div>
          <div className={`ctrk-hv${warn ? ' warn' : ''}`} ref={hudTimeRef} />
        </div>
        <div className="ctrk-hc">
          <div className="ctrk-hk">Rounds</div>
          <div className="ctrk-hv" ref={hudRoundsRef} />
        </div>
        <div className="ctrk-hc grow">
          <div className="ctrk-hv" style={{ fontSize: 'clamp(12px,2vw,19px)' }}>
            컬러 트래커
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
      <div ref={playRef} className="ctrk-play">
        <canvas className="ctrk-canvas" ref={cvRef} />
        <div className="ctrk-msg" ref={msgRef} />
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
