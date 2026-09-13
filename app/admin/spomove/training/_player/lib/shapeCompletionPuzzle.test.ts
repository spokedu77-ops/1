import { describe, expect, test } from 'vitest';
import { activeShapeCellCount, combineShapeMasks, countValidCompletions, generateShapeCompletionPuzzle, isShapeMaskConnected, shapeMaskDistance, shapeMaskKey, type ShapeCompletionDifficulty } from './shapeCompletionPuzzle';

const expected = {
  easy: { size: 3, target: [4, 5], missing: [2, 2] },
  normal: { size: 3, target: [5, 6], missing: [2, 3] },
  hard: { size: 4, target: [7, 9], missing: [3, 4] },
} as const;

describe('shape completion generator invariants', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as ShapeCompletionDifficulty[]) {
    test(`${difficulty}: 100 valid connected puzzles`, () => {
      for (let index = 0; index < 100; index += 1) {
        const puzzle = generateShapeCompletionPuzzle(difficulty);
        const contract = expected[difficulty];
        expect(puzzle.gridSize).toBe(contract.size);
        expect(puzzle.target).toHaveLength(contract.size ** 2);
        expect(puzzle.base).toHaveLength(puzzle.target.length);
        expect(puzzle.missing).toHaveLength(puzzle.target.length);
        expect(isShapeMaskConnected(puzzle.target, puzzle.gridSize)).toBe(true);
        expect(isShapeMaskConnected(puzzle.base, puzzle.gridSize)).toBe(true);
        expect(isShapeMaskConnected(puzzle.missing, puzzle.gridSize)).toBe(true);
        expect(activeShapeCellCount(puzzle.target)).toBeGreaterThanOrEqual(contract.target[0]);
        expect(activeShapeCellCount(puzzle.target)).toBeLessThanOrEqual(contract.target[1]);
        expect(activeShapeCellCount(puzzle.missing)).toBeGreaterThanOrEqual(contract.missing[0]);
        expect(activeShapeCellCount(puzzle.missing)).toBeLessThanOrEqual(contract.missing[1]);
        expect(puzzle.base.every((cell, cellIndex) => !(cell && puzzle.missing[cellIndex]))).toBe(true);
        expect(shapeMaskKey(combineShapeMasks(puzzle.base, puzzle.missing))).toBe(shapeMaskKey(puzzle.target));
        expect(puzzle.candidates).toHaveLength(4);
        expect(new Set(puzzle.candidates.map(shapeMaskKey)).size).toBe(4);
        expect(countValidCompletions(puzzle.base, puzzle.candidates, puzzle.target)).toBe(1);
        for (const candidate of puzzle.candidates) {
          expect(activeShapeCellCount(candidate)).toBe(activeShapeCellCount(puzzle.missing));
          expect(candidate.every((cell, cellIndex) => !(cell && puzzle.base[cellIndex]))).toBe(true);
          expect(isShapeMaskConnected(candidate, puzzle.gridSize)).toBe(true);
        }
        const distractorDistances = puzzle.candidates.filter((_, candidateIndex) => candidateIndex !== puzzle.correctIndex).map((candidate) => shapeMaskDistance(candidate, puzzle.missing));
        if (difficulty === 'easy') expect(distractorDistances.every((distance) => distance >= 4)).toBe(true);
        if (difficulty === 'normal') expect(distractorDistances).toContain(2);
        if (difficulty === 'hard') expect(distractorDistances.every((distance) => distance === 2)).toBe(true);
      }
    });
  }
});