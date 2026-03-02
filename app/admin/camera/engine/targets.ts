/**
 * SPOKEDU 카메라 앱 — 타겟 스폰·그리기·히트
 * state는 읽기 전용, 변경은 onStateUpdate 콜백으로만 위임
 */

import {
  DIFF,
  SHAPES,
  SHAPE_KO,
  COLOR_POOL,
} from '../constants';
import type { GameState, Target } from '../types';
import { SFX } from '../sfx';
import { spawnParticles } from './fx';
import type { StateUpdate } from './pose';

function rp(): { x: number; y: number } {
  return { x: 0.1 + Math.random() * 0.8, y: 0.15 + Math.random() * 0.72 };
}
function rc(): string {
  return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]!;
}

const SEQ_POSITIONS = [
  { x: 0.15, y: 0.2 }, { x: 0.82, y: 0.25 }, { x: 0.2, y: 0.78 },
  { x: 0.78, y: 0.75 }, { x: 0.5, y: 0.5 }, { x: 0.35, y: 0.45 },
];
const SHAPE_POSITIONS = [
  { x: 0.2, y: 0.3 }, { x: 0.78, y: 0.3 }, { x: 0.5, y: 0.68 },
  { x: 0.3, y: 0.6 }, { x: 0.7, y: 0.6 }, { x: 0.5, y: 0.25 },
];

export function drawTarget(
  ctx: CanvasRenderingContext2D,
  t: Target,
  cW: number,
  cH: number,
  now: number
): void {
  const x = t.x * cW;
  const y = t.y * cH;
  const baseR = t.r * Math.min(cW, cH);
  const age = t.spawnTime != null ? now - t.spawnTime : 999;
  const scale = age < 300 ? 0.4 + 0.6 * Math.min(age / 300, 1) : 1;
  const r = baseR * scale;

  ctx.save();
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 1.7);
  grd.addColorStop(0, t.glow || 'rgba(255,255,100,0.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  ctx.beginPath();
  const sh = t.shape || 'circle';
  if (sh === 'circle') ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (sh === 'square') ctx.rect(x - r, y - r, r * 2, r * 2);
  else if (sh === 'triangle') {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.lineTo(x - r, y + r);
    ctx.closePath();
  }
  ctx.fillStyle = t.fill || '#3b82f6';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  if (t.label) {
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(r * 0.75)}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.label, x, y + 1);
  }
  ctx.restore();
}

export function spawnSpeed(state: Readonly<GameState>, onStateUpdate: StateUpdate): void {
  const p = rp();
  const cfg = DIFF[state.diff];
  const newTarget: Target = {
    x: p.x, y: p.y, r: cfg.r, fill: rc(),
    glow: 'rgba(250,204,21,0.3)', label: '★', shape: 'circle',
    spawnTime: performance.now(),
  };
  onStateUpdate({ targets: [...state.targets, newTarget] });
}

export function createMovingTarget(state: Readonly<GameState>): Target {
  const p = rp();
  const cfg = DIFF[state.diff];
  const sp = cfg.speed;
  return {
    x: p.x, y: p.y, r: cfg.r, fill: rc(),
    glow: 'rgba(250,204,21,0.25)', label: '★', shape: 'circle',
    vx: (Math.random() - 0.5) * sp * 2,
    vy: (Math.random() - 0.5) * sp * 2,
    spawnTime: performance.now(),
  };
}

export function spawnMoving(state: Readonly<GameState>, onStateUpdate: StateUpdate): void {
  const newT = createMovingTarget(state);
  onStateUpdate({ targets: [...state.targets, newT] });
}

export function spawnSequence(state: Readonly<GameState>, onStateUpdate: StateUpdate): void {
  const positions = [...SEQ_POSITIONS].sort(() => Math.random() - 0.5).slice(0, 4);
  const now = performance.now();
  const targets: Target[] = positions.map((pos, i) => {
    const num = i + 1;
    return {
      x: pos.x, y: pos.y, r: DIFF[state.diff].r,
      fill: num === 1 ? '#2563EB' : '#94A3B8',
      glow: num === 1 ? 'rgba(37,99,235,0.3)' : 'rgba(0,0,0,0.05)',
      label: String(num), shape: 'circle' as const, number: num,
      spawnTime: num === 1 ? now : undefined,
    };
  });
  onStateUpdate({ targets, expectedNum: 1 });
}

export function spawnShape(
  state: Readonly<GameState>,
  setMissionText: (text: string) => void,
  onStateUpdate: StateUpdate
): void {
  const arr = [...SHAPES].sort(() => Math.random() - 0.5);
  const targetShape = arr[0]!;
  setMissionText(SHAPE_KO[targetShape] + ' 터치하기!');
  const positions = [...SHAPE_POSITIONS].sort(() => Math.random() - 0.5);
  const now = performance.now();
  const targets: Target[] = [];
  for (let i = 0; i < 4; i++) {
    const st = i === 0 ? targetShape : SHAPES[Math.floor(Math.random() * SHAPES.length)]!;
    targets.push({
      x: positions[i]!.x, y: positions[i]!.y, r: DIFF[state.diff].r * 1.1,
      fill: st === targetShape ? '#7C3AED' : rc(),
      glow: 'rgba(124,58,237,0.2)', shape: st, shapeType: st, spawnTime: now,
    });
  }
  onStateUpdate({ targets, targetShape });
}

export interface TargetsCallbacks {
  addScore: (pi: number, pts: number) => void;
  feedback: (msg: string, warn?: boolean) => void;
  comboFlash: () => void;
  setMissionText: (text: string) => void;
  getCanvasSize: () => { cW: number; cH: number };
  onStateUpdate: StateUpdate;
  onSpawnMovingLater?: () => void;
}

export function handleHit(
  state: Readonly<GameState>,
  t: Target,
  idx: number,
  pi: number,
  now: number,
  callbacks: TargetsCallbacks
): void {
  const cfg = DIFF[state.diff];
  const hitTimes = state.hitTimes;
  if (t.spawnTime != null) {
    const rt = now - t.spawnTime;
    if (rt >= 50 && rt <= 3000) callbacks.onStateUpdate({ hitTimes: [...hitTimes, rt] });
  }

  const { cW, cH } = callbacks.getCanvasSize();

  if (state.mode === 'speed') {
    const newTargets = state.targets.filter((_, i) => i !== idx);
    callbacks.onStateUpdate({ targets: newTargets });
    callbacks.addScore(pi, Math.round(10 * cfg.bonus));
    spawnSpeed({ ...state, targets: newTargets }, callbacks.onStateUpdate);
    spawnParticles(t.x, t.y, cW, cH);
  } else if (state.mode === 'moving') {
    const newTargets = state.targets.filter((_, i) => i !== idx);
    callbacks.onStateUpdate({ targets: newTargets });
    callbacks.addScore(pi, Math.round(15 * cfg.bonus));
    spawnParticles(t.x, t.y, cW, cH);
    setTimeout(() => callbacks.onSpawnMovingLater?.(), 150);
  } else if (state.mode === 'sequence') {
    if (t.number === state.expectedNum && !t.hitLocked) {
      const newTargets = state.targets.filter((_, i) => i !== idx);
      const newExpectedNum = state.expectedNum + 1;
      const now2 = performance.now();
      const updated = newTargets.map((tt) =>
        tt.number === newExpectedNum
          ? { ...tt, fill: '#2563EB', glow: 'rgba(37,99,235,0.3)' as string, spawnTime: now2 }
          : { ...tt, fill: '#94A3B8', glow: 'rgba(0,0,0,0.05)' as string }
      );
      callbacks.onStateUpdate({ targets: updated, expectedNum: newExpectedNum });
      callbacks.addScore(pi, Math.round(20 * cfg.bonus));
      if (updated.length === 0) {
        callbacks.feedback('🤝 완벽한 팀워크!');
        spawnSequence({ ...state, targets: [], expectedNum: 1 }, callbacks.onStateUpdate);
      }
      spawnParticles(t.x, t.y, cW, cH);
    }
  } else if (state.mode === 'shape') {
    if (t.shapeType === state.targetShape) {
      callbacks.addScore(pi, Math.round(20 * cfg.bonus));
      SFX.combo();
      callbacks.feedback('✅ 정확한 판단!');
      const newTargets = state.targets.filter((_, i) => i !== idx);
      spawnShape({ ...state, targets: newTargets }, callbacks.setMissionText, callbacks.onStateUpdate);
    } else {
      const newScores = [...state.scores];
      newScores[pi] = Math.max(0, (newScores[pi] ?? 0) - 5);
      callbacks.onStateUpdate({ scores: newScores });
      SFX.miss();
      callbacks.feedback('❌ 다른 모양이에요!', true);
    }
  }
}
