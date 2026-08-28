const STORAGE_KEY = 'admin_memo_recent_v1';
const MAX_RECENT = 5;

export function readRecentPageIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
  } catch {
    return [];
  }
}

export function rememberRecentPage(pageId: string): string[] {
  if (typeof window === 'undefined') return [];
  const prev = readRecentPageIds().filter((id) => id !== pageId);
  const next = [pageId, ...prev].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage blocked
  }
  return next;
}
