import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto } from '../types/operational';

export type ProgramMemory = {
  sessionId: string;
  date: string;
  className: string;
  nextSessionNote: string;
};

export function selectLatestProgramMemory({
  programId,
  sessions,
  captures,
}: {
  programId: string;
  sessions: MasterSessionDto[];
  captures: MasterClassRecordDto[];
}): ProgramMemory | null {
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  return captures
    .map((capture) => ({ capture, session: capture.sessionId ? sessionsById.get(capture.sessionId) : undefined }))
    .filter(({ capture, session }) => Boolean(
      capture.applicationIdea?.trim()
      && session?.programs.some((item) => item.sourceType === 'program' && String(item.programId) === programId),
    ))
    .sort((a, b) => new Date(b.session!.startAt).getTime() - new Date(a.session!.startAt).getTime() || b.session!.id.localeCompare(a.session!.id))
    .map(({ capture, session }) => ({
      sessionId: session!.id,
      date: session!.startAt,
      className: session!.className,
      nextSessionNote: capture.applicationIdea!.trim(),
    }))[0] ?? null;
}
