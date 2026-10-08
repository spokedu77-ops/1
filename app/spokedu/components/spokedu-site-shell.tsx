'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAcquisitionFromLocation } from '../lib/acquisition';
import { scrollSpokeduToTopOrHash } from '../lib/scroll';
import { SiteFooter, SiteHeader } from './site-chrome';

function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0B1F46] focus:shadow-md focus:outline focus:outline-2 focus:outline-[#245DFF]"
    >
      본문 바로가기
    </a>
  );
}

export function SpokeduSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLabLanding = pathname === '/spokedu-lab';

  useEffect(() => {
    captureAcquisitionFromLocation();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollSpokeduToTopOrHash);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <>
      <SkipToContent />
      {isLabLanding ? null : <SiteHeader />}
      <main id="main-content" className="w-full min-w-0">
        {children}
      </main>
      {isLabLanding ? null : <SiteFooter />}
    </>
  );
}
