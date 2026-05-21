import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import { SiteFooter, SiteHeader } from './components/site-chrome';
import SpokeduTrackingProvider from './components/tracking-provider';
import { seoKeywords, seoMeta } from './data/content';
import { SPOKEDU_LIVE_PHOTOS } from './data/images';
import { getSpokeduSiteUrl } from './lib/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(getSpokeduSiteUrl()),
  title: {
    default: seoMeta.home.title,
    template: '%s',
  },
  description: seoMeta.home.description,
  keywords: [...seoKeywords.home],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SPOKEDU',
    title: seoMeta.home.title,
    description: seoMeta.home.description,
    url: '/spokedu',
    images: [
      {
        url: SPOKEDU_LIVE_PHOTOS.homeHero,
        width: 1200,
        height: 800,
        alt: '스포키듀 대표 수업 장면',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoMeta.home.title,
    description: seoMeta.home.description,
  },
};

export default function SpokeduSiteLayout({ children }: { children: ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <div className="min-h-screen bg-slate-50">
      <link rel="preconnect" href="https://i.postimg.cc" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://i.postimg.cc" />
      <link rel="preload" as="image" href={SPOKEDU_LIVE_PHOTOS.homeHero} />
      {gaMeasurementId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`} strategy="afterInteractive" />
          <Script
            id="spokedu-ga-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { page_path: window.location.pathname });
              `,
            }}
          />
        </>
      ) : null}
      <SpokeduTrackingProvider />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-3.5 py-5 sm:px-6 sm:py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
