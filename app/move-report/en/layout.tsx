import type { Metadata } from 'next';
import { getMoveReportMetadataBaseUrl } from '../lib/siteUrl';

/** Host·환경 기준 절대 OG URL이 빌드/캐시에 localhost 등으로 박히지 않게 매 요청 계산 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getMoveReportMetadataBaseUrl();
  const title = 'SPOKEDU MOVE Report | Your Child’s Movement Style';
  const description =
    'A free 3-minute observation check: 12 parent questions, 16 movement styles, and practical tips for home and PE — not a medical test.';
  const url = `${baseUrl}/move-report/en`;
  const imageUrl = `${baseUrl}/move-report/opengraph-image`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'SPOKEDU',
      locale: 'en_US',
      title,
      description,
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'SPOKEDU MOVE Report preview',
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

export default function MoveReportEnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
