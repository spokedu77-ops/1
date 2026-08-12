import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import Script from 'next/script';
import { SpokeduSiteShell } from './spokedu-site-shell';
import SpokeduTrackingProvider from './tracking-provider';
import { seoKeywords, seoMeta } from '../data/content';
import { SPOKEDU_IMAGES } from '../data/images';
import { SPOKEDU_PATHS } from '../data/public-routes';
import { getSpokeduSiteUrl } from '../lib/site-url';
import {
  brandBlue,
  brandBlueHover,
  brandBody,
  brandBorder,
  brandDarkBody,
  brandDarkEyebrow,
  brandInk,
  brandMuted,
  brandNavy,
  brandPaper,
  brandSurface,
  brandWhite,
} from '../lib/ui-classes';

const spokeduMarketingTokens = {
  '--spokedu-marketing-color-navy': brandNavy,
  '--spokedu-marketing-color-blue': brandBlue,
  '--spokedu-marketing-color-blue-hover': brandBlueHover,
  '--spokedu-marketing-color-soft': brandSurface,
  '--spokedu-marketing-color-paper': brandPaper,
  '--spokedu-marketing-color-ink': brandInk,
  '--spokedu-marketing-color-body': brandBody,
  '--spokedu-marketing-color-muted': brandMuted,
  '--spokedu-marketing-color-border': brandBorder,
  '--spokedu-marketing-color-white': brandWhite,
  '--spokedu-marketing-color-dark-body': brandDarkBody,
  '--spokedu-marketing-color-dark-eyebrow': brandDarkEyebrow,
} as CSSProperties;

/** Clean public + legacy `/spokedu` 공유 레이아웃 메타 */
export const spokeduMarketingMetadata: Metadata = {
  metadataBase: new URL(getSpokeduSiteUrl()),
  title: {
    default: seoMeta.home.title,
    template: '%s',
  },
  description: seoMeta.home.description,
  keywords: [...seoKeywords.home],
  verification: {
    other: {
      'naver-site-verification': 'ff169900d6c9a7dd4a127d1bb3384acaf94cb85d',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'SPOKEDU',
    title: seoMeta.home.title,
    description: seoMeta.home.description,
    url: SPOKEDU_PATHS.home,
    images: [
      {
        url: SPOKEDU_IMAGES.home.hero.src,
        width: 1920,
        height: 1280,
        alt: SPOKEDU_IMAGES.home.hero.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoMeta.home.title,
    description: seoMeta.home.description,
    images: [SPOKEDU_IMAGES.home.hero.src],
  },
};

export function SpokeduMarketingLayout({ children }: { children: ReactNode }) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <div
      className="spokedu-marketing min-h-screen bg-[#F5F7FB] antialiased"
      style={spokeduMarketingTokens}
    >
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      />
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
      <SpokeduSiteShell>{children}</SpokeduSiteShell>
    </div>
  );
}
