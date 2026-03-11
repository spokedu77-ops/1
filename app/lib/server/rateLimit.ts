/**
 * 간단한 서버 사이드 Rate Limiter (인메모리).
 *
 * 참고: 서버리스 환경(Vercel)에서는 인스턴스 간 상태가 공유되지 않으므로
 * 엄밀한 글로벌 제한이 필요하면 Upstash Redis 기반으로 교체 권장.
 * 현재 구현은 단일 인스턴스 내 연속 요청 남용을 방지하는 1차 방어선.
 */

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const store = new Map<string, RateLimitEntry>();

// 오래된 항목 주기적 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10분
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.windowStart > CLEANUP_INTERVAL_MS) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * @param key      제한 기준 키 (예: `ai-report:${userId}`)
 * @param limit    windowMs 내 최대 허용 횟수
 * @param windowMs 시간 윈도우 (ms)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return { allowed: true };
  }

  const retryAfterMs = windowMs - (now - entry.windowStart);
  return { allowed: false, retryAfterMs };
}
