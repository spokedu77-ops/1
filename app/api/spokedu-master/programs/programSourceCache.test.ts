import { beforeEach, describe, expect, it, vi } from 'vitest';

const { unstableCache, revalidateTag } = vi.hoisted(() => ({
  unstableCache: vi.fn((loader: () => Promise<unknown>) => loader),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({
  unstable_cache: unstableCache,
  revalidateTag,
}));

describe('spokedu master program source cache helpers', () => {
  beforeEach(() => {
    unstableCache.mockClear();
    revalidateTag.mockClear();
  });

  it('wraps loaders with tag and 60s revalidate', async () => {
    const {
      SPOKEDU_MASTER_PROGRAMS_CACHE_TAG,
      wrapSpokeduMasterProgramSourceLoader,
    } = await import('@/app/lib/server/spokeduMasterProgramSourceCache');
    const loader = vi.fn().mockResolvedValue(['program']);
    const wrapped = wrapSpokeduMasterProgramSourceLoader(loader);
    await expect(wrapped()).resolves.toEqual(['program']);
    expect(unstableCache).toHaveBeenCalledWith(
      loader,
      ['spokedu-master-program-source-v1', '0'],
      expect.objectContaining({
        revalidate: 60,
        tags: [SPOKEDU_MASTER_PROGRAMS_CACHE_TAG],
      }),
    );
  });

  it('invalidates with immediate expire profile and bumps in-process generation', async () => {
    const {
      SPOKEDU_MASTER_PROGRAMS_CACHE_TAG,
      SPOKEDU_MASTER_PROGRAMS_CACHE_INVALIDATE_PROFILE,
      getSpokeduMasterProgramSourceCacheGeneration,
      invalidateSpokeduMasterProgramSourceCache,
    } = await import('@/app/lib/server/spokeduMasterProgramSourceCache');
    const before = getSpokeduMasterProgramSourceCacheGeneration();
    invalidateSpokeduMasterProgramSourceCache();
    expect(getSpokeduMasterProgramSourceCacheGeneration()).toBe(before + 1);
    expect(revalidateTag).toHaveBeenCalledWith(
      SPOKEDU_MASTER_PROGRAMS_CACHE_TAG,
      SPOKEDU_MASTER_PROGRAMS_CACHE_INVALIDATE_PROFILE,
    );
  });
});
