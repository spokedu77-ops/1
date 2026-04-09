import { headers } from 'next/headers';

function stripUrl(s: string): string {
  return s.replace(/^https?:\/\//, '').replace(/\/$/, '').split(',')[0]?.trim() ?? s;
}

/**
 * OG·canonical·og:image 절대 URL.
 * 크롤러는 잘못된 도메인(예: example.com)이면 미리보기 이미지가 전부 깨진다.
 * 프로덕션: 요청 Host 또는 Vercel/배포 환경변수·NEXT_PUBLIC_APP_URL을 반드시 쓸 수 있게 순서를 잡는다.
 */
export async function getMoveReportMetadataBaseUrl(): Promise<string> {
  const h = await headers();
  const hostRaw = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const host = stripUrl(hostRaw);
  const proto = (h.get('x-forwarded-proto') ?? 'https').split(',')[0]?.trim() || 'https';
  if (host) return `${proto}://${host}`;

  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? stripUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    : '';
  if (prodHost) return `https://${prodHost}`;

  const vercelUrl = process.env.VERCEL_URL ? stripUrl(process.env.VERCEL_URL) : '';
  if (vercelUrl) return `https://${vercelUrl}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  if (appUrl) {
    if (appUrl.startsWith('http://') || appUrl.startsWith('https://')) return appUrl;
    return `https://${stripUrl(appUrl)}`;
  }

  // 로컬에서 메타만 맞출 때(카카오 미리보기는 공개 URL 필요)
  return 'http://localhost:3000';
}
