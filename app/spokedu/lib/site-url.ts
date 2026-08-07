/**
 * OG/canonical 절대 URL 기준.
 * 공식 public domain은 `NEXT_PUBLIC_SITE_URL` (https://spokedu.kr).
 * Production에서 env 누락 시에도 canonical이 vercel.app로 떨어지지 않게 한다.
 */
export function getSpokeduSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://spokedu.kr';
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }
  return 'http://localhost:3000';
}
