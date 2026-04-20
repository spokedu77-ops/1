/**
 * 학부모에게 보내는 공개 링크의 베이스 URL.
 * NEXT_PUBLIC_APP_URL이 있으면 항상 그 도메인을 쓰고, 없으면 현재 접속 origin (모바일마다 달라질 수 있음).
 */
export function getPublicAppOrigin(): string {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL?.trim() : '';
  if (raw) {
    const u = raw.replace(/\/$/, '');
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return `https://${u.replace(/^\/+/, '')}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}
