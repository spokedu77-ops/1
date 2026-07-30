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
  const settingsBriefing = read('app/spokedu-master/spomove/session/SettingsBriefing.tsx');
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
    expect(configurator).toContain("variant === 'compact'");
  });

  it('SettingsBriefing은 움직임 자리에서 매트 배치를 안내한다', () => {
    expect(settingsBriefing).not.toContain('<MovementConfigurator');
    expect(settingsBriefing).toContain('<SpomovePadLayoutView');
    expect(settingsBriefing).toContain('getSpomovePadLayoutVariant');
    expect(settingsBriefing).not.toContain('<FixedMovementSummary');
    expect(settingsBriefing).not.toContain('<BuiltInMovementNotice');
  });

  it('설정 화면은 movement pick 변경 UI를 노출하지 않는다', () => {
    const session = read('app/spokedu-master/spomove/session/page.tsx');
    expect(session).toContain('writeFamilyMovement');
    expect(session).not.toContain('setMovementPick(pick)');
    expect(session).not.toContain('onMovementPickChange');
  });

  it('Hub 카드 하단은 추천 동작과 난이도만 노출한다', () => {
    expect(hub).toContain('추천');
    expect(hub).toContain('동작');
    expect(hub).toContain('난이도');
    expect(hub).not.toContain('최근 설정');
    expect(hub).not.toContain('빠른 시작');
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
