import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireSpokeduMasterSession, getSpokeduMasterProfile, upsertSpokeduMasterProfile } = vi.hoisted(() => ({
  requireSpokeduMasterSession: vi.fn(),
  getSpokeduMasterProfile: vi.fn(),
  upsertSpokeduMasterProfile: vi.fn(),
}));

vi.mock('@/app/lib/server/spokeduMasterAccess', () => ({
  requireSpokeduMasterSession,
}));

vi.mock('@/app/lib/server/spokeduMasterProfile', () => ({
  getSpokeduMasterProfile,
  normalizeSpokeduMasterProfileInput: (body: unknown) => body,
  toSpokeduMasterProfileDto: (row: { name: string }) => ({ name: row.name, school: '', role: 'teacher', ageGroups: [], programTypes: [], onboardingDone: true }),
  upsertSpokeduMasterProfile,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: () => ({}),
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError: vi.fn(),
}));

import { GET, PATCH } from './route';

describe('SPOKEDU MASTER profile endpoint', () => {
  beforeEach(() => {
    requireSpokeduMasterSession.mockReset();
    getSpokeduMasterProfile.mockReset();
    upsertSpokeduMasterProfile.mockReset();
  });

  it('returns null profile data when no row exists', async () => {
    requireSpokeduMasterSession.mockResolvedValue({ ok: true, userId: 'user-1', isAdmin: false });
    getSpokeduMasterProfile.mockResolvedValue({ row: null, error: null });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: null });
  });

  it('upserts profile for authenticated session', async () => {
    requireSpokeduMasterSession.mockResolvedValue({ ok: true, userId: 'user-1', isAdmin: false });
    upsertSpokeduMasterProfile.mockResolvedValue({
      row: {
        user_id: 'user-1',
        name: 'Teacher',
        school: 'School',
        role: 'teacher',
        age_groups: [],
        program_types: [],
        onboarding_done: true,
        created_at: '2026-07-11T00:00:00.000Z',
        updated_at: '2026-07-11T00:00:00.000Z',
      },
      error: null,
    });

    const response = await PATCH(
      new Request('http://localhost/api/spokedu-master/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Teacher', onboardingDone: true }),
      }),
    );

    expect(response.status).toBe(200);
    expect(upsertSpokeduMasterProfile).toHaveBeenCalled();
  });
});
