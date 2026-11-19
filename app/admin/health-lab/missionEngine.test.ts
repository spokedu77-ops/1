import { describe, expect, it, vi } from 'vitest';
import { HEALTH_LAB_PROGRAM_ID, LAB_WEEKS } from './curriculum';
import { clearHealthLabStore, HEALTH_LAB_STORAGE_KEY_V1, HEALTH_LAB_STORAGE_KEY_V2, migrateV1Record, parseHealthLabStore, readHealthLabStore } from './healthLabStorage';
import {
  CHILD_A,
  CHILDREN,
  closeMission,
  completionSummary,
  emptyHealthLabStore,
  pauseMission,
  programCompletion,
  resumeMission,
  retryMission,
  startMission,
  type GuardianObservation,
  type MissionAssignment,
  type HealthLabStore,
  type TransitionResult,
} from './missionEngine';

function successfulStore(result: TransitionResult): HealthLabStore {
  if (!result.ok) throw new Error(`Expected a successful mission transition: ${result.reason}`);
  return result.store;
}

const assignment: MissionAssignment = {
  childId: CHILD_A.id,
  programId: HEALTH_LAB_PROGRAM_ID,
  missionId: 'week1-color-move',
  required: true,
};

const observation = (participation: GuardianObservation['participation']): GuardianObservation => ({
  understanding: 'once',
  movement: 'independent',
  participation,
  memo: '메모',
  savedAt: '2026-11-19T00:00:00.000Z',
});

const input = (id: string) => ({
  id,
  childId: CHILD_A.id,
  programId: HEALTH_LAB_PROGRAM_ID,
  missionId: 'week1-color-move',
  missionVersion: 1,
  createdAt: '2026-11-19T00:00:00.000Z',
});

describe('health lab mission engine', () => {
  it('keeps partial and stopped observations out of the required completion rate', () => {
    let store = emptyHealthLabStore();
    store = successfulStore(startMission(store, input('a1')));
    store = successfulStore(closeMission(store, CHILD_A.id, 'week1-color-move', observation('partial')));
    expect(store.attempts).toHaveLength(1);
    expect(store.attempts[0].status).toBe('partial-closed');
    expect(completionSummary(store, CHILD_A.id, [assignment])).toEqual({ completed: 0, required: 1, percent: 0 });

    store = successfulStore(retryMission(store, input('a2')));
    store = successfulStore(pauseMission(store, CHILD_A.id, 'week1-color-move'));
    store = successfulStore(resumeMission(store, CHILD_A.id, 'week1-color-move'));
    store = successfulStore(closeMission(store, CHILD_A.id, 'week1-color-move', observation('stopped')));
    expect(store.attempts.map((attempt) => attempt.observation?.participation)).toEqual(['partial', 'stopped']);
    expect(completionSummary(store, CHILD_A.id, [assignment]).completed).toBe(0);
  });

  it('counts one required mission once even after a repeated completion', () => {
    let store = emptyHealthLabStore();
    store = successfulStore(closeMission(successfulStore(startMission(store, input('a1'))), CHILD_A.id, 'week1-color-move', observation('finished')));
    store = successfulStore(closeMission(successfulStore(retryMission(store, input('a2'))), CHILD_A.id, 'week1-color-move', observation('finished')));
    expect(store.attempts).toHaveLength(2);
    expect(completionSummary(store, CHILD_A.id, [assignment])).toEqual({ completed: 1, required: 1, percent: 100 });
  });

  it('does not turn a legacy done record without an observation into a completion', () => {
    const migrated = migrateV1Record(JSON.stringify({ version: 1, week1Status: 'done', week1Observation: null }));
    expect(migrated.corrupted).toBe(false);
    expect(migrated.store.attempts).toEqual([]);
    expect(completionSummary(migrated.store, CHILD_A.id, [assignment]).completed).toBe(0);
  });

  it('migrates a legacy observation without deleting the v0.1 key', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value); },
        removeItem: (key: string) => { storage.delete(key); },
      },
    });
    storage.set(HEALTH_LAB_STORAGE_KEY_V1, JSON.stringify({
      version: 1,
      week1Status: 'done',
      week1Observation: observation('finished'),
    }));
    const loaded = readHealthLabStore();
    expect(loaded.migrated).toBe(true);
    expect(loaded.store.attempts[0].status).toBe('done');
    expect(storage.has(HEALTH_LAB_STORAGE_KEY_V1)).toBe(true);
    expect(storage.has(HEALTH_LAB_STORAGE_KEY_V2)).toBe(true);
    clearHealthLabStore();
    expect(storage.has(HEALTH_LAB_STORAGE_KEY_V1)).toBe(true);
    expect(JSON.parse(storage.get(HEALTH_LAB_STORAGE_KEY_V2) ?? '{}').attempts).toEqual([]);
    const reread = readHealthLabStore();
    expect(reread.migrated).toBe(false);
    expect(reread.store.attempts).toEqual([]);
    expect(storage.get(HEALTH_LAB_STORAGE_KEY_V1)).toContain('"participation":"finished"');
    vi.unstubAllGlobals();
  });

  it('does not open a second attempt while one is running, and resume keeps the same attempt', () => {
    const started = startMission(emptyHealthLabStore(), input('same'));
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(startMission(started.store, input('other')).ok).toBe(false);
    expect(started.store.attempts).toHaveLength(1);
    const paused = pauseMission(started.store, CHILD_A.id, 'week1-color-move');
    expect(paused.ok && paused.store.attempts[0].id).toBe('same');
    if (!paused.ok) return;
    const resumed = resumeMission(paused.store, CHILD_A.id, 'week1-color-move');
    expect(resumed.ok && resumed.store.attempts).toEqual([{ ...paused.store.attempts[0], status: 'running' }]);
  });

  it('refuses to resume a closed attempt and keeps both attempts after retry', () => {
    let store = successfulStore(closeMission(successfulStore(startMission(emptyHealthLabStore(), input('done-1'))), CHILD_A.id, 'week1-color-move', observation('finished')));
    expect(resumeMission(store, CHILD_A.id, 'week1-color-move').ok).toBe(false);
    expect(store.attempts).toHaveLength(1);
    store = successfulStore(closeMission(successfulStore(retryMission(store, input('stop-2'))), CHILD_A.id, 'week1-color-move', observation('stopped')));
    expect(store.attempts.map((attempt) => attempt.status)).toEqual(['done', 'stopped-closed']);
    expect(completionSummary(store, CHILD_A.id, [assignment])).toEqual({ completed: 1, required: 1, percent: 100 });
    store = successfulStore(closeMission(successfulStore(retryMission(store, input('partial-3'))), CHILD_A.id, 'week1-color-move', observation('partial')));
    expect(store.attempts).toHaveLength(3);
    expect(store.attempts[0].observation?.participation).toBe('finished');
    expect(completionSummary(store, CHILD_A.id, [assignment]).completed).toBe(1);
  });

  it('keeps each child assignment separate and ignores an unknown child id', () => {
    const assignments = CHILDREN.map((child) => ({ ...assignment, childId: child.id }));
    let store = successfulStore(closeMission(successfulStore(startMission(emptyHealthLabStore(), input('a'))), CHILD_A.id, 'week1-color-move', observation('finished')));
    store = successfulStore(closeMission(successfulStore(startMission(store, { ...input('b'), childId: 'virtual-child-b' })), 'virtual-child-b', 'week1-color-move', observation('stopped')));
    expect(completionSummary(store, CHILD_A.id, assignments)).toEqual({ completed: 1, required: 1, percent: 100 });
    expect(completionSummary(store, 'virtual-child-b', assignments).completed).toBe(0);
    expect(completionSummary(store, 'virtual-child-c', assignments)).toEqual({ completed: 0, required: 1, percent: 0 });
    expect(programCompletion(store, assignments)).toEqual({ completed: 1, required: 3, percent: 33 });
    const parsed = parseHealthLabStore(JSON.stringify({
      schemaVersion: 2,
      legacyImported: true,
      attempts: [
        store.attempts[0],
        { ...store.attempts[0], id: 'foreign', childId: 'real-child' },
      ],
    }));
    expect(parsed.corrupted).toBe(false);
    expect(completionSummary(parsed.store, CHILD_A.id, assignments).completed).toBe(1);
    expect(parsed.store.attempts.some((attempt) => attempt.childId === CHILD_A.id && attempt.id === 'foreign')).toBe(false);
  });

  it('counts week 1 and week 2 as separate required assignments without replacing attempts', () => {
    const assignments = CHILDREN.flatMap((child) => LAB_WEEKS.flatMap((week) => (
      week.required && week.missionId ? [{ childId: child.id, programId: HEALTH_LAB_PROGRAM_ID, missionId: week.missionId, required: true }] : []
    )));
    let store = successfulStore(closeMission(successfulStore(startMission(emptyHealthLabStore(), input('a-week1'))), CHILD_A.id, 'week1-color-move', observation('finished')));
    const week1 = store.attempts[0];
    store = successfulStore(closeMission(successfulStore(startMission(store, { ...input('a-week2'), missionId: 'week2-footstep-path' })), CHILD_A.id, 'week2-footstep-path', observation('finished')));
    store = successfulStore(closeMission(successfulStore(retryMission(store, { ...input('a-week2-again'), missionId: 'week2-footstep-path' })), CHILD_A.id, 'week2-footstep-path', observation('finished')));
    store = successfulStore(closeMission(successfulStore(startMission(store, { ...input('b-week1'), childId: 'virtual-child-b' })), 'virtual-child-b', 'week1-color-move', observation('finished')));
    expect(store.attempts[0]).toEqual(week1);
    expect(completionSummary(store, CHILD_A.id, assignments)).toEqual({ completed: 2, required: 2, percent: 100 });
    expect(completionSummary(store, 'virtual-child-b', assignments)).toEqual({ completed: 1, required: 2, percent: 50 });
    expect(completionSummary(store, 'virtual-child-c', assignments)).toEqual({ completed: 0, required: 2, percent: 0 });
    expect(programCompletion(store, assignments)).toEqual({ completed: 3, required: 6, percent: 50 });
    expect(parseHealthLabStore(JSON.stringify(store)).corrupted).toBe(false);
  });

  it('reads a phase 2 store that has no habit logs and keeps the attempts', () => {
    const raw = JSON.stringify({ schemaVersion: 2, legacyImported: true, attempts: [{ id: 'old', childId: CHILD_A.id, programId: HEALTH_LAB_PROGRAM_ID, missionId: 'week1-color-move', missionVersion: 1, status: 'done', observation: observation('finished'), createdAt: '2026-11-19T00:00:00.000Z' }] });
    const parsed = parseHealthLabStore(raw);
    expect(parsed.corrupted).toBe(false);
    expect(parsed.store.attempts).toHaveLength(1);
    expect(parsed.store.habitLogs).toEqual([]);
    expect(completionSummary(parsed.store, CHILD_A.id, [assignment]).completed).toBe(1);
  });
});
