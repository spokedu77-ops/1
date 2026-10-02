import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess, maskAdminEmail } from '@/app/lib/server/spokeduMasterAdmin';
import { classifyMasterAccount, hasRenewalProblem, type MasterAccountClass } from '@/app/lib/server/spokeduMasterPopulation';
import type { SpokeduMasterEntitlementGrantRow, SpokeduMasterSubscriptionRow } from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;
const OPERATION_TABLES = [
  'spokedu_master_classes',
  'spokedu_master_class_students',
  'spokedu_master_sessions',
  'spokedu_master_session_programs',
  'spokedu_master_session_attendance',
  'spokedu_master_students',
  'spokedu_master_class_records',
  'spokedu_master_class_record_students',
  'spokedu_master_class_schedule_rules',
  'spokedu_master_program_favorites',
  'spokedu_master_explanations',
] as const;

type UserIdentity = {
  id: string;
  email: string | null;
  created_at?: string;
  banned_until?: string | null;
  deleted_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown> & { name?: string; full_name?: string };
};

type Evidence = { profile: boolean; subscription: boolean; grant: boolean; operations: boolean };

function emptyEvidence(): Evidence {
  return { profile: false, subscription: false, grant: false, operations: false };
}

function markEvidence(map: Map<string, Evidence>, id: unknown, key: keyof Evidence) {
  if (typeof id !== 'string') return;
  const value = map.get(id) ?? emptyEvidence();
  value[key] = true;
  map.set(id, value);
}

async function populationEvidence() {
  const service = getServiceSupabase();
  const [profilesResult, subscriptionsResult, grantsResult, ...operationResults] = await Promise.all([
    service.from('spokedu_master_profiles').select('user_id,name,school,onboarding_done,created_at'),
    service.from('spokedu_master_subscriptions').select('user_id'),
    service.from('spokedu_master_entitlement_grants').select('user_id'),
    ...OPERATION_TABLES.map((table) => service.from(table).select('owner_id')),
  ]);
  const error = [profilesResult, subscriptionsResult, grantsResult, ...operationResults].find((result) => result.error)?.error;
  if (error) throw error;

  const evidence = new Map<string, Evidence>();
  for (const row of profilesResult.data ?? []) markEvidence(evidence, (row as any).user_id, 'profile');
  for (const row of subscriptionsResult.data ?? []) markEvidence(evidence, (row as any).user_id, 'subscription');
  for (const row of grantsResult.data ?? []) markEvidence(evidence, (row as any).user_id, 'grant');
  for (const result of operationResults) {
    for (const row of result.data ?? []) markEvidence(evidence, (row as any).owner_id, 'operations');
  }
  const profiles = new Map((profilesResult.data ?? []).map((row: any) => [row.user_id, row]));
  return { evidence, profiles };
}

async function identities() {
  const service = getServiceSupabase();
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const users = data.users as UserIdentity[];
  const ids = users.map((user) => user.id);
  const { data: appUsers, error: appUsersError } = ids.length
    ? await service.from('users').select('id,name,email,role,is_admin,is_active,status').in('id', ids)
    : { data: [], error: null };
  if (appUsersError) throw appUsersError;
  return { users, appUsers: new Map((appUsers ?? []).map((row: any) => [row.id, row])) };
}

async function accessMaps(userIds: string[]) {
  const service = getServiceSupabase();
  const now = new Date().toISOString();
  const [{ data: subscriptions, error: subError }, { data: grants, error: grantError }, { data: payments, error: paymentError }] = await Promise.all([
    userIds.length ? service.from('spokedu_master_subscriptions').select('user_id,plan,status,pg_provider,toss_order_id,provider_customer_key,created_at,period_end,cancel_at_period_end,next_billing_at,current_period_end,renewal_retry_count,last_billing_error,next_retry_at,last_payment_at').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
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

function matchesScope(accountClass: MasterAccountClass, scope: string) {
  if (scope === 'all') return true;
  if (scope === 'production') return accountClass === 'production';
  if (scope === 'qa_test') return accountClass === 'qa_test';
  if (scope === 'internal') return accountClass === 'internal';
  if (scope === 'inactive') return accountClass === 'inactive';
  return accountClass !== 'spokedu_only';
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'overview';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 120);
    const scope = url.searchParams.get('scope') ?? 'master';
    const [{ evidence, profiles }, { users, appUsers }] = await Promise.all([populationEvidence(), identities()]);
    const { subscriptionMap, grantMap, paymentMap } = await accessMaps([...evidence.keys()]);

    const rows = users.map((user) => {
      const profile = profiles.get(user.id) ?? null;
      const appUser = appUsers.get(user.id) ?? null;
      const membershipEvidence = evidence.get(user.id) ?? emptyEvidence();
      const hasMasterEvidence = Object.values(membershipEvidence).some(Boolean);
      const subscription = (subscriptionMap.get(user.id) ?? null) as (SpokeduMasterSubscriptionRow & Record<string, any>) | null;
      const grant = (grantMap.get(user.id) ?? null) as SpokeduMasterEntitlementGrantRow | null;
      const payment = paymentMap.get(user.id) ?? null;
      const accountClass = classifyMasterAccount({
        hasMasterEvidence,
        identity: { appMetadata: user.app_metadata, userMetadata: user.user_metadata, bannedUntil: user.banned_until, deletedAt: user.deleted_at },
        profile,
        appUser,
        subscription,
      });
      return {
        id: user.id,
        email: user.email ?? appUser?.email ?? null,
        name: profile?.name || appUser?.name || user.user_metadata?.name || user.user_metadata?.full_name || '이름 없음',
        createdAt: profile?.created_at ?? user.created_at ?? null,
        maskedEmail: maskAdminEmail(user.email ?? appUser?.email),
        accountClass,
        membershipEvidence,
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
          lastPaymentAt: subscription.last_payment_at ?? null,
          lastPaymentAmount: payment?.amount ?? null,
          lastPaymentOrderAt: payment?.applied_at ?? payment?.updated_at ?? null,
        } : null,
      };
    });

    if (view === 'overview') {
      const production = rows.filter((row) => row.accountClass === 'production');
      const summary = {
        total: production.length,
        free: 0,
        lite: 0,
        premium: 0,
        promotions: 0,
        renewalFailed: 0,
        authTotal: rows.length,
        masterEvidence: rows.filter((row) => row.accountClass !== 'spokedu_only').length,
        qaTest: rows.filter((row) => row.accountClass === 'qa_test').length,
        internal: rows.filter((row) => row.accountClass === 'internal').length,
        inactive: rows.filter((row) => row.accountClass === 'inactive').length,
      };
      for (const row of production) {
        if (row.effectivePlan === 'premium' || row.effectivePlan === 'team') summary.premium += 1;
        else if (row.effectivePlan === 'lite') summary.lite += 1;
        else summary.free += 1;
        if (row.promoPlan) summary.promotions += 1;
        if (hasRenewalProblem(row.subscription ? {
          status: row.subscription.status,
          renewal_retry_count: row.subscription.renewalRetryCount,
          last_billing_error: row.subscription.lastBillingError,
          next_retry_at: row.subscription.nextRetryAt,
        } : null)) summary.renewalFailed += 1;
      }
      return withPrivateNoStore(NextResponse.json({ summary, recentMembers: production.slice(-5).reverse() }));
    }

    const filtered = rows.filter((user) => matchesScope(user.accountClass, scope))
      .filter((user) => !query || user.name.toLowerCase().includes(query) || (user.email ?? '').toLowerCase().includes(query));
    const start = (page - 1) * PAGE_SIZE;
    return withPrivateNoStore(NextResponse.json({ members: filtered.slice(start, start + PAGE_SIZE), total: filtered.length, page, pageSize: PAGE_SIZE, scope }));
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'MASTER 운영 데이터를 불러오지 못했습니다.' }, { status: 500 }));
  }
}
