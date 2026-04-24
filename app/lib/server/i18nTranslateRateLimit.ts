import type { NextRequest } from 'next/server';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 45;

const ipHits = new Map<string, number[]>();

function prune(tsList: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  return tsList.filter((t) => t > cutoff);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

/** true = 허용, false = 차단 */
export function allowI18nTranslateRequest(req: NextRequest): boolean {
  // 개발 환경(로컬)에서는 번역 호출이 한번에 몰릴 수 있어 429를 내지 않도록 완화
  if (process.env.NODE_ENV !== 'production') return true;
  const ip = getClientIp(req);
  if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    // 로컬/프록시 없음: 완화 (남용 시 CSP/배포 환경에서 보완)
    return true;
  }
  const now = Date.now();
  const prev = ipHits.get(ip) ?? [];
  const next = prune(prev, now);
  if (next.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  next.push(now);
  ipHits.set(ip, next);
  return true;
}
