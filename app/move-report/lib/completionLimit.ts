const LOCAL_KEY = 'mr_completions';

export function getMrCompletionCount(): number {
  if (typeof window === 'undefined') return 0;
  const raw = window.localStorage.getItem(LOCAL_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function incrementMrCompletionCount(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_KEY, String(getMrCompletionCount() + 1));
}
