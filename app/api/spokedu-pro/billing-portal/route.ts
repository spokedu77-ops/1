/**
 * Stripe Customer Billing Portal 세션 URL 발급.
 * GET /api/spokedu-pro/checkout 과 동일한 센터·고객 해석.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { getStripeClient, isStripeCheckoutConfigured } from '@/app/lib/server/stripeSpokedu';

function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export async function POST() {
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
        message: '센터를 먼저 만든 뒤 이용해 주세요.',
      },
      { status: 400 }
    );
  }

  const centerId = owned.id as string;

  const { data: sub } = await svc
    .from('spokedu_pro_subscriptions')
    .select('stripe_customer_id')
    .eq('center_id', centerId)
    .maybeSingle();

  const customerId = sub?.stripe_customer_id as string | null | undefined;
  if (!customerId?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'no_stripe_customer',
        message:
          'Stripe 고객 정보가 없습니다. 먼저 설정 화면에서 Basic 또는 Pro 결제(Checkout)를 한 번 완료한 뒤 다시 시도해 주세요.',
      },
      { status: 400 }
    );
  }

  const origin = appOrigin();
  const returnUrl = `${origin}/spokedu-pro?view=settings`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    if (!session.url) {
      return NextResponse.json({ ok: false, error: 'no_session_url' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: 'portal_session_failed', message: msg },
      { status: 502 }
    );
  }
}
