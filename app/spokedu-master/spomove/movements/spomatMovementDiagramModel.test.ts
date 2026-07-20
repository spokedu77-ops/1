import { describe, expect, it } from 'vitest';

import { buildSpomatMovementDiagramModel, SPOMAT_DIAGRAM_COLOR_ORDER } from './spomatMovementDiagramModel';

describe('spomatMovementDiagramModel', () => {
  it('색 순서는 빨강|노랑 / 초록|파랑 고정', () => {
    expect(SPOMAT_DIAGRAM_COLOR_ORDER).toEqual([
      ['red', 'yellow'],
      ['green', 'blue'],
    ]);
    const model = buildSpomatMovementDiagramModel('free');
    expect(model.colorOrder).toEqual(SPOMAT_DIAGRAM_COLOR_ORDER);
    expect(model.hasCenterWaitZone).toBe(false);
  });

  it('free는 L/R 오버레이 없음', () => {
    const model = buildSpomatMovementDiagramModel('free');
    expect(model.colors).toEqual({
      red: null,
      yellow: null,
      green: null,
      blue: null,
    });
  });

  it('sameSide는 왼쪽=L 오른쪽=R', () => {
    const model = buildSpomatMovementDiagramModel('sameSide');
    expect(model.colors.red).toBe('L');
    expect(model.colors.green).toBe('L');
    expect(model.colors.yellow).toBe('R');
    expect(model.colors.blue).toBe('R');
  });

  it('oppositeSide는 좌우 반전', () => {
    const model = buildSpomatMovementDiagramModel('oppositeSide');
    expect(model.colors.red).toBe('R');
    expect(model.colors.green).toBe('R');
    expect(model.colors.yellow).toBe('L');
    expect(model.colors.blue).toBe('L');
  });
});
