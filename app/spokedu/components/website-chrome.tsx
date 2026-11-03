'use client';

import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from './site-chrome';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { captureAcquisitionFromLocation } from '../lib/acquisition';
import { scrollSpokeduToTopOrHash } from '../lib/scroll';
import './website-chrome.css';

/** Shared public chrome approved in Phase D. Unverified address remains withheld. */
export function WebsiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => { captureAcquisitionFromLocation(); }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollSpokeduToTopOrHash);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);
  return (
    <div className="phase-d-preview" data-spokedu-website-chrome="true">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-white focus:p-4">본문 바로가기</a>
      <SiteHeader />
      <div className="website-content">{children}</div>
      <SiteFooter omitUnverifiedAddress />
    </div>
  );
}
