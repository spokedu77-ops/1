'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteFooter, SiteHeader } from './site-chrome';

export function SpokeduSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isContactPage = pathname === '/spokedu/contact';
  const isHomePage = pathname === '/spokedu';

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
