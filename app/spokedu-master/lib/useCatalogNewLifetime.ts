'use client';

import { useEffect, useState } from 'react';

export type CatalogNewTiming = { newRemainingMs?: number; newObservedAt?: number };

/** Expire an already-open card using server duration and monotonic browser time. */
export function useCatalogNewLifetime(timing?: CatalogNewTiming) {
  const remaining = timing?.newRemainingMs;
  const observed = timing?.newObservedAt;
  const [expiredFor, setExpiredFor] = useState<number | null>(null);
  useEffect(() => {
    if (remaining === undefined || observed === undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const left = remaining - (performance.now() - observed);
      if (left <= 0) setExpiredFor(observed);
      else timer = setTimeout(check, Math.min(2147483647, left + 1));
    };
    check();
    return () => clearTimeout(timer);
  }, [remaining, observed]);
  return observed === undefined || expiredFor !== observed;
}
