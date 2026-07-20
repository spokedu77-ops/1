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
  isAllowedByFamily,
  isAllowedMovement,
  isLeftSpomatColor,
  isRightSpomatColor,
  resolveOfficialRecommended,
  profileSupportsJumpFree,
} from './index';
import { enrichPresetWithMovementLayerResult } from './enrichPresetMovement';

/** Core hard — 실행 안전·스키마 불변조건만. KPI는 movementAudit.test.ts */
describe('SPOMOVE movement invariants', () => {
  const visiblePresets = OFFICIAL_SPOMOVE_LIBRARY.filter(isHubVisiblePreset);

  it('모든 hub-visible 프리셋에 activityFamilyId와 movementProfileId가 있다', () => {
    expect(visiblePresets.length).toBeGreaterThan(0);
    for (const preset of visiblePresets) {
      expect(preset.activityFamilyId, preset.id).toBeTruthy();
      expect(preset.movementProfileId, preset.id).toBeTruthy();
    }
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

  it('명시 Family ≠ MAP 충돌은 hard-fail한다', () => {
    expect(() =>
      enrichPresetWithMovementLayerResult({
        id: 'reaction-cognition-full-color-03',
        activityFamilyId: 'dive',
      } as Parameters<typeof enrichPresetWithMovementLayerResult>[0]),
    ).toThrow(/Family MAP conflict/);
  });

  it('Profile 추천은 허용 목록에 포함된다', () => {
    for (const profile of Object.values(MOVEMENT_PROFILES)) {
      if (profile.selectionMode === 'disabled') continue;
      expect(isAllowedMovement(profile.recommended, profile)).toBe(true);
      expect(listAllowedMovementPicks(profile).length).toBeGreaterThanOrEqual(
        profile.minimumMovementCount,
      );
    }
  });

  it('Family 공식 추천은 Profile+제외 규칙을 통과한다', () => {
    for (const family of Object.values(ACTIVITY_FAMILIES)) {
      const profile = MOVEMENT_PROFILES[family.movementProfileId];
      if (profile.selectionMode === 'disabled') continue;
      const official = resolveOfficialRecommended(family, profile);
      expect(isAllowedByFamily(official, family, profile), family.id).toBe(true);
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
      expect(getActivityFamily(preset.activityFamilyId!)).toBeTruthy();
    }
  });

  it('selectable 프로필은 점프 없는 동작을 제공한다', () => {
    for (const profile of Object.values(MOVEMENT_PROFILES)) {
      if (profile.selectionMode === 'disabled') continue;
      expect(profileSupportsJumpFree(profile)).toBe(true);
    }
  });
});
