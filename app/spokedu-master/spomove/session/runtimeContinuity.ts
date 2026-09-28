import type { DiveThemeId } from '@/app/lib/spomove/diveThemes';

import type { ActivityOperationConfig, SpomoveRecentConfigSnapshotV3 } from '../operations/operationTypes';
import type { MovementPick } from '../movements/movementTypes';
import type { MovementChangeEvent } from './sessionMovementLifecycle';
import type { SpomoveCompletionReason } from './sessionResultModel';

export const SPOMOVE_ACTIVE_RUN_STORAGE_KEY = 'spokedu-master:spomove-active-run:v1';
export const SPOMOVE_TERMINAL_RECEIPT_STORAGE_KEY = 'spokedu-master:spomove-terminal-receipt:v1';
export const SPOMOVE_ACTIVE_RUN_TTL_MS = 6 * 60 * 60 * 1000;

export type SpomoveRuntimeConfig = {
  presetId: string;
  launchMode: 'projector' | 'mobile';
  soundEnabled: boolean;
  bgmPath: string;
  cueSeconds: number;
  movement: MovementPick | null;
  operationLayerStatus: 'legacyDisabled' | 'ready' | 'sanitized' | 'fallback';
  operation?: ActivityOperationConfig;
  difficultyKind?: string;
  difficultyValue?: string;
  diveEnvironmentTheme: DiveThemeId;
  sportsArenaFeatures: Array<'side' | 'jump' | 'duck'>;
  flowDuration: number;
  flowIncludeBonus: boolean;
};

export type SpomoveActiveRunSnapshotV1 = {
  version: 1;
  runId: string;
  presetId: string;
  phase: 'running' | 'paused';
  startedAt: string;
  elapsedActiveMs: number;
  currentMovement: MovementPick | null;
  movementChanges: MovementChangeEvent[];
  runtimeSettings: SpomoveRuntimeConfig;
  savedAt: number;
};

export type SpomoveTerminalReceiptV1 = {
  version: 1;
  runId: string;
  presetId: string;
  completionReason: SpomoveCompletionReason;
  endedAt: number;
};

type StorageReader = Pick<Storage, 'getItem' | 'removeItem'>;
type StorageWriter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isMovement(value: unknown): value is MovementPick {
  if (!isRecord(value)) return false;
  return typeof value.baseMovement === 'string' && ['free', 'sameSide', 'oppositeSide'].includes(String(value.limbRule));
}

function isMovementChange(value: unknown): value is MovementChangeEvent {
  if (!isRecord(value) || !isMovement(value.from) || !isMovement(value.to)) return false;
  return typeof value.activeElapsedMs === 'number' && Number.isFinite(value.activeElapsedMs) && value.activeElapsedMs >= 0;
}

function isRuntimeConfig(value: unknown, presetId: string): value is SpomoveRuntimeConfig {
  if (!isRecord(value) || value.presetId !== presetId) return false;
  if (value.launchMode !== 'projector' && value.launchMode !== 'mobile') return false;
  if (typeof value.soundEnabled !== 'boolean' || typeof value.bgmPath !== 'string') return false;
  if (typeof value.cueSeconds !== 'number' || !Number.isFinite(value.cueSeconds)) return false;
  if (value.movement !== null && !isMovement(value.movement)) return false;
  if (!['legacyDisabled', 'ready', 'sanitized', 'fallback'].includes(String(value.operationLayerStatus))) return false;
  if (value.operationLayerStatus !== 'legacyDisabled' && !isRecord(value.operation)) return false;
  if (typeof value.diveEnvironmentTheme !== 'string') return false;
  if (!Array.isArray(value.sportsArenaFeatures) || value.sportsArenaFeatures.some((item) => !['side', 'jump', 'duck'].includes(String(item)))) return false;
  if (typeof value.flowDuration !== 'number' || !Number.isFinite(value.flowDuration)) return false;
  return typeof value.flowIncludeBonus === 'boolean';
}

export function createSpomoveRunId(randomUuid?: () => string): string {
  const uuid = randomUuid ?? (() => crypto.randomUUID());
  return uuid();
}

export function buildRecentConfigSnapshot(config: SpomoveRuntimeConfig): SpomoveRecentConfigSnapshotV3 {
  return { schemaVersion: 3, ...config };
}

export function parseActiveRunSnapshot(
  raw: string | null,
  expectedPresetId: string,
  now = Date.now(),
): SpomoveActiveRunSnapshotV1 | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== 1 || value.presetId !== expectedPresetId) return null;
    if (typeof value.runId !== 'string' || !value.runId.trim()) return null;
    if (value.phase !== 'running' && value.phase !== 'paused') return null;
    if (typeof value.startedAt !== 'string' || !Number.isFinite(Date.parse(value.startedAt))) return null;
    if (typeof value.elapsedActiveMs !== 'number' || value.elapsedActiveMs < 0) return null;
    if (typeof value.savedAt !== 'number' || now - value.savedAt > SPOMOVE_ACTIVE_RUN_TTL_MS || value.savedAt > now + 60_000) return null;
    if (value.currentMovement !== null && !isMovement(value.currentMovement)) return null;
    if (!Array.isArray(value.movementChanges) || value.movementChanges.some((change) => !isMovementChange(change)) || !isRuntimeConfig(value.runtimeSettings, expectedPresetId)) return null;
    return value as SpomoveActiveRunSnapshotV1;
  } catch {
    return null;
  }
}

export function readActiveRunSnapshot(
  expectedPresetId: string,
  storage: StorageReader = sessionStorage,
  now = Date.now(),
): SpomoveActiveRunSnapshotV1 | null {
  try {
    const raw = storage.getItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
    if (raw) {
      try {
        const candidate: unknown = JSON.parse(raw);
        if (isRecord(candidate) && typeof candidate.presetId === 'string' && candidate.presetId !== expectedPresetId) {
          return null;
        }
      } catch {
        // The normal parser below classifies and removes corrupt snapshots.
      }
    }
    const parsed = parseActiveRunSnapshot(raw, expectedPresetId, now);
    if (raw && !parsed) storage.removeItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export function discardActiveRunSnapshotForPreset(
  presetId: string,
  storage: StorageReader = sessionStorage,
) {
  try {
    const raw = storage.getItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
    if (!raw) return;
    const candidate: unknown = JSON.parse(raw);
    if (isRecord(candidate) && candidate.presetId === presetId) {
      storage.removeItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
    }
  } catch {
    storage.removeItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
  }
}

export function writeActiveRunSnapshot(snapshot: SpomoveActiveRunSnapshotV1, storage: Pick<Storage, 'setItem'> = sessionStorage) {
  try {
    storage.setItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Recovery persistence is best-effort and must never crash a live runtime.
  }
}

export function commitTerminalReceipt(
  receipt: SpomoveTerminalReceiptV1,
  storage: StorageWriter = sessionStorage,
): boolean {
  try {
    const current = storage.getItem(SPOMOVE_TERMINAL_RECEIPT_STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as Partial<SpomoveTerminalReceiptV1>;
      if (parsed.version === 1 && parsed.runId === receipt.runId) return false;
    }
  } catch {
    // A corrupt receipt cannot prevent a valid terminal transition.
  }
  try {
    storage.setItem(SPOMOVE_TERMINAL_RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
    storage.removeItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
  } catch {
    // Storage denial must not crash termination; the in-memory guard remains authoritative.
  }
  return true;
}

export function clearActiveRunSnapshot(storage: Pick<Storage, 'removeItem'> = sessionStorage) {
  try {
    storage.removeItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY);
  } catch {
    // Storage denial must not block setup.
  }
}
