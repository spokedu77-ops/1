import { Suspense } from 'react';
import type { Metadata } from 'next';
import MoveReportSharedContent from './MoveReportSharedContent';
import { parseMoveReportSharePayload } from '../lib/shareLink';
import { getMoveReportMetadataBaseUrl } from '../lib/siteUrl';
import { P } from '../data/profiles';

/** 매 요청마다 Host 기준으로 og:url·og:image 절대 경로를 잡기 (크롤러 미리보기 깨짐 방지) */
export const dynamic = 'force-dynamic';

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
        const name = parsed.displayName || '우리 아이';
        return {
          name,
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
  return (
    <Suspense fallback={<SharedFallback />}>
      <MoveReportSharedContent />
    </Suspense>
  );
}
