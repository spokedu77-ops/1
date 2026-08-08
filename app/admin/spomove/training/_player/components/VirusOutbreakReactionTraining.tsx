'use client';

/**
 * 시지각 반응 · 바이러스 폭증 (Visual Reaction 9 / engine 13)
 * 원본 「바이러스 폭증 - 수감각 과부하」를 SPOMOVE HUD·톤에 맞게 이식.
 * — ANNOUNCE → OUTBREAK 3s → SHUTTER 0.5s → COUNTDOWN 5s → REVEAL
 * — 정답 = 가장 많거나(적게) 증식한 4색 중 하나 (회색 돌연변이는 무시)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { bindViewportResize } from '../lib/bindViewportResize';
import { setupCanvas } from '../lib/canvasUtils';
import { getAudioCtx } from '../lib/audio';
import { REACT_TRAIN_VIEWPORT_CSS } from '../lib/embedViewport';
import {
  ReactTrainStartCountdownOverlay,
  REACT_TRAIN_START_COUNTDOWN_SEC,
  runReactTrainStartCountdown,
} from '../lib/reactTrainStartCountdown';
import type { ReactTrainCompleteStats } from './VisualReactionTraining';

const COLORS = [
  { name: '빨강', hex: '#ff3333', glow: 'rgba(255, 51, 51, 0.6)' },
  { name: '노랑', hex: '#ffcc00', glow: 'rgba(255, 204, 0, 0.6)' },
  { name: '파랑', hex: '#3366ff', glow: 'rgba(51, 102, 255, 0.6)' },
  { name: '초록', hex: '#33cc33', glow: 'rgba(51, 204, 51, 0.6)' },
  { name: '돌연변이', hex: '#888888', glow: 'rgba(150, 150, 150, 0.6)' },
] as const;

const MUTANT_ID = 4;
const ANNOUNCE_MS = 2000;
const OUTBREAK_MS = 3000;
const SHUTTER_MS = 500;
const COUNTDOWN_MS = 5000;
const REVEAL_MS = 4000;

export type VirusOutbreakDifficulty = 'easy' | 'normal' | 'hard';

type Phase = 'ANNOUNCE' | 'OUTBREAK' | 'SHUTTER' | 'COUNTDOWN' | 'REVEAL';
type QuestionType = 'MOST' | 'LEAST';

type Virus = {
  colorId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetSize: number;
  phase: number;
};

type Game = {
  running: boolean;
  phase: Phase;
  phaseStartMs: number;
  round: number;
  durationLeft: number;
  difficulty: VirusOutbreakDifficulty;
  viruses: Virus[];
  targetCounts: number[];
  currentCounts: number[];
  questionType: QuestionType;
  targetColorId: number;
  shutterProgress: number;
  hasMutants: boolean;
  lastCountdownSec: number;
  laneCount: [number, number, number, number];
  raf: number | null;
  timer: ReturnType<typeof setInterval> | null;
  cx: number;
  cy: number;
  dishR: number;
};

type Props = {
  durationSec: number;
  speedLevel: number;
  speedSec: number;
  difficulty?: VirusOutbreakDifficulty;
  onExit: () => void;
  onComplete: (stats: ReactTrainCompleteStats) => void;
};

const css = `
.vburst{position:fixed;inset:0;height:100dvh;max-height:100dvh;background:#050a0f;color:#fff;z-index:320;display:flex;flex-direction:column;font-family:Barlow Condensed,Noto Sans KR,sans-serif;overflow:hidden;user-select:none;touch-action:none}
.vburst,.vburst *{box-sizing:border-box}
.vburst-hud{height:72px;display:flex;align-items:stretch;background:rgba(5,10,15,.82);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.1);padding:max(0px,env(safe-area-inset-top)) clamp(12px,2.5vw,30px) 0;z-index:30;flex-shrink:0}
.vburst-hc{display:flex;flex-direction:column;justify-content:center;padding:0 clamp(10px,2vw,26px);border-right:1px solid rgba(255,255,255,.1)}
.vburst-hc.grow{flex:1;align-items:center;border-right:none}
.vburst-hk{font-size:9px;font-weight:800;letter-spacing:.18em;color:rgba(255,255,255,.45);text-transform:uppercase}
.vburst-hv{font-size:clamp(22px,3.5vw,34px);font-weight:1000;letter-spacing:.04em;color:#fff;line-height:1.1;text-shadow:0 0 18px rgba(255,255,255,.22)}
.vburst-stop{align-self:center;margin-left:auto;padding:8px 16px;border-radius:10px;border:1px solid rgba(248,113,113,.45);background:rgba(220,38,38,.16);color:rgba(255,255,255,.82);font-size:13px;font-weight:800;letter-spacing:.12em;cursor:pointer;font-family:inherit}
.vburst-play{position:relative;flex:1;min-height:0}
.vburst-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.vburst-lens{position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(circle,transparent 40%,rgba(0,0,0,.9) 80%,#000 100%)}
.vburst-mission{position:absolute;left:50%;top:50%;z-index:24;pointer-events:none;transform:translate(-50%,-50%) scale(.5);opacity:0;transition:opacity .28s ease,transform .28s cubic-bezier(.175,.885,.32,1.275);text-align:center;white-space:nowrap;font-size:clamp(22px,5vw,52px);line-height:1.1;font-weight:1000;color:#fff;background:rgba(0,0,0,.7);padding:.45em 1.1em;border-radius:999px;border:2px solid rgba(255,255,255,.2);backdrop-filter:blur(10px)}
.vburst-mission.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
.vburst-count{position:absolute;left:50%;top:50%;z-index:22;pointer-events:none;transform:translate(-50%,-50%);font-size:clamp(80px,22vw,200px);font-weight:1000;color:#ff3333;text-shadow:0 0 50px #f00,0 0 20px #f00;opacity:0;transition:opacity .1s}
.vburst-count.show{opacity:1}
.vburst-warn{position:absolute;left:50%;top:12%;z-index:20;pointer-events:none;transform:translateX(-50%) scale(.85);opacity:0;transition:all .3s;padding:8px 18px;border-radius:999px;border:2px dashed #a3a3a3;background:rgba(0,0,0,.8);color:#a3a3a3;font-size:clamp(12px,2.4vw,22px);font-weight:900;white-space:nowrap}
.vburst-warn.show{opacity:1;transform:translateX(-50%) scale(1);animation:vburstMutant 1s infinite alternate}
@keyframes vburstMutant{from{border-color:#a3a3a3;color:#a3a3a3;text-shadow:none}to{border-color:#fff;color:#fff;text-shadow:0 0 10px #fff}}
.vburst-status{position:absolute;left:50%;top:clamp(10px,1.8vw,16px);transform:translateX(-50%);z-index:20;pointer-events:none;text-align:center;padding:6px 16px;border-radius:999px;background:rgba(5,10,15,.68);border:1px solid rgba(255,255,255,.16);font-family:monospace;font-size:clamp(10px,1.35vw,13px);letter-spacing:.06em;color:#67e8f9;white-space:nowrap;backdrop-filter:blur(10px)}
${REACT_TRAIN_VIEWPORT_CSS}
`;

function normalizeDifficulty(v: unknown): VirusOutbreakDifficulty {
  if (v === 'easy' || v === 'hard') return v;
  return 'normal';
}

function playSfx(type: 'pop' | 'tick' | 'shutter' | 'reveal') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  if (type === 'pop') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, t + 0.1);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
    return;
  }
  if (type === 'tick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
    return;
  }
  if (type === 'shutter') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
    return;
  }
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t + i * 0.1);
    gain.gain.setValueAtTime(0.22, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.5);
  });
}

function makeVirus(
  colorId: number,
  g: Game,
  questionType: QuestionType,
  targetColorId: number,
): Virus {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * (g.dishR * 0.5);
  const speedMod = g.difficulty === 'hard' ? 1.8 : g.difficulty === 'normal' ? 1.2 : 0.8;
  let sizeMod = 1;
  if (colorId !== MUTANT_ID && (g.difficulty === 'hard' || g.difficulty === 'normal')) {
    if (questionType === 'MOST') {
      sizeMod = colorId === targetColorId ? 0.6 + Math.random() * 0.2 : 1.3 + Math.random() * 0.4;
    } else {
      sizeMod = colorId === targetColorId ? 1.6 + Math.random() * 0.4 : 0.7 + Math.random() * 0.2;
    }
  }
  return {
    colorId,
    x: g.cx + Math.cos(angle) * r,
    y: g.cy + Math.sin(angle) * r,
    vx: (Math.random() - 0.5) * 4 * speedMod,
    vy: (Math.random() - 0.5) * 4 * speedMod,
    size: 0,
    targetSize: (10 + Math.random() * 10) * sizeMod,
    phase: Math.random() * Math.PI * 2,
  };
}

export function VirusOutbreakReactionTraining({
  durationSec,
  difficulty: difficultyProp = 'normal',
  onComplete,
}: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const playRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const warnRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<Game | null>(null);
  const onCompleteRef = useRef(onComplete);
  const lastCountTextRef = useRef('');
  const [countdown, setCountdown] = useState(REACT_TRAIN_START_COUNTDOWN_SEC);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const complete = useCallback(() => {
    const g = gRef.current;
    if (!g?.running) return;
    g.running = false;
    if (g.raf != null) cancelAnimationFrame(g.raf);
    if (g.timer) clearInterval(g.timer);
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
      phase: 'ANNOUNCE',
      phaseStartMs: performance.now(),
      round: 1,
      durationLeft: Math.max(5, Math.round(durationSec)),
      difficulty: normalizeDifficulty(difficultyProp),
      viruses: [],
      targetCounts: [0, 0, 0, 0, 0],
      currentCounts: [0, 0, 0, 0, 0],
      questionType: 'MOST',
      targetColorId: 0,
      shutterProgress: 0,
      hasMutants: false,
      lastCountdownSec: -1,
      laneCount: [0, 0, 0, 0],
      raf: null,
      timer: null,
      cx: 0,
      cy: 0,
      dishR: 0,
    };
    gRef.current = g;

    const setStatus = (text: string, color = '#67e8f9') => {
      if (!statusRef.current) return;
      statusRef.current.textContent = text;
      statusRef.current.style.color = color;
    };

    const syncGeom = () => {
      const W = play.clientWidth || window.innerWidth;
      const H = play.clientHeight || window.innerHeight;
      g.cx = W / 2;
      g.cy = H / 2;
      g.dishR = Math.min(W, H) * 0.45;
    };

    const generateTargetCounts = () => {
      const total = g.difficulty === 'easy' ? 50 : g.difficulty === 'normal' ? 100 : 180;
      g.questionType = g.difficulty === 'easy' || Math.random() > 0.3 ? 'MOST' : 'LEAST';
      g.targetColorId = Math.floor(Math.random() * 4);
      const counts = [0, 0, 0, 0, 0];
      g.hasMutants = false;
      if (g.difficulty !== 'easy' && Math.random() > 0.2) {
        g.hasMutants = true;
        counts[MUTANT_ID] = Math.floor(total * (g.difficulty === 'hard' ? 0.35 : 0.15));
      }
      const activeTotal = total - counts[MUTANT_ID]!;
      let props: number[];
      if (g.difficulty === 'easy') {
        props = g.questionType === 'MOST' ? [55, 15, 15, 15] : [10, 30, 30, 30];
      } else if (g.difficulty === 'normal') {
        props = g.questionType === 'MOST' ? [36, 25, 20, 19] : [16, 26, 28, 30];
      } else {
        props = g.questionType === 'MOST' ? [28, 26, 24, 22] : [22, 24, 26, 28];
      }
      counts[g.targetColorId] = Math.floor(activeTotal * (props[0]! / 100));
      const remaining = props.slice(1).sort(() => Math.random() - 0.5);
      let propIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i !== g.targetColorId) {
          counts[i] = Math.floor(activeTotal * (remaining[propIdx]! / 100));
          propIdx++;
        }
      }
      g.targetCounts = counts;
      g.currentCounts = [0, 0, 0, 0, 0];
    };

    const startRound = () => {
      if (!g.running) return;
      syncGeom();
      setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      g.viruses = [];
      g.shutterProgress = 0;
      g.lastCountdownSec = -1;
      lastCountTextRef.current = '';
      if (countRef.current) countRef.current.classList.remove('show');
      if (missionRef.current) {
        missionRef.current.classList.remove('show');
        missionRef.current.style.borderColor = 'rgba(255,255,255,0.2)';
        missionRef.current.style.boxShadow = 'none';
        missionRef.current.style.color = '#fff';
      }
      if (warnRef.current) warnRef.current.classList.remove('show');

      generateTargetCounts();
      g.phase = 'ANNOUNCE';
      g.phaseStartMs = performance.now();
      if (roundRef.current) roundRef.current.textContent = String(g.round);

      const mission = g.questionType === 'MOST' ? '가장 [많이] 증식한 색깔은?' : '가장 [조금] 증식한 색깔은?';
      if (missionRef.current) {
        missionRef.current.textContent = mission;
        missionRef.current.style.color = g.questionType === 'LEAST' ? '#ffd633' : '#fff';
        missionRef.current.classList.add('show');
      }
      if (g.hasMutants && warnRef.current) warnRef.current.classList.add('show');
      setStatus(
        `배양 · ${g.difficulty === 'easy' ? '1단계' : g.difficulty === 'normal' ? '2단계' : '3단계'}`,
        '#67e8f9',
      );
    };

    const updateVirus = (v: Virus) => {
      if (v.size < v.targetSize) v.size += (v.targetSize - v.size) * 0.2;
      v.x += v.vx;
      v.y += v.vy;
      const dx = v.x - g.cx;
      const dy = v.y - g.cy;
      const dist = Math.hypot(dx, dy);
      if (dist + v.size > g.dishR) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = v.vx * nx + v.vy * ny;
        v.vx -= 2 * dot * nx;
        v.vy -= 2 * dot * ny;
        v.x = g.cx + nx * (g.dishR - v.size - 1);
        v.y = g.cy + ny * (g.dishR - v.size - 1);
      }
    };

    const drawVirus = (v: Virus, now: number) => {
      if (v.colorId === -1) {
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.fillStyle = 'rgba(100,100,100,0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.1, v.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      const color = COLORS[v.colorId]!;
      const wobble = Math.sin(now * 0.01 + v.phase) * 2;
      const s = Math.max(0.1, v.size + wobble);
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.shadowBlur = 15;
      ctx.shadowColor = color.glow;
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.1, s * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawShutter = (W: number, H: number) => {
      if (g.shutterProgress <= 0) return;
      const maxR = Math.hypot(W, H) / 2;
      const ease = 1 - (1 - g.shutterProgress) ** 3;
      const r = maxR * (1 - ease);
      ctx.fillStyle = '#050a0f';
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(g.cx, g.cy, Math.max(0, r), 0, Math.PI * 2, true);
      ctx.fill();
      if (r > 0 && r < maxR) {
        ctx.strokeStyle = '#33ccff';
        ctx.lineWidth = 4 + ease * 10;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(51,204,255,0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const angle = ((Math.PI * 2) / 12) * i + (ease * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(g.cx + Math.cos(angle) * r, g.cy + Math.sin(angle) * r);
          ctx.lineTo(g.cx + Math.cos(angle + 0.5) * maxR * 2, g.cy + Math.sin(angle + 0.5) * maxR * 2);
          ctx.stroke();
        }
      }
    };

    const draw = (now: number) => {
      if (!g.running) return;
      g.raf = requestAnimationFrame(draw);
      const elapsed = now - g.phaseStartMs;
      const { cssW: W, cssH: H } = setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      syncGeom();

      ctx.fillStyle = '#050a0f';
      ctx.fillRect(0, 0, W, H);
      ctx.beginPath();
      ctx.arc(g.cx, g.cy, g.dishR, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1420';
      ctx.fill();
      ctx.strokeStyle = 'rgba(51,153,255,0.3)';
      ctx.lineWidth = 4;
      ctx.stroke();

      if (g.phase === 'ANNOUNCE') {
        if (elapsed >= ANNOUNCE_MS) {
          g.phase = 'OUTBREAK';
          g.phaseStartMs = now;
          setStatus('증식 중', '#86efac');
        }
      } else if (g.phase === 'OUTBREAK') {
        const progress = Math.min(elapsed / OUTBREAK_MS, 1);
        for (let i = 0; i < 5; i++) {
          const targetNow = Math.floor(g.targetCounts[i]! * progress);
          while (g.currentCounts[i]! < targetNow) {
            g.viruses.push(makeVirus(i, g, g.questionType, g.targetColorId));
            g.currentCounts[i]!++;
            if (Math.random() > 0.7) playSfx('pop');
          }
        }
        if (elapsed >= OUTBREAK_MS) {
          g.phase = 'SHUTTER';
          g.phaseStartMs = now;
          playSfx('shutter');
          warnRef.current?.classList.remove('show');
          setStatus('셔터 · 해당 색 패드로', '#fbbf24');
        }
      } else if (g.phase === 'SHUTTER') {
        g.shutterProgress = Math.min(elapsed / SHUTTER_MS, 1);
        if (elapsed >= SHUTTER_MS) {
          g.phase = 'COUNTDOWN';
          g.phaseStartMs = now;
          g.lastCountdownSec = -1;
        }
      } else if (g.phase === 'COUNTDOWN') {
        g.shutterProgress = 1;
        const timeLeft = Math.ceil(5 - elapsed / 1000);
        const text = String(Math.max(0, timeLeft));
        if (lastCountTextRef.current !== text && countRef.current) {
          lastCountTextRef.current = text;
          countRef.current.textContent = text;
          countRef.current.classList.remove('show');
          void countRef.current.offsetWidth;
          countRef.current.classList.add('show');
          if (timeLeft > 0) playSfx('tick');
        }
        if (elapsed >= COUNTDOWN_MS) {
          g.phase = 'REVEAL';
          g.phaseStartMs = now;
          countRef.current?.classList.remove('show');
          playSfx('shutter');
          playSfx('reveal');
          g.laneCount[g.targetColorId]++;
        }
      } else if (g.phase === 'REVEAL') {
        g.shutterProgress = 1 - Math.min(elapsed / SHUTTER_MS, 1);
        if (elapsed < SHUTTER_MS) {
          g.viruses.forEach((v) => {
            if (v.colorId !== g.targetColorId && v.colorId !== -1) {
              v.colorId = -1;
              v.vx *= 0.9;
              v.vy *= 0.9;
            }
          });
        }
        if (elapsed > SHUTTER_MS && missionRef.current) {
          const ans = COLORS[g.targetColorId]!;
          missionRef.current.innerHTML = `정답: <span style="color:${ans.hex}">${ans.name}</span>`;
          missionRef.current.style.color = '#fff';
          missionRef.current.style.borderColor = ans.hex;
          missionRef.current.style.boxShadow = `0 0 30px ${ans.glow}`;
          missionRef.current.classList.add('show');
          setStatus(`${ans.name} · ${g.questionType === 'MOST' ? '최다' : '최소'}`, '#e5e7eb');
        }
        if (elapsed >= REVEAL_MS) {
          g.round += 1;
          startRound();
        }
      }

      g.viruses.forEach((v) => {
        updateVirus(v);
        drawVirus(v, now);
      });
      drawShutter(W, H);
    };

    const resize = () => {
      setupCanvas(cv, play.clientWidth || window.innerWidth, play.clientHeight || window.innerHeight);
      syncGeom();
    };
    const unbind = bindViewportResize(play, resize);
    getAudioCtx();
    if (timeRef.current) timeRef.current.textContent = String(g.durationLeft);

    const beginGame = () => {
      if (!gRef.current?.running) return;
      startRound();
      g.raf = requestAnimationFrame(draw);
      g.timer = setInterval(() => {
        if (!g.running) return;
        g.durationLeft -= 1;
        if (timeRef.current) timeRef.current.textContent = String(Math.max(0, g.durationLeft));
        if (g.durationLeft <= 0) complete();
      }, 1000);
    };

    const stopCountdown = runReactTrainStartCountdown({
      onTick: setCountdown,
      onDone: beginGame,
    });

    return () => {
      stopCountdown();
      unbind();
      g.running = false;
      if (g.raf != null) cancelAnimationFrame(g.raf);
      if (g.timer) clearInterval(g.timer);
    };
  }, [complete, difficultyProp, durationSec]);

  return (
    <div className="vburst">
      <style>{css}</style>
      <div className="vburst-hud">
        <div className="vburst-hc">
          <div className="vburst-hk">ROUND</div>
          <div className="vburst-hv" ref={roundRef}>1</div>
        </div>
        <div className="vburst-hc grow">
          <div className="vburst-hv" style={{ fontSize: 'clamp(13px,2vw,20px)' }}>바이러스 폭증</div>
          <div className="vburst-hk">Visual Reaction 9</div>
        </div>
        <div className="vburst-hc">
          <div className="vburst-hk">TIME</div>
          <div className="vburst-hv" ref={timeRef}>0</div>
        </div>
        <div className="vburst-hc" style={{ borderRight: 'none' }}>
          <button type="button" className="vburst-stop" onClick={complete}>STOP</button>
        </div>
      </div>
      <div ref={playRef} className="vburst-play">
        <canvas className="vburst-canvas" ref={cvRef} />
        <ReactTrainStartCountdownOverlay countdown={countdown} />
        <div className="vburst-lens" aria-hidden />
        <div className="vburst-warn" ref={warnRef}>회색 돌연변이를 무시하세요!</div>
        <div className="vburst-mission" ref={missionRef} />
        <div className="vburst-count" ref={countRef} aria-hidden />
        <div className="vburst-status" ref={statusRef} />
      </div>
    </div>
  );
}
