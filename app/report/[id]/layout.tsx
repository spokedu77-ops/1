import type { Metadata } from 'next';
import { headers } from 'next/headers';

async function getBaseUrlFromRequestHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return 'https://example.com';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const baseUrl = await getBaseUrlFromRequestHeaders();
  const title = 'SPOKEDU 리포트';
  const description = '오늘 우리 아이는 한 뼘 더 자랐습니다.';
  const imageUrl = `${baseUrl}/og/spokedu-report-logo.png`;
  const { id } = await params;
  const safeId = typeof id === 'string' ? encodeURIComponent(id) : '';
  const url = `${baseUrl}/report/${safeId}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: 'SPOKEDU',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'SPOKEDU Growth Report',
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

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}

