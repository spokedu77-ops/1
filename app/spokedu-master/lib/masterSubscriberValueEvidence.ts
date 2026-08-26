export type MasterSubscriberValueEvidence = {
  scope: { from: string; to: string; label: '최근 30일' };
  operating: {
    completedSessions: number;
    sessionsWithAttendance: number;
    upcomingSessions: number;
    activeClasses: number;
  };
  memory: {
    available: boolean;
    sessionsWithMemo: number;
    captureSessions: number;
    studentObservations: number;
    nextSessionNotes: number;
  };
  preserved: { totalClasses: number; totalSessions: number };
};

export type MasterActivationNeed = 'create-class' | 'create-session' | 'prepare-session' | 'run-first-session' | 'none';

const DAY = 86_400_000;

export function getMasterValueRange(now = new Date()) {
  const seoulDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const todayStart = new Date(`${seoulDay}T00:00:00+09:00`);
  return { from: new Date(todayStart.getTime() - 29 * DAY).toISOString(), to: now.toISOString(), label: '최근 30일' as const };
}

export function resolveMasterActivationNeed(input: {
  classCount: number;
  sessions: Array<{ status: string; programs: unknown[] }>;
}): MasterActivationNeed {
  if (input.classCount === 0) return 'create-class';
  if (input.sessions.length === 0) return 'create-session';
  if (input.sessions.some((session) => session.status === 'completed')) return 'none';
  if (input.sessions.some((session) => session.status === 'scheduled' && session.programs.length === 0)) return 'prepare-session';
  return 'run-first-session';
}

export type MasterValueLine = { label: string; value: number; kind: 'continuity' | 'memory' | 'usage' };

/**
 * Retention evidence priority:
 * NEXT PREPARED / MEMORY > continuity upcoming > raw usage counts.
 */
export function buildMasterSubscriberValueView(input: {
  evidence: MasterSubscriberValueEvidence;
  plan: 'free' | 'lite' | 'premium' | 'team';
}) {
  const { evidence, plan } = input;
  const continuity: MasterValueLine[] = [
    { label: '다음 예정', value: evidence.operating.upcomingSessions, kind: 'continuity' },
  ];
  const memory: MasterValueLine[] = plan === 'premium' || plan === 'team'
    ? [
        { label: '다음 수업 메모', value: evidence.memory.nextSessionNotes, kind: 'memory' },
        { label: '학생 관찰', value: evidence.memory.studentObservations, kind: 'memory' },
      ]
    : [];
  const usage: MasterValueLine[] = [
    { label: '출석 기록 수업', value: evidence.operating.sessionsWithAttendance, kind: 'usage' },
    { label: '완료 수업', value: evidence.operating.completedSessions, kind: 'usage' },
  ];
  const ordered = [
    ...(evidence.memory.available ? memory : []),
    ...continuity,
    ...usage,
  ];
  return { lines: ordered.filter((line) => line.value > 0).slice(0, 4) };
}

export function hasMasterValueEvidence(evidence: MasterSubscriberValueEvidence) {
  return evidence.operating.completedSessions > 0
    || evidence.operating.sessionsWithAttendance > 0
    || evidence.operating.upcomingSessions > 0
    || evidence.memory.nextSessionNotes > 0
    || evidence.memory.studentObservations > 0;
}

export function hasMasterPreservedContext(evidence: MasterSubscriberValueEvidence) {
  return evidence.preserved.totalClasses > 0 || evidence.preserved.totalSessions > 0;
}
