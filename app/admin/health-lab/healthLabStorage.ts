import { HEALTH_LAB_PROGRAM_ID, LAB_WEEKS } from './curriculum';
import {
  CHILD_A,
  KNOWN_CHILD_IDS,
  emptyHealthLabStore,
  statusForParticipation,
  type GuardianObservation,
  type HabitLog,
  type HealthLabStore,
  type MissionAttempt,
  type MissionRunStatus,
  type MovementLevel,
  type ParticipationResult,
  type UnderstandingLevel,
} from './missionEngine';

export const HEALTH_LAB_STORAGE_KEY_V1 = 'spokedu.health-lab.prototype.v0.1';
export const HEALTH_LAB_STORAGE_KEY_V2 = 'spokedu.health-lab.prototype.v2';
export const PARTICIPANT_LABEL = CHILD_A.label;

const WEEK1 = LAB_WEEKS.find((week) => week.missionId === 'week1-color-move');

const UNDERSTANDING = new Set<UnderstandingLevel>(['once', 'repeated', 'ongoing-help']);
const MOVEMENT = new Set<MovementLevel>(['independent', 'partial-help', 'difficult']);
const PARTICIPATION = new Set<ParticipationResult>(['finished', 'partial', 'stopped']);
const STATUS = new Set<MissionRunStatus>(['before', 'running', 'paused', 'done', 'partial-closed', 'stopped-closed']);

type LegacyRecord = {
  version?: number;
  week1Status?: MissionRunStatus;
  week1Observation?: GuardianObservation | null;
};

function isObservation(value: unknown): value is GuardianObservation {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<GuardianObservation>;
  return (
    UNDERSTANDING.has(row.understanding as UnderstandingLevel) &&
    MOVEMENT.has(row.movement as MovementLevel) &&
    PARTICIPATION.has(row.participation as ParticipationResult) &&
    typeof row.memo === 'string' &&
    row.memo.length <= 2000 &&
    typeof row.savedAt === 'string' &&
    !Number.isNaN(Date.parse(row.savedAt))
  );
}

function isStoredAttempt(value: unknown, knownOnly: boolean): value is MissionAttempt {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<MissionAttempt>;
  const childId = row.childId;
  const childOk = typeof childId === 'string' && childId.length > 0 && childId.length <= 80 && (knownOnly ? KNOWN_CHILD_IDS.has(childId) : !KNOWN_CHILD_IDS.has(childId));
  return (
    typeof row.id === 'string' &&
    childOk &&
    row.programId === HEALTH_LAB_PROGRAM_ID &&
    typeof row.missionId === 'string' &&
    LAB_WEEKS.some((week) => week.available && week.missionId === row.missionId) &&
    row.missionVersion === 1 &&
    STATUS.has(row.status as MissionRunStatus) &&
    row.status !== 'before' &&
    (row.observation == null || isObservation(row.observation)) &&
    typeof row.createdAt === 'string' &&
    !Number.isNaN(Date.parse(row.createdAt))
  );
}

function isAttempt(value: unknown): value is MissionAttempt {
  return isStoredAttempt(value, true);
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isHabitLog(value: unknown): value is HabitLog {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<HabitLog>;
  const choice = (item: unknown) => item === null || item === 'yes' || item === 'no';
  return (
    typeof row.childId === 'string' &&
    typeof row.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    choice(row.vegetables) &&
    choice(row.movementPlay) &&
    (row.bedtime === null || (typeof row.bedtime === 'string' && TIME_PATTERN.test(row.bedtime))) &&
    (row.wakeTime === null || (typeof row.wakeTime === 'string' && TIME_PATTERN.test(row.wakeTime))) &&
    (row.mediaMinutes === null || (Number.isInteger(row.mediaMinutes) && (row.mediaMinutes as number) >= 0 && (row.mediaMinutes as number) <= 1440))
  );
}

export function parseHealthLabStore(raw: string | null): { store: HealthLabStore; corrupted: boolean } {
  if (!raw) return { store: emptyHealthLabStore(false), corrupted: false };
  try {
    const parsed = JSON.parse(raw) as Partial<HealthLabStore>;
    if (parsed.schemaVersion !== 2 || !Array.isArray(parsed.attempts) || parsed.attempts.some((attempt) => !isStoredAttempt(attempt, true) && !isStoredAttempt(attempt, false))) {
      return { store: emptyHealthLabStore(true), corrupted: true };
    }
    return {
      store: {
        schemaVersion: 2,
        legacyImported: parsed.legacyImported === true,
        attempts: parsed.attempts,
        habitLogs: Array.isArray(parsed.habitLogs) ? parsed.habitLogs.filter(isHabitLog) : [],
      },
      corrupted: false,
    };
  } catch {
    return { store: emptyHealthLabStore(true), corrupted: true };
  }
}

export function migrateV1Record(raw: string | null): { store: HealthLabStore; corrupted: boolean } {
  if (!raw) return { store: emptyHealthLabStore(true), corrupted: false };
  try {
    const parsed = JSON.parse(raw) as LegacyRecord;
    if (parsed.version !== 1 || !STATUS.has(parsed.week1Status as MissionRunStatus)) {
      return { store: emptyHealthLabStore(true), corrupted: true };
    }
    if (parsed.week1Observation != null && !isObservation(parsed.week1Observation)) {
      return { store: emptyHealthLabStore(true), corrupted: true };
    }
    const observation = parsed.week1Observation ?? null;
    let status = parsed.week1Status as MissionRunStatus;
    if (!observation && status !== 'running' && status !== 'paused' && status !== 'before') {
      return { store: emptyHealthLabStore(true), corrupted: false };
    }
    if (observation && (status === 'before' || status === 'done' || status === 'partial-closed' || status === 'stopped-closed')) {
      status = statusForParticipation(observation.participation);
    }
    if (status === 'before') return { store: emptyHealthLabStore(true), corrupted: false };
    if (!WEEK1?.missionId) return { store: emptyHealthLabStore(true), corrupted: true };
    const attempt: MissionAttempt = {
      id: 'v1-week1',
      childId: CHILD_A.id,
      programId: HEALTH_LAB_PROGRAM_ID,
      missionId: WEEK1.missionId,
      missionVersion: WEEK1.version ?? 1,
      status,
      observation,
      createdAt: observation?.savedAt ?? '2026-11-18T00:00:00.000Z',
    };
    return { store: { schemaVersion: 2, legacyImported: true, attempts: [attempt], habitLogs: [] }, corrupted: false };
  } catch {
    return { store: emptyHealthLabStore(true), corrupted: true };
  }
}

export function readHealthLabStore(): { store: HealthLabStore; corrupted: boolean; migrated: boolean } {
  if (typeof window === 'undefined') return { store: emptyHealthLabStore(false), corrupted: false, migrated: false };
  try {
    const current = window.localStorage.getItem(HEALTH_LAB_STORAGE_KEY_V2);
    if (current) {
      const parsed = parseHealthLabStore(current);
      return { ...parsed, migrated: false };
    }
    const legacy = window.localStorage.getItem(HEALTH_LAB_STORAGE_KEY_V1);
    const migrated = migrateV1Record(legacy);
    if (legacy) writeHealthLabStore(migrated.store);
    return { ...migrated, migrated: Boolean(legacy) };
  } catch {
    return { store: emptyHealthLabStore(true), corrupted: true, migrated: false };
  }
}

export function writeHealthLabStore(store: HealthLabStore) {
  window.localStorage.setItem(HEALTH_LAB_STORAGE_KEY_V2, JSON.stringify(store));
}

export function clearHealthLabStore() {
  const current = parseHealthLabStore(window.localStorage.getItem(HEALTH_LAB_STORAGE_KEY_V2));
  const next = emptyHealthLabStore(current.store.legacyImported || window.localStorage.getItem(HEALTH_LAB_STORAGE_KEY_V1) != null);
  writeHealthLabStore(next);
  return next;
}
