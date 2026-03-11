/**
 * POST /api/spokedu-pro/subscription/cancel
 * 포트원 빌링키에 묶인 예약 정기결제를 취소.
 *
 * DB_READY=false: stub ok 반환 (UI 정상 동작)
 * DB_READY=true: 포트원 예약 취소 API 호출 후 DB 업데이트
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const DB_READY = process.env.SPOKEDU_PRO_DB_READY === 'true';
const PORTONE_API = 'https://api.portone.io';

export async function POST() {
  try {
    const serverSupabase = await createServerSupabaseClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!DB_READY) {
      return NextResponse.json({ ok: true, stub: true });
    }

    const supabase = getServiceSupabase();

    const { data: ownedCenter } = await supabase
      .from('spokedu_pro_centers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    const centerId = ownedCenter?.id ?? null;
    if (!centerId) {
      return NextResponse.json({ error: '센터를 찾을 수 없습니다.' }, { status: 404 });
    }

    const { data: sub } = await supabase
      .from('spokedu_pro_subscriptions')
      .select('id, portone_billing_key, status, plan')
      .eq('center_id', centerId)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    if (sub.status === 'canceled') {
      return NextResponse.json({ error: '이미 취소된 구독입니다.' }, { status: 409 });
    }

    const portoneSecret = process.env.PORTONE_SECRET;

    // 포트원 예약 정기결제 취소
    if (portoneSecret && sub.portone_billing_key) {
      const cancelRes = await fetch(`${PORTONE_API}/payment-schedules`, {
        method: 'DELETE',
        headers: {
          Authorization: `PortOne ${portoneSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billingKey: sub.portone_billing_key }),
      });

      if (!cancelRes.ok) {
        const err = await cancelRes.json().catch(() => ({}));
        console.error('[subscription/cancel] 포트원 예약 취소 오류', err);
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
