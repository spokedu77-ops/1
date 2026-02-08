/**
 * PLAY v1 타임라인 생성
 * Pure: 날짜/랜덤/IO 없음. ResolvedPlayDraft → PlayTimeline
 */

import { PLAY_RULES } from '@/app/lib/constants/rules';
import { getBinaryPatternFromPreset } from './operatorPresets';
import { MOTION_LABELS } from './presets';
import type { ResolvedBlock, ResolvedPlayDraft } from './types';
import type {
  VisualEvent,
  BinaryEvent,
  RevealWipeEvent,
  DropEvent,
  ExplainEvent,
  TransitionEvent,
  AudioEvent,
  PlayTimeline,
} from './types';

const { TICKS } = PLAY_RULES;
const EXPLAIN = TICKS.EXPLAIN;
const SET = TICKS.SET;
const TRANSITION = TICKS.TRANSITION;
const BLOCKS = TICKS.BLOCKS;

/**
 * ResolvedPlayDraft → PlayTimeline (pure)
 */
export function buildTimeline(resolved: ResolvedPlayDraft): PlayTimeline {
  const visuals: VisualEvent[] = [];
  const audio: AudioEvent[] = [];

  let globalTick = 0;

  for (let blockIdx = 0; blockIdx < BLOCKS; blockIdx++) {
    const block = resolved.blocks[blockIdx];
    const blockStartTick = globalTick;

    // explain 5ticks: 텍스트만 (사진 금지)
    const motionId = block.motionId;
    const label = MOTION_LABELS[motionId as keyof typeof MOTION_LABELS] ?? motionId;
    for (let t = 0; t < EXPLAIN; t++) {
      visuals.push({
        kind: 'EXPLAIN',
        tick: blockStartTick + t,
        motionId,
        label,
      } as ExplainEvent);
    }
    globalTick += EXPLAIN;

    // set1 20ticks
    emitSetEvents(block, 1, globalTick, blockIdx, visuals);
    globalTick += SET;

    // set2 20ticks
    emitSetEvents(block, 2, globalTick, blockIdx, visuals);
    globalTick += SET;

    // transition 5ticks (Draft Composer 연결: motionId, label 표시)
    for (let t = 0; t < TRANSITION; t++) {
      visuals.push({
        kind: 'TRANSITION',
        tick: globalTick + t,
        blockIndex: blockIdx,
        motionId,
        label,
      } as TransitionEvent);
    }
    globalTick += TRANSITION;
  }

  const totalTicks = globalTick;

  // audio: BGM_START=0, BGM_STOP=end, SFX=action phase에서만
  audio.push({ kind: 'BGM_START', tick: 0, path: resolved.bgmPath });
  audio.push({ kind: 'BGM_STOP', tick: totalTicks - 1 });

  const isActionTick = (v: VisualEvent): boolean => {
    if (v.kind === 'BINARY') return v.isActionPhase === true;
    if (v.kind === 'REVEAL_WIPE') return v.phase === 'action';
    if (v.kind === 'DROP') return v.phase === 'drop';
    return false;
  };
  const actionTicks = visuals
    .filter((v) => (v.kind === 'BINARY' || v.kind === 'REVEAL_WIPE' || v.kind === 'DROP') && isActionTick(v))
    .map((v) => v.tick);
  const uniqueActionTicks = [...new Set(actionTicks)];
  for (const tick of uniqueActionTicks) {
    audio.push({ kind: 'SFX', tick, path: resolved.sfxPath });
  }

  // tick별 인덱스 (O(n) push 방식)
  const visualsByTick: VisualEvent[][] = Array.from({ length: totalTicks }, () => []);
  for (const v of visuals) {
    if (v.tick >= 0 && v.tick < totalTicks) visualsByTick[v.tick]!.push(v);
  }
  const audioByTick: AudioEvent[][] = Array.from({ length: totalTicks }, () => []);
  for (const a of audio) {
    if (a.tick >= 0 && a.tick < totalTicks) audioByTick[a.tick]!.push(a);
  }

  return { visuals, audio, totalTicks, visualsByTick, audioByTick };
}

function emitSetEvents(
  block: ResolvedBlock,
  setIndex: 1 | 2,
  startTick: number,
  blockIndex: number,
  out: VisualEvent[]
): void {
  const set: ResolvedBlock['set1'] = setIndex === 1 ? block.set1 : block.set2;
  const { operator, imageIds, frames, objects, bgSrc, fgSrc } = set;
  const offSrc = imageIds.off;
  const onSrc = imageIds.on;

  if (operator.type === 'BINARY') {
    const pattern = getBinaryPatternFromPreset(blockIndex, setIndex);
    for (let t = 0; t < SET; t++) {
      const isOn = pattern[t] ?? (t % 2 === 0);
      const src = isOn ? onSrc : offSrc;
      out.push({
        kind: 'BINARY',
        tick: startTick + t,
        blockIndex,
        setIndex,
        src,
        isActionPhase: isOn,
      } as BinaryEvent);
    }
    return;
  }

  if (operator.type === 'PROGRESSIVE') {
    if (operator.style === 'wipe') {
      // 5단계 스냅, 1초당 1단계 (2틱/단계). SET=10 → 5초/set
      const bg = bgSrc ?? offSrc;
      const fg = fgSrc ?? onSrc;
      for (let t = 0; t < SET; t++) {
        const step = Math.floor(t / 2);
        const progress = t >= 9 ? 1 : step / 5;
        const phase = t % 2 === 0 ? 'action' : 'rest';
        out.push({
          kind: 'REVEAL_WIPE',
          tick: startTick + t,
          blockIndex,
          setIndex,
          bgSrc: bg,
          fgSrc: fg,
          progress,
          phase,
          direction: 'bottom-up',
        } as RevealWipeEvent);
      }
    } else {
      // frames: BINARY로 폴백 (onSrc 사용), action tick 판정으로 SFX 정합
      for (let t = 0; t < SET; t++) {
        const src = t < 10 ? (frames?.[t] ?? onSrc) : (frames?.[9] ?? onSrc);
        out.push({
          kind: 'BINARY',
          tick: startTick + t,
          blockIndex,
          setIndex,
          src,
          isActionPhase: t % 2 === 0,
        } as BinaryEvent);
      }
    }
    return;
  }

  if (operator.type === 'DROP') {
    // 5개 차례로 스폰: 틱 0→lane0, 1→lane1, ..., 4→lane4. 각 1초 낙하.
    const bgSrc = offSrc;
    const objSrc = onSrc;
    for (let laneIndex = 0; laneIndex < 5; laneIndex++) {
      const actionTick = startTick + laneIndex;
      out.push({
        kind: 'DROP',
        tick: actionTick,
        blockIndex,
        setIndex,
        bgSrc,
        objSrc,
        phase: 'drop',
        objIndex: laneIndex,
        laneIndex,
      } as DropEvent);
    }
  }
}
