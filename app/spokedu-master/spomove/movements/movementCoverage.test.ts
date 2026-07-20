import { describe, expect, it } from 'vitest';

import { OFFICIAL_SPOMOVE_LIBRARY } from '../officialSpomovePresets';
import {
  ACTIVITY_FAMILIES,
  PRESET_FAMILY_MAP,
  getActivityFamily,
  isHubVisiblePreset,
  listAllowedMovementPicks,
  MOVEMENT_PROFILES,
  MOVEMENT_REGISTRY,
  isAllowedMovement,
  isLeftSpomatColor,
  isRightSpomatColor,
  profileSupportsJumpFree,
} from './index';

describe('SPOMOVE movement coverage', () => {
  const visiblePresets = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubVisiblePreset);

  it('모든 hub-visible 프리셋에 activityFamilyId와 movementProfileId가 있다', () => {
    expect(visiblePresets.length).toBeGreaterThan(0);
    for (const preset of visiblePresets) {
      expect(preset.activityFamilyId, preset.id).toBeTruthy();
      expect(preset.movementProfileId, preset.id).toBeTruthy();
    }
  });

  it('패밀리 단위 1장 지원 비율이 60% 이상이다', () => {
    const familyIds = [...new Set(visiblePresets.map((p) => p.activityFamilyId!).filter(Boolean))];
    const singleMat = familyIds.filter((id) => getActivityFamily(id)?.matRequirement.minMats === 1);
    expect(singleMat.length / familyIds.length).toBeGreaterThanOrEqual(0.6);
  });

  it('허브 노출 콘텐츠 1장 지원 비율이 70% 이상이다', () => {
    const singleMat = visiblePresets.filter((p) => {
      const family = getActivityFamily(p.activityFamilyId!);
      return family?.matRequirement.minMats === 1;
    });
    expect(singleMat.length / visiblePresets.length).toBeGreaterThanOrEqual(0.7);
  });

  it('같은 family는 동일한 movementProfileId를 쓴다', () => {
    const byFamily = new Map<string, Set<string>>();
    for (const preset of visiblePresets) {
      const set = byFamily.get(preset.activityFamilyId!) ?? new Set();
      set.add(preset.movementProfileId!);
      byFamily.set(preset.activityFamilyId!, set);
    }
    for (const [familyId, profiles] of byFamily) {
      expect(profiles.size, familyId).toBe(1);
    }
  });

  it('PRESET_FAMILY_MAP과 enrichment 결과가 충돌하지 않는다', () => {
    for (const preset of visiblePresets) {
      const mapped = PRESET_FAMILY_MAP[preset.id];
      expect(mapped === undefined || mapped === preset.activityFamilyId).toBe(true);
    }
  });

  it('추천 동작은 허용 목록에 포함된다', () => {
    for (const profile of Object.values(MOVEMENT_PROFILES)) {
      if (profile.selectionMode === 'disabled') continue;
      expect(isAllowedMovement(profile.recommended, profile)).toBe(true);
      expect(listAllowedMovementPicks(profile).length).toBeGreaterThanOrEqual(profile.minimumMovementCount);
    }
  });

  it('미지원 limbRule은 허용 목록에 없다', () => {
    for (const profile of Object.values(MOVEMENT_PROFILES)) {
      for (const pick of listAllowedMovementPicks(profile)) {
        expect(MOVEMENT_REGISTRY[pick.baseMovement].supportedLimbRules).toContain(pick.limbRule);
      }
    }
  });

  it('stepHold·squat·lunge는 free만 허용한다', () => {
    for (const id of ['stepHold', 'squatTouch', 'lungeReach'] as const) {
      expect(MOVEMENT_REGISTRY[id].supportedLimbRules).toEqual(['free']);
    }
  });

  it('색 좌우는 참가자 기준 빨강·초록=왼쪽, 노랑·파랑=오른쪽이다', () => {
    expect(isLeftSpomatColor('red')).toBe(true);
    expect(isLeftSpomatColor('green')).toBe(true);
    expect(isRightSpomatColor('yellow')).toBe(true);
    expect(isRightSpomatColor('blue')).toBe(true);
  });

  it('DIVE는 selectionMode disabled이다', () => {
    for (const preset of visiblePresets.filter((p) => p.programGroup === 'dive')) {
      expect(preset.movementProfileId).toBe('diveBuiltIn');
      expect(MOVEMENT_PROFILES.diveBuiltIn.selectionMode).toBe('disabled');
    }
  });

  it('등록된 모든 family가 ACTIVITY_FAMILIES에 있다', () => {
    for (const preset of visiblePresets) {
      expect(ACTIVITY_FAMILIES[preset.activityFamilyId!]).toBeTruthy();
    }
  });

  it('selectable 프로필은 점프 없는 동작을 제공한다', () => {
    for (const profile of Object.values(MOVEMENT_PROFILES)) {
      if (profile.selectionMode === 'disabled') continue;
      expect(profileSupportsJumpFree(profile)).toBe(true);
    }
  });
});
