import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './move-report.css';

async function getBaseUrlFromRequestHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;

  return 'https://example.com';
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrlFromRequestHeaders();
  const title = '스포키듀 MOVE 리포트 | 우리 아이 움직임 성향 분석';
  const description = '질문 12개로 우리 아이의 움직임 유형을 확인하고, 맞춤 활동 힌트까지 받아보세요.';
  const url = `${baseUrl}/move-report`;
  const imageUrl = `${baseUrl}/move-report/opengraph-image`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'SPOKEDU',
      locale: 'ko_KR',
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: '스포키듀 MOVE 리포트 미리보기',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function MoveReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;600;700;900&family=Bebas+Neue&family=DM+Serif+Display:ital@1&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />
      {children}
    </>
  );
}
