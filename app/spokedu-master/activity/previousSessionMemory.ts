/**
 * Connected Memory — previous completed Session memo for the same Class.
 * Display-only carry-over for next PREP; does not mutate the current Session memo.
 */

export type PreviousSessionCarryover = {
  sessionId: string;
  startAt: string;
  memo: string;
};

type SessionMemorySource = {
  id: string;
  classId: string;
  status: string;
  startAt: string;
  memo: string | null;
};

export function resolvePreviousSessionCarryover(
  sessions: SessionMemorySource[],
  classId: string,
  currentSessionId: string | null,
): PreviousSessionCarryover | null {
  if (!classId) return null;
  const latest = sessions
    .filter((session) => (
      session.classId === classId
      && session.status === 'completed'
      && session.id !== currentSessionId
      && Boolean(session.memo?.trim())
    ))
    .sort((a, b) => b.startAt.localeCompare(a.startAt))[0];
  const memo = latest?.memo?.trim();
  if (!latest || !memo) return null;
  return { sessionId: latest.id, startAt: latest.startAt, memo };
}
