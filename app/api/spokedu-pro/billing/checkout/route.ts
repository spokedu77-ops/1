/**
 * POST /api/spokedu-pro/billing/checkout
 * Stripe Checkout Session을 생성하고 URL을 반환한다.
 * 신규 구독자에게는 14일 무료 체험이 적용된다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import stripe, { getPriceId } from '@/app/lib/stripe';

export async function POST(req: NextRequest) {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const plan = body.plan as 'basic' | 'pro' | undefined;
  if (!plan || !['basic', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'plan must be basic or pro' }, { status: 400 });
  }

  let priceId: string;
  try {
    priceId = getPriceId(plan);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const supabase = getServiceSupabase();

    // 기존 Stripe Customer ID 조회 (center 기반)
    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let stripeCustomerId: string | undefined;
    let isNewSubscriber = true;

    if (ownedCenter) {
      const { data: sub } = await supabase
        .from('spokedu_pro_subscriptions')
        .select('stripe_customer_id, status')
        .eq('center_id', ownedCenter.id)
        .maybeSingle();

      if (sub?.stripe_customer_id) {
        stripeCustomerId = sub.stripe_customer_id;
        // 이미 체험/구독 이력이 있으면 trial 미적용
        if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
          isNewSubscriber = false;
        }
      }
    }

    const baseParams = {
      mode: 'subscription' as const,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/spokedu-pro?billing=success&plan=${plan}`,
      cancel_url: `${appUrl}/spokedu-pro?billing=cancel`,
      metadata: {
        userId: user.id,
        plan,
        centerId: ownedCenter?.id ?? '',
      },
      subscription_data: {
        metadata: { userId: user.id, plan, centerId: ownedCenter?.id ?? '' },
        ...(isNewSubscriber ? { trial_period_days: 14 } : {}),
      },
    };

    const session = await stripe.checkout.sessions.create(
      stripeCustomerId
        ? { ...baseParams, customer: stripeCustomerId }
        : { ...baseParams, customer_email: user.email }
    );

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('[billing/checkout]', e);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
