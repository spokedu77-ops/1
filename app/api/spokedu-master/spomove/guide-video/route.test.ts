import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  createSignedUrl: vi.fn(),
  pack: { assets_json: { guideVideos: { 'dive-standard': 'https://youtu.be/0N-JTIgX3fU' } } },
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterCapability: mocks.requireCapability,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: mocks.pack, error: null }) }),
      }),
    }),
    storage: {
      from: () => ({ createSignedUrl: mocks.createSignedUrl }),
    },
  }),
}));

import { GET } from './route';

describe('SPOMOVE guide video route', () => {
  beforeEach(() => {
    mocks.requireCapability.mockReset();
    mocks.createSignedUrl.mockReset();
  });

  it('returns a configured legacy HTTPS video to a platform admin', async () => {
    mocks.requireCapability.mockResolvedValue({ ok: true, userId: 'admin-user', isAdmin: true, plan: 'admin' });

    const response = await GET(new Request('http://localhost/api/spokedu-master/spomove/guide-video?preset=dive-standard'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { url: 'https://youtu.be/0N-JTIgX3fU', expiresIn: null },
    });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('does not expose the same legacy URL to a non-admin subscriber', async () => {
    mocks.requireCapability.mockResolvedValue({ ok: true, userId: 'premium-user', isAdmin: false, plan: 'premium' });

    const response = await GET(new Request('http://localhost/api/spokedu-master/spomove/guide-video?preset=dive-standard'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: 'PREMIUM_MEDIA_NOT_MIGRATED' });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});
