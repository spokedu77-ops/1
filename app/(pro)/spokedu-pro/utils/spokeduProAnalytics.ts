/**
 * 스포키듀 Pro 퍼널·제품 이벤트 (이름은 docs/spokedu-subscription-funnel-events.md 와 동일 유지).
 * - 개발: `console.debug`
 * - 프로덕션: `window.posthog.capture`가 있으면 전달(PostHog 스니펫으로 주입 시).
 * - 프로덕션: `NEXT_PUBLIC_SPOKEDU_ANALYTICS_INGEST_URL`이 있으면 JSON POST(keepalive, 실패 무시).
 */
type WindowWithPosthog = Window & { posthog?: { capture?: (n: string, p?: Record<string, unknown>) => void } };

export function trackSpokeduProEvent(name: string, payload?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console -- 의도적 디버그 채널
    console.debug('[spokedu-pro]', name, payload ?? {});
    return;
  }

  const w = window as WindowWithPosthog;
  if (typeof w.posthog?.capture === 'function') {
    try {
      w.posthog.capture(name, payload ?? {});
    } catch {
      /* ignore */
    }
  }

  const ingest = process.env.NEXT_PUBLIC_SPOKEDU_ANALYTICS_INGEST_URL?.trim();
  if (ingest) {
    const body = JSON.stringify({ name, payload: payload ?? {}, t: Date.now() });
    try {
      void fetch(ingest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}
