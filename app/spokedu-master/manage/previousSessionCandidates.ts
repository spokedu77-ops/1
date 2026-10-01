import { getSeoulSessionDay } from '../lib/sessionDateTime';
import type { MasterSessionDto } from '../types/operational';

export function resolvePreviousSessionCandidates(sessions: readonly MasterSessionDto[], targetDay: string) {
  return sessions
    .filter((session) => session.status === 'completed' && getSeoulSessionDay(session.startAt) < targetDay)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
}
