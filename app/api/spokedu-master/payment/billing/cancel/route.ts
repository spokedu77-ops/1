import { NextResponse } from 'next/server';

import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { deleteSpokeduMasterBillingKey } from '@/app/lib/server/spokeduMasterBillingKeyVault';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

const NON_BILLING_CANCEL_MESSAGE = '자동결제 해지 대상이 아닙니다. 고객센터로 문의해 주세요.';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (await isPlatformAdminUser(user, supabase)) {
    return NextResponse.json({ error: NON_BILLING_CANCEL_MESSAGE }, { status: 422 });
  }

  const service = getServiceSupabase();
  const { data: subscription, error: lookupError } = await service
    .from('spokedu_master_subscriptions')
    .select('current_period_end,period_end,provider_billing_key_secret_id,cancel_at_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (lookupError) {
    await reportError(lookupError, {
      context: 'spokedu_master.billing.cancel',
      tags: { provider: 'tosspayments', stage: 'subscription_lookup', status: 500 },
    });
    return NextResponse.json({ error: '해지 예약에 실패했습니다.' }, { status: 500 });
  }

  if (!subscription) {
    return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 });
  }

  const row = subscription as {
    current_period_end?: string | null;
    period_end?: string | null;
    provider_billing_key_secret_id?: string | null;
    cancel_at_period_end?: boolean | null;
  };

  if (row.cancel_at_period_end) {
    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: true,
      periodEnd: row.current_period_end ?? row.period_end ?? null,
    });
  }

  if (!row.provider_billing_key_secret_id) {
    return NextResponse.json({ error: NON_BILLING_CANCEL_MESSAGE }, { status: 422 });
  }

  const { error } = await service
    .from('spokedu_master_subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('provider_billing_key_secret_id', row.provider_billing_key_secret_id);

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.cancel',
      tags: { provider: 'tosspayments', stage: 'subscription_update', status: 500 },
    });
    return NextResponse.json({ error: '해지 예약에 실패했습니다.' }, { status: 500 });
  }

  const deleted = await deleteSpokeduMasterBillingKey({
    userId: user.id,
    secretId: row.provider_billing_key_secret_id,
  });
  if (!deleted) {
    await reportError(new Error('billing_key_secret_delete_failed'), {
      context: 'spokedu_master.billing.cancel',
      tags: { provider: 'supabase_vault', stage: 'secret_delete', status: 500 },
    });
  }

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: true,
    periodEnd: row.current_period_end ?? row.period_end ?? null,
  });
}
