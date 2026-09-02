'use client';

import { useEffect, useState } from 'react';

export type SpomoveGuideVideoState = 'idle' | 'loading' | 'ready' | 'locked' | 'missing' | 'error';

export function useSpomoveGuideVideo(presetId: string | null, enabled = true) {
  const [result, setResult] = useState<{ url: string; state: SpomoveGuideVideoState }>({ url: '', state: 'idle' });

  useEffect(() => {
    setResult({ url: '', state: presetId && !enabled ? 'locked' : presetId ? 'loading' : 'idle' });
    if (!presetId || !enabled) return;
    const controller = new AbortController();
    void fetch(`/api/spokedu-master/spomove/guide-video?preset=${encodeURIComponent(presetId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 403) return { state: 'locked' as const };
        if (response.status === 503) return { state: 'missing' as const };
        if (!response.ok) return { state: 'error' as const };
        const body = await response.json() as { data?: { url?: unknown } | null };
        return typeof body.data?.url === 'string'
          ? { state: 'ready' as const, url: body.data.url }
          : { state: 'missing' as const };
      })
      .then((body) => {
        if (!body) return;
        setResult({ url: 'url' in body && typeof body.url === 'string' ? body.url : '', state: body.state });
      })
      .catch((error: unknown) => {
        if ((error as { name?: unknown })?.name !== 'AbortError') setResult({ url: '', state: 'error' });
      });
    return () => controller.abort();
  }, [enabled, presetId]);

  return result;
}
