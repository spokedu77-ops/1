import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  parseSpokeduMasterOrderId,
} from '@/app/lib/server/spokeduMasterPayment';

export async function POST(request: Request) {
  const tossSecretKey = process.env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    return NextResponse.json({ error: '결제 설정 오류' }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.paymentKey || !body.orderId || !body.amount) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const plan = parseSpokeduMasterOrderId(body.orderId);
  if (!plan) {
    return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
  }

  const expectedAmount = SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
  if (!Number.isInteger(body.amount) || body.amount !== expectedAmount) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const credentials = Buffer.from(`${tossSecretKey}:`).toString('base64');
  const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount,
    }),
  });

  if (!tossRes.ok) {
    const err = await tossRes.json() as { message?: string };
    return NextResponse.json({ error: err.message ?? '결제 확인 실패' }, { status: 400 });
  }

  const payment = await tossRes.json() as { paymentKey: string; orderId: string; totalAmount?: number };
  if (payment.orderId !== body.orderId || (typeof payment.totalAmount === 'number' && payment.totalAmount !== expectedAmount)) {
    return NextResponse.json({ error: 'Payment verification mismatch' }, { status: 400 });
  }

  // orderId 형식: spm-{plan}-{timestamp}
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const service = getServiceSupabase();
  await service.from('spokedu_master_subscriptions').upsert(
    {
      user_id: user.id,
      plan,
      status: 'active',
      pg_provider: 'tosspayments',
      toss_payment_key: payment.paymentKey,
      toss_order_id: payment.orderId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    },
    { onConflict: 'user_id' },
  );

  return NextResponse.json({ ok: true, plan });
}
