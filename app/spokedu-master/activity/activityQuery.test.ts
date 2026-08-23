import { describe, expect, it } from 'vitest';
import type { MasterSessionDto } from '../types/operational';
import { resolveActivityQuery } from './activityQuery';

const sessions = [{ id: 'exact', startAt: '2026-08-23T01:00:00.000Z' }] as MasterSessionDto[];

describe('Activity query routing', () => {
  it('opens only the exact session id', () => {
    expect(resolveActivityQuery(new URLSearchParams('session=exact'), sessions)).toMatchObject({ kind: 'session', session: { id: 'exact' } });
  });

  it('does not fall back to another session when the id is missing', () => {
    expect(resolveActivityQuery(new URLSearchParams('session=missing'), sessions)).toEqual({ kind: 'missing-session', sessionId: 'missing' });
  });

  it('supports the date-scoped create convenience without another domain object', () => {
    expect(resolveActivityQuery(new URLSearchParams('date=2026-08-24&create=1'), sessions)).toEqual({ kind: 'create', day: '2026-08-24' });
  });
});
