'use client';

import { useEffect, useRef } from 'react';

type ScreenWakeLockSentinel = {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
  removeEventListener: (type: 'release', listener: () => void) => void;
};

type ScreenWakeLock = {
  request: (type: 'screen') => Promise<ScreenWakeLockSentinel>;
};

function screenWakeLock(): ScreenWakeLock | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { wakeLock?: ScreenWakeLock }).wakeLock ?? null;
}

export function useSpomoveWakeLock(shouldHold: boolean) {
  const shouldHoldRef = useRef(shouldHold);
  const sentinelRef = useRef<ScreenWakeLockSentinel | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    shouldHoldRef.current = shouldHold;
    const generation = ++generationRef.current;
    let disposed = false;

    const releaseCurrent = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) void sentinel.release().catch(() => undefined);
    };

    const acquire = () => {
      const wakeLock = screenWakeLock();
      if (
        disposed ||
        !shouldHoldRef.current ||
        typeof document === 'undefined' ||
        document.visibilityState !== 'visible' ||
        !wakeLock ||
        sentinelRef.current ||
        requestRef.current
      ) return;

      const request = wakeLock.request('screen')
        .then((sentinel) => {
          if (
            disposed ||
            generation !== generationRef.current ||
            !shouldHoldRef.current ||
            document.visibilityState !== 'visible'
          ) {
            void sentinel.release().catch(() => undefined);
            return;
          }

          sentinelRef.current = sentinel;
          const onRelease = () => {
            sentinel.removeEventListener('release', onRelease);
            if (sentinelRef.current === sentinel) sentinelRef.current = null;
          };
          sentinel.addEventListener('release', onRelease);
        })
        .catch(() => undefined)
        .finally(() => {
          if (requestRef.current === request) requestRef.current = null;
        });
      requestRef.current = request;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    if (shouldHold) {
      document.addEventListener('visibilitychange', onVisibilityChange);
      acquire();
    } else {
      releaseCurrent();
    }

    return () => {
      disposed = true;
      generationRef.current += 1;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (!shouldHoldRef.current || !shouldHold) releaseCurrent();
    };
  }, [shouldHold]);

  useEffect(() => () => {
    shouldHoldRef.current = false;
    generationRef.current += 1;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    if (sentinel) void sentinel.release().catch(() => undefined);
  }, []);
}