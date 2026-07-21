import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from '../officialSpomovePresets';
import {
  ACTIVITY_FAMILIES,
  getActivityFamily,
  isHubListedPreset,
  isHubRunnablePreset,
  resolveOfficialRecommended,
  getMovementProfile,
  listAllowedMovementPicks,
  MOVEMENT_PROFILES,
  profileSupportsJumpFree,
  isAllowedMovement,
} from './index';

/**
 * Audit — 콘텐츠 KPI·누락 현황. exit 0로 보고만 하고 개발을 막지 않는다.
 */
describe('SPOMOVE movement audit (KPI report)', () => {
  const listedPresets = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubListedPreset);
  const runnablePresets = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubRunnablePreset);

  it('보고: listed vs runnable 분모 및 Family/Profile 누락', () => {
    const missing = runnablePresets.filter((p) => !p.activityFamilyId || !p.movementProfileId);
    console.log(
      `[movement-audit] listed=${listedPresets.length} runnable=${runnablePresets.length} missingFamilyOrProfile=${missing.length}${
        missing.length ? ` ids=${missing.map((p) => p.id).join(',')}` : ''
      }`,
    );
    expect(listedPresets.length).toBeGreaterThanOrEqual(runnablePresets.length);
    // 누락은 warning 보고만 — hard fail 하지 않음
    expect(missing.length).toBeGreaterThanOrEqual(0);
  });

  it('보고: 패밀리·콘텐츠 1장 비율 및 추천 다양성', () => {
    const withFamily = runnablePresets.filter((p) => p.activityFamilyId);
    const familyIds = [...new Set(withFamily.map((p) => p.activityFamilyId!).filter(Boolean))];
    const singleMatFamilies = familyIds.filter(
      (id) => getActivityFamily(id)?.matRequirement.minMats === 1,
    );
    const familyRatio = singleMatFamilies.length / Math.max(1, familyIds.length);

    const singleMatPresets = withFamily.filter((p) => {
      const family = getActivityFamily(p.activityFamilyId!);
      return family?.matRequirement.minMats === 1;
    });
    const contentRatio = singleMatPresets.length / Math.max(1, withFamily.length);

    const officialKeys = new Set<string>();
    for (const preset of withFamily) {
      const family = getActivityFamily(preset.activityFamilyId!);
      const profile = preset.movementProfileId
        ? getMovementProfile(preset.movementProfileId)
        : null;
      if (!family || !profile || profile.selectionMode === 'disabled') continue;
      const pick = resolveOfficialRecommended(family, profile);
      officialKeys.add(`${pick.baseMovement}:${pick.limbRule}`);
    }

    const familyTargetMet = familyRatio >= 0.6;
    const contentTargetMet = contentRatio >= 0.7;
    console.log(
      [
        '[movement-audit]',
        `runnable=${runnablePresets.length}`,
        `families=${familyIds.length}`,
        `singleMatFamily=${(familyRatio * 100).toFixed(1)}% (target 60%, met=${familyTargetMet})`,
        `singleMatContent=${(contentRatio * 100).toFixed(1)}% (target 70%, met=${contentTargetMet})`,
        `officialDiversity=${officialKeys.size} distinct picks`,
        `picks=${[...officialKeys].sort().join(',')}`,
      ].join(' '),
    );

    expect(runnablePresets.length).toBeGreaterThan(0);
    expect(officialKeys.size).toBeGreaterThanOrEqual(1);
  });

  it('보고: selectable jump-free·minCount·no-op exclusion', () => {
    const profiles = Object.values(MOVEMENT_PROFILES).filter((p) => p.selectionMode !== 'disabled');
    let jumpFreeOk = 0;
    let minCountOk = 0;
    for (const profile of profiles) {
      const picks = listAllowedMovementPicks(profile);
      if (profileSupportsJumpFree(profile)) jumpFreeOk += 1;
      if (picks.length >= profile.minimumMovementCount) minCountOk += 1;
    }

    let noopExclusionFamilies = 0;
    for (const family of Object.values(ACTIVITY_FAMILIES)) {
      const profile = MOVEMENT_PROFILES[family.movementProfileId];
      if (!family.excludedMovements?.length || profile.selectionMode === 'disabled') continue;
      const anyIntersect = family.excludedMovements.some((ex) => isAllowedMovement(ex, profile));
      if (!anyIntersect) noopExclusionFamilies += 1;
    }

    console.log(
      `[movement-audit] jumpFree=${jumpFreeOk}/${profiles.length} minCount=${minCountOk}/${profiles.length} noopExclusionFamilies=${noopExclusionFamilies}`,
    );
    expect(profiles.length).toBeGreaterThan(0);
  });
});
