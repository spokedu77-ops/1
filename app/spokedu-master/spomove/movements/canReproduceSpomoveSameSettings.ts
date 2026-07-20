import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import {
  isAllowedByFamily,
  parseMovementQuery,
} from './movementResolve';
import { clampCueSpeedSec } from '../spomoveCueSpeed';
import {
  getSpomoveDifficultyKind,
  getSpomoveDifficultyOptions,
} from '../spomoveDifficulty';
import type { OfficialSpomovePreset } from '../officialSpomovePresets';
import type { RecentProgramActivity } from '../../lib/recentProgramActivity';

/** Recent 「같은 설정 실행」 가능 여부 — 보정 없이 URL 재현이 가능할 때만 true */
export function canReproduceSpomoveSameSettings(
  activity: RecentProgramActivity,
  preset: OfficialSpomovePreset | null | undefined,
): boolean {
  if (!preset) return false;
  if (activity.cueSeconds == null || !Number.isFinite(activity.cueSeconds)) return false;
  const cue = clampCueSpeedSec(activity.cueSeconds);
  if (cue !== Math.round(activity.cueSeconds) && activity.cueSeconds < 2) return false;

  const pick = parseMovementQuery(activity.baseMovement, activity.limbRule);
  if (!pick) return false;

  const family = preset.activityFamilyId ? getActivityFamily(preset.activityFamilyId) : null;
  const profile = preset.movementProfileId ? getMovementProfile(preset.movementProfileId) : null;
  if (!family || !profile) return false;
  if (profile.selectionMode === 'disabled') return false;
  if (!isAllowedByFamily(pick, family, profile)) return false;

  const difficultyKind = getSpomoveDifficultyKind(preset);
  if (difficultyKind) {
    if (!activity.difficultyValue) return false;
    const options = getSpomoveDifficultyOptions(difficultyKind);
    if (!options.some((opt) => opt.value === activity.difficultyValue)) return false;
  }

  return true;
}
