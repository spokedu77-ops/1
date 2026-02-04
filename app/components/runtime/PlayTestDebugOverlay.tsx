'use client';

/**
 * tick/phase/step 실시간 디버그 오버레이
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import type { PlayTimeline, VisualEvent } from '@/app/lib/engine/play/types';

const TICK_MS = PLAY_RULES.TICK_MS;

export interface PlayTestDebugOverlayProps {
  tMs: number;
  timeline: PlayTimeline;
}

export function PlayTestDebugOverlay({ tMs, timeline }: PlayTestDebugOverlayProps) {
  const currentTick = Math.floor(tMs / TICK_MS);
  const visualsAtTick = timeline.visuals.filter((v) => v.tick === currentTick);

  const primary = visualsAtTick.find(
    (v): v is Extract<VisualEvent, { kind: 'BINARY' } | { kind: 'REVEAL_WIPE' } | { kind: 'DROP' }> =>
      v.kind === 'BINARY' || v.kind === 'REVEAL_WIPE' || v.kind === 'DROP'
  );
  const explain = visualsAtTick.find((v) => v.kind === 'EXPLAIN');
  const transition = visualsAtTick.find((v) => v.kind === 'TRANSITION');

  let operatorType = '-';
  let phase = '-';
  let stepFrame = '-';
  let blockIndex: string | number = '-';
  let setIndex = '-';

  if (primary) {
    blockIndex = primary.blockIndex;
    setIndex = String(primary.setIndex);
    if (primary.kind === 'BINARY') {
      operatorType = 'BINARY';
      phase = primary.isActionPhase ? 'on' : 'off';
      stepFrame = '-';
    } else if (primary.kind === 'REVEAL_WIPE') {
      operatorType = 'REVEAL_WIPE';
      phase = primary.phase;
      stepFrame = primary.progress.toFixed(2);
    } else if (primary.kind === 'DROP') {
      operatorType = 'DROP';
      phase = primary.phase;
      stepFrame = `obj${primary.objIndex}`;
    }
  } else if (explain) {
    operatorType = 'EXPLAIN';
    phase = explain.label;
    stepFrame = explain.motionId;
  } else if (transition) {
    operatorType = 'TRANSITION';
    blockIndex = transition.blockIndex;
  }

  return (
    <div className="rounded-lg bg-black/80 p-3 font-mono text-xs text-green-400">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <span>tMs</span>
        <span>{Math.round(tMs)}</span>
        <span>currentTick</span>
        <span>{currentTick}</span>
        <span>blockIndex</span>
        <span>{String(blockIndex)}</span>
        <span>setIndex</span>
        <span>{setIndex}</span>
        <span>operatorType</span>
        <span>{operatorType}</span>
        <span>phase</span>
        <span>{phase}</span>
        <span>step/frameIndex</span>
        <span>{stepFrame}</span>
      </div>
    </div>
  );
}
