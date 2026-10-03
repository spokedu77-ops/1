'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackMasterFunnelEvent } from '../../lib/funnelEvents';

const CORE_PREFIXES = [
  '/spokedu-master/dashboard',
  '/spokedu-master/library',
  '/spokedu-master/classes',
  '/spokedu-master/manage',
  '/spokedu-master/class-tools',
  '/spokedu-master/spomove',
  '/spokedu-master/class-record',
  '/spokedu-master/report',
] as const;

export function MasterFunnelTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/spokedu-master/landing') {
      trackMasterFunnelEvent('landing_visit', { surface: 'landing' });
      return;
    }
    if (pathname === '/spokedu-master/payment') {
      trackMasterFunnelEvent('upgrade_intent', { surface: 'payment' });
      return;
    }
    if (CORE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      trackMasterFunnelEvent('core_use_daily', { surface: pathname.split('/')[2] || 'master' });
    }
  }, [pathname]);

  return null;
}
