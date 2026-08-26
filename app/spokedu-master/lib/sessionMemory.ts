import type { MasterClassRecordDto } from '../types/legacyOperational';
import type { MasterSessionDto } from '../types/operational';

export type SessionCaptureState = 'none' | 'exists';

export function deriveSessionCaptureState(capture: MasterClassRecordDto | null): SessionCaptureState {
  return capture ? 'exists' : 'none';
}

export function buildSessionMemoryView(session: MasterSessionDto, capture: MasterClassRecordDto | null) {
  return {
    sessionId: session.id,
    sessionMemo: session.memo,
    attendance: session.attendance,
    completedPrograms: session.programs.filter((program) => program.isCompleted),
    studentObservations: capture?.students.filter((student) => Boolean(student.memo?.trim())) ?? [],
    nextSessionNote: capture?.applicationIdea?.trim() || null,
    captureUpdatedAt: capture?.updatedAt ?? null,
  };
}

export function resolvePreviousSessionMemory({ currentSession, classSessions, captures }: {
  currentSession: MasterSessionDto;
  classSessions: MasterSessionDto[];
  captures: MasterClassRecordDto[];
}) {
  const bySession = new Map(captures.filter((capture) => capture.sessionId).map((capture) => [capture.sessionId!, capture]));
  return classSessions
    .filter((session) => session.classId === currentSession.classId && session.status === 'completed')
    .filter((session) => new Date(session.startAt).getTime() < new Date(currentSession.startAt).getTime())
    .filter((session) => bySession.has(session.id))
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime() || b.id.localeCompare(a.id))
    .map((session) => ({ session, capture: bySession.get(session.id)! }))
    .find(({ capture }) => Boolean(capture.applicationIdea?.trim())) ?? null;
}
