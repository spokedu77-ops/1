import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import { isAllowedByFamily } from './movementResolve';
import { clampCueSpeedSec } from '../spomoveCueSpeed';
import {
  getSpomoveDifficultyKind,
  getSpomoveDifficultyOptions,
} from '../spomoveDifficulty';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import type { RecentProgramActivity } from '../../lib/recentProgramActivity';
import { getOperationProfile } from '../operations/operationProfiles';
import {
  buildDeclaredOperation,
  resolveOperationEngineCapabilities,
} from '../operations/operationResolve';
import { validateOperationConfig } from '../operations/operationConstraints';

/**
 * Recent 「같은 설정 실행」 가능 여부.
 * Snapshot V2가 있고, URL로 보정 없이 재현 가능할 때만 true.
 * 구 Recent(Snapshot 없음)는 false → Hub는 「이 활동으로 시작」.
 */
export function canReproduceSpomoveSameSettings(
  activity: RecentProgramActivity,
  preset: OfficialSpomovePreset | null | undefined,
): boolean {
  if (!preset) return false;

  const snapshot = activity.spomoveSnapshot;
  if (!snapshot || snapshot.schemaVersion !== 2 || snapshot.presetId !== preset.id) {
    return false;
  }

  const cueRaw = snapshot.cueSeconds;
  if (cueRaw == null || !Number.isFinite(cueRaw)) return false;
  const cue = clampCueSpeedSec(cueRaw);
  if (cue !== Math.round(cueRaw) && cueRaw < 2) return false;

  const movement = snapshot.movement;
  if (!movement) return false;

  const family = preset.activityFamilyId ? getActivityFamily(preset.activityFamilyId) : null;
  const profile = preset.movementProfileId ? getMovementProfile(preset.movementProfileId) : null;
  if (!family || !profile) return false;
  if (profile.selectionMode === 'disabled') return false;
  if (!isAllowedByFamily(movement, family, profile)) return false;

  const difficultyKind = getSpomoveDifficultyKind(preset);
  if (difficultyKind) {
    if (!snapshot.difficultyValue) return false;
    const options = getSpomoveDifficultyOptions(difficultyKind);
    if (!options.some((opt) => opt.value === snapshot.difficultyValue)) return false;
  }

  if (snapshot.operationLayerStatus === 'legacyDisabled') return true;
  if (!snapshot.operation) return false;

  const opProfileId = preset.operationProfileId ?? family.operationProfileId;
  const opProfile = getOperationProfile(opProfileId);
  if (opProfile.exposure === 'legacyDisabled') return true;

  const declared = buildDeclaredOperation(opProfileId, preset.recommendedOperation);
  const capabilities = resolveOperationEngineCapabilities(preset.engine.mode);
  const validation = validateOperationConfig({
    profile: opProfile,
    config: snapshot.operation,
    official: declared,
    capabilities,
    activityFamilyId: preset.activityFamilyId,
  });
  // sanitize가 필요하면 URL만으로는 동일 재현이 아님
  if (validation.status !== 'valid') return false;

  return true;
}
