/**
 * PLAY v1 엔진 타입
 * Renderer는 상태 없음: tMs만 받아서 그린다
 */

import type { SetOperator } from '@/app/lib/constants/schemas';
import type { MotionId } from './presets';

export type { MotionId };

/** AssetIndex: themeId + motionId → 확정된 에셋 URL */
export interface MotionAssets {
  off: string;
  on: string;
  frames?: string[];
  objects?: string[];
  /** REVEAL_WIPE용 배경/전경 */
  bgSrc?: string;
  fgSrc?: string;
}

export interface AssetIndex {
  /** motionId → URL 매핑 (theme 적용 후) */
  motions: Record<string, MotionAssets>;
  /** 배경 URL */
  background?: string;
  /** BGM path (storage path) */
  bgm?: string;
  /** SFX path (storage path) */
  sfx?: string;
}

/** Resolved set (공통 구조) */
export interface ResolvedSet {
  operator: SetOperator;
  imageIds: { off: string; on: string };
  frames?: string[];
  objects?: string[];
  /** REVEAL_WIPE용 */
  bgSrc?: string;
  fgSrc?: string;
}

/** Resolved block: 모든 imageId 확정 */
export interface ResolvedBlock {
  motionId: string;
  set1: ResolvedSet;
  set2: ResolvedSet;
}

export interface ResolvedPlayDraft {
  blocks: ResolvedBlock[];
  backgroundUrl?: string;
  bgmPath?: string;
  sfxPath?: string;
}

/** Timeline 이벤트 (atTick 배열) - 렌더 가능한 형태, src 직접 포함 */
export type ExplainEvent = {
  kind: 'EXPLAIN';
  tick: number;
  motionId: string;
  label: string;
};

export type BinaryEvent = {
  kind: 'BINARY';
  tick: number;
  blockIndex: number;
  setIndex: 1 | 2;
  /** 해당 tick에 표시할 이미지 URL */
  src: string;
  /** ON tick 여부 (SFX용) */
  isActionPhase?: boolean;
};

export type RevealWipeEvent = {
  kind: 'REVEAL_WIPE';
  tick: number;
  blockIndex: number;
  setIndex: 1 | 2;
  bgSrc: string;
  fgSrc: string;
  /** 0..1 진행도 */
  progress: number;
  phase: 'action' | 'rest';
  direction: 'bottom-up';
};

export type DropEvent = {
  kind: 'DROP';
  tick: number;
  blockIndex: number;
  setIndex: 1 | 2;
  bgSrc?: string;
  objSrc: string;
  phase: 'drop' | 'rest';
  objIndex: number;
};

export type TransitionEvent = {
  kind: 'TRANSITION';
  tick: number;
  blockIndex: number;
};

export type VisualEvent = ExplainEvent | BinaryEvent | RevealWipeEvent | DropEvent | TransitionEvent;

/** Audio 이벤트 */
export type BgmStartEvent = { kind: 'BGM_START'; tick: number; path?: string };
export type BgmStopEvent = { kind: 'BGM_STOP'; tick: number };
export type SfxEvent = { kind: 'SFX'; tick: number; path?: string };

export type AudioEvent = BgmStartEvent | BgmStopEvent | SfxEvent;

/** PlayTimeline: tick 기반, Renderer가 tMs로 조회 */
export interface PlayTimeline {
  /** 시각 이벤트 (atTick) */
  visuals: VisualEvent[];
  /** 오디오 이벤트 (atTick) */
  audio: AudioEvent[];
  /** 총 tick 수 */
  totalTicks: number;
  /** tick별 시각 이벤트 (렌더 최적화용) */
  visualsByTick: VisualEvent[][];
  /** tick별 오디오 이벤트 (렌더 최적화용) */
  audioByTick: AudioEvent[][];
}

/** Renderer 계약: 상태 없음, tMs + timeline.visuals만 받아서 그림 */
export type PlayRendererProps = {
  tMs: number;
  visuals: VisualEvent[];
  totalTicks: number;
};
