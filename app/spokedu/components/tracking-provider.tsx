'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

type SpokeduTrackPayload = {
  track: string;
  href: string | null;
  label: string;
  pagePath: string;
  timestamp: string;
};

export default function SpokeduTrackingProvider() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const trackedEl = target.closest<HTMLElement>('[data-track]');
      if (!trackedEl) return;

      const track = trackedEl.dataset.track;
      if (!track) return;

      const href =
        trackedEl.getAttribute('href') ||
        trackedEl.getAttribute('data-href') ||
        trackedEl.getAttribute('data-target-href');
      const label = trackedEl.getAttribute('data-track-label') || trackedEl.textContent?.trim() || '';

      const payload: SpokeduTrackPayload = {
        track,
        href,
        label,
        pagePath: window.location.pathname,
        timestamp: new Date().toISOString(),
      };

      // GTM/GA 연결 시 dataLayer 이벤트로 바로 활용 가능
      window.dataLayer?.push({
        event: 'spokedu_cta_click',
        ...payload,
      });

      // 앱 내부에서 후속 연동(로그 전송 등)을 쉽게 붙일 수 있도록 커스텀 이벤트 제공
      window.dispatchEvent(new CustomEvent('spokedu:cta-click', { detail: payload }));
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
