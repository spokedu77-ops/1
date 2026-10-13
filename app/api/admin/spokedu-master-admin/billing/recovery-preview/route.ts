import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import {
  billingRecoveryLookupError,
  diagnoseSpokeduMasterBillingRecovery,
  type BillingRecoveryOrder,
  type BillingRecoverySubscription,
  type BillingRecoveryWebhook,
} from '@/app/lib/server/spokeduMasterBillingRecovery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return withPrivateNoStore(auth.response);
  const orderId = new URL(request.url).searchParams.get('orderId')?.trim() ?? '';
  if (!orderId || orderId.length > 200) return withPrivateNoStore(NextResponse.json({ error: 'Valid orderId is required' }, { status: 400 }));

  try {
    const service = getServiceSupabase();
    const orderResult = await service.from('spokedu_master_payment_orders')
      .select('order_id,user_id,plan,amount,status,billing_cycle_key,created_at,updated_at,applied_at,last_processed_at,last_error_code,payment_key')
      .eq('order_id', orderId).maybeSingle();
    if (orderResult.error) throw orderResult.error;
    if (!orderResult.data) return withPrivateNoStore(NextResponse.json({ error: 'Payment order not found' }, { status: 404 }));

    const rawOrder = orderResult.data;
    const [linkedSubscription, ownerSubscription, webhookResult] = await Promise.all([
      service.from('spokedu_master_subscriptions').select('id,user_id,plan,status,pg_provider,toss_order_id,current_period_end').eq('toss_order_id', orderId).maybeSingle(),
      service.from('spokedu_master_subscriptions').select('id,user_id,plan,status,pg_provider,toss_order_id,current_period_end').eq('user_id', rawOrder.user_id).maybeSingle(),
      service.from('spokedu_master_payment_webhook_events').select('event_key,event_type,order_id,status,created_at').eq('order_id', orderId).order('created_at', { ascending: false }).range(0, 99),
    ]);
    if (linkedSubscription.error || ownerSubscription.error || webhookResult.error) throw linkedSubscription.error ?? ownerSubscription.error ?? webhookResult.error;

    const order: BillingRecoveryOrder = {
      order_id: rawOrder.order_id,
      user_id: rawOrder.user_id,
      plan: rawOrder.plan,
      amount: rawOrder.amount,
      status: rawOrder.status,
      billing_cycle_key: rawOrder.billing_cycle_key,
      created_at: rawOrder.created_at,
      updated_at: rawOrder.updated_at,
      applied_at: rawOrder.applied_at,
      last_processed_at: rawOrder.last_processed_at,
      last_error_code: rawOrder.last_error_code,
      paymentApproved: Boolean(rawOrder.payment_key),
    };
    const subscription = (linkedSubscription.data ?? ownerSubscription.data ?? null) as BillingRecoverySubscription | null;
    const webhooks = (webhookResult.data ?? []) as BillingRecoveryWebhook[];
    const diagnosis = diagnoseSpokeduMasterBillingRecovery({ order, subscription, webhooks });

    return withPrivateNoStore(NextResponse.json({
      order,
      subscription,
      webhooks,
      diagnosis,
    }));
  } catch {
    return withPrivateNoStore(NextResponse.json({
      error: 'Recovery diagnosis lookup failed',
      diagnosis: billingRecoveryLookupError(orderId),
    }, { status: 500 }));
  }
}
