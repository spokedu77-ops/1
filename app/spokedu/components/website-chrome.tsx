'use client';

import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from './site-chrome';
import './website-chrome.css';

/** Shared public chrome approved in Phase D. Unverified address remains withheld. */
export function WebsiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="phase-d-preview" data-spokedu-website-chrome="true">
      <SiteHeader />
      {children}
      <SiteFooter omitUnverifiedAddress />
    </div>
  );
}
