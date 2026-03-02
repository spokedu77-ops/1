/**
 * SPOKEDU 카메라 앱 — 엔진 진입점 (renderFrame만)
 * state는 Readonly, 변경은 콜백(onStateUpdate 등)으로만 위임
 */

import { DIFF, PLAYER_COLORS, TOUCH_IDX, POSES, MIRROR_POSES, MIRROR_HOLD_MS } from '../constants';
import type { GameState } from '../types';
import * as fx from './fx';
import * as pose from './pose';
import * as targets from './targets';

export { clearSmooth, clearTrails, clearParticles } from './fx';
export { spawnSpeed, spawnMoving, spawnSequence, spawnShape } from './targets';
export { nextBalancePose, nextMirrorPose } from './pose';

export type { StateUpdate } from './pose';
export type { TargetsCallbacks } from './targets';

export interface EngineCallbacks {
  addScore: (pi: number, pts: number) => void;
  feedback: (msg: string, warn?: boolean) => void;
  comboFlash: () => void;
  nextBalancePose: () => void;
  nextMirrorPose: () => void;
  endGame: () => void;
  setMissionText: (text: string) => void;
  getElement: (id: string) => HTMLElement | null;
  getCanvasSize: () => { cW: number; cH: number };
  setHudTime: (html: string) => void;
  setHudWarn: (warn: boolean) => void;
  onStateUpdate: (patch: Partial<GameState>) => void;
  onSpawnMovingLater?: () => void;
}

type Landmark = { x: number; y: number; visibility?: number };

function processLandmarks(
  ctx: CanvasRenderingContext2D,
  state: Readonly<GameState>,
  lmAll: Landmark[][],
  cW: number,
  cH: number,
  dW: number,
  dH: number,
  oX: number,
  oY: number,
  now: number,
  callbacks: EngineCallbacks
): void {
  let sorted = [...lmAll].sort((a, b) => (b[0]?.x ?? 0) - (a[0]?.x ?? 0));
  if (!state.multiOn) sorted = [sorted[0]!].filter(Boolean);

  sorted.forEach((lm, pi) => {
    if (pi >= 3) return;
    const col = PLAYER_COLORS[pi]!;

    if (state.mode === 'balance') {
      if (pi === 0) {
        pose.processBalance(state, lm, now, callbacks.getElement, callbacks.onStateUpdate);
        if (pose.checkBalanceComplete(state, now)) {
          callbacks.addScore(0, Math.round(30 * DIFF[state.diff].bonus));
          callbacks.feedback('🧘 ' + POSES[state.poseIdx]!.name + ' 성공!');
          pose.nextBalancePose(state, callbacks.getElement, callbacks.onStateUpdate);
        }
      }
      return;
    }
    if (state.mode === 'mirror') {
      if (pi === 0) {
        if (pose.processMirror(state, lm, now, callbacks.onStateUpdate)) {
          callbacks.addScore(0, Math.round(25 * DIFF[state.diff].bonus));
          callbacks.feedback('🪞 완벽한 동작!');
          pose.nextMirrorPose(state, callbacks.setMissionText, callbacks.onStateUpdate);
        }
      }
      return;
    }

    TOUCH_IDX.forEach((idx) => {
      const pt = lm[idx];
      if (!pt || (pt.visibility != null && pt.visibility < 0.4)) return;

      const rawX = cW - (oX + pt.x * dW);
      const rawY = oY + pt.y * dH;
      const sp = fx.smooth(`${pi}_${idx}`, rawX, rawY);

      fx.pushTrail(`${pi}_${idx}`, sp.x, sp.y, now);
      fx.drawTrail(ctx, `${pi}_${idx}`, col.rgba, now);

      const aura = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 45);
      aura.addColorStop(0, `rgba(${col.rgba},0.5)`);
      aura.addColorStop(1, `rgba(${col.rgba},0)`);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 45, 0, Math.PI * 2);
      ctx.fillStyle = aura;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = col.hex;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = state.targets.length - 1; i >= 0; i--) {
        const t = state.targets[i]!;
        const tx = t.x * cW;
        const ty = t.y * cH;
        const tr = t.r * Math.min(cW, cH);
        const dist = Math.hypot(sp.x - tx, sp.y - ty);
        if (dist < tr + Math.min(cW, cH) * 0.07) {
          targets.handleHit(state, t, i, pi, now, {
            addScore: callbacks.addScore,
            feedback: callbacks.feedback,
            comboFlash: callbacks.comboFlash,
            setMissionText: callbacks.setMissionText,
            getCanvasSize: callbacks.getCanvasSize,
            onStateUpdate: callbacks.onStateUpdate,
            onSpawnMovingLater: callbacks.onSpawnMovingLater,
          });
          break;
        }
      }
    });
  });
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  state: Readonly<GameState>,
  lmAll: Landmark[][],
  cW: number,
  cH: number,
  dW: number,
  dH: number,
  oX: number,
  oY: number,
  now: number,
  callbacks: EngineCallbacks
): boolean {
  ctx.save();
  ctx.clearRect(0, 0, cW, cH);

  ctx.save();
  ctx.translate(cW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, oX, oY, dW, dH);
  ctx.restore();

  if (!state.playing || state.paused) {
    ctx.restore();
    return true;
  }

  const elapsed = (state.timerOffset + (now - state.timerStart)) / 1000;
  const tLeft = Math.max(0, state.dur - elapsed);
  callbacks.setHudTime(Math.ceil(tLeft) + '<span style="font-size:1rem;font-weight:600">초</span>');
  callbacks.setHudWarn(tLeft <= 5);
  if (tLeft <= 0) {
    ctx.restore();
    return false;
  }

  let targetsToDraw = state.targets;
  let stateForHit: Readonly<GameState> = state;
  if (state.mode === 'moving') {
    const updatedTargets = state.targets.map((t) => {
      let x = t.x + (t.vx ?? 0);
      let y = t.y + (t.vy ?? 0);
      let vx = t.vx ?? 0;
      let vy = t.vy ?? 0;
      if (x < 0.08 || x > 0.92) vx *= -1;
      if (y < 0.1 || y > 0.92) vy *= -1;
      return { ...t, x, y, vx, vy };
    });
    callbacks.onStateUpdate({ targets: updatedTargets });
    targetsToDraw = updatedTargets;
    stateForHit = { ...state, targets: updatedTargets };
  }

  targetsToDraw.forEach((t) => targets.drawTarget(ctx, t, cW, cH, now));

  fx.tickParticles(ctx);

  if (state.mode === 'mirror' && lmAll.length > 0) {
    ctx.save();
    ctx.translate(cW, 0);
    ctx.scale(-1, 1);
    pose.drawMirrorGuide(ctx, cW, cH, state.mirrorIdx);
    ctx.restore();
    const lm = lmAll[0];
    if (lm) {
      const ok = MIRROR_POSES[state.mirrorIdx]!.check(lm);
      if (ok && state.mirrorHoldStart) {
        const prog = Math.min((now - state.mirrorHoldStart) / MIRROR_HOLD_MS, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(219,39,119,0.18)';
        ctx.fillRect(cW * 0.1, cH - 32, cW * 0.8 * prog, 18);
        ctx.strokeStyle = '#DB2777';
        ctx.lineWidth = 2;
        ctx.strokeRect(cW * 0.1, cH - 32, cW * 0.8, 18);
        ctx.restore();
      }
    }
  }

  if (lmAll.length > 0) {
    processLandmarks(ctx, stateForHit, lmAll, cW, cH, dW, dH, oX, oY, now, callbacks);
  }

  ctx.restore();
  return true;
}
