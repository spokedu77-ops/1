'use client';

import { getSupabaseBrowserClient } from '@/app/lib/supabase/browser';
import { resolveSpomovePackCacheBust } from '@/app/lib/spomove/spomoveAssetCacheVersion';
import {
  normalizeSpomoveContentMap,
  normalizeSpomoveThumbnailMap,
  SPOMOVE_CONTENT_PACK_ID,
  SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID,
  SPOMOVE_THUMBNAIL_PACK_ID,
  type SpomovePresetContentOverride,
} from '@/app/lib/spomove/spomoveOfficialAssets';
import {
  emptyHubFamilyFeaturedSlots,
  normalizeHubFamilyFeaturedSlots,
  type SpomoveHubFamilyFeaturedSlots,
} from '@/app/spokedu-master/lib/spomoveHubFamilyFeatured';

/** Shared in-memory TTL for official SPOMOVE hub asset packs (seconds: 60–300). */
export const SPOMOVE_OFFICIAL_ASSET_PACK_CACHE_TTL_MS = 120_000;

type CacheEntry<T> = { value: T; expiresAt: number };
type PackQueryRow = { assets_json?: unknown; updated_at?: string | null };

const successCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export type SpomoveThumbnailPackLoadResult = {
  thumbnailPaths: Record<string, string>;
  thumbnailCacheBust: number | undefined;
  hadQueryError: boolean;
};

export type SpomoveContentPackLoadResult = {
  contentOverrides: Record<string, SpomovePresetContentOverride>;
  hadQueryError: boolean;
};

export type SpomoveHubFamilyFeaturedPackLoadResult = {
  hubFamilyFeaturedSlots: SpomoveHubFamilyFeaturedSlots;
  hadQueryError: boolean;
};

function readFreshCache<T>(cacheKey: string): T | null {
  const cached = successCache.get(cacheKey);
  if (!cached || cached.expiresAt <= Date.now()) return null;
  return cached.value as T;
}

async function loadCachedPack<T>(
  cacheKey: string,
  loader: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
  const fresh = readFreshCache<T>(cacheKey);
  if (fresh !== null) return fresh;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const task = loader()
    .then((value) => {
      if (shouldCache(value)) {
        successCache.set(cacheKey, { value, expiresAt: Date.now() + SPOMOVE_OFFICIAL_ASSET_PACK_CACHE_TTL_MS });
      }
      return value;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });

  inFlight.set(cacheKey, task);
  return task;
}

async function fetchPackRow(packId: string, withUpdatedAt: boolean): Promise<{ row: PackQueryRow | null; hadQueryError: boolean }> {
  const supabase = getSupabaseBrowserClient();
  const select = withUpdatedAt ? 'assets_json, updated_at' : 'assets_json';
  const { data, error } = await supabase.from('think_asset_packs').select(select).eq('id', packId).maybeSingle();
  if (error && error.code !== 'PGRST116') return { row: null, hadQueryError: true };
  return { row: data as PackQueryRow | null, hadQueryError: false };
}

export function clearSpomoveOfficialAssetPackCache() {
  successCache.clear();
  inFlight.clear();
}

export async function loadSpomoveThumbnailPack(): Promise<SpomoveThumbnailPackLoadResult> {
  const cacheKey = `pack:${SPOMOVE_THUMBNAIL_PACK_ID}`;
  return loadCachedPack(cacheKey, async () => {
    const { row, hadQueryError } = await fetchPackRow(SPOMOVE_THUMBNAIL_PACK_ID, true);
    if (hadQueryError) {
      return { thumbnailPaths: {}, thumbnailCacheBust: undefined, hadQueryError: true };
    }
    const next = normalizeSpomoveThumbnailMap(row?.assets_json);
    return {
      thumbnailPaths: next,
      thumbnailCacheBust: resolveSpomovePackCacheBust(row?.updated_at as string | undefined, Object.values(next)),
      hadQueryError: false,
    };
  }, (value) => !value.hadQueryError);
}

export async function loadSpomoveContentPack(): Promise<SpomoveContentPackLoadResult> {
  const cacheKey = `pack:${SPOMOVE_CONTENT_PACK_ID}`;
  return loadCachedPack(cacheKey, async () => {
    const { row, hadQueryError } = await fetchPackRow(SPOMOVE_CONTENT_PACK_ID, false);
    if (hadQueryError) {
      return { contentOverrides: {}, hadQueryError: true };
    }
    return {
      contentOverrides: normalizeSpomoveContentMap(row?.assets_json),
      hadQueryError: false,
    };
  }, (value) => !value.hadQueryError);
}

export async function loadSpomoveHubFamilyFeaturedPack(): Promise<SpomoveHubFamilyFeaturedPackLoadResult> {
  const cacheKey = `pack:${SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID}`;
  return loadCachedPack(cacheKey, async () => {
    const { row, hadQueryError } = await fetchPackRow(SPOMOVE_HUB_FAMILY_FEATURED_PACK_ID, false);
    if (hadQueryError) {
      return { hubFamilyFeaturedSlots: emptyHubFamilyFeaturedSlots(), hadQueryError: true };
    }
    return {
      hubFamilyFeaturedSlots: normalizeHubFamilyFeaturedSlots(row?.assets_json),
      hadQueryError: false,
    };
  }, (value) => !value.hadQueryError);
}

export async function loadSpomoveHubFeaturedAssetPacks(): Promise<{
  thumbnail: SpomoveThumbnailPackLoadResult;
  content: SpomoveContentPackLoadResult;
  familyFeatured: SpomoveHubFamilyFeaturedPackLoadResult;
}> {
  const [thumbnail, content, familyFeatured] = await Promise.all([
    loadSpomoveThumbnailPack(),
    loadSpomoveContentPack(),
    loadSpomoveHubFamilyFeaturedPack(),
  ]);
  return { thumbnail, content, familyFeatured };
}
