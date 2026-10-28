import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPOMOVE_OFFICIAL_ASSET_PACK_CACHE_TTL_MS,
  clearSpomoveOfficialAssetPackCache,
  loadSpomoveContentPack,
  loadSpomoveThumbnailPack,
} from './loadSpomoveOfficialAssetPacks';
import { SPOMOVE_CONTENT_PACK_ID, SPOMOVE_THUMBNAIL_PACK_ID } from './spomoveOfficialAssets';

const maybeSingle = vi.fn();

vi.mock('@/app/lib/supabase/browser', () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle,
        }),
      }),
    }),
  }),
}));

describe('loadSpomoveOfficialAssetPacks', () => {
  beforeEach(() => {
    clearSpomoveOfficialAssetPackCache();
    maybeSingle.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares in-flight requests for the same pack', async () => {
    maybeSingle.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ data: { assets_json: { thumbnails: {} }, updated_at: '2026-01-01T00:00:00Z' }, error: null }), 10);
    }));

    const first = loadSpomoveThumbnailPack();
    const second = loadSpomoveThumbnailPack();
    await vi.advanceTimersByTimeAsync(15);
    await Promise.all([first, second]);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('returns cached packs within TTL without another network call', async () => {
    maybeSingle.mockResolvedValue({ data: { assets_json: { thumbnails: {} }, updated_at: '2026-01-01T00:00:00Z' }, error: null });
    await loadSpomoveThumbnailPack();
    await loadSpomoveThumbnailPack();
    expect(maybeSingle).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(SPOMOVE_OFFICIAL_ASSET_PACK_CACHE_TTL_MS - 1);
    await loadSpomoveThumbnailPack();
    expect(maybeSingle).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await loadSpomoveThumbnailPack();
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('does not cache query failures and allows retry', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: '500' } });
    const failed = await loadSpomoveContentPack();
    expect(failed.hadQueryError).toBe(true);

    maybeSingle.mockResolvedValueOnce({ data: { assets_json: { schemaVersion: 2, content: {} } }, error: null });
    const recovered = await loadSpomoveContentPack();
    expect(recovered.hadQueryError).toBe(false);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('loads thumbnail and content packs independently', async () => {
    maybeSingle.mockImplementation(async () => ({ data: { assets_json: {} }, error: null }));
    await loadSpomoveThumbnailPack();
    await loadSpomoveContentPack();
    expect(maybeSingle).toHaveBeenCalledTimes(2);
    expect(SPOMOVE_THUMBNAIL_PACK_ID).toBeTruthy();
    expect(SPOMOVE_CONTENT_PACK_ID).toBeTruthy();
  });
});
