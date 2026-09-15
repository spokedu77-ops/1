import { privateNoStoreJson } from '@/app/lib/server/privateNoStore';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { calculateSpokeduMasterLiteUpgradeQuote } from '@/app/lib/server/spokeduMasterProration';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return privateNoStoreJson({ error: '로그인이 필요합니다.' }, { status: 401 });

  const { data, error } = await getServiceSupabase()
    .from('spokedu_master_subscriptions')
    .select('plan,status,current_period_start,current_period_end,period_start,period_end,provider_customer_key,provider_billing_key_secret_id,cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return privateNoStoreJson({ error: '업그레이드 정보를 확인하지 못했습니다.' }, { status: 500 });
  if (!data || data.plan !== 'lite' || data.status !== 'active' || data.cancel_at_period_end === true) {
    return privateNoStoreJson({ error: '현재 이용권은 즉시 업그레이드할 수 없습니다.' }, { status: 409 });
  }
  if (!data.provider_customer_key || !data.provider_billing_key_secret_id) {
    return privateNoStoreJson({ error: '기존 자동결제 수단을 확인할 수 없습니다.' }, { status: 409 });
  }
  const quote = calculateSpokeduMasterLiteUpgradeQuote({
    periodStart: data.current_period_start ?? data.period_start,
    periodEnd: data.current_period_end ?? data.period_end,
  });
  if (!quote) return privateNoStoreJson({ error: '현재 결제 기간을 확인할 수 없습니다.' }, { status: 409 });
  return privateNoStoreJson({ ok: true, ...quote });
}