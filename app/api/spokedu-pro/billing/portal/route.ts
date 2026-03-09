/**
 * POST /api/spokedu-pro/billing/portal
 * Stripe Customer Portal URL을 생성한다 (구독 관리/취소/카드 변경).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import stripe from '@/app/lib/stripe';

export async function POST() {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const supabase = getServiceSupabase();

    // 소유 센터의 Stripe Customer ID 조회
    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownedCenter) {
      return NextResponse.json({ error: 'No center found' }, { status: 404 });
    }

    const { data: sub } = await supabase
      .from('spokedu_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('center_id', ownedCenter.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/spokedu-pro?view=settings`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    console.error('[billing/portal]', e);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
