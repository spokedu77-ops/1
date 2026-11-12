import { expect, it } from 'vitest';
import { snapshotMoleResult, validMoleResult } from './moleResultRecord';

it('keeps regular rounds after the bonus spawn counter is reset and counts paired targets separately', () => {
  const record = snapshotMoleResult({ spawnCount: 7, regularSpawnCountAtBonus: 5,
    regularLaneCountAtBonus: [2, 2, 1, 2], laneCount: [5, 4, 4, 5],
    targetRounds: 5, bonusStarted: true, stims: 18 });
  expect(record.regularRounds).toBe(5);
  expect(record.bonusRounds).toBe(7);
  expect(record.regularLaneCount.reduce((a, b) => a + b, 0)).toBe(7);
  expect(record.bonusLaneCount.reduce((a, b) => a + b, 0)).toBe(11);
  expect(validMoleResult(record)).toBe(true);
  expect(validMoleResult({ ...record, stims: 19 })).toBe(false);
});

it('reports an interrupted normal run without inventing a bonus', () => {
  const record = snapshotMoleResult({ spawnCount: 2, regularSpawnCountAtBonus: null,
    regularLaneCountAtBonus: null, laneCount: [1, 1, 0, 1],
    targetRounds: 5, bonusStarted: false, stims: 3 });
  expect(record.regularRounds).toBe(2);
  expect(record.bonusRounds).toBe(0);
  expect(record.bonusLaneCount).toEqual([0, 0, 0, 0]);
  expect(validMoleResult(record)).toBe(true);
});
