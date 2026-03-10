/**
 * POST /api/spokedu-pro/subscription/upgrade
 * Stripe Checkout 세션을 생성하고 URL을 반환.
 *
 * DB_READY=false → { ok: false, reason: 'db_not_ready' }
 * STRIPE_SECRET_KEY 미설정 → { ok: false, reason: 'stripe_not_configured' }
 * 정상 → { ok: true, url: checkoutUrl }
 *
 * 환경변수:
 *   STRIPE_SECRET_KEY      — Stripe 비밀 키
 *   STRIPE_PRICE_BASIC     — Basic 플랜 Price ID
 *   STRIPE_PRICE_PRO       — Pro 플랜 Price ID
 *   NEXT_PUBLIC_APP_URL    — 앱 기본 URL (성공/취소 리다이렉트용)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const STRIPE_API = 'https://api.stripe.com/v1';

type Plan = 'basic' | 'pro';

const PRICE_IDS: Record<Plan, string | undefined> = {
  basic: process.env.STRIPE_PRICE_BASIC,
  pro: process.env.STRIPE_PRICE_PRO,
};

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!DB_READY) {
      return NextResponse.json({ ok: false, reason: 'db_not_ready' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ ok: false, reason: 'stripe_not_configured' });
    }

    let body: { plan?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const plan = body.plan as Plan;
    if (!['basic', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'plan은 basic 또는 pro여야 합니다.' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({
        ok: false,
        reason: 'price_not_configured',
        message: `${plan.toUpperCase()} 플랜 가격 ID가 설정되지 않았습니다. STRIPE_PRICE_${plan.toUpperCase()} 환경변수를 확인하세요.`,
      });
    }

    const supabase = getServiceSupabase();

    // 기존 구독 확인
    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    const centerId = ownedCenter?.id ?? null;

    // Stripe customer ID 조회 (있으면 기존 고객으로 세션 생성)
    let stripeCustomerId: string | undefined;
    if (centerId) {
      const { data: sub } = await supabase
        .from('spokedu_pro_subscriptions')
        .select('stripe_customer_id')
        .eq('center_id', centerId)
        .maybeSingle();
      stripeCustomerId = (sub?.stripe_customer_id as string | null) ?? undefined;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const successUrl = `${appUrl}/spokedu-pro?upgrade=success&plan=${plan}`;
    const cancelUrl = `${appUrl}/spokedu-pro?upgrade=canceled`;

    const params = new URLSearchParams({
      mode: 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[center_id]': centerId ?? '',
      'metadata[user_id]': user.id,
      'metadata[plan]': plan,
    });
    if (stripeCustomerId) {
      params.set('customer', stripeCustomerId);
    } else {
      params.set('customer_email', user.email ?? '');
    }

    const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json().catch(() => ({}));
      console.error('[subscription/upgrade] Stripe error', err);
      return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }

    const session = await stripeRes.json();
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error('[subscription/upgrade]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
