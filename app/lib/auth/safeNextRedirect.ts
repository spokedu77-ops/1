/**
 * 로그인/회원가입 후 `next` 쿼리로 이동할 때 사용.
 * 동일 출처 상대 경로만 허용 (오픈 리다이렉트 방지).
 */
export function parseSafeNextRedirect(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return null;
  }
  if (!decoded) return null;
  if (decoded.length > 2048) return null;
  if (!decoded.startsWith('/')) return null;
  if (decoded.startsWith('//')) return null;
  if (/[\r\n\0]/.test(decoded)) return null;
  if (decoded.includes('\\')) return null;
  if (decoded.includes('://')) return null;
  return decoded;
}
