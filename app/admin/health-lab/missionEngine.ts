export const CHILDREN = [
  { id: 'virtual-child-a', label: '가상 아동 A', ageLabel: '만 5세' },
  { id: 'virtual-child-b', label: '가상 아동 B', ageLabel: '만 4세' },
  { id: 'virtual-child-c', label: '가상 아동 C', ageLabel: '만 6세' },
] as const;

export const CHILD_A = CHILDREN[0];
export const KNOWN_CHILD_IDS = new Set<string>(CHILDREN.map((child) => child.id));

export type MissionRunStatus = 'before' | 'running' | 'paused' | 'done' | 'partial-closed' | 'stopped-closed';
export type UnderstandingLevel = 'once' | 'repeated' | 'ongoing-help';
export type MovementLevel = 'independent' | 'partial-help' | 'difficult';
export type ParticipationResult = 'finished' | 'partial' | 'stopped';

export type SpecificChoice = 'independent' | 'guided' | 'not-completed';

export type SpecificObservation = {
  itemId: string;
  itemVersion: number;
  choice: SpecificChoice;
  recordedAt: string;
};

export type GuardianObservation = {
  understanding: UnderstandingLevel;
  movement: MovementLevel;
  participation: ParticipationResult;
  memo: string;
  savedAt: string;
  specific?: SpecificObservation | null;
};

export type MissionAssignment = {
  childId: string;
  programId: string;
  missionId: string;
  required: boolean;
};

export type MissionAttempt = {
  id: string;
  childId: string;
  programId: string;
  missionId: string;
  missionVersion: number;
  status: MissionRunStatus;
  observation: GuardianObservation | null;
  createdAt: string;
};

export type HabitChoice = 'yes' | 'no';

export type HabitLog = {
  childId: string;
  date: string;
  vegetables: HabitChoice | null;
  movementPlay: HabitChoice | null;
  bedtime: string | null;
  wakeTime: string | null;
  mediaMinutes: number | null;
};

export type HealthLabStore = {
  schemaVersion: 2;
  legacyImported: boolean;
  attempts: MissionAttempt[];
  habitLogs: HabitLog[];
};

export type TransitionResult =
  | { ok: true; store: HealthLabStore }
  | { ok: false; reason: string };

const OPEN_STATUS = new Set<MissionRunStatus>(['running', 'paused']);

export function emptyHealthLabStore(legacyImported = false): HealthLabStore {
  return { schemaVersion: 2, legacyImported, attempts: [], habitLogs: [] };
}

export function statusForParticipation(participation: ParticipationResult): MissionRunStatus {
  if (participation === 'finished') return 'done';
  if (participation === 'partial') return 'partial-closed';
  return 'stopped-closed';
}

export function isOpenStatus(status: MissionRunStatus) {
  return OPEN_STATUS.has(status);
}

function sameMission(attempt: MissionAttempt, childId: string, missionId: string) {
  return attempt.childId === childId && attempt.missionId === missionId;
}

export function attemptsForMission(store: HealthLabStore, childId: string, missionId: string) {
  return store.attempts.filter((attempt) => sameMission(attempt, childId, missionId));
}

export function latestAttempt(store: HealthLabStore, childId: string, missionId: string) {
  const attempts = attemptsForMission(store, childId, missionId);
  return attempts[attempts.length - 1] ?? null;
}

export function completionSummary(store: HealthLabStore, childId: string, assignments: MissionAssignment[]) {
  const required = assignments.filter((assignment) => assignment.childId === childId && assignment.required);
  const completed = required.filter((assignment) =>
    store.attempts.some((attempt) => sameMission(attempt, childId, assignment.missionId) && attempt.status === 'done'),
  ).length;
  const percent = required.length === 0 ? 0 : Math.round((completed / required.length) * 100);
  return { completed, required: required.length, percent };
}

export function programCompletion(store: HealthLabStore, assignments: MissionAssignment[]) {
  const required = assignments.filter((assignment) => assignment.required && KNOWN_CHILD_IDS.has(assignment.childId));
  const completed = required.filter((assignment) =>
    store.attempts.some((attempt) => sameMission(attempt, assignment.childId, assignment.missionId) && attempt.status === 'done'),
  ).length;
  const percent = required.length === 0 ? 0 : Math.round((completed / required.length) * 100);
  return { completed, required: required.length, percent };
}

function appendRunning(store: HealthLabStore, input: {
  id: string;
  childId: string;
  programId: string;
  missionId: string;
  missionVersion: number;
  createdAt: string;
}): HealthLabStore {
  const attempt: MissionAttempt = {
    id: input.id,
    childId: input.childId,
    programId: input.programId,
    missionId: input.missionId,
    missionVersion: input.missionVersion,
    status: 'running',
    observation: null,
    createdAt: input.createdAt,
  };
  return { ...store, attempts: [...store.attempts, attempt] };
}

export function startMission(store: HealthLabStore, input: {
  id: string;
  childId: string;
  programId: string;
  missionId: string;
  missionVersion: number;
  createdAt: string;
}): TransitionResult {
  if (attemptsForMission(store, input.childId, input.missionId).length > 0) {
    return { ok: false, reason: '이미 수행 기록이 있습니다. 다시 수행으로 새 회차를 시작하세요.' };
  }
  return { ok: true, store: appendRunning(store, input) };
}

export function retryMission(store: HealthLabStore, input: {
  id: string;
  childId: string;
  programId: string;
  missionId: string;
  missionVersion: number;
  createdAt: string;
}): TransitionResult {
  const attempts = attemptsForMission(store, input.childId, input.missionId);
  const latest = attempts[attempts.length - 1];
  if (!latest || isOpenStatus(latest.status)) {
    return { ok: false, reason: '종료된 수행이 있을 때만 다시 수행할 수 있습니다.' };
  }
  return { ok: true, store: appendRunning(store, input) };
}

function updateLatest(store: HealthLabStore, childId: string, missionId: string, from: MissionRunStatus, status: MissionRunStatus, observation?: GuardianObservation): TransitionResult {
  const latest = latestAttempt(store, childId, missionId);
  if (!latest || latest.status !== from) {
    return { ok: false, reason: '현재 수행 상태에서는 이 동작으로 바꿀 수 없습니다.' };
  }
  const next = store.attempts.map((attempt) => attempt.id === latest.id ? { ...attempt, status, observation: observation ?? attempt.observation } : attempt);
  return { ok: true, store: { ...store, attempts: next } };
}

export function pauseMission(store: HealthLabStore, childId: string, missionId: string): TransitionResult {
  return updateLatest(store, childId, missionId, 'running', 'paused');
}

export function resumeMission(store: HealthLabStore, childId: string, missionId: string): TransitionResult {
  return updateLatest(store, childId, missionId, 'paused', 'running');
}

export function closeMission(store: HealthLabStore, childId: string, missionId: string, observation: GuardianObservation): TransitionResult {
  const latest = latestAttempt(store, childId, missionId);
  if (!latest || !isOpenStatus(latest.status)) {
    return { ok: false, reason: '진행 중이거나 일시중단된 수행만 관찰을 저장할 수 있습니다.' };
  }
  const status = statusForParticipation(observation.participation);
  const attempts = store.attempts.map((attempt) => attempt.id === latest.id ? { ...attempt, status, observation } : attempt);
  return { ok: true, store: { ...store, attempts } };
}
