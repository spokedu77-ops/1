import { Suspense } from 'react';
import type { Metadata } from 'next';
import MoveReportSharedContent from '../../shared/MoveReportSharedContent';
import { getProfiles } from '../../data/catalog';
import { getMoveReportUi } from '../../i18n/ui';
import { parseMoveReportSharePayload } from '../../lib/shareLink';
import { getMoveReportMetadataBaseUrl } from '../../lib/siteUrl';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ d?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const d = params?.d;
  const raw = typeof d === 'string' ? d : Array.isArray(d) ? d[0] ?? null : null;
  const parsed = parseMoveReportSharePayload(raw);
  const profiles = getProfiles('en');
  const payload = !parsed
    ? null
    : (() => {
        const profile = profiles[parsed.profileKey];
        if (!profile) return null;
        const name = parsed.displayName || 'Your child';
        return {
          name,
          profileName: profile.char,
          catchcopy: profile.catchcopy,
        };
      })();

  const title = payload
    ? `${payload.name}'s MOVE REPORT · ${payload.profileName}`
    : 'SPOKEDU MOVE REPORT — Shared card';
  const description = payload
    ? (() => {
        const line = `"${payload.profileName}" — ${payload.catchcopy}`.replace(/\s+/g, ' ').trim();
        const clipped = line.length > 118 ? `${line.slice(0, 115)}…` : line;
        return `${payload.name}'s movement style — ${clipped} Try it for another friend.`;
      })()
    : 'Open a shared MOVE REPORT card, or start a new test.';
  const baseUrl = await getMoveReportMetadataBaseUrl();
  const pathWithQuery = raw
    ? `/move-report/en/shared?d=${encodeURIComponent(raw)}`
    : '/move-report/en/shared';
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
      locale: 'en_US',
      title,
      description,
      url: pageUrlAbsolute,
      images: [{ url: ogImageAbsolute, width: 1200, height: 630, alt: 'SPOKEDU MOVE REPORT preview' }],
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
  const loading = getMoveReportUi('en').shared.loading;
  return (
    <main
      className="mr-page"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100dvh',
        padding: '24px',
        color: '#a2a2a2',
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      {loading}
    </main>
  );
}

export default function MoveReportEnSharedPage() {
  return (
    <Suspense fallback={<SharedFallback />}>
      <MoveReportSharedContent locale="en" />
    </Suspense>
  );
}
