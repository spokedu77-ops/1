import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseClient, getServiceSupabase, isPlatformAdminUser } = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getServiceSupabase: vi.fn(),
  isPlatformAdminUser: vi.fn(),
}));

vi.mock('@/app/lib/supabase/server', () => ({
  createServerSupabaseClient,
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase,
  isPlatformAdminUser,
}));

import { GET } from './route';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'qa@example.test',
  created_at: '2026-06-01T00:00:00.000Z',
};

function mockAuthUser(value: typeof user | null) {
  createServerSupabaseClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: value } }),
    },
  });
}

function mockSubscriptionRow(row: {
  plan: string;
  status: string;
  period_end: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
} | null, lookupError: unknown = null) {
  let stored = row
    ? {
        trial_started_at: null,
        trial_ends_at: null,
        ...row,
      }
    : null;
  const maybeSingle = vi.fn(async () => ({ data: stored, error: lookupError }));
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const insert = vi.fn(async (payload: Record<string, unknown>) => {
    stored = {
      plan: String(payload.plan),
      status: String(payload.status),
      period_end: null,
      trial_started_at: String(payload.trial_started_at),
      trial_ends_at: String(payload.trial_ends_at),
    };
    return { error: null };
  });
  const from = vi.fn().mockReturnValue({ select, insert });
  getServiceSupabase.mockReturnValue({ from });
  return { from, select, eq, maybeSingle, insert };
}

describe('SPOKEDU MASTER subscription endpoint', () => {
  beforeEach(() => {
    createServerSupabaseClient.mockReset();
    getServiceSupabase.mockReset();
    isPlatformAdminUser.mockReset();
    isPlatformAdminUser.mockResolvedValue(false);
    mockSubscriptionRow(null);
  });

  it('returns free none for anonymous users without querying service tables', async () => {
    mockAuthUser(null);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual({
      plan: 'free',
      status: 'none',
      isAdmin: false,
    });
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it('returns admin as active Center access', async () => {
    mockAuthUser(user);
    isPlatformAdminUser.mockResolvedValue(true);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      plan: 'team',
      status: 'active',
      isAdmin: true,
      userId: user.id,
      email: user.email,
      trialEndsAt: null,
    });
    expect(getServiceSupabase).not.toHaveBeenCalled();
  });

  it.each([
    ['lite', '2099-05-31T00:00:00.000Z'],
    ['premium', '2099-06-30T00:00:00.000Z'],
    ['team', '2099-07-31T00:00:00.000Z'],
  ])('returns active %s subscription summary', async (plan, periodEnd) => {
    mockAuthUser(user);
    const query = mockSubscriptionRow({ plan, status: 'active', period_end: periodEnd });

    const response = await GET();

    expect(query.from).toHaveBeenCalledWith('spokedu_master_subscriptions');
    expect(query.select).toHaveBeenCalledWith(
      'plan,status,period_end,trial_started_at,trial_ends_at',
    );
    expect(query.eq).toHaveBeenCalledWith('user_id', user.id);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      plan,
      status: 'active',
      periodEnd,
      isAdmin: false,
      userId: user.id,
      email: user.email,
    });
  });

  it('returns expired paid subscription with periodEnd', async () => {
    mockAuthUser(user);
    mockSubscriptionRow({ plan: 'premium', status: 'expired', period_end: '2026-06-30T00:00:00.000Z' });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      plan: 'premium',
      status: 'expired',
      periodEnd: '2026-06-30T00:00:00.000Z',
      trialEndsAt: null,
    });
  });

  it.each([
    ['missing periodEnd', { plan: 'premium', status: 'active', period_end: null }],
    ['invalid periodEnd', { plan: 'team', status: 'active', period_end: 'not-a-date' }],
    ['cancelled subscription', { plan: 'premium', status: 'cancelled', period_end: '2099-06-30T00:00:00.000Z' }],
  ])('fails closed for %s', async (_label, row) => {
    mockAuthUser(user);
    mockSubscriptionRow(row);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      plan: row.plan,
      status: row.status === 'cancelled' ? 'cancelled' : 'expired',
      isAdmin: false,
    });
  });

  it('returns free none without creating a trial when no subscription exists', async () => {
    mockAuthUser(user);
    const query = mockSubscriptionRow(null);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      plan: 'free',
      status: 'none',
      isAdmin: false,
      userId: user.id,
      email: user.email,
      trialStartedAt: null,
      trialEndsAt: null,
    });
    expect(query.insert).not.toHaveBeenCalled();
  });

  it('returns 500 when the subscription lookup fails', async () => {
    mockAuthUser(user);
    mockSubscriptionRow(null, { message: 'db unavailable' });

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Subscription lookup failed',
    });
  });
});
