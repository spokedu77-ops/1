import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSessionCaptures, invalidateSessionCaptureCache, saveSessionCapture, SessionCaptureConflictError } from './sessionCaptureClient';
afterEach(() => { vi.unstubAllGlobals(); invalidateSessionCaptureCache(); });
describe('Session Capture client coherence', () => {
  it('deduplicates only in-flight requests and refetches after resolution', async () => { const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })); vi.stubGlobal('fetch', fetchMock); const first = fetchSessionCaptures('class=c1'); const second = fetchSessionCaptures('class=c1'); expect(first).toBe(second); await first; await fetchSessionCaptures('class=c1'); expect(fetchMock).toHaveBeenCalledTimes(2); });
  it('distinguishes load error from an empty loaded result', async () => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false }))); expect(await fetchSessionCaptures('session=s1')).toMatchObject({ status: 'error' }); vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }))); expect(await fetchSessionCaptures('session=s2')).toEqual({ status: 'loaded', data: [] }); });
  it('surfaces optimistic concurrency conflicts without treating them as an empty save', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 409 })));
    await expect(saveSessionCapture({ sessionId: 's1', expectedVersion: 2, nextSessionNote: '', observationChanges: [] }))
      .rejects.toBeInstanceOf(SessionCaptureConflictError);
  });
});
