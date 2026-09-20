import { describe, expect, test } from 'vitest';
import {
  applyDirection,
  compassPool,
  pickDirection,
  validDirections,
  type RelativeCompassPosition,
} from './relativeCompass';

describe('relative compass 2x2 walk', () => {
  test('easy and normal stay on cardinals', () => {
    expect(compassPool('easy')).toEqual(['up', 'down', 'left', 'right']);
    expect(compassPool('normal')).toEqual(['up', 'down', 'left', 'right']);
  });

  test('hard adds diagonals but still one step', () => {
    expect(compassPool('hard')).toContain('up-right');
    expect(compassPool('hard')).toHaveLength(8);
  });

  test('red only allows right and down', () => {
    const red: RelativeCompassPosition = { x: 0, y: 0 };
    expect(validDirections(red, 'easy').sort()).toEqual(['down', 'right']);
    expect(applyDirection(red, 'up')).toBeNull();
    expect(applyDirection(red, 'down')).toEqual({ x: 0, y: 1 });
  });

  test('pickDirection always lands on a pad', () => {
    const starts: RelativeCompassPosition[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];
    for (const difficulty of ['easy', 'normal', 'hard'] as const) {
      for (const start of starts) {
        for (let i = 0; i < 40; i += 1) {
          const direction = pickDirection(start, difficulty);
          expect(applyDirection(start, direction)).not.toBeNull();
        }
      }
    }
  });
});
