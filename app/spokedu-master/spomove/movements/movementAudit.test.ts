import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from '../officialSpomovePresets';
import {
  getActivityFamily,
  isHubVisiblePreset,
  resolveOfficialRecommended,
  getMovementProfile,
} from './index';

/**
 * Audit — 콘텐츠 KPI. CI에서 exit 0로 보고만 하고 개발을 막지 않는다.
 * (하드 실패가 필요하면 Release gate에서 별도 수행)
 */
describe('SPOMOVE movement audit (KPI report)', () => {
  const visiblePresets = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubVisiblePreset);

  it('보고: 패밀리·콘텐츠 1장 비율 및 추천 다양성', () => {
    const familyIds = [...new Set(visiblePresets.map((p) => p.activityFamilyId!).filter(Boolean))];
    const singleMatFamilies = familyIds.filter(
      (id) => getActivityFamily(id)?.matRequirement.minMats === 1,
    );
    const familyRatio = singleMatFamilies.length / Math.max(1, familyIds.length);

    const singleMatPresets = visiblePresets.filter((p) => {
      const family = getActivityFamily(p.activityFamilyId!);
      return family?.matRequirement.minMats === 1;
    });
    const contentRatio = singleMatPresets.length / Math.max(1, visiblePresets.length);

    const officialKeys = new Set<string>();
    for (const preset of visiblePresets) {
      const family = getActivityFamily(preset.activityFamilyId!);
      const profile = preset.movementProfileId
        ? getMovementProfile(preset.movementProfileId)
        : null;
      if (!family || !profile || profile.selectionMode === 'disabled') continue;
      const pick = resolveOfficialRecommended(family, profile);
      officialKeys.add(`${pick.baseMovement}:${pick.limbRule}`);
    }

    // KPI 목표(참고): family 60% / content 70%. 미달해도 이 파일은 fail하지 않음.
    const familyTargetMet = familyRatio >= 0.6;
    const contentTargetMet = contentRatio >= 0.7;
    // eslint-disable-next-line no-console
    console.log(
      [
        '[movement-audit]',
        `visible=${visiblePresets.length}`,
        `families=${familyIds.length}`,
        `singleMatFamily=${(familyRatio * 100).toFixed(1)}% (target 60%, met=${familyTargetMet})`,
        `singleMatContent=${(contentRatio * 100).toFixed(1)}% (target 70%, met=${contentTargetMet})`,
        `officialDiversity=${officialKeys.size} distinct picks`,
        `picks=${[...officialKeys].sort().join(',')}`,
      ].join(' '),
    );

    expect(visiblePresets.length).toBeGreaterThan(0);
    expect(officialKeys.size).toBeGreaterThanOrEqual(1);
  });
});
