import type { MasterSessionDto } from '../types/operational';

type SessionProgram = MasterSessionDto['programs'][number];

export type SessionProgramAvailability =
  | { kind: 'not-library' }
  | { kind: 'checking' }
  | { kind: 'available'; programId: number }
  | { kind: 'unavailable'; programId: number | null };

/**
 * Session rows are historical snapshots. A snapshot may outlive the catalog row
 * it originally referenced, so navigation must be resolved before rendering a link.
 */
export function resolveSessionProgramAvailability(
  program: Pick<SessionProgram, 'sourceType' | 'programId'>,
  availableProgramIds: ReadonlySet<number>,
  catalogReady: boolean,
): SessionProgramAvailability {
  if (program.sourceType !== 'program') return { kind: 'not-library' };
  if (!catalogReady) return { kind: 'checking' };
  if (program.programId == null || !availableProgramIds.has(program.programId)) {
    return { kind: 'unavailable', programId: program.programId };
  }
  return { kind: 'available', programId: program.programId };
}

export function buildSessionProgramDetailHref(input: {
  programId: number;
  sessionId: string;
  sessionProgramId: string;
  returnTo: string;
}) {
  const params = new URLSearchParams({
    session: input.sessionId,
    sessionProgram: input.sessionProgramId,
    returnTo: input.returnTo,
    source: 'session',
  });
  return `/spokedu-master/library/${input.programId}?${params.toString()}`;
}
