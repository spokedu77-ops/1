/** 로그인 페이지 등에서 세션 에러가 리프레시 토큰 문제인지 판별할 때 사용 */
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
