#!/usr/bin/env node
import nextEnv from '@next/env';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const maxAgeMinutes = Number(process.env.SPM_PAYMENT_RECONCILE_PROCESSING_MINUTES ?? 10);

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function mask(value) {
  if (!value || typeof value !== 'string') return null;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function hash(value) {
  if (!value || typeof value !== 'string') return null;
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function issue(type, order, subscription = null, recoverable = false) {
  return {
    type,
    recoverable,
    orderIdHash: hash(order?.order_id),
    orderIdMask: mask(order?.order_id),
    paymentKeyHash: hash(order?.payment_key ?? subscription?.toss_payment_key),
    orderStatus: order?.status ?? null,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionPlan: subscription?.plan ?? null,
    periodEnd: subscription?.period_end ?? null,
  };
}

const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

const { data: orders, error: orderError } = await supabase
  .from('spokedu_master_payment_orders')
  .select('order_id,user_id,plan,amount,status,payment_key,last_error_code,last_processed_at,applied_at,updated_at')
  .in('status', ['processing', 'recoverable_failed', 'active'])
  .order('updated_at', { ascending: false })
  .limit(500);

if (orderError) throw orderError;

const { data: subscriptions, error: subscriptionError } = await supabase
  .from('spokedu_master_subscriptions')
  .select('user_id,plan,status,toss_order_id,toss_payment_key,period_end,updated_at')
  .limit(1000);

if (subscriptionError) throw subscriptionError;

const subscriptionByUser = new Map((subscriptions ?? []).map((row) => [row.user_id, row]));
const subscriptionByOrder = new Map(
  (subscriptions ?? [])
    .filter((row) => row.toss_order_id)
    .map((row) => [row.toss_order_id, row]),
);

const issues = [];

for (const order of orders ?? []) {
  const subscription = subscriptionByOrder.get(order.order_id) ?? subscriptionByUser.get(order.user_id) ?? null;
  if (order.status === 'processing' && (!order.last_processed_at || order.last_processed_at < cutoff)) {
    issues.push(issue('processing_stale', order, subscription, true));
  }
  if (order.status === 'recoverable_failed') {
    issues.push(issue(order.last_error_code ?? 'recoverable_failed', order, subscription, true));
  }
  if (order.status === 'active' && (!subscription || subscription.status !== 'active')) {
    issues.push(issue('order_active_subscription_mismatch', order, subscription, true));
  }
  if (order.payment_key && !subscription) {
    issues.push(issue('payment_key_without_subscription', order, null, true));
  }
}

for (const subscription of subscriptions ?? []) {
  if (subscription.status !== 'active' || !subscription.toss_order_id) continue;
  const order = (orders ?? []).find((candidate) => candidate.order_id === subscription.toss_order_id);
  if (!order || order.status !== 'active') {
    issues.push(issue('subscription_active_order_not_active', order ?? { order_id: subscription.toss_order_id, status: null, payment_key: subscription.toss_payment_key }, subscription, true));
  }
}

console.log(JSON.stringify({
  ok: issues.length === 0,
  mode: apply ? 'apply' : 'read-only',
  checkedAt: new Date().toISOString(),
  issueCount: issues.length,
  issues,
}, null, 2));

if (apply) {
  console.error('Apply mode is intentionally not implemented in this step. Re-run after adding an explicit recovery policy.');
  process.exitCode = 2;
} else if (issues.length > 0) {
  process.exitCode = 1;
}
