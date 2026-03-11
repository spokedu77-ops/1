/**
 * POST /api/spokedu-pro/subscription/upgrade
 * 포트원 V2 빌링키로 즉시 결제 후 다음 달 정기결제 예약.
 *
 * DB_READY=false → { ok: false, reason: 'db_not_ready' }
 * PORTONE_SECRET 미설정 → { ok: false, reason: 'portone_not_configured' }
 * 정상 → { ok: true }
 *
 * 요청 body: { plan: 'basic' | 'pro', billingKey: string }
 *
 * 환경변수:
 *   PORTONE_SECRET          — 포트원 V2 API 시크릿
 *   NEXT_PUBLIC_APP_URL     — 앱 기본 URL
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const PORTONE_API = 'https://api.portone.io';

type Plan = 'basic' | 'pro';

const PRICES: Record<Plan, number> = { basic: 49900, pro: 79900 };
const ORDER_NAMES: Record<Plan, string> = {
  basic: 'SPOKEDU PRO Basic 정기구독',
  pro: 'SPOKEDU PRO Pro 정기구독',
};

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!DB_READY) {
      return NextResponse.json({ ok: false, reason: 'db_not_ready' });
    }

    const portoneSecret = process.env.PORTONE_SECRET;
    if (!portoneSecret) {
      return NextResponse.json({ ok: false, reason: 'portone_not_configured' });
    }

    let body: { plan?: string; billingKey?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const plan = body.plan as Plan;
    if (!['basic', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'plan은 basic 또는 pro여야 합니다.' }, { status: 400 });
    }

    const billingKey = body.billingKey;
    if (!billingKey) {
      return NextResponse.json({ error: 'billingKey가 필요합니다.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 기존 센터 조회 또는 생성
    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    const centerId = ownedCenter?.id ?? null;
    if (!centerId) {
      return NextResponse.json({ error: '센터를 찾을 수 없습니다. 먼저 센터를 생성해주세요.' }, { status: 404 });
    }

    const priceKrw = PRICES[plan];
    const orderName = ORDER_NAMES[plan];
    const paymentId = `spokedu-${plan}-${Date.now()}`;
    const customerEmail = user.email ?? '';

    // 즉시 결제 (첫 달)
    const payRes = await fetch(`${PORTONE_API}/payments/${paymentId}/billing-key`, {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${portoneSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billingKey,
        orderName,
        amount: { total: priceKrw },
        currency: 'KRW',
        customer: { email: customerEmail },
        customData: { centerId, userId: user.id, plan },
      }),
    });

    if (!payRes.ok) {
      const err = await payRes.json().catch(() => ({}));
      console.error('[subscription/upgrade] 포트원 결제 오류', err);
      return NextResponse.json({ error: '결제 처리에 실패했습니다.' }, { status: 500 });
    }

    // 다음 달 결제 예약
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const nextPaymentId = `spokedu-${plan}-${Date.now() + 1}`;

    await fetch(`${PORTONE_API}/payments/${nextPaymentId}/schedule`, {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${portoneSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment: {
          billingKey,
          orderName,
          amount: { total: priceKrw },
          currency: 'KRW',
          customer: { email: customerEmail },
          customData: { centerId, userId: user.id, plan },
        },
        timeToPay: periodEnd.toISOString(),
      }),
    });

    // DB 업데이트
    await supabase
      .from('spokedu_pro_subscriptions')
      .upsert(
        {
          center_id: centerId,
          plan,
          status: 'active',
          portone_billing_key: billingKey,
          portone_customer_id: user.id,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          canceled_at: null,
          updated_at: now.toISOString(),
        },
        { onConflict: 'center_id' }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[subscription/upgrade]', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
