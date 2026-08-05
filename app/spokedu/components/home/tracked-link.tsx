'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { externalLinkProps, isExternalHref } from '../../lib/external-link';
import { trackCommercialEvent } from '../../lib/commercial-events';
import { inferTrackFromHref } from '../../lib/tracking';

type TrackedLinkProps = {
  href: string;
  trackLabel: string;
  children: ReactNode;
  className?: string;
  /** 상업 CTA 클릭 시 primary_cta_clicked */
  commercialRoute?: 'private' | 'curriculum' | 'dispatch';
  ctaIntentId?: string;
  selectionId?: string;
  evidenceSlug?: string;
};

function emitCommercialClick(props: TrackedLinkProps) {
  if (!props.commercialRoute || !props.ctaIntentId) return;
  trackCommercialEvent({
    name: 'primary_cta_clicked',
    route: props.commercialRoute,
    ctaIntentId: props.ctaIntentId,
    selectionId: props.selectionId,
    evidenceSlug: props.evidenceSlug,
  });
}

export function TrackedLink({
  href,
  trackLabel,
  children,
  className,
  commercialRoute,
  ctaIntentId,
  selectionId,
  evidenceSlug,
}: TrackedLinkProps) {
  const onClick = () =>
    emitCommercialClick({ href, trackLabel, children, commercialRoute, ctaIntentId, selectionId, evidenceSlug });

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        data-track-label={trackLabel}
        className={className}
        onClick={onClick}
        {...externalLinkProps}
      >
        {children}
      </a>
    );
  }

  if (href.startsWith('#')) {
    return (
      <a href={href} data-track-label={trackLabel} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      data-track={inferTrackFromHref(href)}
      data-track-label={trackLabel}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
