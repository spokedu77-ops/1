// @vitest-environment happy-dom
import { act, cloneElement, createElement, StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OperationalDataProvider, useOperationalData } from './OperationalDataProvider';

const state = vi.hoisted(() => ({ owner: '11111111-1111-4111-8111-111111111111' as string | null, attendance: true }));
vi.mock('../store', () => ({ useProfile: () => state.owner ? { id: state.owner } : null }));
vi.mock('../access/MasterAccessProvider', () => ({ useMasterCanUseAttendance: () => state.attendance }));
const request = vi.hoisted(() => vi.fn());
vi.mock('../lib/masterRequestError', () => ({ masterFetchJson: request, getMasterRequestErrorMessage: String }));
let root: Root;
let value: ReturnType<typeof useOperationalData>;
function Consumer() {
  const current = useOperationalData();
  useEffect(() => { value = current; }, [current]);
  return createElement('span', null, current.students.map(s => s.name).join(','));
}
async function render(needs = true) {
  const provider = createElement(OperationalDataProvider, null, createElement(Consumer));
  await act(async () => root.render(createElement(StrictMode, null, cloneElement(provider, {
    key: `${state.owner}:${state.attendance}`, syncWhenRouteNeedsData: state.attendance && needs,
  }))));
}
afterEach(async () => { await act(async () => root.unmount()); vi.restoreAllMocks(); });
function setup() {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  root = createRoot(document.createElement('div'));
  state.owner = '11111111-1111-4111-8111-111111111111'; state.attendance = true;
  request.mockReset().mockImplementation(async (url: string) => url.endsWith('/students')
    ? { data: [{ id: state.owner, name: 'Previous owner' }] }
    : { data: { classes: [{ id: 'previous-class' }], sessions: [{ id: 'previous-session' }] } });
}
describe('operational context lifecycle', () => {
  it('renders Free consumers with empty data and no GET even on focus or manual reload', async () => {
    setup(); state.attendance = false;
    await render();
    await act(async () => { window.dispatchEvent(new Event('focus')); await value.reload(); });
    expect(value.students).toEqual([]); expect(request).not.toHaveBeenCalled();
  });
  it('fetches once per list and retains the cache across route re-entry within 60 seconds', async () => {
    setup(); await render(false); expect(request).not.toHaveBeenCalled();
    await render(); expect(request).toHaveBeenCalledTimes(2);
    await render(false); await render();
    expect(request).toHaveBeenCalledTimes(2); expect(value.students).toHaveLength(1);
  });
  it('does not refresh independent routes on focus even after the cache interval', async () => {
    setup(); await render(); await render(false);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    await act(async () => { window.dispatchEvent(new Event('focus')); await value.reload(); });
    expect(request).toHaveBeenCalledTimes(2);
    await render(); expect(request).toHaveBeenCalledTimes(4);
  });
  it.each(['logout', 'capability', 'account'])('clears prior data on %s and ignores late GET responses', async (change) => {
    setup(); await render();
    expect(value.students).toHaveLength(1); expect(value.classes).toHaveLength(1); expect(value.sessions).toHaveLength(1);
    const resolvers: Array<() => void> = [];
    request.mockImplementation((url: string) => new Promise(r => { resolvers.push(() => r(url.endsWith('/students')
      ? { data: [{ id: 'old', name: 'Late old owner' }] }
      : { data: { classes: [], sessions: [] } })); }));
    let pending!: Promise<void>;
    await act(async () => { pending = value.reload(); });
    if (change === 'logout') state.owner = null;
    if (change === 'capability') state.attendance = false;
    if (change === 'account') state.owner = '22222222-2222-4222-8222-222222222222';
    await render(false);
    expect(value.students).toEqual([]); expect(value.sessions).toEqual([]); expect(value.classes).toEqual([]);
    // Resolve the last old-owner request after the provider has been replaced.
    await act(async () => { resolvers.forEach(resolve => resolve()); await pending; });
    expect(value.students).toEqual([]); expect(value.classes).toEqual([]); expect(value.sessions).toEqual([]);
  });
});
