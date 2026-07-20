import { describe, expect, it } from 'vitest';

import {
  getMovementPresentation,
  groupMovementPresentations,
  limbMarkersForRule,
} from './movementPresentation';
import type { MovementPick } from './movementTypes';

describe('movementPresentation', () => {
  it('사용자 9표현 라벨을 제공한다', () => {
    const nine: MovementPick[] = [
      { baseMovement: 'footTap', limbRule: 'free' },
      { baseMovement: 'footTap', limbRule: 'sameSide' },
      { baseMovement: 'footTap', limbRule: 'oppositeSide' },
      { baseMovement: 'handTouch', limbRule: 'free' },
      { baseMovement: 'handTouch', limbRule: 'sameSide' },
      { baseMovement: 'handTouch', limbRule: 'oppositeSide' },
      { baseMovement: 'stepHold', limbRule: 'free' },
      { baseMovement: 'squatTouch', limbRule: 'free' },
      { baseMovement: 'lungeReach', limbRule: 'free' },
    ];
    const labels = nine.map((pick) => getMovementPresentation(pick).label);
    expect(labels).toEqual([
      '자유발 터치',
      '같은 쪽 발 터치',
      '교차발 터치',
      '자유손 터치',
      '같은 쪽 손 터치',
      '교차손 터치',
      '밟고 정지',
      '스쿼트 터치',
      '런지 리치',
    ]);
  });

  it('허용 pick만 그룹으로 묶고 빈 그룹은 생략한다', () => {
    const picks: MovementPick[] = [
      { baseMovement: 'footTap', limbRule: 'free' },
      { baseMovement: 'handTouch', limbRule: 'sameSide' },
      { baseMovement: 'stepHold', limbRule: 'free' },
    ];
    const groups = groupMovementPresentations(picks);
    expect(groups.map((g) => g.group)).toEqual(['feet', 'hands', 'postureBalance']);
    expect(groups[0]!.items).toHaveLength(1);
    expect(groups[1]!.items[0]!.label).toBe('같은 쪽 손 터치');
  });

  it('발만 있으면 손·자세 그룹을 만들지 않는다', () => {
    const groups = groupMovementPresentations([{ baseMovement: 'footTap', limbRule: 'free' }]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.group).toBe('feet');
  });

  it('SideRule 시각화 데이터를 제공한다', () => {
    expect(limbMarkersForRule('free')).toEqual({ left: null, right: null });
    expect(limbMarkersForRule('sameSide')).toEqual({ left: 'L', right: 'R' });
    expect(limbMarkersForRule('oppositeSide')).toEqual({ left: 'R', right: 'L' });
  });

  it('요약 칩용 문구를 포함한다', () => {
    const p = getMovementPresentation({ baseMovement: 'footTap', limbRule: 'free' });
    expect(p.impactLabel).toBe('낮은 강도');
    expect(p.jumpLabel).toBe('점프 없음');
    expect(p.startLabel).toBe('매트 밖 시작');
    expect(p.returnLabel).toBe('준비 위치로 복귀');
    expect(p.instruction.length).toBeGreaterThan(0);
  });
});
