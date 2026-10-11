import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { classifyBillingIssue, isActualPaidOrder, isActualPaidSubscription, paginateBillingRows, type BillingOrder, type BillingSubscription } from '@/app/lib/server/spokeduMasterBillingAdmin';
import { buildBillingIncidents, type BillingRun, type BillingWebhook } from '@/app/lib/server/spokeduMasterBillingIncidents';
import { readSpokeduMasterAdminCache } from '@/app/lib/server/spokeduMasterAdminCache';

export const dynamic = 'force-dynamic';

async function allRows(table: string, columns: string, orderColumn: string, tieColumn: string) {
  const service = getServiceSupabase();
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await service.from(table).select(columns).order(orderColumn, { ascending: false }).order(tieColumn, { ascending: false }).range(from, from + 999);
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) return rows;
  }
}

async function identities(ids: string[]) {
  const service = getServiceSupabase();
  const result = new Map<string, { name: string | null; email: string | null }>();
  for (let index = 0; index < ids.length; index += 200) {
    const batch = ids.slice(index, index + 200);
    const { data, error } = await service.from('spokedu_master_profiles').select('user_id,name').in('user_id', batch);
    if (error) throw error;
    for (const row of data ?? []) result.set(row.user_id, { name: row.name ?? null, email: null });
  }
  const wanted = new Set(ids);
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (!wanted.has(user.id)) continue;
      const current = result.get(user.id) ?? { name: null, email: null };
      result.set(user.id, { ...current, email: user.email ?? null });
    }
    if (data.users.length < 1000) break;
  }
  return result;
}

async function readBillingSnapshot() {
  const [rawOrders, rawSubscriptions, webhooks, runs] = await Promise.all([
    allRows('spokedu_master_payment_orders', 'order_id,user_id,plan,amount,status,created_at,updated_at,applied_at,last_processed_at,last_error_code,payment_key', 'updated_at', 'order_id'),
    allRows('spokedu_master_subscriptions', 'id,user_id,plan,status,pg_provider,toss_order_id,current_period_end,next_billing_at,cancel_at_period_end,renewal_retry_count,last_billing_error,next_retry_at,updated_at', 'updated_at', 'id'),
    allRows('spokedu_master_payment_webhook_events', 'event_key,event_type,order_id,status,created_at', 'created_at', 'event_key'),
    allRows('spokedu_master_billing_runs', 'id,started_at,completed_at,status,attempted,succeeded,failed,skipped,error_code,created_at', 'started_at', 'id'),
  ]);
  const userIds = [...new Set([...rawOrders.map((row) => row.user_id), ...rawSubscriptions.map((row) => row.user_id)])];
  const orders = rawOrders.map(({ payment_key, ...row }) => ({ ...row, paymentApproved: Boolean(payment_key) }));
  return { orders, rawSubscriptions, webhooks, runs, userIds, people: await identities(userIds) };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const filter = url.searchParams.get('status') ?? 'all';
    const orderId = url.searchParams.get('orderId');
    const incidentPage = Math.max(1, Number(url.searchParams.get('incidentPage') ?? 1) || 1);
    const incidentType = url.searchParams.get('incidentType') ?? 'all';
    const severity = url.searchParams.get('severity') ?? 'all';
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    if (orderId) {
      const service = getServiceSupabase();
      const { data: rawOrder, error: orderError } = await service.from('spokedu_master_payment_orders').select('order_id,user_id,plan,amount,status,created_at,updated_at,applied_at,last_processed_at,last_error_code,payment_key').eq('order_id', orderId).maybeSingle();
      if (orderError) throw orderError;
      if (!rawOrder) return withPrivateNoStore(NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 }));
      const [subscriptionResult, webhookResult, userResult, profileResult] = await Promise.all([
        service.from('spokedu_master_subscriptions').select('id,user_id,plan,status,pg_provider,toss_order_id,current_period_end,next_billing_at,cancel_at_period_end,renewal_retry_count,last_billing_error,next_retry_at,updated_at').eq('user_id', rawOrder.user_id).maybeSingle(),
        service.from('spokedu_master_payment_webhook_events').select('event_key,event_type,order_id,status,created_at').eq('order_id', orderId).order('created_at', { ascending: false }).range(0, 99),
        service.auth.admin.getUserById(rawOrder.user_id),
        service.from('spokedu_master_profiles').select('name').eq('user_id', rawOrder.user_id).maybeSingle(),
      ]);
      const detailError = subscriptionResult.error ?? webhookResult.error ?? userResult.error ?? profileResult.error;
      if (detailError) throw detailError;
      const { payment_key, ...order } = rawOrder;
      return withPrivateNoStore(NextResponse.json({
        order: { ...order, paymentApproved: Boolean(payment_key) },
        member: { name: profileResult.data?.name ?? null, email: userResult.data.user?.email ?? null },
        subscription: subscriptionResult.data,
        webhooks: webhookResult.data ?? [],
      }));
    }
    const snapshot = await readSpokeduMasterAdminCache('billing-snapshot', 10_000, readBillingSnapshot);
    const { orders: rawOrders, rawSubscriptions, webhooks, runs, userIds, people } = snapshot.value;
    const orders = rawOrders as BillingOrder[];
    const subscriptions = rawSubscriptions as BillingSubscription[];
    const subscriptionByUser = new Map(subscriptions.map((row) => [row.user_id, row]));
    const latestOrderByUser = new Map<string, BillingOrder>();
    for (const order of orders) if (!latestOrderByUser.has(order.user_id)) latestOrderByUser.set(order.user_id, order);
    const incidents = buildBillingIncidents({ orders, subscriptions, webhooks: webhooks as BillingWebhook[], runs: runs as BillingRun[] })
      .map((incident) => ({ ...incident, member: incident.userId ? people.get(incident.userId) ?? null : null }))
      .filter((incident) => incidentType === 'all' || incident.type === incidentType)
      .filter((incident) => severity === 'all' || incident.severity === severity)
      .filter((incident) => !from || Date.parse(incident.lastOccurredAt) >= Date.parse(from))
      .filter((incident) => !to || Date.parse(incident.lastOccurredAt) < Date.parse(to) + 86_400_000)
      .filter((incident) => !q || incident.orderId?.toLowerCase().includes(q) || incident.errorCode?.toLowerCase().includes(q) || incident.member?.name?.toLowerCase().includes(q) || incident.member?.email?.toLowerCase().includes(q));
    const rows = userIds.map((userId) => {
      const order = latestOrderByUser.get(userId) ?? null;
      const subscription = subscriptionByUser.get(userId) ?? null;
      const person = people.get(userId) ?? { name: null, email: null };
      return { userId, ...person, order, subscription, issue: classifyBillingIssue(order, subscription) };
    }).filter((row) => !q || row.name?.toLowerCase().includes(q) || row.email?.toLowerCase().includes(q) || row.order?.order_id.toLowerCase().includes(q))
      .filter((row) => filter === 'all' || row.issue.code === filter);
    const actualOrders = orders.filter(isActualPaidOrder);
    const summary = {
      paidCount: actualOrders.length,
      paidAmount: actualOrders.reduce((sum, order) => sum + (order.amount ?? 0), 0),
      paidSubscriptions: subscriptions.filter((sub) => isActualPaidSubscription(sub, latestOrderByUser.get(sub.user_id) ?? null)).length,
      cancelScheduled: subscriptions.filter((sub) => sub.cancel_at_period_end).length,
      renewalAttention: subscriptions.filter((sub) => Boolean(sub.last_billing_error || sub.renewal_retry_count)).length,
      applyFailed: orders.filter((order) => order.paymentApproved && (!order.applied_at || order.status === 'recoverable_failed')).length,
      refundReview: orders.filter((order) => order.last_error_code === 'partial_cancel_review_required').length,
    };
    const runIssues = runs.filter((run) => run.status === 'failed' || run.status === 'completed_with_errors');
    return withPrivateNoStore(NextResponse.json({ summary, customers: paginateBillingRows(rows, page), incidents: paginateBillingRows(incidents, incidentPage), runs: runs.slice(0, 20), scheduler: { lastSuccessfulAt: runs.find((run) => run.status === 'succeeded')?.completed_at ?? null, issueCount: runIssues.length, latestIssue: runIssues[0] ?? null } }));
  } catch {
    return withPrivateNoStore(NextResponse.json({ error: '결제 운영 데이터를 불러오지 못했습니다.' }, { status: 500 }));
  }
}
