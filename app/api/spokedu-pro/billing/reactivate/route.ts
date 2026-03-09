/**
 * POST /api/spokedu-pro/billing/reactivate
 * 구독 종료 예약 취소 (cancel_at_period_end=false).
 * 종료 예약 상태에서만 호출 가능.
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
    .select('stripe_subscription_id, cancel_at_period_end')
    .eq('center_id', center.id)
    .maybeSingle();

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  if (!sub.cancel_at_period_end) {
    return NextResponse.json({ error: 'Subscription is not scheduled for cancellation' }, { status: 400 });
  }

  try {
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await svc
      .from('spokedu_pro_subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('center_id', center.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[billing/reactivate]', e);
    return NextResponse.json({ error: 'Failed to reactivate subscription' }, { status: 500 });
  }
}
