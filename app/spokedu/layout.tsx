import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from './components/site-chrome';
import { seoKeywords, seoMeta } from './data/content';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://spokedu.vercel.app'),
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
  },
};

export default function SpokeduSiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
