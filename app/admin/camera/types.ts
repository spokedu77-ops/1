/**
 * SPOKEDU 카메라 앱 — 타입 정의
 */

import type { DiffKey } from './constants';

export interface Target {
  x: number;
  y: number;
  r: number;
  fill: string;
  glow?: string;
  label?: string;
  shape?: 'circle' | 'square' | 'triangle';
  number?: number;
  hitLocked?: boolean;
  shapeType?: string;
  vx?: number;
  vy?: number;
  spawnTime?: number;
}

export interface GameState {
  mode: string | null;
  diff: DiffKey;
  dur: number;
  multiOn: boolean;
  soundOn: boolean;
  camReady: boolean;
  playing: boolean;
  paused: boolean;
  scores: number[];
  combo: number[];
  hitTimes: number[];
  targets: Target[];
  expectedNum: number;
  targetShape: string;
  timerStart: number;
  timerOffset: number;
  poseIdx: number;
  poseHoldStart: number;
  mirrorIdx: number;
  mirrorHoldStart: number;
}

export interface HistoryRecord {
  date: string;
  mode: string;
  diff: string;
  dur: number;
  scores: number[];
  avgRt: number | null;
  total: number;
}
