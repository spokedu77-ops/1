import { describe, expect, it, vi } from 'vitest';
import { MasterProgramSourceLoadError, loadPublishedMasterProgramsFromDb } from './route';

vi.mock('@/app/lib/server/spokeduMasterProgramSourceCache', () => ({
  wrapSpokeduMasterProgramSourceLoader: (loader: () => Promise<unknown>) => loader,
  invalidateSpokeduMasterProgramSourceCache: vi.fn(),
  SPOKEDU_MASTER_PROGRAMS_CACHE_TAG: 'spokedu-master-programs',
}));

describe('loadPublishedMasterProgramsFromDb', () => {
  it('throws on curriculum errors instead of returning empty programs', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
            }),
          }),
        }),
      }),
    };

    await expect(loadPublishedMasterProgramsFromDb(supabase as never)).rejects.toBeInstanceOf(
      MasterProgramSourceLoadError,
    );
  });
});
