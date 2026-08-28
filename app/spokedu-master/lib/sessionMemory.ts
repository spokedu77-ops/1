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
  const session = classSessions
    .filter((session) => session.classId === currentSession.classId && session.status === 'completed')
    .filter((session) => new Date(session.startAt).getTime() < new Date(currentSession.startAt).getTime())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime() || b.id.localeCompare(a.id))
    [0] ?? null;
  if (!session) return null;
  return { session, capture: bySession.get(session.id) ?? null };
}

export function selectCurrentRosterObservations(capture: MasterClassRecordDto | null, currentRosterIds: ReadonlySet<string>) {
  return capture?.students.filter((student) => Boolean(
    student.studentId && currentRosterIds.has(student.studentId) && student.memo?.trim(),
  )) ?? [];
}
