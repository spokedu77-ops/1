import type { MasterClassDto, MasterSessionDto } from '../types/operational';

export type ActivityQueryResolution =
  | { kind: 'session'; session: MasterSessionDto }
  | { kind: 'missing-session'; sessionId: string }
  | { kind: 'create'; day: string; classId: string | null }
  | { kind: 'missing-class'; classId: string }
  | { kind: 'none' };

export function resolveActivityQuery(
  params: Pick<URLSearchParams, 'get'>,
  sessions: MasterSessionDto[],
  classes: MasterClassDto[] = [],
): ActivityQueryResolution {
  const sessionId = params.get('session')?.trim();
  if (sessionId) {
    const session = sessions.find((item) => item.id === sessionId);
    return session ? { kind: 'session', session } : { kind: 'missing-session', sessionId };
  }

  const requestedDay = params.get('date')?.trim();
  if (params.get('create') === '1' && requestedDay && /^\d{4}-\d{2}-\d{2}$/.test(requestedDay)) {
    const classId = params.get('class')?.trim() || null;
    if (classId && !classes.some((item) => item.id === classId)) return { kind: 'missing-class', classId };
    return { kind: 'create', day: requestedDay, classId };
  }
  return { kind: 'none' };
}
