import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess, deriveMasterAdminBillingIncident, grantStatus } from '@/app/lib/server/spokeduMasterAdmin';
import { readAllMasterAdminPages, selectActiveMasterAdminGrants, selectLatestMasterAdminOrders } from '@/app/lib/server/spokeduMasterAdminRead';

export const dynamic = 'force-dynamic';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readUserRows(table: string, columns: string, userId: string, orderColumn: string) {
  const service = getServiceSupabase();
  return readAllMasterAdminPages<any>({ fetchPage: async (page, pageSize) => {
    const from = (page - 1) * pageSize;
    const result = await service.from(table).select(columns).eq('user_id', userId)
      .order(orderColumn, { ascending: false }).range(from, from + pageSize - 1);
    if (result.error) throw result.error;
    return result.data ?? [];
  } });
}

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const { userId } = await context.params;
  if (!UUID_PATTERN.test(userId)) return withPrivateNoStore(NextResponse.json({ error: 'Valid userId is required' }, { status: 400 }));
  try {
    const service = getServiceSupabase();
    const [authResult, profileResult, subscriptions, grants, orders] = await Promise.all([
      service.auth.admin.getUserById(userId),
      service.from('spokedu_master_profiles').select('user_id,name,school,onboarding_done,created_at,account_type').eq('user_id', userId).maybeSingle(),
      readUserRows('spokedu_master_subscriptions', 'user_id,plan,status,period_end,cancel_at_period_end,next_billing_at,current_period_end,renewal_retry_count,last_billing_error,next_retry_at,last_payment_at,pg_provider,toss_order_id,created_at', userId, 'created_at'),
      readUserRows('spokedu_master_entitlement_grants', 'id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,granted_by,created_at,revoked_at,metadata', userId, 'created_at'),
      readUserRows('spokedu_master_payment_orders', 'id,user_id,plan,amount,status,updated_at,applied_at,last_error_code,payment_key', userId, 'updated_at'),
    ]);
    if (authResult.error || profileResult.error) throw authResult.error ?? profileResult.error;
    if (!profileResult.data || !authResult.data.user) return withPrivateNoStore(NextResponse.json({ error: 'LAB member not found' }, { status: 404 }));
    const subscription = subscriptions[0] ?? null;
    const activeGrant = selectActiveMasterAdminGrants(grants, new Date().toISOString()).get(userId) ?? null;
    const latestOrder = selectLatestMasterAdminOrders(orders).get(userId) ?? null;
    return withPrivateNoStore(NextResponse.json({
      member: { id: userId, email: authResult.data.user.email ?? null, ...profileResult.data },
      access: buildMasterAdminAccess({ subscription, grant: activeGrant }),
      grants: grants.map((grant) => ({ ...grant, status: grantStatus(grant) })),
      subscription,
      orders,
      latestOrder,
      billingIncident: deriveMasterAdminBillingIncident({
        subscription: subscription ? { status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end, nextBillingAt: subscription.next_billing_at, renewalRetryCount: subscription.renewal_retry_count, lastBillingError: subscription.last_billing_error, nextRetryAt: subscription.next_retry_at } : null,
        order: latestOrder ? { status: latestOrder.status, paymentApproved: Boolean(latestOrder.payment_key), appliedAt: latestOrder.applied_at, lastErrorCode: latestOrder.last_error_code, updatedAt: latestOrder.updated_at } : null,
      }),
    }));
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'Member detail lookup failed' }, { status: 500 }));
  }
}
