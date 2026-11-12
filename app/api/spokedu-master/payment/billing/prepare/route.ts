import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getBillingConfigurationError } from '@/app/lib/server/spokeduMasterBillingConfiguration';
import { BILLING_INTENT_COOKIE, BILLING_INTENT_MAX_AGE, createBillingIntent } from '@/app/lib/server/spokeduMasterBillingIntent';
import { isSpokeduMasterPaidPlan } from '@/app/lib/server/spokeduMasterPayment';
import { assertSpokeduMasterBillingProviderAccess } from '@/app/lib/server/spokeduMasterBillingProvider';
import { billingProviderDiagnostics } from '@/app/lib/server/spokeduMasterBillingDiagnostics';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const internalUrl = new URL(request.url);
  const publicHost = request.headers.get('host') ?? internalUrl.host;
  const publicProtocol = request.headers.get('x-forwarded-proto') === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
    ? 'https:' : internalUrl.protocol;
  // Next dev/reverse proxies may normalize request.url to localhost while the
  // actual browser uses 127.0.0.1 or a custom domain. Host is browser-controlled
  // by the network stack; do not trust an arbitrary x-forwarded-host override.
  if (origin !== `${publicProtocol}//${publicHost}`) {
    return NextResponse.json({ error: '결제 요청 출처가 올바르지 않습니다.', code: 'billing_origin_invalid', stage: 'prepare' }, { status: 403 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isSpokeduMasterPaidPlan(body?.planId)) return NextResponse.json({ error: '상품 정보가 올바르지 않습니다.' }, { status: 400 });
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? '';
  const code = getBillingConfigurationError();
  // Compare the build-time browser key to the server configuration. A stale
  // client bundle must not open auth with a different merchant/environment.
  const errorCode = code ?? (body.clientKey !== clientKey ? 'billing_client_bundle_mismatch' : null);
  if (errorCode) {
    await reportError(new Error(errorCode), { context: 'spokedu_master.billing.prepare', tags: { stage: 'configuration', code: errorCode } });
    return NextResponse.json({ error: '자동결제 설정을 확인해야 합니다. 운영자에게 문의해 주세요.', code: errorCode, stage: 'prepare' }, { status: 503 });
  }
  try {
    await assertSpokeduMasterBillingProviderAccess();
  } catch (error) {
    const diagnostics = billingProviderDiagnostics(error);
    await reportError(error, { context: 'spokedu_master.billing.prepare', tags: { stage: 'provider_access', ...diagnostics } });
    return NextResponse.json({ error: '결제 서버 연결을 확인하지 못했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.', code: diagnostics.providerCode, stage: 'provider_access' }, { status: 503 });
  }
  // Supabase user IDs are random UUIDs; retain the established provider mapping.
  const customerKey = `spm_${user.id.replaceAll('-', '')}`;
  const response = NextResponse.json({ customerKey }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(BILLING_INTENT_COOKIE, createBillingIntent({ userId: user.id, plan: body.planId, customerKey }), {
    httpOnly: true, secure: publicProtocol === 'https:', sameSite: 'lax', path: '/api/spokedu-master/payment/billing', maxAge: BILLING_INTENT_MAX_AGE,
  });
  return response;
}
