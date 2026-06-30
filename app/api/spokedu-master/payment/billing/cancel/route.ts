import { NextResponse } from 'next/server';

import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase, isPlatformAdminUser } from '@/app/lib/server/adminAuth';
import { deleteSpokeduMasterBillingKey } from '@/app/lib/server/spokeduMasterBillingKeyVault';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (await isPlatformAdminUser(user, supabase)) {
    return NextResponse.json({ error: '관리자 권한은 해지할 수 없습니다.' }, { status: 409 });
  }

  const service = getServiceSupabase();
  const { data, error } = await service
    .from('spokedu_master_subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'active')
    .select('current_period_end,period_end,provider_billing_key_secret_id')
    .maybeSingle();

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.billing.cancel',
      tags: { provider: 'tosspayments', stage: 'subscription_update', status: 500 },
    });
    return NextResponse.json({ error: '해지 예약에 실패했습니다.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: '활성 구독이 없습니다.' }, { status: 404 });
  }

  const row = data as {
    current_period_end?: string | null;
    period_end?: string | null;
    provider_billing_key_secret_id?: string | null;
  };
  if (row.provider_billing_key_secret_id) {
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
  }

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: true,
    periodEnd: row.current_period_end ?? row.period_end ?? null,
  });
}
