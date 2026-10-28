import { revalidateTag, unstable_cache } from 'next/cache';

export const SPOKEDU_MASTER_PROGRAMS_CACHE_TAG = 'spokedu-master-programs';

export const SPOKEDU_MASTER_PROGRAMS_CACHE_REVALIDATE_SECONDS = 60;

/** Route Handler invalidation — immediate expiry (not stale-while-revalidate). */
export const SPOKEDU_MASTER_PROGRAMS_CACHE_INVALIDATE_PROFILE = { expire: 0 } as const;

let sourceCacheGeneration = 0;
let boundLoader: (() => Promise<unknown>) | null = null;
let boundLoaderGeneration = -1;

export function getSpokeduMasterProgramSourceCacheGeneration() {
  return sourceCacheGeneration;
}

export function wrapSpokeduMasterProgramSourceLoader<T>(
  loader: () => Promise<T>,
): () => Promise<T> {
  return async () => {
    if (!boundLoader || boundLoaderGeneration !== sourceCacheGeneration) {
      boundLoaderGeneration = sourceCacheGeneration;
      boundLoader = unstable_cache(loader, [
        'spokedu-master-program-source-v1',
        String(sourceCacheGeneration),
      ], {
        revalidate: SPOKEDU_MASTER_PROGRAMS_CACHE_REVALIDATE_SECONDS,
        tags: [SPOKEDU_MASTER_PROGRAMS_CACHE_TAG],
      });
    }
    return boundLoader() as Promise<T>;
  };
}

export function invalidateSpokeduMasterProgramSourceCache() {
  sourceCacheGeneration += 1;
  boundLoader = null;
  revalidateTag(SPOKEDU_MASTER_PROGRAMS_CACHE_TAG, SPOKEDU_MASTER_PROGRAMS_CACHE_INVALIDATE_PROFILE);
}
