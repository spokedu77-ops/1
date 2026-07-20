import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getActivityFamily } from './activityFamilies';
import { getMovementProfile } from './movementProfiles';
import { groupMovementPresentations } from './movementPresentation';
import {
  listAllowedMovementPicks,
  movementPicksEqual,
  resolveOfficialRecommended,
} from './movementResolve';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

/**
 * vitest include는 *.test.ts 만 — UI 렌더 대신 계약·순수 로직으로 Configurator 경계를 고정.
 */
describe('MovementConfigurator contract', () => {
  const configurator = read(
    'app/spokedu-master/spomove/movements/MovementConfigurator.tsx',
  );
  const briefing = read('app/spokedu-master/spomove/session/page.tsx');
  const hub = read('app/spokedu-master/spomove/SpomoveHubView.tsx');

  it('Configurator 내부에 Resolver·storage·URL·usage 로직이 없다', () => {
    expect(configurator).not.toContain('resolveEffectiveMovement');
    expect(configurator).not.toContain('resolveOfficialRecommended');
    expect(configurator).not.toContain('readFamilyMovement');
    expect(configurator).not.toContain('writeFamilyMovement');
    expect(configurator).not.toContain('appendMovementUsageEvent');
    expect(configurator).not.toContain('router.');
    expect(configurator).not.toContain('useSearchParams');
    expect(configurator).not.toContain('localStorage');
    expect(configurator).toContain('onChange');
    expect(configurator).toContain('allowedPicks');
  });

  it('Briefing은 selectionMode 3분기를 사용한다', () => {
    expect(briefing).toContain("selectionMode === 'selectable'");
    expect(briefing).toContain("selectionMode === 'fixed'");
    expect(briefing).toContain("selectionMode === 'disabled'");
    expect(briefing).toContain('<MovementConfigurator');
    expect(briefing).toContain('<FixedMovementSummary');
    expect(briefing).toContain('<BuiltInMovementNotice');
  });

  it('pick 변경은 session state + Family 저장이며 URL replace가 아니다', () => {
    expect(briefing).toContain('setMovementPick(pick)');
    expect(briefing).toContain('writeFamilyMovement');
    expect(briefing).not.toMatch(/onMovementPickChange[\s\S]{0,400}router\.replace/);
  });

  it('Hub는 Effective≠Official일 때 최근 설정 라벨을 쓴다', () => {
    expect(hub).toContain('최근 설정');
    expect(hub).toContain('movementPicksEqual');
    expect(hub).toContain('빠른 시작');
    expect(hub).toContain('설정');
  });

  it('Selectable Family 허용분만 그룹에 들어가고 추천은 하나다', () => {
    const family = getActivityFamily('reaction-quadrant');
    expect(family).toBeTruthy();
    const profile = getMovementProfile(family!.movementProfileId);
    expect(profile.selectionMode).toBe('selectable');
    const allowed = listAllowedMovementPicks(profile, family);
    const official = resolveOfficialRecommended(family!, profile);
    expect(allowed.some((p) => movementPicksEqual(p, official))).toBe(true);
    const groups = groupMovementPresentations(allowed);
    const flat = groups.flatMap((g) => g.items.map((i) => i.pick));
    expect(flat).toHaveLength(allowed.length);
    for (const pick of flat) {
      expect(allowed.some((a) => movementPicksEqual(a, pick))).toBe(true);
    }
  });

  it('Family 제외 pick은 허용 목록에 없다', () => {
    const family = getActivityFamily('reaction-triple-diff');
    expect(family).toBeTruthy();
    const profile = getMovementProfile(family!.movementProfileId);
    const allowed = listAllowedMovementPicks(profile, family);
    expect(
      allowed.some((p) => p.baseMovement === 'footTap' && p.limbRule === 'oppositeSide'),
    ).toBe(false);
    expect(allowed.some((p) => p.baseMovement === 'lungeReach')).toBe(false);
  });

  it('fixed / disabled profile 모드가 계약과 일치한다', () => {
    expect(getMovementProfile('variantFootFixed').selectionMode).toBe('fixed');
    expect(getMovementProfile('bodyCueBuiltIn').selectionMode).toBe('disabled');
    expect(getMovementProfile('diveBuiltIn').selectionMode).toBe('disabled');
    expect(configurator).toContain("profile.id === 'diveBuiltIn'");
    expect(configurator).toContain("profile.id !== 'bodyCueBuiltIn'");
  });
});
