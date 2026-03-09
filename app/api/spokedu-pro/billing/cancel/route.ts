/**
 * POST /api/spokedu-pro/billing/cancel
 * 구독 종료 예약 (cancel_at_period_end=true).
 * 현재 결제 기간이 끝나면 구독이 취소됨.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import stripe from '@/app/lib/stripe';

export async function POST() {
  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = getServiceSupabase();

  const { data: center } = await svc
    .from('spokedu_pro_centers')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!center) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

  const { data: sub } = await svc
    .from('spokedu_pro_subscriptions')
    .select('stripe_subscription_id, status')
    .eq('center_id', center.id)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  }

  if (sub.status === 'canceled') {
    return NextResponse.json({ error: 'Subscription already canceled' }, { status: 400 });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // DB 즉시 반영 (webhook이 늦을 경우 대비)
    await svc
      .from('spokedu_pro_subscriptions')
      .update({ cancel_at_period_end: true })
      .eq('center_id', center.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[billing/cancel]', e);
    return NextResponse.json({ error: 'Failed to schedule cancellation' }, { status: 500 });
  }
}
