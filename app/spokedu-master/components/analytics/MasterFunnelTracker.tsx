'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackMasterFunnelEvent } from '../../lib/funnelEvents';

const CORE_PREFIXES = [
  '/spokedu-lab/dashboard',
  '/spokedu-lab/library',
  '/spokedu-lab/classes',
  '/spokedu-lab/manage',
  '/spokedu-lab/class-tools',
  '/spokedu-lab/spomove',
  '/spokedu-lab/class-record',
  '/spokedu-lab/report',
] as const;

export function MasterFunnelTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const canonicalPathname = pathname.replace(/^\/spokedu-master(?=\/|$)/, '/spokedu-lab');
    if (canonicalPathname === '/spokedu-lab/landing') {
      trackMasterFunnelEvent('landing_visit', { surface: 'landing' });
      return;
    }
    if (canonicalPathname === '/spokedu-lab/payment') {
      trackMasterFunnelEvent('upgrade_intent', { surface: 'payment' });
      return;
    }
    if (CORE_PREFIXES.some((prefix) => canonicalPathname.startsWith(prefix))) {
      trackMasterFunnelEvent('core_use_daily', { surface: canonicalPathname.split('/')[2] || 'lab' });
    }
  }, [pathname]);

  return null;
}
