import { Suspense } from 'react';
import type { Metadata } from 'next';
import MoveReportSharedContent from './MoveReportSharedContent';
import { parseMoveReportSharePayload } from '../lib/shareLink';
import { getMoveReportMetadataBaseUrl } from '../lib/siteUrl';
import { P } from '../data/profiles';

type PageProps = {
  /** Next.js 15+ : searchParams는 Promise */
  searchParams?: Promise<{ d?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const d = params?.d;
  const raw = typeof d === 'string' ? d : Array.isArray(d) ? d[0] ?? null : null;
  const parsed = parseMoveReportSharePayload(raw);
  const payload = !parsed
    ? null
    : (() => {
        const profile = P[parsed.profileKey];
        if (!profile) return null;
        return {
          name: '우리 아이',
          profileName: profile.char,
        };
      })();

  const title = payload ? `${payload.name}의 MOVE 리포트 결과` : '공유된 MOVE 리포트 결과';
  const description = payload
    ? `${payload.profileName} 유형 결과를 확인하고, 나도 MOVE 리포트를 해보세요.`
    : '공유받은 MOVE 리포트 결과를 확인하고, 나도 테스트해보세요.';
  const baseUrl = await getMoveReportMetadataBaseUrl();
  const pathWithQuery = raw ? `/move-report/shared?d=${encodeURIComponent(raw)}` : '/move-report/shared';
  const ogImagePath = raw ? `/api/move-report/share-image?d=${encodeURIComponent(raw)}` : '/move-report/opengraph-image';
  const ogImageAbsolute = `${baseUrl}${ogImagePath}`;
  const pageUrlAbsolute = `${baseUrl}${pathWithQuery}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: {
      canonical: pathWithQuery,
    },
    openGraph: {
      type: 'website',
      siteName: 'SPOKEDU',
      locale: 'ko_KR',
      title,
      description,
      url: pageUrlAbsolute,
      images: [{ url: ogImageAbsolute, width: 1200, height: 630, alt: 'MOVE 리포트 공유 이미지' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageAbsolute],
    },
  };
}

function SharedFallback() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0D0D0D',
        color: '#A2A2A2',
        padding: '24px',
        display: 'grid',
        placeItems: 'center',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      불러오는 중…
    </main>
  );
}

export default function MoveReportSharedPage() {
  const title = '공유된 MOVE 리포트 결과';
  const description = '공유받은 MOVE 리포트 결과를 확인하고, 나도 테스트해보세요.';
  const image = '/move-report/opengraph-image';
  return (
    <>
      <head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SPOKEDU" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
      </head>
      <Suspense fallback={<SharedFallback />}>
        <MoveReportSharedContent />
      </Suspense>
    </>
  );
}
