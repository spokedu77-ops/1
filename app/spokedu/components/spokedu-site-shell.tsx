'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SiteFooter, SiteHeader } from './site-chrome';

function scrollPageToTopOrHash() {
  if (typeof window === 'undefined') return;
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      // 앵커 이동(#contact 등)은 유지
      target.scrollIntoView({ block: 'start' });
      return;
    }
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export function SpokeduSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isContactPage = pathname === '/spokedu/contact';
  const isHomePage = pathname === '/spokedu';

  // 공유 layout이라 클라이언트 이동 시 이전 스크롤이 남는 경우가 있음 → 경로 바뀔 때 맨 위로
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollPageToTopOrHash();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <>
      <SiteHeader />
      <main
        className={
          isHomePage
            ? 'w-full max-w-none px-0 py-0'
            : 'mx-auto w-full max-w-6xl px-5 py-5 sm:px-8 sm:py-10'
        }
      >
        {children}
      </main>
      {isContactPage ? null : <SiteFooter />}
    </>
  );
}
