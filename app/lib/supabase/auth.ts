import type { SupabaseClient } from '@supabase/supabase-js';

function isRefreshTokenError(err: unknown): boolean {
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

/**
 * 현재 사용자를 가져옵니다.
 * Refresh Token이 무효한 경우(서버에 없음/만료) 세션을 지우고 로그인 페이지로 보냅니다.
 * Invalid Refresh Token 콘솔 에러를 방지하고 사용자가 다시 로그인할 수 있게 합니다.
 */
export async function getAuthUserOrRedirect(
  supabase: SupabaseClient
): Promise<{ id: string; email?: string } | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && isRefreshTokenError(error)) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return null;
    }
    if (error) return null;
    return user ? { id: user.id, email: user.email ?? undefined } : null;
  } catch (err) {
    if (isRefreshTokenError(err)) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return null;
    }
    throw err;
  }
}
