/**
 * Stripe Checkout (구독) — 환경변수 설정 시에만 동작.
 * GET: 설정 여부. POST: Checkout Session URL 반환.
 *
 * 필요: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_BASIC, STRIPE_PRICE_ID_PRO,
 *       NEXT_PUBLIC_APP_URL 또는 VERCEL_URL (success/cancel URL용)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  getStripeClient,
  isStripeCheckoutConfigured,
  stripePriceIdForPlan,
} from '@/app/lib/server/stripeSpokedu';

function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    checkoutEnabled: isStripeCheckoutConfigured(),
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  if (!stripe || !isStripeCheckoutConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: 'stripe_not_configured' },
      { status: 503 }
    );
  }

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const plan = body.plan === 'basic' || body.plan === 'pro' ? body.plan : null;
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'invalid_plan' }, { status: 400 });
  }

  const priceId = stripePriceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ ok: false, error: 'missing_price' }, { status: 503 });
  }

  const svc = getServiceSupabase();
  const { data: owned } = await svc
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!owned?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: 'no_center',
        message: '도장(센터)을 먼저 설정한 뒤 결제를 진행해 주세요.',
      },
      { status: 400 }
    );
  }

  const centerId = owned.id as string;

  const { data: sub } = await svc
    .from('spokedu_pro_subscriptions')
    .select('id, stripe_customer_id')
    .eq('center_id', centerId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json(
      {
        ok: false,
        error: 'no_subscription_row',
        message: '구독 정보가 없습니다. 앱에서 도장(센터)과 체험 설정을 완료한 뒤 다시 시도해 주세요.',
      },
      { status: 400 }
    );
  }

  let customerId = sub.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { center_id: centerId, user_id: user.id },
    });
    customerId = customer.id;
    await svc
      .from('spokedu_pro_subscriptions')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('center_id', centerId);
  }

  const origin = appOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/spokedu-pro?checkout=success`,
    cancel_url: `${origin}/spokedu-pro?checkout=cancel`,
    metadata: {
      center_id: centerId,
      user_id: user.id,
      target_plan: plan,
    },
    subscription_data: {
      metadata: {
        center_id: centerId,
        target_plan: plan,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ ok: false, error: 'no_session_url' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: session.url });
}
