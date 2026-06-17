import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSpokeduMasterAccess } = vi.hoisted(() => ({
  requireSpokeduMasterAccess: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterAccess,
}));

import { GET } from './route';

describe('SPOKEDU MASTER access endpoint', () => {
  beforeEach(() => {
    requireSpokeduMasterAccess.mockReset();
  });

  it.each([
    ['pro subscriber', { ok: true, userId: 'pro-user', isAdmin: false, plan: 'pro' }],
    ['admin', { ok: true, userId: 'admin-user', isAdmin: true, plan: 'admin' }],
  ])('allows %s', async (_label, access) => {
    requireSpokeduMasterAccess.mockResolvedValue(access);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Vary')).toBe('Cookie, Authorization');
    await expect(response.json()).resolves.toEqual({ ok: true, allowed: true });
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'ACCESS_DENIED'],
    [500, 'ACCESS_CHECK_FAILED'],
  ])('preserves denied status %s', async (status, code) => {
    requireSpokeduMasterAccess.mockResolvedValue({
      ok: false,
      response: new Response(null, { status }),
    });

    const response = await GET();

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      allowed: false,
      code,
    });
  });

  it('does not query programs or drills content', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app/api/spokedu-master/access/route.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/loadPrograms|loadDrills|spokedu_master_(program|drill)/);
    expect(source).not.toMatch(/\.from\(|\.select\(/);
  });
});
