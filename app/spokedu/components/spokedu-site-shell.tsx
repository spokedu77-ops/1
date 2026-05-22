'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteFooter, SiteHeader } from './site-chrome';

export function SpokeduSiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isContactPage = pathname === '/spokedu/contact';

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-3.5 py-5 sm:px-6 sm:py-10">{children}</main>
      {isContactPage ? null : <SiteFooter />}
    </>
  );
}
