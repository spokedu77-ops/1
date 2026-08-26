import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { deriveMasterSessionWorkState } from '../lib/masterSessionWorkState';

export type SessionContinuityTarget =
  | { kind: 'existing-upcoming' | 'existing-unresolved' | 'historical-next'; targetSession: MasterSessionDto }
  | { kind: 'create-next' }
  | { kind: 'none' };

export function resolveSessionContinuity({ sourceSession, classSessions, classItem, now = new Date() }: {
  sourceSession: MasterSessionDto;
  classSessions: MasterSessionDto[];
  classItem?: MasterClassDto | null;
  now?: Date;
}): SessionContinuityTarget {
  if (sourceSession.status !== 'completed') return { kind: 'none' };
  const later = classSessions
    .filter((session) => session.id !== sourceSession.id && session.classId === sourceSession.classId && session.status !== 'cancelled')
    .filter((session) => new Date(session.startAt).getTime() > new Date(sourceSession.startAt).getTime())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime() || a.id.localeCompare(b.id));
  const scheduled = later.find((session) => session.status === 'scheduled');
  if (scheduled) {
    const workState = deriveMasterSessionWorkState(scheduled, classItem ?? null, now);
    return { kind: workState.attention.overdue ? 'existing-unresolved' : 'existing-upcoming', targetSession: scheduled };
  }
  const historical = later.find((session) => session.status === 'completed');
  return historical ? { kind: 'historical-next', targetSession: historical } : { kind: 'create-next' };
}

export function resolvePreviousCompletedSession(targetSession: MasterSessionDto, classSessions: MasterSessionDto[]) {
  if (targetSession.status !== 'scheduled') return null;
  return classSessions.filter((session) => session.classId === targetSession.classId && session.status === 'completed' && new Date(session.startAt).getTime() < new Date(targetSession.startAt).getTime())
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime() || b.id.localeCompare(a.id))[0] ?? null;
}
