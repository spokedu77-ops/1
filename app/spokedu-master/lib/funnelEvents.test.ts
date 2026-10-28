import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createSessionStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('trackMasterFunnelEvent core_use_daily dedupe', () => {
  const fetchMock = vi.fn();
  const userId = 'user-aaa-bbbb-cccc-dddddddddddd';
  const occurredAt = new Date('2026-10-03T12:00:00.000Z');
  let sessionStorageMock: ReturnType<typeof createSessionStorageMock>;

  beforeEach(async () => {
    sessionStorageMock = createSessionStorageMock();
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function loadFunnelModule() {
    return import('./funnelEvents');
  }

  async function flushFunnelTasks() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('uses UTC date in the dedupe key', async () => {
    const { buildCoreUseDailyDedupeKey } = await loadFunnelModule();
    expect(buildCoreUseDailyDedupeKey(userId, new Date('2026-10-03T23:59:00.000Z'))).toBe(
      'core_use_daily:user-aaa-bbbb-cccc-dddddddddddd:2026-10-03',
    );
    expect(buildCoreUseDailyDedupeKey(userId, new Date('2026-10-04T00:00:00.000Z'))).toBe(
      'core_use_daily:user-aaa-bbbb-cccc-dddddddddddd:2026-10-04',
    );
  });

  it('skips duplicate POST after a stored success for the same user and UTC day', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ stored: true }) });
    const { trackMasterFunnelEvent, buildCoreUseDailyDedupeKey, hasStoredCoreUseDailySuccess } = await loadFunnelModule();
    trackMasterFunnelEvent('core_use_daily', { surface: 'dashboard' }, { userId, occurredAt });
    trackMasterFunnelEvent('core_use_daily', { surface: 'library' }, { userId, occurredAt });
    await flushFunnelTasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const dedupeKey = buildCoreUseDailyDedupeKey(userId, occurredAt);
    expect(hasStoredCoreUseDailySuccess(dedupeKey)).toBe(true);
  });

  it('does not mark success when the server response is not stored', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ stored: false }) });
    const { trackMasterFunnelEvent } = await loadFunnelModule();
    trackMasterFunnelEvent('core_use_daily', { surface: 'dashboard' }, { userId, occurredAt });
    await flushFunnelTasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    trackMasterFunnelEvent('core_use_daily', { surface: 'dashboard' }, { userId, occurredAt });
    await flushFunnelTasks();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not send without a user id', async () => {
    const { trackMasterFunnelEvent } = await loadFunnelModule();
    trackMasterFunnelEvent('core_use_daily', { surface: 'dashboard' }, { userId: null, occurredAt });
    await flushFunnelTasks();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps other funnel events on the direct fetch path', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ stored: true }) });
    const { trackMasterFunnelEvent } = await loadFunnelModule();
    trackMasterFunnelEvent('upgrade_intent', { surface: 'payment' });
    await flushFunnelTasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('upgrade_intent');
  });
});
