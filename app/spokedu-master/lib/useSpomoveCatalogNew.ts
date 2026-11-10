'use client';

import { useEffect, useState } from 'react';

/** Server durations + monotonic elapsed time; changing the device date cannot create NEW. */
export function useSpomoveCatalogNew() {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    const controller = new AbortController();
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    void fetch('/api/spokedu-master/spomove/catalog-new', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const body = await response.json() as { newForMs?: Record<string, number> };
        const durations = Object.entries(body.newForMs ?? {}).filter(([, ms]) => Number.isFinite(ms) && ms > 0);
        const refresh = () => {
          if (controller.signal.aborted) return;
          const elapsed = performance.now() - started;
          const active = durations.filter(([, ms]) => ms > elapsed);
          setIds(new Set(active.map(([id]) => id)));
          if (active.length) {
            // Timers larger than signed int32 overflow in browsers.
            expiryTimer = setTimeout(refresh, Math.min(2147483647, Math.min(...active.map(([, ms]) => ms - elapsed)) + 1));
          }
        };
        refresh();
      }).catch(() => { /* Existing cards remain usable without the optional badge. */ });
    return () => { controller.abort(); clearTimeout(expiryTimer); };
  }, []);
  return ids;
}
