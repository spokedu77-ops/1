/**
 * POST /api/spokedu-pro/billing/webhook
 * Stripe 웹훅 핸들러.
 * 구독 생성/변경/취소/결제 실패 이벤트를 처리해 DB를 동기화한다.
 *
 * Stripe Dashboard → 웹훅 설정:
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.payment_failed
 *   invoice.payment_succeeded
 */
import { NextRequest, NextResponse } from 'next/server';
import stripe from '@/app/lib/stripe';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import type Stripe from 'stripe';

// Next.js는 raw body를 파싱해야 Stripe 서명 검증이 가능
export const runtime = 'nodejs';

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

type StripeSubscription = Stripe.Subscription;

async function syncSubscription(subscription: StripeSubscription) {
  const supabase = getServiceSupabase();

  const centerId = subscription.metadata?.centerId;
  const userId = subscription.metadata?.userId;

  if (!centerId) {
    console.warn('[webhook] centerId missing in subscription metadata');
    return;
  }

  // Stripe plan을 DB plan으로 변환
  const priceId = subscription.items.data[0]?.price?.id;
  let plan: 'free' | 'basic' | 'pro' = 'free';
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) plan = 'basic';
  else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';

  // subscription.status 매핑
  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'expired',
    paused: 'canceled',
  };
  const status = statusMap[subscription.status] ?? 'expired';

  // Stripe v20 uses `items` not `current_period_*` at top level; use billing_cycle_anchor + schedule or item period
  // The actual period dates are in subscription.items.data[0].billing_thresholds or subscription itself via casting
  const subAny = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const currentPeriodStart = subAny.current_period_start
    ? new Date(subAny.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEnd = subAny.current_period_end
    ? new Date(subAny.current_period_end * 1000).toISOString()
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  await supabase
    .from('spokedu_pro_subscriptions')
    .upsert(
      {
        center_id: centerId,
        ...(userId ? { owner_user_id: userId } : {}),
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_end: trialEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'center_id' }
    );
}

type StripeInvoice = {
  parent?: {
    subscription_details?: {
      subscription?: string;
    };
  };
} & Stripe.Invoice;

function getSubscriptionId(invoice: StripeInvoice): string | null {
  // Stripe v20: invoice.parent.subscription_details.subscription
  return invoice.parent?.subscription_details?.subscription ?? null;
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error('[webhook] signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as StripeSubscription);
        break;

      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoice;
        const subId = getSubscriptionId(invoice);
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(subscription);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoice;
        const subId = getSubscriptionId(invoice);
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(subscription);
        }
        break;
      }

      default:
        // 무시
        break;
    }
  } catch (e) {
    console.error('[webhook] handler error:', e);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
