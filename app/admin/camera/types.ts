/**
 * SPOKEDU 카메라 앱 — 타입 정의
 */

import type { CameraModeId, DiffKey } from './constants';

export interface CameraSettings {
  diff: DiffKey;
  dur: number;
  multiOn: boolean;
  soundOn: boolean;
}

export type CameraActivitySource = 'player' | 'controller' | 'demo' | 'import';
export type CameraParticipantMode = 'solo' | 'multi' | 'team' | 'unknown';
export type CameraControlSessionStatus = 'waiting' | 'paired' | 'active' | 'ended' | 'expired';
export type CameraControlPhase = 'idle' | 'ready' | 'running' | 'paused' | 'ended';

export type CameraControllerCommand =
  | { type: 'selectMode'; mode: CameraModeId }
  | { type: 'applyContentPack'; packId: string; mode: CameraModeId; settings: Partial<CameraSettings> }
  | { type: 'updateSettings'; settings: Partial<CameraSettings> }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'end' }
  | { type: 'reset' };

export interface CameraControlEnvelope {
  commandId: string;
  issuedAt: string;
  command: CameraControllerCommand;
}

export interface CameraPlayerStateSnapshot {
  phase: CameraControlPhase;
  mode: CameraModeId | null;
  settings: CameraSettings;
  participantMode: CameraParticipantMode;
  lastResultId?: string | null;
  updatedAt: string;
}

export interface CameraControllerStateSnapshot {
  phase: CameraControlPhase;
  mode: CameraModeId;
  settings: CameraSettings;
  participantMode: CameraParticipantMode;
  updatedAt: string;
}

export interface CameraControlSessionDraft {
  id: string;
  code: string;
  status: CameraControlSessionStatus;
  playerState: CameraPlayerStateSnapshot;
  controllerState?: CameraControllerStateSnapshot | null;
  lastCommand?: CameraControlEnvelope | null;
  lastCommandId?: string | null;
  lastAckCommandId?: string | null;
  expiresAt: string;
}

export interface CameraActivityMetrics {
  totalScore: number;
  avgReactionMs: number | null;
  hitCount: number;
  missCount?: number | null;
  comboMax?: number | null;
  activeParticipants: number;
  lateGameScoreRate?: number | null;
  leftRightBalance?: {
    leftHits: number;
    rightHits: number;
    differenceRate: number | null;
  } | null;
  modeSpecific?: Record<string, unknown>;
}

export interface CameraActivityDeviceInfo {
  role: 'player' | 'controller';
  viewport?: { width: number; height: number };
  screen?: { width: number; height: number };
  userAgent?: string;
  camera?: {
    facingMode?: string;
    videoWidth?: number;
    videoHeight?: number;
  };
  pose?: {
    model?: string;
    delegate?: 'CPU' | 'GPU';
  };
}

export interface CameraActivitySessionDraft {
  centerId?: string | null;
  teacherId?: string | null;
  classId?: string | null;
  lessonSessionId?: string | null;
  source: CameraActivitySource;
  mode: CameraModeId;
  difficulty: DiffKey;
  durationSec: number;
  participantMode: CameraParticipantMode;
  settings: CameraSettings;
  metrics: CameraActivityMetrics;
  device?: CameraActivityDeviceInfo | null;
  startedAt?: string | null;
  endedAt?: string | null;
}

export interface CameraActivityParticipantDraft {
  studentId?: string | null;
  teamId?: string | null;
  slotIndex: number;
  displayName?: string | null;
  score: number;
  avgReactionMs?: number | null;
  hitCount: number;
  missCount?: number | null;
  metrics?: Record<string, unknown>;
}

export interface CameraActivitySavePayload {
  session: CameraActivitySessionDraft;
  participants: CameraActivityParticipantDraft[];
}

export interface CameraActivityResultSummary {
  id: string;
  mode: CameraModeId;
  difficulty: DiffKey;
  durationSec: number;
  participantMode: CameraParticipantMode;
  metrics: CameraActivityMetrics;
  createdAt: string;
  participantCount: number;
  topScore: number;
}

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
  mode: CameraModeId | null;
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

export interface CameraResultRecord {
  date: string;
  mode: CameraModeId;
  diff: DiffKey;
  dur: number;
  scores: number[];
  avgRt: number | null;
  total: number;
}

export type HistoryRecord = CameraResultRecord;
