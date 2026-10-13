import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  authorized: true,
  paymentKey: 'pay_SECRET_MUST_NOT_LEAK',
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

const order = {
  order_id: 'order-20261010-1',
  user_id: USER_ID,
  plan: 'premium',
  amount: 28900,
  status: 'active',
  updated_at: '2026-10-10T01:02:03.000Z',
  applied_at: null,
  last_error_code: 'entitlement_apply_failed',
  payment_key: state.paymentKey,
};

function tableRows(table: string) {
  if (table === 'spokedu_master_subscriptions') return [];
  if (table === 'spokedu_master_entitlement_grants') return [];
  if (table === 'spokedu_master_payment_orders') return [order];
  return [];
}

function query(table: string) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(async () => ({ data: tableRows(table), error: null })),
    maybeSingle: vi.fn(async () => ({
      data: table === 'spokedu_master_profiles'
        ? { user_id: USER_ID, name: 'QA Admin', school: null, onboarding_done: true, created_at: '2026-10-01T00:00:00.000Z', account_type: 'personal' }
        : null,
      error: null,
    })),
  };
  return builder;
}

vi.mock('@/app/lib/server/adminAuth', () => ({
  requireAdmin: vi.fn(async () => state.authorized
    ? { ok: true, user: { id: 'admin-id' } }
    : { ok: false, response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) }),
  getServiceSupabase: vi.fn(() => ({
    auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { id: USER_ID, email: 'member@example.com' } }, error: null })) } },
    from: vi.fn((table: string) => query(table)),
  })),
}));

vi.mock('@/app/lib/server/privateNoStore', () => ({ withPrivateNoStore: (response: Response) => response }));
vi.mock('@/app/lib/server/spokeduMasterAdmin', () => ({
  buildMasterAdminAccess: vi.fn(() => ({ effectivePlan: 'premium', effectiveSource: 'billing', promoStartsAt: null, promoEndsAt: null, fallbackPlan: 'free' })),
  deriveMasterAdminBillingIncident: vi.fn(({ order: value }) => ({ label: value?.paymentApproved && !value.appliedAt ? '승인 후 반영 확인 필요' : '정상', tone: 'warning' })),
  grantStatus: vi.fn(() => 'active'),
}));
vi.mock('@/app/lib/server/spokeduMasterAdminRead', () => ({
  readAllMasterAdminPages: vi.fn(async ({ fetchPage }) => fetchPage(1, 1000)),
  selectActiveMasterAdminGrants: vi.fn(() => new Map()),
  selectLatestMasterAdminOrders: vi.fn((orders) => new Map([[USER_ID, orders[0]]])),
}));

import { GET } from './route';

describe('member detail admin API payment DTO', () => {
  beforeEach(() => { state.authorized = true; });

  it('returns approval evidence without exposing payment credentials', async () => {
    const response = await GET(new Request('http://localhost/api/admin/spokedu-master-admin/members/' + USER_ID), { params: Promise.resolve({ userId: USER_ID }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0]).toEqual({
      order_id: order.order_id,
      plan: order.plan,
      amount: order.amount,
      status: order.status,
      updated_at: order.updated_at,
      applied_at: order.applied_at,
      last_error_code: order.last_error_code,
      paymentApproved: true,
    });
    expect(body.latestOrder).toEqual(body.orders[0]);
    expect(body.orders[0]).not.toHaveProperty('payment_key');
    expect(body.latestOrder).not.toHaveProperty('payment_key');
    expect(JSON.stringify(body)).not.toContain(state.paymentKey);
    expect(body.billingIncident.label).toBe('승인 후 반영 확인 필요');
  });

  it('keeps non-admin access blocked', async () => {
    state.authorized = false;
    const response = await GET(new Request('http://localhost/api/admin/spokedu-master-admin/members/' + USER_ID), { params: Promise.resolve({ userId: USER_ID }) });
    expect(response.status).toBe(403);
  });
});
