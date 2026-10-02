import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess, maskAdminEmail } from '@/app/lib/server/spokeduMasterAdmin';
import type { SpokeduMasterEntitlementGrantRow, SpokeduMasterSubscriptionRow } from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

type UserIdentity = { id: string; email: string | null; created_at?: string; user_metadata?: { name?: string; full_name?: string } };

async function identities() {
  const service = getServiceSupabase();
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const users = data.users as UserIdentity[];
  const ids = users.map((user) => user.id);
  const [{ data: masterProfiles }, { data: appUsers }] = await Promise.all([
    ids.length ? service.from('spokedu_master_profiles').select('user_id,name,created_at').in('user_id', ids) : Promise.resolve({ data: [] }),
    ids.length ? service.from('users').select('id,name,email').in('id', ids) : Promise.resolve({ data: [] }),
  ]);
  const masterMap = new Map((masterProfiles ?? []).map((row: any) => [row.user_id, row]));
  const userMap = new Map((appUsers ?? []).map((row: any) => [row.id, row]));
  return users.map((user) => ({
    id: user.id,
    email: user.email ?? userMap.get(user.id)?.email ?? null,
    name: masterMap.get(user.id)?.name || userMap.get(user.id)?.name || user.user_metadata?.name || user.user_metadata?.full_name || '이름 없음',
    createdAt: masterMap.get(user.id)?.created_at ?? user.created_at ?? null,
  }));
}

async function accessMaps(userIds: string[]) {
  const service = getServiceSupabase();
  const now = new Date().toISOString();
  const [{ data: subscriptions, error: subError }, { data: grants, error: grantError }, { data: payments, error: paymentError }] = await Promise.all([
    userIds.length ? service.from('spokedu_master_subscriptions').select('user_id,plan,status,period_end,cancel_at_period_end,next_billing_at,current_period_end,renewal_retry_count,last_billing_error,next_retry_at,last_payment_at').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? service.from('spokedu_master_entitlement_grants').select('id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at').in('user_id', userIds).is('revoked_at', null).lte('starts_at', now).gt('ends_at', now).order('plan', { ascending: false }).order('ends_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    userIds.length ? service.from('spokedu_master_payment_orders').select('user_id,amount,status,updated_at,applied_at').in('user_id', userIds).eq('status', 'active').order('updated_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (subError || grantError || paymentError) throw subError ?? grantError ?? paymentError;
  const subscriptionMap = new Map((subscriptions ?? []).map((row: any) => [row.user_id, row]));
  const grantMap = new Map<string, any>();
  for (const row of grants ?? []) if (!grantMap.has((row as any).user_id)) grantMap.set((row as any).user_id, row);
  const paymentMap = new Map<string, any>();
  for (const row of payments ?? []) if (!paymentMap.has((row as any).user_id)) paymentMap.set((row as any).user_id, row);
  return { subscriptionMap, grantMap, paymentMap };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'overview';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 120);
    const allUsers = await identities();
    const filtered = query ? allUsers.filter((user) => user.name.toLowerCase().includes(query) || (user.email ?? '').toLowerCase().includes(query)) : allUsers;
    const { subscriptionMap, grantMap, paymentMap } = await accessMaps(allUsers.map((user) => user.id));
    const rows = filtered.map((user) => {
      const subscription = (subscriptionMap.get(user.id) ?? null) as SpokeduMasterSubscriptionRow | null;
      const grant = (grantMap.get(user.id) ?? null) as SpokeduMasterEntitlementGrantRow | null;
      const payment = paymentMap.get(user.id) ?? null;
      return {
        ...user,
        maskedEmail: maskAdminEmail(user.email),
        ...buildMasterAdminAccess({ subscription, grant }),
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
          nextBillingAt: subscription.next_billing_at ?? null,
          currentPeriodEnd: subscription.current_period_end ?? subscription.period_end ?? null,
          renewalRetryCount: subscription.renewal_retry_count ?? 0,
          lastBillingError: subscription.last_billing_error ?? null,
          nextRetryAt: subscription.next_retry_at ?? null,
          lastPaymentAt: (subscription as any).last_payment_at ?? null,
          lastPaymentAmount: payment?.amount ?? null,
          lastPaymentOrderAt: payment?.applied_at ?? payment?.updated_at ?? null,
        } : null,
      };
    });

    if (view === 'overview') {
      const summary = { total: rows.length, free: 0, lite: 0, premium: 0, promotions: 0, renewalFailed: 0 };
      for (const row of rows) {
        if (row.effectivePlan === 'premium' || row.effectivePlan === 'team') summary.premium += 1;
        else if (row.effectivePlan === 'lite') summary.lite += 1;
        else summary.free += 1;
        if (row.promoPlan) summary.promotions += 1;
        if (row.subscription?.lastBillingError) summary.renewalFailed += 1;
      }
      return withPrivateNoStore(NextResponse.json({ summary, recentMembers: rows.slice(-5).reverse() }));
    }
    const start = (page - 1) * PAGE_SIZE;
    return withPrivateNoStore(NextResponse.json({ members: rows.slice(start, start + PAGE_SIZE), total: rows.length, page, pageSize: PAGE_SIZE }));
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'MASTER 운영 데이터를 불러오지 못했습니다.' }, { status: 500 }));
  }
}
