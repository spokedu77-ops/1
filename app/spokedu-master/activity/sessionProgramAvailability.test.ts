import { describe, expect, it } from 'vitest';
import { buildSessionProgramDetailHref, resolveSessionProgramAvailability } from './sessionProgramAvailability';

describe('session program availability contract', () => {
  it('does not create navigation until the catalog is ready', () => {
    expect(resolveSessionProgramAvailability({ sourceType: 'program', programId: 7 }, new Set([7]), false))
      .toEqual({ kind: 'checking' });
  });

  it('distinguishes an available catalog row from a historical orphan', () => {
    expect(resolveSessionProgramAvailability({ sourceType: 'program', programId: 7 }, new Set([7]), true))
      .toEqual({ kind: 'available', programId: 7 });
    expect(resolveSessionProgramAvailability({ sourceType: 'program', programId: 8 }, new Set([7]), true))
      .toEqual({ kind: 'unavailable', programId: 8 });
  });

  it('builds one encoded same-window detail route with session context', () => {
    expect(buildSessionProgramDetailHref({ programId: 7, sessionId: 's 1', sessionProgramId: 'row/1', returnTo: '/spokedu-master/activity?session=s 1' }))
      .toBe('/spokedu-master/library/7?session=s+1&sessionProgram=row%2F1&returnTo=%2Fspokedu-master%2Factivity%3Fsession%3Ds+1&source=session');
  });
});
