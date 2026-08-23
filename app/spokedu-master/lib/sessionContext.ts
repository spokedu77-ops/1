import type { MasterSessionDto } from '../types/operational';

export function findExactSession(sessions: MasterSessionDto[], sessionId: string | null) {
  if (!sessionId) return null;
  return sessions.find((session) => session.id === sessionId) ?? null;
}

export function resolveReportSession(
  completedSessions: MasterSessionDto[],
  requestedSessionId: string | null,
  selectedSessionId: string,
) {
  if (requestedSessionId) {
    return completedSessions.find(
      (session) => session.id === requestedSessionId && session.status === 'completed',
    ) ?? null;
  }
  const completedOnly = completedSessions.filter((session) => session.status === 'completed');
  return completedOnly.find((session) => session.id === selectedSessionId)
    ?? completedOnly[0]
    ?? null;
}
