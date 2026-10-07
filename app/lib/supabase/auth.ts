/** 로그인 페이지 등에서 세션 에러가 리프레시 토큰 문제인지 판별할 때 사용 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';

export function isRefreshTokenError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const msg = typeof (err as { message?: string }).message === 'string'
    ? (err as { message: string }).message
    : '';
  const name = (err as { name?: string }).name ?? '';
  return (
    /refresh\s*token|refresh_token/i.test(msg) ||
    name === 'AuthApiError'
  );
}

/** Read the browser session and clear stale local auth state after refresh rejection. */
export async function getSessionWithRefreshRecovery(
  supabase: SupabaseClient,
): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error) return data.session;
    if (!isRefreshTokenError(error)) throw error;
  } catch (error) {
    if (!isRefreshTokenError(error)) throw error;
  }

  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return null;
}
