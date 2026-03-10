/**
 * POST /api/spokedu-pro/subscription/cancel
 * 현재 구독을 현재 결제 주기 말에 취소 (cancel_at_period_end).
 *
 * DB_READY=false: stub ok 반환 (UI 정상 동작)
 * DB_READY=true + STRIPE_SECRET_KEY: Stripe API 호출 후 DB 업데이트
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const STRIPE_API = 'https://api.stripe.com/v1';

export async function POST() {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!DB_READY) {
      // DB 마이그레이션 전: stub ok — UI 는 정상 동작
      return NextResponse.json({ ok: true, stub: true });
    }

    const supabase = getServiceSupabase();

    // 활성 센터 조회 (owner 우선)
    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    const centerId = ownedCenter?.id ?? null;
    if (!centerId) {
      return NextResponse.json({ error: '센터를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 구독 조회
    const { data: sub } = await supabase
      .from('spokedu_pro_subscriptions')
      .select('id, stripe_subscription_id, status, plan')
      .eq('center_id', centerId)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (sub.status === 'canceled') {
      return NextResponse.json({ error: '이미 취소된 구독입니다.' }, { status: 409 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // Stripe 연동 시 구독 취소
    if (stripeKey && sub.stripe_subscription_id) {
      const stripeRes = await fetch(
        `${STRIPE_API}/subscriptions/${sub.stripe_subscription_id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ cancel_at_period_end: 'true' }).toString(),
        }
      );
      if (!stripeRes.ok) {
        const err = await stripeRes.json().catch(() => ({}));
        console.error('[subscription/cancel] Stripe error', err);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
      }
    }

    // DB 상태 업데이트
    await supabase
      .from('spokedu_pro_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[subscription/cancel]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
