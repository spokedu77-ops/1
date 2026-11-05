'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentProps } from 'react';

const handoffKeys = [
  'classType', 'operation', 'program', 'proposal', 'intent',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid',
] as const;

/** Carry existing selections to the real form without allowing its type to be overridden. */
export function consultationHref(href: string, search: string): string {
  const destination = new URL(href, 'https://spokedu.invalid');
  const current = new URLSearchParams(search);
  for (const key of handoffKeys) {
    const value = current.get(key);
    if (value && !destination.searchParams.has(key)) destination.searchParams.set(key, value);
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

export function ConsultationLink({ href, ...props }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  const [destination, setDestination] = useState(href);
  useEffect(() => { setDestination(consultationHref(href, window.location.search)); }, [href]);
  return <Link {...props} href={destination} />;
}
