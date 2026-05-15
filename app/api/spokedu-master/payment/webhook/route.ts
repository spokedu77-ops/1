import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const PLAN_MAP: Record<string, string> = {
  'pro': 'pro',
  'team': 'team',
  'lite': 'lite',
};

async function upsertSubscription(params: {
  userId: string;
  plan: string;
  status: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}) {
  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('spokedu_master_subscriptions')
    .upsert({
      user_id: params.userId,
      plan: params.plan,
      status: params.status,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      stripe_price_id: params.stripePriceId,
      period_start: params.periodStart?.toISOString() ?? null,
      period_end: params.periodEnd?.toISOString() ?? null,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[spm-webhook] upsert error:', error.message);
  }
}

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature') ?? '';
  const stripe = new Stripe(stripeKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return NextResponse.json({ ok: true });

      const userId = session.metadata?.user_id;
      const planKey = session.metadata?.plan;
      if (!userId || !planKey) return NextResponse.json({ ok: true });

      const subscriptionId = session.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      await upsertSubscription({
        userId,
        plan: PLAN_MAP[planKey] ?? planKey,
        status: subscription.status === 'active' ? 'active' : 'pending',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: subscription.items.data[0]?.price.id ?? '',
        periodStart: new Date(subscription.current_period_start * 1000),
        periodEnd: new Date(subscription.current_period_end * 1000),
      });
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata.user_id;
      const planKey = sub.metadata.plan;
      if (!userId) return NextResponse.json({ ok: true });

      const status = sub.status === 'active' ? 'active' : sub.status === 'canceled' ? 'canceled' : 'expired';

      await upsertSubscription({
        userId,
        plan: PLAN_MAP[planKey ?? ''] ?? 'pro',
        status,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        stripePriceId: sub.items.data[0]?.price.id ?? '',
        periodStart: new Date(sub.current_period_start * 1000),
        periodEnd: new Date(sub.current_period_end * 1000),
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata.user_id;
      if (!userId) return NextResponse.json({ ok: true });

      const supabase = getServiceSupabase();
      await supabase
        .from('spokedu_master_subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', userId);
    }
  } catch (err) {
    console.error('[spm-webhook] handler error:', err);
  }

  return NextResponse.json({ ok: true });
}
