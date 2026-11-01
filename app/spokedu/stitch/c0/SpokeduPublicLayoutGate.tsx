'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SpokeduMarketingLayout } from '../../components/spokedu-marketing-layout';
import { isStitchC0Enabled, isStitchC0Path } from './flags';

export function SpokeduPublicLayoutGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const stitch = isStitchC0Enabled() && isStitchC0Path(pathname);

  if (stitch) {
    return <div data-stitch-c0-shell="1">{children}</div>;
  }

  return <SpokeduMarketingLayout>{children}</SpokeduMarketingLayout>;
}
