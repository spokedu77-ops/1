import { describe, expect, it } from 'vitest';

import {
  SPOMOVE_ACTIVE_RUN_STORAGE_KEY,
  SPOMOVE_ACTIVE_RUN_TTL_MS,
  SPOMOVE_TERMINAL_RECEIPT_STORAGE_KEY,
  buildRecentConfigSnapshot,
  commitTerminalReceipt,
  createSpomoveRunId,
  discardActiveRunSnapshotForPreset,
  parseActiveRunSnapshot,
  readActiveRunSnapshot,
  type SpomoveActiveRunSnapshotV1,
  type SpomoveRuntimeConfig,
} from './runtimeContinuity';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

const config: SpomoveRuntimeConfig = {
  presetId: 'preset-a',
  launchMode: 'mobile',
  soundEnabled: false,
  bgmPath: 'music/a.mp3',
  cueSeconds: 4,
  movement: { baseMovement: 'handTouch', limbRule: 'sameSide' },
  operationLayerStatus: 'legacyDisabled',
  diveEnvironmentTheme: 'theme2',
  sportsArenaFeatures: ['side', 'jump'],
  flowDuration: 25,
  flowIncludeBonus: false,
};

const now = Date.UTC(2026, 8, 28, 9);
const snapshot: SpomoveActiveRunSnapshotV1 = {
  version: 1,
  runId: 'run-a',
  presetId: 'preset-a',
  phase: 'paused',
  startedAt: new Date(now - 60_000).toISOString(),
  elapsedActiveMs: 20_000,
  currentMovement: config.movement,
  movementChanges: [{
    from: { baseMovement: 'footTap', limbRule: 'free' },
    to: config.movement!,
    activeElapsedMs: 10_000,
  }],
  runtimeSettings: config,
  savedAt: now,
};

describe('SPOMOVE runtime continuity', () => {
  it('creates a new identity through the injected UUID source', () => {
    expect(createSpomoveRunId(() => 'run-a')).toBe('run-a');
    expect(createSpomoveRunId(() => 'run-b')).toBe('run-b');
  });

  it.each(['running', 'paused'] as const)('round-trips a valid %s active snapshot', (phase) => {
    expect(parseActiveRunSnapshot(JSON.stringify({ ...snapshot, phase }), 'preset-a', now)?.runId).toBe('run-a');
  });

  it('preserves run identity, movement, active elapsed, and full settings', () => {
    const parsed = parseActiveRunSnapshot(JSON.stringify(snapshot), 'preset-a', now);
    expect(parsed).toMatchObject({
      runId: 'run-a',
      elapsedActiveMs: 20_000,
      currentMovement: config.movement,
      runtimeSettings: config,
    });
    expect(parsed?.movementChanges).toHaveLength(1);
  });

  it.each([
    '{',
    JSON.stringify({ ...snapshot, version: 2 }),
    JSON.stringify({ ...snapshot, runId: '' }),
    JSON.stringify({ ...snapshot, phase: 'done' }),
    JSON.stringify({ ...snapshot, currentMovement: { baseMovement: 3, limbRule: 'free' } }),
    JSON.stringify({ ...snapshot, movementChanges: [{ nope: true }] }),
    JSON.stringify({ ...snapshot, runtimeSettings: { ...config, sportsArenaFeatures: ['invalid'] } }),
  ])('rejects corrupt or invalid snapshots safely', (raw) => {
    expect(parseActiveRunSnapshot(raw, 'preset-a', now)).toBeNull();
  });

  it('rejects expired and future snapshots', () => {
    expect(parseActiveRunSnapshot(JSON.stringify({ ...snapshot, savedAt: now - SPOMOVE_ACTIVE_RUN_TTL_MS - 1 }), 'preset-a', now)).toBeNull();
    expect(parseActiveRunSnapshot(JSON.stringify({ ...snapshot, savedAt: now + 60_001 }), 'preset-a', now)).toBeNull();
  });

  it('never restores a snapshot into another preset', () => {
    expect(parseActiveRunSnapshot(JSON.stringify(snapshot), 'preset-b', now)).toBeNull();
  });

  it('does not discard another preset run while checking an unrelated route', () => {
    const storage = memoryStorage();
    storage.setItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY, JSON.stringify(snapshot));
    expect(readActiveRunSnapshot('preset-b', storage, now)).toBeNull();
    expect(readActiveRunSnapshot('preset-a', storage, now)?.runId).toBe('run-a');
  });

  it('discards an unavailable preset snapshot only when its route matches', () => {
    const storage = memoryStorage();
    storage.setItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY, JSON.stringify(snapshot));
    discardActiveRunSnapshotForPreset('preset-b', storage);
    expect(storage.getItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY)).not.toBeNull();
    discardActiveRunSnapshotForPreset('preset-a', storage);
    expect(storage.getItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY)).toBeNull();
  });

  it('discards an invalid stored snapshot and enters safe setup', () => {
    const storage = memoryStorage();
    storage.setItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY, '{');
    expect(readActiveRunSnapshot('preset-a', storage, now)).toBeNull();
    expect(storage.getItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY)).toBeNull();
  });

  it('commits one terminal reason per run and clears the active snapshot', () => {
    const storage = memoryStorage();
    storage.setItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY, JSON.stringify(snapshot));
    expect(commitTerminalReceipt({ version: 1, runId: 'run-a', presetId: 'preset-a', completionReason: 'cancelled', endedAt: now }, storage)).toBe(true);
    expect(storage.getItem(SPOMOVE_ACTIVE_RUN_STORAGE_KEY)).toBeNull();
    expect(commitTerminalReceipt({ version: 1, runId: 'run-a', presetId: 'preset-a', completionReason: 'natural_complete', endedAt: now + 1 }, storage)).toBe(false);
    expect(JSON.parse(storage.getItem(SPOMOVE_TERMINAL_RECEIPT_STORAGE_KEY)!)).toMatchObject({ completionReason: 'cancelled' });
  });

  it('allows a new runId to establish its own terminal reason', () => {
    const storage = memoryStorage();
    commitTerminalReceipt({ version: 1, runId: 'run-a', presetId: 'preset-a', completionReason: 'cancelled', endedAt: now }, storage);
    expect(commitTerminalReceipt({ version: 1, runId: 'run-b', presetId: 'preset-a', completionReason: 'natural_complete', endedAt: now + 1 }, storage)).toBe(true);
  });

  it('creates a versioned full Recent config without execution results', () => {
    expect(buildRecentConfigSnapshot(config)).toEqual({ schemaVersion: 3, ...config });
    expect(buildRecentConfigSnapshot(config)).not.toHaveProperty('runId');
    expect(buildRecentConfigSnapshot(config)).not.toHaveProperty('elapsedActiveMs');
  });
});
