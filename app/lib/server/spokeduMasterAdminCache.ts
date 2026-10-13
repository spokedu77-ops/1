type CacheEntry<T> = { expiresAt: number; value: Promise<T> };

const cache = new Map<string, CacheEntry<unknown>>();

export function invalidateSpokeduMasterAdminCache(...keys: string[]) {
  for (const key of keys) cache.delete(key);
}

export async function readSpokeduMasterAdminCache<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
  const now = Date.now();
  const current = cache.get(key) as CacheEntry<T> | undefined;
  if (current && current.expiresAt > now) return { value: await current.value, hit: true };

  const startedAt = performance.now();
  const value = loader();
  cache.set(key, { expiresAt: now + ttlMs, value });
  try {
    const resolved = await value;
    console.info('[spm-admin-perf]', { key, cache: 'miss', durationMs: Math.round(performance.now() - startedAt) });
    return { value: resolved, hit: false };
  } catch (error) {
    if (cache.get(key)?.value === value) cache.delete(key);
    throw error;
  }
}
