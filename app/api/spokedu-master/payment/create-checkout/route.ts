import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

const PLAN_CONFIG = {
  pro: {
    name: 'SPOKEDU PRO — Pro 플랜',
    description: '전체 프로그램 라이브러리 + SPOMOVE 무제한 + 수업 설명 도구 전체',
    amount: 39900,
    currency: 'krw',
  },
  team: {
    name: 'SPOKEDU PRO — Center 플랜',
    description: '강사 3명 포함 + 센터용 설명 도구 + 추가 강사 확장 가능',
    amount: 79000,
    currency: 'krw',
  },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const planKey = body.plan as PlanKey;
  const plan = PLAN_CONFIG[planKey];
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const stripe = new Stripe(stripeKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: plan.currency,
        product_data: {
          name: plan.name,
          description: plan.description,
        },
        unit_amount: plan.amount,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    customer_email: user.email,
    success_url: `${siteUrl}/spokedu-master/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/spokedu-master/payment/cancel`,
    metadata: {
      user_id: user.id,
      plan: planKey,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan: planKey,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
