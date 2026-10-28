import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPlatformAdminStatus, resolvePostLoginRedirect } from './postLoginRedirect';

afterEach(() => vi.unstubAllGlobals());

function reply(payload: object) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
}

describe('server-authoritative login routing', () => {
  it('does not override a missing server session with a known admin email', async () => {
    reply({ admin: false, reason: 'no-session' });
    await expect(fetchPlatformAdminStatus(undefined, { id: 'admin', email: 'choijihoon@spokedu.com' })).rejects.toThrow();
  });

  it('does not send a forbidden user back to an admin next path', async () => {
    reply({ admin: false, reason: 'forbidden' });
    await expect(resolvePostLoginRedirect('/admin/classes/calendar')).resolves.toBe('/teacher/my-classes');
  });

  it('preserves the requested admin page after server approval', async () => {
    reply({ admin: true });
    await expect(resolvePostLoginRedirect('/admin/classes/calendar')).resolves.toBe('/admin/classes/calendar');
  });

  it('stops automatic routing when the server check is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(resolvePostLoginRedirect('/admin')).rejects.toThrow();
  });
});
