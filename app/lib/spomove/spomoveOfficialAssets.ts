import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';

export const SPOMOVE_THUMBNAIL_PACK_ID = 'spokedu_master_official_spomove_thumbnails';
export const SPOMOVE_THUMBNAIL_PACK_NAME = 'SPOKEDU MASTER SPOMOVE 공식 프리셋 썸네일';
export const SPOMOVE_GUIDE_VIDEO_PACK_ID = 'spokedu_master_official_spomove_guide_videos';
export const SPOMOVE_GUIDE_VIDEO_PACK_NAME = 'SPOKEDU MASTER SPOMOVE 공식 가이드 영상';
export const SPOMOVE_HOME_FEATURED_PACK_ID = 'spokedu_master_home_spomove_featured';
export const SPOMOVE_HOME_FEATURED_PACK_NAME = 'SPOKEDU MASTER 홈 SPOMOVE 추천 슬롯';
export const SPOMOVE_HOME_FEATURED_SLOT_COUNT = 4;

export type SpomoveThumbnailAssetsJson = {
  thumbnails?: Record<string, string | null | undefined>;
};

export type SpomoveGuideVideoAssetsJson = {
  guideVideos?: Record<string, string | null | undefined>;
};

export type SpomoveHomeFeaturedAssetsJson = {
  slots?: Array<string | null | undefined>;
};

function normalizePresetStringMap(
  raw: unknown,
  key: 'thumbnails' | 'guideVideos',
): Record<string, string> {
  const source = (raw as Record<string, unknown> | null)?.[key];
  if (!source || typeof source !== 'object') return {};
  const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
  const next: Record<string, string> = {};
  for (const [presetId, value] of Object.entries(source as Record<string, unknown>)) {
    if (!validPresetIds.has(presetId)) continue;
    if (typeof value === 'string' && value.trim()) next[presetId] = value.trim();
  }
  return next;
}

export function normalizeSpomoveThumbnailMap(raw: unknown): Record<string, string> {
  return normalizePresetStringMap(raw, 'thumbnails');
}

export function normalizeSpomoveGuideVideoMap(raw: unknown): Record<string, string> {
  return normalizePresetStringMap(raw, 'guideVideos');
}

export function normalizeSpomoveHomeFeaturedSlots(raw: unknown): Array<string | null> {
  const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
  const source = Array.isArray((raw as SpomoveHomeFeaturedAssetsJson | null)?.slots)
    ? ((raw as SpomoveHomeFeaturedAssetsJson).slots ?? [])
    : Array.isArray(raw)
      ? raw
      : [];

  return Array.from({ length: SPOMOVE_HOME_FEATURED_SLOT_COUNT }, (_, index) => {
    const value = source[index];
    if (typeof value !== 'string') return null;
    const id = value.trim();
    return id && validPresetIds.has(id) ? id : null;
  });
}
