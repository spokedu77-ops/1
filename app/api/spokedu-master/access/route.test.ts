import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSpokeduMasterAccessSnapshot } = vi.hoisted(() => ({
  getSpokeduMasterAccessSnapshot: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  getSpokeduMasterAccessSnapshot,
}));

import { GET } from './route';

describe('SPOKEDU MASTER access endpoint', () => {
  beforeEach(() => {
    getSpokeduMasterAccessSnapshot.mockReset();
  });

  it.each([
    ['free user', {
      ok: true,
      userId: 'free-user',
      snapshot: {
        authenticated: true,
        onboardingDone: false,
        plan: 'free',
        subscriptionStatus: 'none',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isAdmin: false,
        isCenterOrTeam: false,
        canUseLibrary: false,
        canUseClassTools: false,
        canUseRecords: false,
        canUseSpomove: false,
      },
    }],
    ['admin', {
      ok: true,
      userId: 'admin-user',
      snapshot: {
        authenticated: true,
        onboardingDone: true,
        plan: 'team',
        subscriptionStatus: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isAdmin: true,
        isCenterOrTeam: true,
        canUseLibrary: true,
        canUseClassTools: true,
        canUseRecords: true,
        canUseSpomove: true,
      },
    }],
  ])('allows %s', async (_label, access) => {
    getSpokeduMasterAccessSnapshot.mockResolvedValue(access);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Vary')).toBe('Cookie, Authorization');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      allowed: true,
      spomatShopAvailable: false,
      ...access.snapshot,
    });
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'ACCESS_DENIED'],
    [500, 'ACCESS_CHECK_FAILED'],
  ])('preserves denied status %s', async (status, code) => {
    getSpokeduMasterAccessSnapshot.mockResolvedValue({
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
