export const ADMIN_CONSULT_PENDING_REFRESH = 'admin-consult-pending-refresh';

const CONSULT_COUNT_CACHE_MS = 90_000;
let consultCountCache: { count: number; at: number } | null = null;

export function notifyConsultPendingRefresh() {
  consultCountCache = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_CONSULT_PENDING_REFRESH));
  }
}

/** 미확인(pending) 상담 건수. 실패 시 null — 기존 뱃지 숫자를 유지할 때 사용 */
export async function loadConsultPendingCount(options?: { force?: boolean }): Promise<number | null> {
  const now = Date.now();
  if (!options?.force && consultCountCache && now - consultCountCache.at < CONSULT_COUNT_CACHE_MS) {
    return consultCountCache.count;
  }

  try {
    const res = await fetch('/api/admin/consult/summary', { credentials: 'include' });
    const json = (await res.json()) as { ok?: boolean; pendingCount?: number };
    if (json.ok && typeof json.pendingCount === 'number') {
      consultCountCache = { count: json.pendingCount, at: now };
      return json.pendingCount;
    }
  } catch {
    // 네트워크 오류 시 null 반환 — UI에서 기존 카운트 유지
  }
  return null;
}
