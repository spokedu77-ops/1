import { describe, expect, it } from 'vitest';

import { getActivityFamily } from './activityFamilies';
import { MOVEMENT_PROFILES } from './movementProfiles';
import {
  DEFAULT_SAFE_MOVEMENT,
  isAllowedByFamily,
  isAllowedMovement,
  isExcludedByFamily,
  parseMovementQuery,
  resolveEffectiveMovement,
  resolveMovementConfiguration,
  resolveMovementPick,
  resolveOfficialRecommended,
  resolveSessionConfiguration,
} from './movementResolve';

describe('movement resolve', () => {
  const profile = MOVEMENT_PROFILES.simpleColorResponse;
  const family = getActivityFamily('reaction-full')!;

  it('Official은 Family 추천을 Profile보다 우선한다', () => {
    expect(family.recommendedMovement).toEqual({ baseMovement: 'handTouch', limbRule: 'free' });
    expect(resolveOfficialRecommended(family, profile)).toEqual(family.recommendedMovement);
    expect(resolveOfficialRecommended(family, profile)).not.toEqual(profile.recommended);
  });

  it('Effective 우선순위는 유효 URL > 유효 저장 > Official', () => {
    const url = { baseMovement: 'footTap' as const, limbRule: 'sameSide' as const };
    const saved = { baseMovement: 'squatTouch' as const, limbRule: 'free' as const };
    expect(
      resolveEffectiveMovement({ profile, family, urlMovement: url, savedMovement: saved }),
    ).toEqual(url);
    expect(resolveEffectiveMovement({ profile, family, savedMovement: saved })).toEqual(saved);
    expect(resolveEffectiveMovement({ profile, family })).toEqual(family.recommendedMovement);
  });

  it('Family 제외는 URL·저장도 우회하지 않는다', () => {
    const gatedFamily = getActivityFamily('reaction-triple-diff')!;
    const excluded = { baseMovement: 'lungeReach' as const, limbRule: 'free' as const };
    expect(isAllowedMovement(excluded, profile)).toBe(true);
    expect(isExcludedByFamily(excluded, gatedFamily)).toBe(true);
    expect(isAllowedByFamily(excluded, gatedFamily, profile)).toBe(false);
    expect(
      resolveEffectiveMovement({
        profile,
        family: gatedFamily,
        urlMovement: excluded,
        savedMovement: excluded,
      }),
    ).toEqual(gatedFamily.recommendedMovement);
  });

  it('비허용 저장값은 Official로 보정한다', () => {
    const invalid = { baseMovement: 'lungeReach' as const, limbRule: 'sameSide' as const };
    expect(isAllowedMovement(invalid, profile)).toBe(false);
    expect(resolveEffectiveMovement({ profile, family, savedMovement: invalid })).toEqual(
      family.recommendedMovement,
    );
  });

  it('disabled 프로필은 null을 반환한다', () => {
    const diveFamily = getActivityFamily('dive')!;
    expect(
      resolveEffectiveMovement({
        profile: MOVEMENT_PROFILES.diveBuiltIn,
        family: diveFamily,
      }),
    ).toBeNull();
    expect(resolveMovementPick({ profile: MOVEMENT_PROFILES.diveBuiltIn })).toBeNull();
  });

  it('잘못된 URL 파라미터는 null로 파싱된다', () => {
    expect(parseMovementQuery('nope', 'free')).toBeNull();
    expect(parseMovementQuery('footTap', 'sameSide')).toEqual({
      baseMovement: 'footTap',
      limbRule: 'sameSide',
    });
  });

  it('cueSeconds는 최소값 이상으로 올린다', () => {
    const movement = resolveMovementConfiguration(
      { baseMovement: 'squatTouch', limbRule: 'free' },
      profile,
    );
    const session = resolveSessionConfiguration({ movement, cueSeconds: 2 });
    expect(session.cueSeconds).toBe(4);
    expect(session.cueAdjusted).toBe(true);
  });

  it('DEFAULT_SAFE_MOVEMENT는 footTap free이다', () => {
    expect(DEFAULT_SAFE_MOVEMENT).toEqual({ baseMovement: 'footTap', limbRule: 'free' });
  });
});
