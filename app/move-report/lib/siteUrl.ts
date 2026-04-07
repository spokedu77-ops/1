import { headers } from 'next/headers';

/** OG·canonical용 절대 URL. 크롤러(Kakao 등)는 host 없는 상대 경로 미리보기에 실패하는 경우가 있어 요청 헤더·환경변수로 고정한다. */
export async function getMoveReportMetadataBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '')}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, '');

  return 'https://example.com';
}
