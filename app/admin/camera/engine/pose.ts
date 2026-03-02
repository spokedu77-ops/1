/**
 * SPOKEDU 카메라 앱 — 밸런스·미러 포즈 판정
 * state는 읽기 전용, 변경은 onStateUpdate 콜백으로만 위임
 */

import { POSES, MIRROR_POSES, POSE_HOLD_MS, MIRROR_HOLD_MS } from '../constants';
import type { GameState } from '../types';

export type StateUpdate = (patch: Partial<GameState>) => void;

export function nextBalancePose(
  state: Readonly<GameState>,
  getElement: (id: string) => HTMLElement | null,
  onStateUpdate: StateUpdate
): void {
  const poseIdx = Math.floor(Math.random() * POSES.length);
  onStateUpdate({ poseIdx, poseHoldStart: 0 });
  const pn = getElement('pose-name');
  const pb = getElement('pose-bar') as HTMLDivElement | null;
  if (pn) pn.textContent = POSES[poseIdx]!.name + ' 자세를 유지하세요!';
  if (pb) pb.style.width = '0%';
}

export function processBalance(
  state: Readonly<GameState>,
  lm: { x: number; y: number; visibility?: number }[],
  now: number,
  getElement: (id: string) => HTMLElement | null,
  onStateUpdate: StateUpdate
): void {
  if (!lm || lm.length < 17) return;
  try {
    const pose = POSES[state.poseIdx]!;
    const ok = pose.check(lm);
    const pb = getElement('pose-bar') as HTMLDivElement | null;
    if (ok) {
      if (!state.poseHoldStart) onStateUpdate({ poseHoldStart: now });
      const start = state.poseHoldStart || now;
      const prog = Math.min((now - start) / POSE_HOLD_MS, 1);
      if (pb) pb.style.width = prog * 100 + '%';
    } else {
      onStateUpdate({ poseHoldStart: 0 });
      if (pb) pb.style.width = '0%';
    }
  } catch {
    // ignore
  }
}

export function checkBalanceComplete(state: Readonly<GameState>, now: number): boolean {
  if (!state.poseHoldStart) return false;
  return now - state.poseHoldStart >= POSE_HOLD_MS;
}

export function nextMirrorPose(
  state: Readonly<GameState>,
  setMissionText: (text: string) => void,
  onStateUpdate: StateUpdate
): void {
  const mirrorIdx = Math.floor(Math.random() * MIRROR_POSES.length);
  onStateUpdate({ mirrorIdx, mirrorHoldStart: 0 });
  setMissionText('📢 ' + MIRROR_POSES[mirrorIdx]!.instruction);
}

export function processMirror(
  state: Readonly<GameState>,
  lm: { x: number; y: number }[],
  now: number,
  onStateUpdate: StateUpdate
): boolean {
  if (!lm || lm.length < 17) return false;
  try {
    const ok = MIRROR_POSES[state.mirrorIdx]!.check(lm);
    if (ok) {
      if (!state.mirrorHoldStart) onStateUpdate({ mirrorHoldStart: now });
      return state.mirrorHoldStart ? now - state.mirrorHoldStart >= MIRROR_HOLD_MS : false;
    }
    onStateUpdate({ mirrorHoldStart: 0 });
  } catch {
    // ignore
  }
  return false;
}

export function drawMirrorGuide(
  ctx: CanvasRenderingContext2D,
  cW: number,
  cH: number,
  mirrorIdx: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#DB2777';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cx = cW * 0.5;
  const cy = cH * 0.38;
  // 몸통 (세로)
  ctx.beginPath();
  ctx.moveTo(cx, cy - 60);
  ctx.lineTo(cx, cy + 40);
  ctx.stroke();
  // 팔 포즈
  if (mirrorIdx === 0) {
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy - 10);
    ctx.lineTo(cx + 80, cy - 10);
    ctx.stroke();
  } else if (mirrorIdx === 1) {
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 60);
    ctx.lineTo(cx, cy - 10);
    ctx.lineTo(cx + 40, cy - 60);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 40, cy - 60);
    ctx.lineTo(cx, cy - 10);
    ctx.lineTo(cx + 40, cy + 40);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
