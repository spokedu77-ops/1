import { NextResponse } from 'next/server';

import { hashForMonitoring, reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { applySpokeduMasterPayment } from '@/app/lib/server/spokeduMasterPaymentApply';
import {
  SPOKEDU_MASTER_PLAN_CONFIG,
  parseSpokeduMasterOrderId,
  validateSpokeduMasterPaymentOrder,
  type SpokeduMasterPaymentOrder,
} from '@/app/lib/server/spokeduMasterPayment';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

type ConfirmBody = {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
};

type TossConfirmResponse = {
  paymentKey?: string;
  orderId?: string;
  totalAmount?: number;
  approvedAt?: string | null;
};

function safePaymentError(status = 500) {
  return NextResponse.json(
    { error: '결제를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
    { status },
  );
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = await request.json() as ConfirmBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.paymentKey || !body.orderId || !body.amount) {
    return NextResponse.json({ error: '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' }, { status: 400 });
  }

  const plan = parseSpokeduMasterOrderId(body.orderId);
  if (!plan) {
    return NextResponse.json({ error: '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' }, { status: 400 });
  }

  const expectedAmount = SPOKEDU_MASTER_PLAN_CONFIG[plan].amount;
  if (!Number.isInteger(body.amount) || body.amount !== expectedAmount) {
    return NextResponse.json({ error: '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { data: order, error: orderLookupError } = await service
    .from('spokedu_master_payment_orders')
    .select('order_id,user_id,plan,amount,status,payment_key')
    .eq('order_id', body.orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (orderLookupError) {
    await reportError(orderLookupError, {
      context: 'spokedu_master.payment.confirm',
      tags: { provider: 'tosspayments', stage: 'order_lookup', status: 500 },
    });
    return safePaymentError(500);
  }

  if (!order) {
    return NextResponse.json({ error: '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' }, { status: 404 });
  }

  const orderValidation = validateSpokeduMasterPaymentOrder(
    order as SpokeduMasterPaymentOrder,
    {
      userId: user.id,
      orderId: body.orderId,
      paymentKey: body.paymentKey,
      plan,
      amount: body.amount,
    },
  );
  if (!orderValidation.ok) {
    return NextResponse.json(
      { error: orderValidation.status === 409 ? '이미 처리된 결제이거나 다시 사용할 수 없는 요청입니다.' : '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' },
      { status: orderValidation.status },
    );
  }

  const tossSecretKey = process.env.TOSS_SECRET_KEY;
  if (!tossSecretKey) {
    await reportError(new Error('TOSS_SECRET_KEY_NOT_CONFIGURED'), {
      context: 'spokedu_master.payment.confirm',
      tags: { provider: 'tosspayments', stage: 'configuration', plan, status: 503 },
    });
    return safePaymentError(503);
  }

  let tossRes: Response;
  try {
    tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${tossSecretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      }),
    });
  } catch (error) {
    await reportError(error, {
      context: 'spokedu_master.payment.confirm',
      tags: {
        provider: 'tosspayments',
        stage: 'toss_confirm_request',
        plan,
        status: 502,
        paymentHash: hashForMonitoring(body.paymentKey),
        orderHash: hashForMonitoring(body.orderId),
      },
    });
    return NextResponse.json({ error: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.' }, { status: 502 });
  }

  if (!tossRes.ok) {
    await reportError(new Error('Toss confirm rejected'), {
      context: 'spokedu_master.payment.confirm',
      tags: {
        provider: 'tosspayments',
        stage: 'toss_confirm_response',
        plan,
        status: tossRes.status,
        paymentHash: hashForMonitoring(body.paymentKey),
        orderHash: hashForMonitoring(body.orderId),
      },
    });
    return safePaymentError(400);
  }

  const payment = await tossRes.json() as TossConfirmResponse;
  if (
    payment.paymentKey !== body.paymentKey ||
    payment.orderId !== body.orderId ||
    (typeof payment.totalAmount === 'number' && payment.totalAmount !== expectedAmount)
  ) {
    return NextResponse.json({ error: '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' }, { status: 400 });
  }

  const applyResult = await applySpokeduMasterPayment({
    userId: user.id,
    orderId: body.orderId,
    paymentKey: body.paymentKey,
    plan,
    amount: expectedAmount,
    approvedAt: payment.approvedAt,
    eventKey: `confirm:${body.orderId}:${body.paymentKey}`,
    source: 'confirm',
  });

  if (!applyResult.ok) {
    if (applyResult.status >= 500) return safePaymentError(500);
    return NextResponse.json(
      { error: applyResult.status === 409 ? '이미 처리된 결제이거나 다시 사용할 수 없는 요청입니다.' : '결제 정보를 확인할 수 없습니다. 결제를 다시 시작해 주세요.' },
      { status: applyResult.status },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyConfirmed: applyResult.alreadyApplied,
    plan,
    periodEnd: applyResult.periodEnd,
  });
}
