import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/app/lib/server/adminAuth', () => ({
  getServiceSupabase: mocks.getServiceSupabase,
}));
vi.mock('@/app/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

import { GET } from './route';
import { calculateSpokeduMasterLiteUpgradeQuote } from '@/app/lib/server/spokeduMasterProration';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SECRET_ID = '22222222-2222-4222-8222-222222222222';

function installSubscription(row: Record<string, unknown> | null) {
  mocks.getServiceSupabase.mockReturnValue({
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() {
          return { data: row, error: null };
        },
      };
    },
  });
}

describe('billing upgrade-quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    });
  });

  it('returns the server proration quote for active Lite', async () => {
    const row = {
      plan: 'lite',
      status: 'active',
      current_period_start: '2026-09-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
      period_start: '2026-09-01T00:00:00.000Z',
      period_end: '2026-10-01T00:00:00.000Z',
      provider_customer_key: `spm_${USER_ID.replaceAll('-', '')}`,
      provider_billing_key_secret_id: SECRET_ID,
      cancel_at_period_end: false,
    };
    installSubscription(row);
    const expected = calculateSpokeduMasterLiteUpgradeQuote({
      periodStart: row.current_period_start,
      periodEnd: row.current_period_end,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      amountDueNow: expected?.amountDueNow,
      nextBillingAt: expected?.nextBillingAt,
      nextBillingAmount: expected?.nextBillingAmount,
    });
  });

  it('rejects cancel_at_period_end Lite upgrades', async () => {
    installSubscription({
      plan: 'lite',
      status: 'active',
      current_period_start: '2026-09-01T00:00:00.000Z',
      current_period_end: '2026-10-01T00:00:00.000Z',
      provider_customer_key: 'ck',
      provider_billing_key_secret_id: SECRET_ID,
      cancel_at_period_end: true,
    });

    const response = await GET();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: '현재 이용권은 즉시 업그레이드할 수 없습니다.',
    });
  });

  it('rejects expired Lite as an upgrade quote', async () => {
    installSubscription({
      plan: 'lite',
      status: 'expired',
      current_period_start: '2026-07-01T00:00:00.000Z',
      current_period_end: '2026-08-01T00:00:00.000Z',
      provider_customer_key: 'ck',
      provider_billing_key_secret_id: SECRET_ID,
      cancel_at_period_end: false,
    });

    const response = await GET();
    expect(response.status).toBe(409);
  });
});
