import { describe, expect, it } from 'vitest';
import type { MasterClassDto, MasterSessionDto } from '../types/operational';
import { resolveActivityQuery } from './activityQuery';

const sessions = [{ id: 'exact', startAt: '2026-08-23T01:00:00.000Z' }] as MasterSessionDto[];
const classes = [{ id: 'class-a' }] as MasterClassDto[];

describe('Activity query routing', () => {
  it('opens only the exact session id', () => {
    expect(resolveActivityQuery(new URLSearchParams('session=exact'), sessions)).toMatchObject({ kind: 'session', session: { id: 'exact' } });
  });

  it('does not fall back to another session when the id is missing', () => {
    expect(resolveActivityQuery(new URLSearchParams('session=missing'), sessions)).toEqual({ kind: 'missing-session', sessionId: 'missing' });
  });

  it('supports the date-scoped create convenience without another domain object', () => {
    expect(resolveActivityQuery(new URLSearchParams('date=2026-08-24&create=1'), sessions, classes)).toEqual({ kind: 'create', day: '2026-08-24', classId: null });
  });

  it('prefills only an exact explicit Class and never falls back for an invalid id', () => {
    expect(resolveActivityQuery(new URLSearchParams('date=2026-08-24&create=1&class=class-a'), sessions, classes)).toEqual({ kind: 'create', day: '2026-08-24', classId: 'class-a' });
    expect(resolveActivityQuery(new URLSearchParams('date=2026-08-24&create=1&class=missing'), sessions, classes)).toEqual({ kind: 'missing-class', classId: 'missing' });
  });
});
