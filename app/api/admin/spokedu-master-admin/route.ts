import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { buildMasterAdminAccess, deriveMasterAdminBillingIncident } from '@/app/lib/server/spokeduMasterAdmin';
import { classifyMasterAccount, hasRenewalProblem, type MasterAccountClass } from '@/app/lib/server/spokeduMasterPopulation';
import { isPlatformAdminIdentity } from '@/app/lib/auth/platformAdminIdentity';
import type { SpokeduMasterEntitlementGrantRow, SpokeduMasterSubscriptionRow } from '@/app/lib/server/spokeduMasterAccess';
import { buildMasterFunnelWindow, type MasterFunnelEventRow, type MasterFunnelPayment } from '@/app/lib/server/spokeduMasterFunnel';
import {
  paginateMasterAdminRows,
  readAllMasterAdminIdRows,
  readAllMasterAdminPages,
  selectActiveMasterAdminGrants,
  selectLatestMasterAdminOrders,
} from '@/app/lib/server/spokeduMasterAdminRead';
import { buildBillingIncidents, type BillingRun, type BillingWebhook } from '@/app/lib/server/spokeduMasterBillingIncidents';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

type UserIdentity = {
  id: string;
  email: string | null;
  created_at?: string;
  banned_until?: string | null;
  deleted_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown> & { name?: string; full_name?: string };
};

async function readRowsByIds(table: string, columns: string, idColumn: string, ids: string[]) {
  const service = getServiceSupabase();
  return readAllMasterAdminIdRows<any>({ ids, fetchPage: async (batch, from, to) => {
    const result = await service.from(table).select(columns).in(idColumn, batch).range(from, to);
    if (result.error) throw result.error;
    return result.data ?? [];
  } });
}

async function populationEvidence() {
  const service = getServiceSupabase();
  const rows = await readAllMasterAdminPages<any>({ fetchPage: async (page, pageSize) => {
    const from = (page - 1) * pageSize;
    const result = await service.from('spokedu_master_profiles')
      .select('user_id,name,school,onboarding_done,created_at,account_type')
      .order('created_at', { ascending: false }).range(from, from + pageSize - 1);
    if (result.error) throw result.error;
    return result.data ?? [];
  } });
  return new Map(rows.map((row: any) => [row.user_id, row]));
}

async function identities() {
  const service = getServiceSupabase();
  const users = await readAllMasterAdminPages<UserIdentity>({ fetchPage: async (page, pageSize) => {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw error;
    return data.users as UserIdentity[];
  } });
  const ids = users.map((user) => user.id);
  const [appUsers, authProfiles] = await Promise.all([
    readRowsByIds('users', 'id,name,email,role,is_admin,is_active,status', 'id', ids),
    readRowsByIds('profiles', 'id,role', 'id', ids),
  ]);
  return { users, appUsers: new Map(appUsers.map((row: any) => [row.id, row])), authProfiles: new Map(authProfiles.map((row: any) => [row.id, row])) };
}

async function accessMaps(userIds: string[]) {
  const now = new Date().toISOString();
  const [subscriptions, grantRows, payments] = await Promise.all([
    readRowsByIds('spokedu_master_subscriptions', 'id,user_id,plan,status,pg_provider,toss_order_id,provider_customer_key,created_at,period_end,cancel_at_period_end,next_billing_at,current_period_end,renewal_retry_count,last_billing_error,next_retry_at,last_payment_at', 'user_id', userIds),
    readRowsByIds('spokedu_master_entitlement_grants', 'id,user_id,plan,source,campaign_id,starts_at,ends_at,activated_at,revoked_at,created_at,granted_by,metadata', 'user_id', userIds),
    readRowsByIds('spokedu_master_payment_orders', 'order_id,user_id,plan,amount,status,payment_key,created_at,updated_at,applied_at,last_processed_at,last_error_code', 'user_id', userIds),
  ]);
  return {
    subscriptionMap: new Map(subscriptions.map((row: any) => [row.user_id, row])),
    grantMap: selectActiveMasterAdminGrants(grantRows, now),
    paymentMap: selectLatestMasterAdminOrders(payments),
    subscriptionRows: subscriptions,
    paymentRows: payments,
  };
}

async function recentOperationalRows(table: string, columns: string, timeColumn: string, allowedUserIds: Set<string>, limit = 8, tieColumn = 'id') {
  const service = getServiceSupabase();
  const rows: any[] = [];
  const pageSize = 100;
  for (let from = 0; rows.length < limit; from += pageSize) {
    const result = await service.from(table).select(columns)
      .order(timeColumn, { ascending: false }).order(tieColumn, { ascending: false }).range(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const pageRows = result.data ?? [];
    rows.push(...pageRows.filter((row: any) => allowedUserIds.has(row.user_id)));
    if (pageRows.length < pageSize) break;
  }
  return rows.sort((left, right) => Date.parse(right[timeColumn] ?? '') - Date.parse(left[timeColumn] ?? '') || String(right[tieColumn] ?? '').localeCompare(String(left[tieColumn] ?? ''))).slice(0, limit);
}

async function funnelEvidence(members: Array<{
  id: string;
  createdAt: string | null;
  effectivePlan: string;
  subscription: null | { cancelAtPeriodEnd: boolean; renewalRetryCount: number; lastBillingError: string | null; nextRetryAt: string | null };
}>) {
  const service = getServiceSupabase();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: events, error: eventError }, { data: payments, error: paymentError }] = await Promise.all([
    service.from('commercial_funnel_events').select('name,user_id,created_at').eq('route', 'master').gte('created_at', cutoff),
    service.from('spokedu_master_payment_orders').select('user_id,applied_at').not('applied_at', 'is', null).gte('applied_at', cutoff),
  ]);
  if (eventError || paymentError) return { available: false, measurementStartsAt: null, windows: [] };
  const funnelEvents = (events ?? []) as MasterFunnelEventRow[];
  const paymentRows = (payments ?? []) as MasterFunnelPayment[];
  const now = Date.now();
  const measurementStartsAt = funnelEvents.length
    ? funnelEvents.reduce((earliest, event) => event.created_at < earliest ? event.created_at : earliest, funnelEvents[0].created_at)
    : null;
  return {
    available: true,
    measurementStartsAt,
    windows: ([7, 30] as const).map((days) => buildMasterFunnelWindow({ days, now, members, events: funnelEvents, payments: paymentRows })),
  };
}

function matchesScope(accountClass: MasterAccountClass, scope: string) {
  if (scope === 'production') return accountClass === 'production';
  if (scope === 'qa_test') return accountClass === 'qa_test';
  if (scope === 'internal') return accountClass === 'internal';
  return accountClass !== 'spokedu_only';
}

function isSpokeduStaffEmail(email: string | null) {
  return email?.trim().toLowerCase().endsWith('@spokedu.com') ?? false;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'overview';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 120);
    const scope = url.searchParams.get('scope') ?? 'production';
    const planFilter = url.searchParams.get('plan') ?? 'all';
    const sourceFilter = url.searchParams.get('source') ?? 'all';
    const onboardingFilter = url.searchParams.get('onboarding') ?? 'all';
    const [profiles, { users, appUsers, authProfiles }] = await Promise.all([populationEvidence(), identities()]);
    const { subscriptionMap, grantMap, paymentMap, subscriptionRows, paymentRows } = await accessMaps([...profiles.keys()]);

    const rows = users.filter((user) => profiles.has(user.id)).map((user) => {
      const profile = profiles.get(user.id) ?? null;
      const appUser = appUsers.get(user.id) ?? null;
      const authProfile = authProfiles.get(user.id) ?? null;
      const subscription = (subscriptionMap.get(user.id) ?? null) as (SpokeduMasterSubscriptionRow & Record<string, any>) | null;
      const grant = (grantMap.get(user.id) ?? null) as SpokeduMasterEntitlementGrantRow | null;
      const payment = paymentMap.get(user.id) ?? null;
      const latestOrder = payment ? {
        plan: payment.plan ?? null,
        amount: payment.amount ?? null,
        status: payment.status ?? null,
        updatedAt: payment.updated_at ?? null,
        appliedAt: payment.applied_at ?? null,
        lastErrorCode: payment.last_error_code ?? null,
        paymentApproved: Boolean(payment.payment_key),
      } : null;
      const accountClass = classifyMasterAccount({
        hasMasterProfile: true,
        identity: { appMetadata: user.app_metadata, userMetadata: user.user_metadata, bannedUntil: user.banned_until, deletedAt: user.deleted_at },
        profile,
        appUser,
        subscription,
      });
      const isAdminAccount = isPlatformAdminIdentity(user.email ?? appUser?.email, appUser, authProfile?.role);
      const appRole = String(appUser?.role ?? authProfile?.role ?? '').trim().toLowerCase();
      const accountRole = isAdminAccount
        ? 'admin'
        : profile?.account_type === 'institution'
          ? 'institution'
          : appRole === 'teacher'
            ? 'teacher'
            : 'user';
      return {
        id: user.id,
        email: user.email ?? appUser?.email ?? null,
        name: profile?.name || appUser?.name || user.user_metadata?.name || user.user_metadata?.full_name || '이름 없음',
        createdAt: profile?.created_at ?? user.created_at ?? null,
        onboardingDone: Boolean(profile?.onboarding_done),
        accountType: profile?.account_type ?? 'personal',
        accountClass,
        accountRole,
        ...buildMasterAdminAccess({ subscription, grant }),
        latestOrder,
        entitlementEndsAt: grant && buildMasterAdminAccess({ subscription, grant }).effectiveSource === 'promotion' ? grant.ends_at : subscription?.current_period_end ?? subscription?.period_end ?? null,
        statusLabel: profile?.onboarding_done ? 'normal' : 'onboarding_required',
        billingIncident: deriveMasterAdminBillingIncident({
          subscription: subscription ? {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
            nextBillingAt: subscription.next_billing_at ?? null,
            renewalRetryCount: subscription.renewal_retry_count ?? 0,
            lastBillingError: subscription.last_billing_error ?? null,
            nextRetryAt: subscription.next_retry_at ?? null,
          } : null,
          order: latestOrder,
        }),
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          pgProvider: subscription.pg_provider ?? null,
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
      const production = rows.filter((row) => row.accountClass === 'production' && !isSpokeduStaffEmail(row.email));
      const summary = {
        total: production.length,
        free: 0,
        lite: 0,
        premium: 0,
        promotions: 0,
        renewalFailed: 0,
        paid: 0,
        expiringSoon: 0,
        billingCustomerIncidents: 0,
        billingSystemIncidents: 0,
      };
      for (const row of production) {
        if (row.effectivePlan === 'premium' || row.effectivePlan === 'team') summary.premium += 1;
        else if (row.effectivePlan === 'lite') summary.lite += 1;
        else summary.free += 1;
        if (row.promoPlan) summary.promotions += 1;
        if (row.subscription && row.subscription.pgProvider !== 'manual_qa' && row.latestOrder?.paymentApproved && row.latestOrder.appliedAt) summary.paid += 1;
        if (row.entitlementEndsAt) { const remaining = Date.parse(row.entitlementEndsAt) - Date.now(); if (remaining >= 0 && remaining <= 7 * 86_400_000) summary.expiringSoon += 1; }
        if (hasRenewalProblem(row.subscription ? {
          status: row.subscription.status,
          renewal_retry_count: row.subscription.renewalRetryCount,
          last_billing_error: row.subscription.lastBillingError,
          next_retry_at: row.subscription.nextRetryAt,
        } : null)) summary.renewalFailed += 1;
      }
      const productionIds = new Set(production.map((row) => row.id));
      const productionById = new Map(production.map((row) => [row.id, row]));
      const [recentGrantEvents, recentPaymentEvents, funnel, webhookRows, billingRuns] = await Promise.all([
        recentOperationalRows('spokedu_master_entitlement_grants', 'id,user_id,plan,created_at', 'created_at', productionIds),
        recentOperationalRows('spokedu_master_payment_orders', 'order_id,user_id,status,payment_key,updated_at,applied_at', 'updated_at', productionIds, 8, 'order_id'),
        funnelEvidence(production),
        readAllMasterAdminPages<any>({ fetchPage: async (page, pageSize) => { const from = (page - 1) * pageSize; const result = await getServiceSupabase().from('spokedu_master_payment_webhook_events').select('event_key,event_type,order_id,status,created_at').order('created_at', { ascending: false }).range(from, from + pageSize - 1); if (result.error) throw result.error; return result.data ?? []; } }),
        readAllMasterAdminPages<any>({ fetchPage: async (page, pageSize) => { const from = (page - 1) * pageSize; const result = await getServiceSupabase().from('spokedu_master_billing_runs').select('id,started_at,completed_at,status,attempted,succeeded,failed,skipped,error_code').order('started_at', { ascending: false }).range(from, from + pageSize - 1); if (result.error) throw result.error; return result.data ?? []; } }),
      ]);
      const billingIncidents = buildBillingIncidents({ orders: paymentRows.filter((row: any) => productionIds.has(row.user_id)).map(({ payment_key, ...row }: any) => ({ ...row, paymentApproved: Boolean(payment_key) })), subscriptions: subscriptionRows.filter((row: any) => productionIds.has(row.user_id)), webhooks: webhookRows as BillingWebhook[], runs: billingRuns as BillingRun[] });
      summary.billingCustomerIncidents = billingIncidents.filter((incident) => incident.scope === 'customer').length;
      summary.billingSystemIncidents = billingIncidents.filter((incident) => incident.scope === 'system').length;
      const newest = <T extends { at: string | null }>(items: T[]) => items.filter((item) => item.at).sort((a, b) => Date.parse(b.at!) - Date.parse(a.at!)).slice(0, 8);
      const activities = {
        newMembers: newest(production.map((row) => ({ userId: row.id, name: row.name, email: row.email, at: row.createdAt }))),
        recentGrants: recentGrantEvents.map((event) => { const member = productionById.get(event.user_id)!; return { userId: event.user_id, name: member.name, email: member.email, plan: event.plan, at: event.created_at }; }),
        expiring: newest(production.filter((row) => row.entitlementEndsAt && Date.parse(row.entitlementEndsAt) >= Date.now() && Date.parse(row.entitlementEndsAt) <= Date.now() + 7 * 86_400_000).map((row) => ({ userId: row.id, name: row.name, email: row.email, plan: row.effectivePlan, at: row.entitlementEndsAt }))),
        payments: recentPaymentEvents.map((event) => { const member = productionById.get(event.user_id)!; return { userId: event.user_id, name: member.name, email: member.email, status: event.status, approved: Boolean(event.payment_key && event.applied_at), at: event.updated_at }; }),
        billingIncidents: billingIncidents.slice(0, 8).map((incident) => { const member = incident.userId ? productionById.get(incident.userId) : null; return { userId: incident.userId, name: member?.name ?? 'System scheduler', email: member?.email ?? null, at: incident.lastOccurredAt, label: incident.type, status: incident.errorCode, scope: incident.scope }; }),
        paymentErrors: newest(production.filter((row) => row.billingIncident.tone !== 'ok').map((row) => ({ userId: row.id, name: row.name, email: row.email, label: row.billingIncident.label, at: row.latestOrder?.updatedAt ?? row.subscription?.nextRetryAt ?? row.createdAt }))),
      };
      return withPrivateNoStore(NextResponse.json({ summary: { ...summary, funnel }, activities }));
    }

    if (view === 'billing') {
      const billingRows = rows.filter((row) =>
        row.accountClass === 'production'
        && !isSpokeduStaffEmail(row.email)
        && Boolean(row.subscription || row.latestOrder),
      );
      const paged = paginateMasterAdminRows(billingRows, page, PAGE_SIZE);
      return withPrivateNoStore(NextResponse.json({
        members: paged.rows,
        total: paged.total,
        page: paged.page,
        pageSize: paged.pageSize,
      }));
    }

    const filtered = rows.filter((user) => matchesScope(user.accountClass, scope))
      .filter((user) => scope !== 'production' || !isSpokeduStaffEmail(user.email))
      .filter((user) => !query || user.name.toLowerCase().includes(query) || (user.email ?? '').toLowerCase().includes(query))
      .filter((user) => planFilter === 'all' || user.effectivePlan === planFilter || (planFilter === 'premium' && user.effectivePlan === 'team'))
      .filter((user) => sourceFilter === 'all' || (sourceFilter === 'base' ? user.effectiveSource === 'none' : user.effectiveSource === sourceFilter))
      .filter((user) => onboardingFilter === 'all' || user.onboardingDone === (onboardingFilter === 'complete'));
    const paged = paginateMasterAdminRows(filtered, page, PAGE_SIZE);
    return withPrivateNoStore(NextResponse.json({ members: paged.rows, total: paged.total, page: paged.page, pageSize: paged.pageSize, scope }));
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: 'MASTER 운영 데이터를 불러오지 못했습니다.' }, { status: 500 }));
  }
}
