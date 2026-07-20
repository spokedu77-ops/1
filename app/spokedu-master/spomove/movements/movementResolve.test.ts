import { describe, expect, it } from 'vitest';

import { MOVEMENT_PROFILES } from './movementProfiles';
import {
  DEFAULT_SAFE_MOVEMENT,
  isAllowedMovement,
  parseMovementQuery,
  resolveMovementPick,
  resolveSessionConfiguration,
  resolveMovementConfiguration,
} from './movementResolve';

describe('movement resolve', () => {
  const profile = MOVEMENT_PROFILES.simpleColorResponse;

  it('우선순위는 URL > family 저장 > 추천이다', () => {
    const url = { baseMovement: 'handTouch' as const, limbRule: 'free' as const };
    const saved = { baseMovement: 'squatTouch' as const, limbRule: 'free' as const };
    expect(resolveMovementPick({ profile, urlMovement: url, savedMovement: saved })).toEqual(url);
    expect(resolveMovementPick({ profile, savedMovement: saved })).toEqual(saved);
    expect(resolveMovementPick({ profile })).toEqual(profile.recommended);
  });

  it('비허용 저장값은 추천으로 보정한다', () => {
    const invalid = { baseMovement: 'lungeReach' as const, limbRule: 'sameSide' as const };
    expect(isAllowedMovement(invalid, profile)).toBe(false);
    expect(resolveMovementPick({ profile, savedMovement: invalid })).toEqual(profile.recommended);
  });

  it('disabled 프로필은 null을 반환한다', () => {
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
