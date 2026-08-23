import { OFFICIAL_SPOMOVE_LIBRARY } from '@/app/spokedu-master/spomove/officialSpomovePresets';
import { normalizeSpomoveCoreKeywordsList } from '@/app/spokedu-master/spomove/spomoveCoreKeywords';
import {
  normalizeSpomoveMovementGuideDraft,
  type SpomoveFocusTag,
  type SpomoveMovementGuide,
  type SpomoveMovementGuideDraft,
  type SpomoveMovementGuideStatus,
} from './spomoveGuideContract';

export const SPOMOVE_THUMBNAIL_PACK_ID = 'spokedu_master_official_spomove_thumbnails';
export const SPOMOVE_THUMBNAIL_PACK_NAME = 'SPOKEDU MASTER SPOMOVE 공식 프리셋 썸네일';
export const SPOMOVE_GUIDE_VIDEO_PACK_ID = 'spokedu_master_official_spomove_guide_videos';
export const SPOMOVE_GUIDE_VIDEO_PACK_NAME = 'SPOKEDU MASTER SPOMOVE 공식 가이드 영상';
export const SPOMOVE_CONTENT_PACK_ID = 'spokedu_master_official_spomove_content';
export const SPOMOVE_CONTENT_PACK_NAME = 'SPOKEDU MASTER SPOMOVE 공식 설명';
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

export type SpomovePresetContentOverride = {
  displayTitle?: string;
  shortDescription?: string;
  variantLabel?: string;
  catalogTags?: string[];
  isVisible?: boolean;
  sortOrder?: number;
  coreKeywords?: string[];
  activityMethod?: string;
  activityConcept?: string;
  movementGuide?: SpomoveMovementGuideDraft;
  movementGuideStatus?: SpomoveMovementGuideStatus;
  /** Guide source drift baseline (Admin Source Integrity). Not Public-facing. */
  sourceFingerprint?: string;
  sourceFingerprintVersion?: number;
  sourceReviewedAt?: string;
};
export type {
  SpomoveFocusTag,
  SpomoveMovementGuide,
  SpomoveMovementGuideDraft,
  SpomoveMovementGuideStatus,
};

export type SpomoveContentAssetsJson = {
  schemaVersion?: 1 | 2;
  content?: Record<string, SpomovePresetContentOverride | null | undefined>;
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

export function normalizeSpomoveContentMap(raw: unknown): Record<string, SpomovePresetContentOverride> {
  const source = (raw as SpomoveContentAssetsJson | null)?.content;
  if (!source || typeof source !== 'object') return {};
  const validPresetIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));
  const next: Record<string, SpomovePresetContentOverride> = {};

  for (const [presetId, value] of Object.entries(source)) {
    if (!validPresetIds.has(presetId) || !value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    /** 핵심 키워드: 시작 위치 · 참여 인원 · 난이도 고정 어휘만 */
    const coreKeywords = normalizeSpomoveCoreKeywordsList(entry.coreKeywords);
    const activityMethod = typeof entry.activityMethod === 'string' ? entry.activityMethod.trim() : '';
    const activityConcept = typeof entry.activityConcept === 'string' ? entry.activityConcept.trim() : '';
    const movementGuide = normalizeSpomoveMovementGuideDraft(entry.movementGuide);
    const movementGuideStatus =
      entry.movementGuideStatus === 'published' || entry.movementGuideStatus === 'draft'
        ? entry.movementGuideStatus
        : undefined;
    const normalized: SpomovePresetContentOverride = {};
    const displayTitle = typeof entry.displayTitle === 'string' ? entry.displayTitle.trim() : '';
    const shortDescription = typeof entry.shortDescription === 'string' ? entry.shortDescription.trim() : '';
    const variantLabel = typeof entry.variantLabel === 'string' ? entry.variantLabel.trim() : '';
    const catalogTags = Array.isArray(entry.catalogTags)
      ? entry.catalogTags.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter(Boolean).slice(0, 5)
      : [];
    if (displayTitle) normalized.displayTitle = displayTitle;
    if (shortDescription) normalized.shortDescription = shortDescription;
    if (variantLabel) normalized.variantLabel = variantLabel;
    if (catalogTags.length) normalized.catalogTags = catalogTags;
    if (typeof entry.isVisible === 'boolean') normalized.isVisible = entry.isVisible;
    if (typeof entry.sortOrder === 'number' && Number.isFinite(entry.sortOrder)) normalized.sortOrder = Math.max(0, Math.round(entry.sortOrder));
    if (coreKeywords.length > 0) normalized.coreKeywords = coreKeywords;
    if (activityMethod) normalized.activityMethod = activityMethod;
    if (activityConcept) normalized.activityConcept = activityConcept;
    if (movementGuide) {
      normalized.movementGuide = movementGuide;
      if (movementGuideStatus) normalized.movementGuideStatus = movementGuideStatus;
    }
    const sourceFingerprint =
      typeof entry.sourceFingerprint === 'string' ? entry.sourceFingerprint.trim() : '';
    if (sourceFingerprint) normalized.sourceFingerprint = sourceFingerprint;
    if (
      typeof entry.sourceFingerprintVersion === 'number' &&
      Number.isFinite(entry.sourceFingerprintVersion)
    ) {
      normalized.sourceFingerprintVersion = Math.trunc(entry.sourceFingerprintVersion);
    }
    const sourceReviewedAt =
      typeof entry.sourceReviewedAt === 'string' ? entry.sourceReviewedAt.trim() : '';
    if (sourceReviewedAt) normalized.sourceReviewedAt = sourceReviewedAt;
    if (Object.keys(normalized).length > 0) next[presetId] = normalized;
  }

  return next;
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
