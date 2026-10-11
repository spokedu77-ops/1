import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  createSignedUrl: vi.fn(),
  pack: { assets_json: { guideVideos: { 'dive-standard': 'https://youtu.be/0N-JTIgX3fU' } } },
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterSpomovePresetAccess: mocks.requireCapability,
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

  it('returns a configured YouTube video to a platform admin', async () => {
    mocks.requireCapability.mockResolvedValue({ ok: true, userId: 'admin-user', isAdmin: true, plan: 'admin' });

    const response = await GET(new Request('http://localhost/api/spokedu-master/spomove/guide-video?preset=dive-standard'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { url: 'https://youtu.be/0N-JTIgX3fU', expiresIn: null },
    });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns the same YouTube URL to a Premium subscriber', async () => {
    mocks.requireCapability.mockResolvedValue({ ok: true, userId: 'premium-user', isAdmin: false, plan: 'premium' });

    const response = await GET(new Request('http://localhost/api/spokedu-master/spomove/guide-video?preset=dive-standard'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { url: 'https://youtu.be/0N-JTIgX3fU', expiresIn: null },
    });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns the configured video when the server authorizes a Lite trial preset', async () => {
    mocks.requireCapability.mockResolvedValue({ ok: true, userId: 'lite-user', isAdmin: false, plan: 'lite' });

    const response = await GET(new Request('http://localhost/api/spokedu-master/spomove/guide-video?preset=dive-standard'));

    expect(response.status).toBe(200);
    expect(mocks.requireCapability).toHaveBeenCalledWith('dive-standard');
  });

  it('does not expose media when preset access is denied', async () => {
    mocks.requireCapability.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'denied' }), { status: 403 }),
    });

    const response = await GET(new Request('http://localhost/api/spokedu-master/spomove/guide-video?preset=dive-standard'));

    expect(response.status).toBe(403);
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });
});
