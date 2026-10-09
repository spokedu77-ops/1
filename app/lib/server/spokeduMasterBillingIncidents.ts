import type { BillingOrder, BillingSubscription } from './spokeduMasterBillingAdmin';

export type BillingWebhook = { event_key: string; event_type: string; order_id: string | null; status: string; created_at: string };
export type BillingRun = { id: string; started_at: string; completed_at: string | null; status: string; attempted: number; succeeded: number; failed: number; skipped: number; error_code: string | null };
export type BillingIncident = { id: string; scope: 'customer' | 'system'; type: string; severity: 'warning' | 'danger'; userId: string | null; orderId: string | null; firstOccurredAt: string; lastOccurredAt: string; status: string; errorCode: string | null; occurrenceCount: number; needsAction: boolean };

export function buildBillingIncidents(input: { orders: BillingOrder[]; subscriptions: BillingSubscription[]; webhooks: BillingWebhook[]; runs: BillingRun[]; now?: number }) {
  const now = input.now ?? Date.now();
  const subscriptionByUser = new Map(input.subscriptions.map((row) => [row.user_id, row]));
  const incidents: BillingIncident[] = [];
  const addOrder = (order: BillingOrder, type: string, severity: 'warning' | 'danger', errorCode: string | null) => incidents.push({ id: `order:${order.order_id}:${type}`, scope: 'customer', type, severity, userId: order.user_id, orderId: order.order_id, firstOccurredAt: order.created_at, lastOccurredAt: order.last_processed_at ?? order.updated_at, status: order.status, errorCode, occurrenceCount: 1, needsAction: true });
  for (const order of input.orders) {
    if (order.paymentApproved && (!order.applied_at || order.status === 'recoverable_failed')) addOrder(order, 'approved_apply_failed', 'danger', order.last_error_code);
    else if (order.status === 'processing' && Date.parse(order.last_processed_at ?? order.updated_at) < now - 10 * 60_000) addOrder(order, 'processing_stale', 'danger', order.last_error_code);
    else if (order.status === 'recoverable_failed') addOrder(order, 'recoverable_failed', 'danger', order.last_error_code);
    else if (order.status === 'failed') addOrder(order, 'payment_failed', 'warning', order.last_error_code);
    const subscription = subscriptionByUser.get(order.user_id);
    if (order.status === 'active' && (!subscription || subscription.status !== 'active')) addOrder(order, 'order_subscription_mismatch', 'danger', 'active_order_without_active_subscription');
  }
  for (const subscription of input.subscriptions) {
    const eventAt = subscription.next_retry_at ?? subscription.next_billing_at ?? subscription.current_period_end ?? new Date(now).toISOString();
    if (subscription.last_billing_error || subscription.renewal_retry_count > 0) incidents.push({ id: `subscription:${subscription.id}:renewal_failed`, scope: 'customer', type: 'renewal_failed', severity: 'danger', userId: subscription.user_id, orderId: subscription.toss_order_id, firstOccurredAt: eventAt, lastOccurredAt: eventAt, status: subscription.status, errorCode: subscription.last_billing_error, occurrenceCount: Math.max(1, subscription.renewal_retry_count), needsAction: true });
    if (subscription.cancel_at_period_end && subscription.status !== 'active') incidents.push({ id: `subscription:${subscription.id}:cancel_status_mismatch`, scope: 'customer', type: 'cancel_status_mismatch', severity: 'warning', userId: subscription.user_id, orderId: subscription.toss_order_id, firstOccurredAt: eventAt, lastOccurredAt: eventAt, status: subscription.status, errorCode: 'cancel_at_period_end_status_mismatch', occurrenceCount: 1, needsAction: true });
  }
  const orderUser = new Map(input.orders.map((order) => [order.order_id, order.user_id]));
  for (const webhook of input.webhooks) if (webhook.status === 'failed' || webhook.status === 'ignored') incidents.push({ id: `webhook:${webhook.event_key}`, scope: 'customer', type: 'webhook_error', severity: webhook.status === 'failed' ? 'danger' : 'warning', userId: webhook.order_id ? orderUser.get(webhook.order_id) ?? null : null, orderId: webhook.order_id, firstOccurredAt: webhook.created_at, lastOccurredAt: webhook.created_at, status: webhook.status, errorCode: webhook.event_type, occurrenceCount: 1, needsAction: true });
  const runsByCode = new Map<string, BillingRun[]>();
  for (const run of input.runs) if (run.status === 'failed' || run.status === 'completed_with_errors') { const code = run.error_code ?? run.status; runsByCode.set(code, [...(runsByCode.get(code) ?? []), run]); }
  for (const [code, runs] of runsByCode) { const sorted = [...runs].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at)); incidents.push({ id: `scheduler:${code}`, scope: 'system', type: 'scheduler_failure', severity: 'danger', userId: null, orderId: null, firstOccurredAt: sorted[0].started_at, lastOccurredAt: sorted.at(-1)!.started_at, status: sorted.at(-1)!.status, errorCode: code, occurrenceCount: sorted.length, needsAction: true }); }
  return incidents.sort((a, b) => Date.parse(b.lastOccurredAt) - Date.parse(a.lastOccurredAt) || a.id.localeCompare(b.id));
}
