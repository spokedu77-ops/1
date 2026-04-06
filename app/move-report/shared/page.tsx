import { Suspense } from 'react';
import type { Metadata } from 'next';
import MoveReportSharedContent from './MoveReportSharedContent';
import { parseMoveReportSharePayload } from '../lib/shareLink';
import { P } from '../data/profiles';

type PageProps = {
  searchParams?: {
    d?: string;
  };
};

export function generateMetadata({ searchParams }: PageProps): Metadata {
  const raw = searchParams?.d ?? null;
  const parsed = parseMoveReportSharePayload(raw);
  const payload =
    !parsed || parsed.v !== 3
      ? parsed
      : (() => {
          const profile = P[parsed.profileKey];
          if (!profile) return null;
          return {
            ...parsed,
            v: 1 as const,
            profileName: profile.char,
          };
        })();

  const title = payload ? `${payload.name}의 MOVE 리포트 결과` : '공유된 MOVE 리포트 결과';
  const description = payload
    ? `${payload.profileName} 유형 결과를 확인하고, 나도 MOVE 리포트를 해보세요.`
    : '공유받은 MOVE 리포트 결과를 확인하고, 나도 테스트해보세요.';
  const ogImage = raw ? `/api/move-report/share-image?d=${encodeURIComponent(raw)}` : '/move-report/opengraph-image';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: '/move-report/shared',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'MOVE 리포트 공유 이미지' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
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
