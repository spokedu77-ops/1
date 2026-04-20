/**
 * Stripe 웹훅 관측: JSON 한 줄 로그(aggregator 파싱용) + 선택적 운영 알림 URL.
 */
export function logStripeWebhook(payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    service: 'stripe_webhook',
    at: new Date().toISOString(),
    ...payload,
  });
  const level = typeof payload.level === 'string' ? payload.level : 'info';
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/** 설정 시 JSON POST (Slack Incoming Webhook, 내부 게이트웨이 등). 실패해도 웹훅 응답에는 영향 없음. */
export async function notifyStripeWebhookOps(summary: string, detail: unknown): Promise<void> {
  const url = process.env.STRIPE_WEBHOOK_OPS_ALERT_URL?.trim();
  if (!url) return;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary, detail, at: new Date().toISOString() }),
      signal: ac.signal,
    });
    clearTimeout(t);
  } catch {
    /* ignore */
  }
}
