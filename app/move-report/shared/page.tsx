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
          catchcopy: profile.catchcopy,
        };
      })();

  const title = payload
    ? `${payload.name}의 MOVE REPORT · ${payload.profileName} 유형`
    : 'SPOKEDU MOVE REPORT — 공유 카드';
  const description = payload
    ? (() => {
        const line = `「${payload.profileName}」${payload.catchcopy}`.replace(/\s+/g, ' ').trim();
        const clipped = line.length > 118 ? `${line.slice(0, 115)}…` : line;
        return `${payload.name}의 움직임 성향 — ${clipped} 나도 MOVE REPORT를 시작해 보세요.`;
      })()
    : '공유받은 MOVE REPORT 카드를 열거나, 새로 테스트를 시작해 보세요.';
  const baseUrl = await getMoveReportMetadataBaseUrl();
  const pathWithQuery = raw ? `/move-report/shared?d=${encodeURIComponent(raw)}` : '/move-report/shared';
  /** 카카오 등 크롤러 안정성 + 기대 미리보기: 메인 MOVE와 동일한 정적 OG 이미지(소개 카드). 제목/설명만 결과 기준 개인화. */
  const ogImageAbsolute = `${baseUrl}/move-report/opengraph-image`;
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
      images: [{ url: ogImageAbsolute, width: 1200, height: 630, alt: 'SPOKEDU MOVE REPORT 미리보기' }],
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
    <main className="mr-page" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: '24px', color: '#a2a2a2', fontSize: 14, fontWeight: 700 }}>
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
