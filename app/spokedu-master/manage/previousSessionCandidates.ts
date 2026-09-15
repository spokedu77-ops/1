import { getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

export function resolvePreviousSessionCandidates(sessions: readonly MasterSessionDto[], targetDay: string) {
  const latestByClass = new Map<string, MasterSessionDto>();
  const eligible = sessions
    .filter((session) => session.status === 'completed' && getSeoulSessionDay(session.startAt) < targetDay)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  for (const session of eligible) {
    if (!latestByClass.has(session.classId)) latestByClass.set(session.classId, session);
  }

  return [...latestByClass.values()];
}
