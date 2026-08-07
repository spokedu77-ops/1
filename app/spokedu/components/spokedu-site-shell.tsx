'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isSpokeduContactPath, isSpokeduHomePath, isSpomoveCatalogPath } from '../data/public-routes';
import { captureAcquisitionFromLocation } from '../lib/acquisition';
import { scrollSpokeduToTopOrHash } from '../lib/scroll';
import { SiteFooter, SiteHeader } from './site-chrome';

export function SpokeduSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isContactPage = isSpokeduContactPath(pathname);
  const isHomePage = isSpokeduHomePath(pathname);
  const isSpomoveCatalogPage = isSpomoveCatalogPath(pathname);
  /** Full-bleed pages own their header spacing and horizontal padding. */
  const isFullBleedPage = isHomePage || isSpomoveCatalogPage;

  useEffect(() => {
    // first-touch attribution — 랜딩 폼 마운트보다 먼저 고정
    captureAcquisitionFromLocation();
  }, []);

  useEffect(() => {
    const run = () => scrollSpokeduToTopOrHash();
    run();
    const frame = window.requestAnimationFrame(() => {
      run();
      window.requestAnimationFrame(run);
    });
    const timer = window.setTimeout(run, 50);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <>
      <SiteHeader />
      <main
        className={
          isFullBleedPage
            ? 'w-full max-w-none px-0 py-0'
            : 'mx-auto w-full max-w-6xl px-5 pb-5 pt-[calc(3.75rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pb-10 sm:pt-[calc(4.25rem+env(safe-area-inset-top,0px))]'
        }
      >
        {children}
      </main>
      {isContactPage || isSpomoveCatalogPage ? null : <SiteFooter />}
    </>
  );
}
