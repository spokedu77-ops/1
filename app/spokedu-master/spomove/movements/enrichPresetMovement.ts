import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import { deriveFamilyIdForPresetId, getActivityFamily, PRESET_FAMILY_MAP } from './activityFamilies';
import type { MovementProfileId } from './movementTypes';

export type OfficialSpomovePresetWithMovement = OfficialSpomovePreset & {
  activityFamilyId: string;
  movementProfileId: MovementProfileId;
};

export type PresetMovementEnrichmentResult =
  | { status: 'ready'; preset: OfficialSpomovePresetWithMovement }
  | {
      status: 'legacyFallback';
      preset: OfficialSpomovePreset;
      reason: 'missingFamily' | 'unknownFamily' | 'missingProfile';
    };

/**
 * soft-fallback: 매핑 누락 시 throw하지 않고 legacyFallback.
 * hard-fail: 프리셋에 명시한 family가 MAP과 충돌할 때만 throw.
 * 거짓 `as OfficialSpomovePresetWithMovement` 금지.
 */
export function enrichPresetWithMovementLayerResult(
  preset: OfficialSpomovePreset,
): PresetMovementEnrichmentResult {
  const mapped = PRESET_FAMILY_MAP[preset.id];
  if (
    preset.activityFamilyId &&
    mapped !== undefined &&
    mapped !== preset.activityFamilyId
  ) {
    throw new Error(
      `Family MAP conflict for preset ${preset.id}: explicit="${preset.activityFamilyId}" map="${mapped}"`,
    );
  }

  if (preset.activityFamilyId && preset.movementProfileId) {
    const family = getActivityFamily(preset.activityFamilyId);
    if (!family) {
      return { status: 'legacyFallback', preset, reason: 'unknownFamily' };
    }
    if (preset.movementProfileId !== family.movementProfileId) {
      // 명시 profile이 family SSOT와 다르면 family 기준을 채움 (충돌은 MAP만 hard)
      return {
        status: 'ready',
        preset: {
          ...preset,
          activityFamilyId: preset.activityFamilyId,
          movementProfileId: family.movementProfileId,
        },
      };
    }
    return {
      status: 'ready',
      preset: preset as OfficialSpomovePresetWithMovement,
    };
  }

  const familyId = preset.activityFamilyId ?? deriveFamilyIdForPresetId(preset.id);
  if (!familyId) {
    return { status: 'legacyFallback', preset, reason: 'missingFamily' };
  }

  const family = getActivityFamily(familyId);
  if (!family) {
    return { status: 'legacyFallback', preset, reason: 'unknownFamily' };
  }

  const movementProfileId = preset.movementProfileId ?? family.movementProfileId;
  if (!movementProfileId) {
    return { status: 'legacyFallback', preset, reason: 'missingProfile' };
  }

  return {
    status: 'ready',
    preset: {
      ...preset,
      activityFamilyId: familyId,
      movementProfileId,
    },
  };
}

/** 라이브러리 로드용 — soft-fallback 시 원본 유지 + 진단 로그 */
export function enrichPresetWithMovementLayer(preset: OfficialSpomovePreset): OfficialSpomovePreset {
  const result = enrichPresetWithMovementLayerResult(preset);
  if (result.status === 'legacyFallback') {
    if (typeof console !== 'undefined') {
      console.warn(
        `[spomove-movement] legacyFallback enrichment: ${preset.id} reason=${result.reason}`,
      );
    }
    return result.preset;
  }
  return result.preset;
}

export function enrichOfficialSpomoveLibrary(
  presets: readonly OfficialSpomovePreset[],
): OfficialSpomovePreset[] {
  return presets.map(enrichPresetWithMovementLayer);
}

export function isMovementReadyPreset(
  preset: OfficialSpomovePreset,
): preset is OfficialSpomovePresetWithMovement {
  return Boolean(preset.activityFamilyId && preset.movementProfileId);
}
