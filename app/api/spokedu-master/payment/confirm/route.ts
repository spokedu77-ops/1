import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  parseSpokeduMasterOrderId,
} from '@/app/lib/server/spokeduMasterPayment';

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.paymentKey || !body.orderId || !body.amount) {
    return NextResponse.json({ error: '필수 결제 정보가 누락되었습니다.' }, { status: 400 });
  }

  const plan = parseSpokeduMasterOrderId(body.orderId);
  if (!plan) {
    return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
  }

  const expectedAmount = SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
  if (!Number.isInteger(body.amount) || body.amount !== expectedAmount) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const findExistingConfirmation = async () => {
    const { data, error } = await service
      .from('spokedu_master_subscriptions')
      .select('plan,status,period_end,toss_payment_key,toss_order_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    const periodEndMs = data.period_end ? Date.parse(data.period_end) : Number.NaN;
    if (
      data.plan !== plan ||
      data.status !== 'active' ||
      data.toss_order_id !== body.orderId ||
      data.toss_payment_key !== body.paymentKey ||
      !Number.isFinite(periodEndMs) ||
      periodEndMs <= Date.now()
    ) {
      return null;
    }

    return { periodEnd: data.period_end as string };
  };

  const idempotentResponse = (periodEnd: string) => NextResponse.json({
    ok: true,
    alreadyConfirmed: true,
    plan,
    periodEnd,
  });

  const existingConfirmation = await findExistingConfirmation();
  if (existingConfirmation) {
    return idempotentResponse(existingConfirmation.periodEnd);
  }

  const tossSecretKey = process.env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    return NextResponse.json({ error: '결제 설정 오류' }, { status: 503 });
  }

  const credentials = Buffer.from(`${tossSecretKey}:`).toString('base64');
  let tossRes: Response;
  try {
    tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
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
  } catch {
    const confirmedAfterNetworkFailure = await findExistingConfirmation();
    if (confirmedAfterNetworkFailure) {
      return idempotentResponse(confirmedAfterNetworkFailure.periodEnd);
    }
    return NextResponse.json({ error: 'Payment confirmation request failed' }, { status: 502 });
  }

  if (!tossRes.ok) {
    const confirmedAfterTossFailure = await findExistingConfirmation();
    if (confirmedAfterTossFailure) {
      return idempotentResponse(confirmedAfterTossFailure.periodEnd);
    }
    const err = await tossRes.json().catch(() => null) as { message?: string } | null;
    return NextResponse.json({ error: err?.message ?? '결제 확인 실패' }, { status: 400 });
  }

  const payment = await tossRes.json() as { paymentKey: string; orderId: string; totalAmount?: number };
  if (
    payment.paymentKey !== body.paymentKey ||
    payment.orderId !== body.orderId ||
    (typeof payment.totalAmount === 'number' && payment.totalAmount !== expectedAmount)
  ) {
    return NextResponse.json({ error: 'Payment verification mismatch' }, { status: 400 });
  }

  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const { error: subscriptionError } = await service.from('spokedu_master_subscriptions').upsert(
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

  if (subscriptionError) {
    const confirmedAfterUpsertFailure = await findExistingConfirmation();
    if (confirmedAfterUpsertFailure) {
      return idempotentResponse(confirmedAfterUpsertFailure.periodEnd);
    }
    return NextResponse.json({ error: '이용권 활성화에 실패했습니다. 고객센터로 문의해 주세요.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    alreadyConfirmed: false,
    plan,
    periodEnd: periodEnd.toISOString(),
  });
}
