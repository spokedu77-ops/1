'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { scrollSpokeduToTopOrHash } from '../lib/scroll';
import { SiteFooter, SiteHeader } from './site-chrome';


export function SpokeduSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isContactPage = pathname === '/spokedu/contact';
  const isHomePage = pathname === '/spokedu';

  // 공유 layout + fullscreen 스크롤 컨테이너라 경로 변경 시 이전 위치가 남음 → 맨 위로
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
          isHomePage
            ? 'w-full max-w-none px-0 py-0'
            : 'mx-auto w-full max-w-6xl px-5 pb-5 pt-[calc(3.75rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pb-10 sm:pt-[calc(4.25rem+env(safe-area-inset-top,0px))]'
        }
      >
        {children}
      </main>
      {isContactPage ? null : <SiteFooter />}
    </>
  );
}
