import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerSupabaseClient,
  getServiceSupabase,
  isPlatformAdminUser,
  deleteSpokeduMasterBillingKey,
} = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getServiceSupabase: vi.fn(),
  isPlatformAdminUser: vi.fn(),
  deleteSpokeduMasterBillingKey: vi.fn(),
}));

vi.mock('@/app/lib/supabase/server', () => ({
  createServerSupabaseClient,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
  isPlatformAdminUser,
}));

vi.mock('@/app/lib/server/spokeduMasterBillingKeyVault', () => ({
  deleteSpokeduMasterBillingKey,
}));

vi.mock('@/app/lib/monitoring/errorReporter', () => ({
  reportError: vi.fn(),
}));

import { POST } from './route';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'qa@example.test',
};

function mockAuthUser(value: typeof user | null) {
  createServerSupabaseClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: value } }),
    },
  });
}

function mockSubscription(row: Record<string, unknown> | null) {
  const maybeSingle = vi.fn(async () => ({ data: row, error: null }));
  const lookupEqStatus = vi.fn().mockReturnValue({ maybeSingle });
  const lookupEqUser = vi.fn().mockReturnValue({ eq: lookupEqStatus });
  const select = vi.fn().mockReturnValue({ eq: lookupEqUser });

  const updateEqSecret = vi.fn(async () => ({ error: null }));
  const updateEqStatus = vi.fn().mockReturnValue({ eq: updateEqSecret });
  const updateEqUser = vi.fn().mockReturnValue({ eq: updateEqStatus });
  const update = vi.fn().mockReturnValue({ eq: updateEqUser });
  const from = vi.fn().mockReturnValue({ select, update });

  getServiceSupabase.mockReturnValue({ from });
  return { from, select, update, updateEqSecret };
}

describe('SPOKEDU MASTER billing cancellation route', () => {
  beforeEach(() => {
    createServerSupabaseClient.mockReset();
    getServiceSupabase.mockReset();
    isPlatformAdminUser.mockReset();
    deleteSpokeduMasterBillingKey.mockReset();
    isPlatformAdminUser.mockResolvedValue(false);
    deleteSpokeduMasterBillingKey.mockResolvedValue(true);
    mockAuthUser(user);
  });

  it('rejects manually issued active subscriptions without scheduling cancellation', async () => {
    const query = mockSubscription({
      current_period_end: '2099-06-30T00:00:00.000Z',
      period_end: '2099-06-30T00:00:00.000Z',
      provider_billing_key_secret_id: null,
      cancel_at_period_end: false,
    });

    const response = await POST();

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: '자동결제 해지 대상이 아닙니다. 고객센터로 문의해 주세요.',
    });
    expect(query.update).not.toHaveBeenCalled();
    expect(deleteSpokeduMasterBillingKey).not.toHaveBeenCalled();
  });

  it('schedules billing subscriptions and removes the stored billing key', async () => {
    const secretId = '22222222-2222-4222-8222-222222222222';
    const query = mockSubscription({
      current_period_end: '2099-06-30T00:00:00.000Z',
      period_end: '2099-06-30T00:00:00.000Z',
      provider_billing_key_secret_id: secretId,
      cancel_at_period_end: false,
    });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      cancelAtPeriodEnd: true,
      periodEnd: '2099-06-30T00:00:00.000Z',
    });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      cancel_at_period_end: true,
    }));
    expect(query.updateEqSecret).toHaveBeenCalledWith('provider_billing_key_secret_id', secretId);
    expect(deleteSpokeduMasterBillingKey).toHaveBeenCalledWith({
      userId: user.id,
      secretId,
    });
  });
});
