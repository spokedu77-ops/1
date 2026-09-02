'use client';

import { useEffect, useState } from 'react';

export function useSpomoveGuideVideo(presetId: string | null) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl('');
    if (!presetId) return;
    const controller = new AbortController();
    void fetch(`/api/spokedu-master/spomove/guide-video?preset=${encodeURIComponent(presetId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() as Promise<{ data?: { url?: unknown } | null }> : null)
      .then((body) => {
        if (typeof body?.data?.url === 'string') setUrl(body.data.url);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [presetId]);

  return url;
}
