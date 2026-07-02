'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { externalLinkProps, isExternalHref } from '../../lib/external-link';
import { inferTrackFromHref } from '../../lib/tracking';

type TrackedLinkProps = {
  href: string;
  trackLabel: string;
  children: ReactNode;
  className?: string;
};

export function TrackedLink({ href, trackLabel, children, className }: TrackedLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a href={href} data-track-label={trackLabel} className={className} {...externalLinkProps}>
        {children}
      </a>
    );
  }

  if (href.startsWith('#')) {
    return (
      <a href={href} data-track-label={trackLabel} className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} data-track={inferTrackFromHref(href)} data-track-label={trackLabel} className={className}>
      {children}
    </Link>
  );
}
