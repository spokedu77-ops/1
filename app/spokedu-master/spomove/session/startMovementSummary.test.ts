import { describe, expect, it } from 'vitest';

import { getMovementProfile } from '../movements/movementProfiles';
import { resolveStartMovementSummary } from './startMovementSummary';

describe('resolveStartMovementSummary', () => {
  it('selectable은 Effective 라벨', () => {
    const profile = getMovementProfile('simpleColorResponse');
    expect(
      resolveStartMovementSummary(profile, { baseMovement: 'footTap', limbRule: 'free' }),
    ).toBe('자유발 터치');
  });

  it('fixed는 화면 지정 방식', () => {
    const profile = getMovementProfile('variantFootFixed');
    expect(
      resolveStartMovementSummary(profile, { baseMovement: 'footTap', limbRule: 'free' }),
    ).toBe('발 터치 · 화면 지정 방식');
  });

  it('bodyCue는 안내 문구', () => {
    expect(resolveStartMovementSummary(getMovementProfile('bodyCueBuiltIn'), null)).toContain(
      '손과 발',
    );
  });

  it('dive는 움직임 행 미표시', () => {
    expect(resolveStartMovementSummary(getMovementProfile('diveBuiltIn'), null)).toBeNull();
  });
});
