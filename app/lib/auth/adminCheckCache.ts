export const ADMIN_CHECK_CACHE_KEY = 'admin_check_cache_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

export type AdminCheckCache = {
  admin: boolean;
  ts: number;
  scope: 'admin' | 'spomove';
};

let memoryCache: AdminCheckCache | null = null;

function isAdminCheckCache(value: unknown): value is AdminCheckCache {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as { admin?: unknown; ts?: unknown; scope?: unknown };
  return typeof parsed.admin === 'boolean'
    && typeof parsed.ts === 'number'
    && (parsed.scope === 'admin' || parsed.scope === 'spomove');
}

export function readAdminCheckMemoryCache(now = Date.now()): AdminCheckCache | null {
  if (!memoryCache?.admin || now - memoryCache.ts >= CACHE_TTL_MS) return null;
  return memoryCache;
}

export function readAdminCheckStorageCache(now = Date.now()): AdminCheckCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ADMIN_CHECK_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isAdminCheckCache(parsed) || !parsed.admin || now - parsed.ts >= CACHE_TTL_MS) return null;
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminCheckCache(next: AdminCheckCache): void {
  memoryCache = next;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ADMIN_CHECK_CACHE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage can be blocked in private browsing or strict browser modes.
  }
}

export function clearAdminCheckCache(): void {
  memoryCache = null;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_CHECK_CACHE_KEY);
  } catch {
    // ignore
  }
}
