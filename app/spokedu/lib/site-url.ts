/**
 * OG/canonical 절대 URL 기준.
 * spokedu.com은 기본값으로 쓰지 않음 — Vercel/로컬에서만 결정.
 */
export function getSpokeduSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }
  return 'http://localhost:3000';
}
