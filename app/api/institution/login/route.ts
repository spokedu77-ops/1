import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  getInstitutionAccountByLoginId,
  INSTITUTION_LAB_DESTINATION,
} from '@/app/lib/server/institutionAccount';
import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import {
  ensureSpokeduMasterEntitlement,
  getActiveSpokeduMasterEntitlementGrant,
} from '@/app/lib/server/spokeduMasterAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const INVALID_CREDENTIALS = '기관 계정 또는 비밀번호를 확인해 주세요.';

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: INVALID_CREDENTIALS }, 400);
  }

  const input = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const loginId = typeof input.loginId === 'string' ? input.loginId : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!loginId.trim() || !password || password.length > 256) {
    return json({ ok: false, error: INVALID_CREDENTIALS }, 400);
  }

  const service = getServiceSupabase();
  const { row: institution, error: lookupError } = await getInstitutionAccountByLoginId(
    service,
    loginId,
  );
  if (lookupError || !institution) {
    return json({ ok: false, error: INVALID_CREDENTIALS }, 401);
  }

  const { data: authUserData, error: authUserError } = await service.auth.admin.getUserById(
    institution.user_id,
  );
  const internalEmail = authUserData.user?.email;
  if (authUserError || !internalEmail) {
    return json({ ok: false, error: INVALID_CREDENTIALS }, 401);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });
  if (error || !data.user || data.user.id !== institution.user_id) {
    if (data.session) await supabase.auth.signOut({ scope: 'local' });
    return json({ ok: false, error: INVALID_CREDENTIALS }, 401);
  }

  const [{ error: subscriptionError }, { error: grantError }] = await Promise.all([
    ensureSpokeduMasterEntitlement(service, institution.user_id),
    getActiveSpokeduMasterEntitlementGrant(service, institution.user_id),
  ]);
  if (subscriptionError || grantError) {
    await supabase.auth.signOut({ scope: 'local' });
    return json({ ok: false, error: '이용 권한을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  }

  return json({ ok: true, destination: INSTITUTION_LAB_DESTINATION });
}
