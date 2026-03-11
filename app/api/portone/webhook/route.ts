/**
 * POST /api/portone/webhook
 * 포트원 V2 웹훅 수신 → 구독 상태 DB 동기화.
 *
 * 처리 이벤트:
 *   Transaction.Paid      → status='active', 기간 갱신, 다음 달 결제 예약
 *   Transaction.Failed    → status='past_due'
 *   Transaction.Cancelled → status='canceled'
 *   Schedule.Succeeded    → status='active', 기간 갱신, 다음 달 재예약
 *   Schedule.Failed       → status='past_due'
 *
 * 환경변수:
 *   PORTONE_SECRET          — 포트원 V2 API 시크릿
 *   PORTONE_WEBHOOK_SECRET  — 웹훅 서명 검증 시크릿
 *   SPOKEDU_PRO_DB_READY    — true인 경우에만 DB 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';

const PORTONE_API = 'https://api.portone.io';

const PRICES: Record<string, number> = { basic: 49900, pro: 79900 };
const ORDER_NAMES: Record<string, string> = {
  basic: 'SPOKEDU PRO Basic 정기구독',
  pro: 'SPOKEDU PRO Pro 정기구독',
};

// 포트원 V2 웹훅 서명 검증 (HMAC-SHA256)
async function verifyPortOneSignature(
  payload: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string
): Promise<boolean> {
  try {
    const signedContent = `${webhookId}.${webhookTimestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent));
    const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

    // 포트원은 쉼표 구분된 복수 서명 중 하나와 일치하면 유효
    return webhookSignature.split(',').some((sig) => sig.trim() === computed);
  } catch {
    return false;
  }
}

// 포트원 결제 상세 조회
async function fetchPayment(paymentId: string, secret: string) {
  const res = await fetch(`${PORTONE_API}/payments/${paymentId}`, {
    headers: { Authorization: `PortOne ${secret}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// 다음 달 정기결제 예약
async function scheduleNextPayment(params: {
  billingKey: string;
  plan: string;
  customerEmail: string;
  currentPeriodEnd: string;
  secret: string;
}) {
  const { billingKey, plan, customerEmail, currentPeriodEnd, secret } = params;
  const priceKrw = PRICES[plan] ?? PRICES.basic;
  const orderName = ORDER_NAMES[plan] ?? ORDER_NAMES.basic;

  const nextPaymentId = `spokedu-${plan}-${Date.now()}`;
  const nextDate = new Date(currentPeriodEnd);
  nextDate.setMonth(nextDate.getMonth() + 1);
  const timeToPay = nextDate.toISOString();

  await fetch(`${PORTONE_API}/payments/${nextPaymentId}/schedule`, {
    method: 'POST',
    headers: {
      Authorization: `PortOne ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      payment: {
        billingKey,
        orderName,
        amount: { total: priceKrw },
        currency: 'KRW',
        customer: { email: customerEmail },
      },
      timeToPay,
    }),
  });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  const portoneSecret = process.env.PORTONE_SECRET;
  const dbReady = process.env.SPOKEDU_PRO_DB_READY === 'true';

  if (!dbReady) {
    return NextResponse.json({ received: true, note: 'db_not_ready' });
  }

  if (!webhookSecret || !portoneSecret) {
    console.error('[portone/webhook] PORTONE_WEBHOOK_SECRET 또는 PORTONE_SECRET 미설정');
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  const payload = await req.text();
  const webhookId = req.headers.get('webhook-id') ?? '';
  const webhookTimestamp = req.headers.get('webhook-timestamp') ?? '';
  const webhookSignature = req.headers.get('webhook-signature') ?? '';

  const valid = await verifyPortOneSignature(
    payload, webhookId, webhookTimestamp, webhookSignature, webhookSecret
  );
  if (!valid) {
    console.warn('[portone/webhook] 서명 검증 실패');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case 'Transaction.Paid': {
        const paymentId = event.data['paymentId'] as string;
        if (!paymentId) break;

        const payment = await fetchPayment(paymentId, portoneSecret);
        if (!payment) break;

        const centerId = payment.customData?.centerId as string | undefined;
        const plan = payment.customData?.plan as string | undefined;
        const billingKey = payment.billingKey as string | undefined;
        const customerEmail = payment.customer?.email as string | undefined;

        if (!centerId) break;

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            plan: plan ?? 'basic',
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            canceled_at: null,
            updated_at: now.toISOString(),
          })
          .eq('center_id', centerId);

        // 다음 달 결제 예약
        if (billingKey && plan && customerEmail) {
          await scheduleNextPayment({
            billingKey,
            plan,
            customerEmail,
            currentPeriodEnd: periodEnd.toISOString(),
            secret: portoneSecret,
          });
        }
        break;
      }

      case 'Transaction.Failed': {
        const paymentId = event.data['paymentId'] as string;
        if (!paymentId) break;

        const payment = await fetchPayment(paymentId, portoneSecret);
        const centerId = payment?.customData?.centerId as string | undefined;
        if (!centerId) break;

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('center_id', centerId);
        break;
      }

      case 'Transaction.Cancelled': {
        const paymentId = event.data['paymentId'] as string;
        if (!paymentId) break;

        const payment = await fetchPayment(paymentId, portoneSecret);
        const centerId = payment?.customData?.centerId as string | undefined;
        if (!centerId) break;

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('center_id', centerId);
        break;
      }

      case 'Schedule.Succeeded': {
        const paymentId = event.data['paymentId'] as string;
        if (!paymentId) break;

        const payment = await fetchPayment(paymentId, portoneSecret);
        if (!payment) break;

        const centerId = payment.customData?.centerId as string | undefined;
        const plan = payment.customData?.plan as string | undefined;
        const billingKey = payment.billingKey as string | undefined;
        const customerEmail = payment.customer?.email as string | undefined;

        if (!centerId) break;

        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            canceled_at: null,
            updated_at: now.toISOString(),
          })
          .eq('center_id', centerId);

        // 다음 달 재예약 (정기구독 루프 유지)
        if (billingKey && plan && customerEmail) {
          await scheduleNextPayment({
            billingKey,
            plan,
            customerEmail,
            currentPeriodEnd: periodEnd.toISOString(),
            secret: portoneSecret,
          });
        }
        break;
      }

      case 'Schedule.Failed': {
        const billingKey = event.data['billingKey'] as string | undefined;
        if (!billingKey) break;

        await supabase
          .from('spokedu_pro_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('portone_billing_key', billingKey);
        break;
      }

      default:
        // 처리하지 않는 이벤트 — 정상 응답으로 재시도 방지
        break;
    }
  } catch (err) {
    console.error(`[portone/webhook] 이벤트 처리 오류 (${event.type})`, err);
    return NextResponse.json({ error: 'processing_error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
