const STORAGE_PREFIX = 'admin_memo_collapsed_v1:';

export function readCollapsedSectionKeys(pageId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${pageId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

export function writeCollapsedSectionKeys(pageId: string, keys: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${pageId}`, JSON.stringify([...keys]));
  } catch {
    // ignore
  }
}
