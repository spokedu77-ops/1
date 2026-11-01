import { afterEach, describe, expect, it, vi } from 'vitest';
import { persistedSessionMatches, assertSavedSessionRows } from './sessionSaveVerification';
import { fetchAdminSessions, invalidateAdminSessionRequests } from './adminSessionsRequest';

afterEach(() => { vi.unstubAllGlobals(); invalidateAdminSessionRequests(); });
describe('verify actual stored edits', () => {
  it('rejects silent zero-row writes, partial bulk writes, duplicate rows, and wrong title/round values', () => {
    const expected = [{ id: 'a', title: 'new', round_total: 8 }, { id: 'b', price: 0 }];
    for (const actual of [null, [], [{ id: 'a' }], [{ id: 'a', title: 'old', round_total: 8 }, { id: 'b', price: 0 }], [{ id: 'a', title: 'new', round_total: 7 }, { id: 'b', price: 0 }], [{ id: 'a' }, { id: 'a' }]]) {
      expect(() => assertSavedSessionRows(actual, expected)).toThrow('SESSION_MUTATION_UNVERIFIED');
    }
    expect(() => assertSavedSessionRows([{ id: 'b', price: 0 }, { id: 'a', title: 'new', round_total: 8 }], expected)).not.toThrow();
  });
  it('accepts equivalent UTC/Korean timestamps but rejects changed time, fee, null, and assistants', () => {
    expect(persistedSessionMatches({ start_at: '2026-10-21T06:30:00+00:00', memo: 'EXTRA_TEACHERS:[]', price: 0 }, { start_at: '2026-10-21T15:30:00+09:00', memo: 'EXTRA_TEACHERS:[]', price: 0 })).toBe(true);
    for (const [stored, expected] of [
      [{ memo: 'EXTRA_TEACHERS:[{"id":"old"}]' }, { memo: 'EXTRA_TEACHERS:[]' }],
      [{ price: 25000 }, { price: 0 }], [{ price: null }, { price: 0 }],
      [{ start_at: '2026-10-21T06:31:00Z' }, { start_at: '2026-10-21T06:30:00Z' }],
    ]) expect(persistedSessionMatches(stored, expected)).toBe(false);
  });
  it('a post-save fresh read cannot join a pre-save request', async () => {
    let resolveOld!: (response: Response) => void;
    const read = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(Response.json({ sessions: [{ id: 'stored-new' }] }));
    vi.stubGlobal('fetch', read);
    const params = new URLSearchParams({ groupIds: 'one' });
    const old = fetchAdminSessions(params);
    invalidateAdminSessionRequests();
    const current = fetchAdminSessions(params, { fresh: true });
    expect(await current).toEqual([{ id: 'stored-new' }]);
    resolveOld(Response.json({ sessions: [{ id: 'old' }] }));
    expect(await old).toEqual([{ id: 'old' }]);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
