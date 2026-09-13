export type ShapeMask = boolean[];
export type ShapeCompletionDifficulty = 'easy' | 'normal' | 'hard';
export type ShapeCompletionSeconds = 2 | 3 | 4 | 5 | 6;
export type ShapeCompletionPuzzle = {
  gridSize: 3 | 4;
  target: ShapeMask;
  base: ShapeMask;
  missing: ShapeMask;
  candidates: ShapeMask[];
  correctIndex: 0 | 1 | 2 | 3;
};

type DifficultySpec = { gridSize: 3 | 4; targetMin: number; targetMax: number; missingMin: number; missingMax: number };
const SPECS: Record<ShapeCompletionDifficulty, DifficultySpec> = {
  easy: { gridSize: 3, targetMin: 4, targetMax: 5, missingMin: 2, missingMax: 2 },
  normal: { gridSize: 3, targetMin: 5, targetMax: 6, missingMin: 2, missingMax: 3 },
  hard: { gridSize: 4, targetMin: 7, targetMax: 9, missingMin: 3, missingMax: 4 },
};
const MAX_GENERATION_ATTEMPTS = 100;

export function shapeMaskDistance(a: ShapeMask, b: ShapeMask): number {
  if (a.length !== b.length) throw new Error('Shape masks must have equal lengths.');
  return a.reduce((distance, value, index) => distance + (value !== b[index] ? 1 : 0), 0);
}
export function activeShapeCellCount(mask: ShapeMask): number { return mask.filter(Boolean).length; }
export function shapeMaskKey(mask: ShapeMask): string { return mask.map((cell) => cell ? '1' : '0').join(''); }
function neighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size); const col = index % size; const out: number[] = [];
  if (row > 0) out.push(index - size); if (row < size - 1) out.push(index + size);
  if (col > 0) out.push(index - 1); if (col < size - 1) out.push(index + 1);
  return out;
}
export function isShapeMaskConnected(mask: ShapeMask, size: number): boolean {
  const first = mask.findIndex(Boolean); if (first < 0) return false;
  const seen = new Set([first]); const queue = [first];
  while (queue.length) { const current = queue.shift()!; for (const next of neighbors(current, size)) if (mask[next] && !seen.has(next)) { seen.add(next); queue.push(next); } }
  return seen.size === activeShapeCellCount(mask);
}
export function combineShapeMasks(a: ShapeMask, b: ShapeMask): ShapeMask { return a.map((cell, index) => cell || Boolean(b[index])); }
export function countValidCompletions(base: ShapeMask, candidates: ShapeMask[], target: ShapeMask): number {
  const targetKey = shapeMaskKey(target); return candidates.filter((candidate) => shapeMaskKey(combineShapeMasks(base, candidate)) === targetKey).length;
}
function choose<T>(values: T[], rng: () => number): T { return values[Math.floor(rng() * values.length)]!; }
function randomInt(min: number, max: number, rng: () => number): number { return min + Math.floor(rng() * (max - min + 1)); }
function maskFromIndices(length: number, indices: number[]): ShapeMask { const mask = Array<boolean>(length).fill(false); indices.forEach((index) => { mask[index] = true; }); return mask; }
function combinations(values: number[], count: number): number[][] {
  const out: number[][] = []; const current: number[] = [];
  const visit = (start: number) => { if (current.length === count) { out.push([...current]); return; } for (let i = start; i <= values.length - (count - current.length); i += 1) { current.push(values[i]!); visit(i + 1); current.pop(); } };
  visit(0); return out;
}
function fisherYates<T>(values: T[], rng: () => number): T[] { const out = [...values]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!]; } return out; }
function growConnectedTarget(size: number, count: number, rng: () => number): ShapeMask {
  const length = size * size; const selected = new Set<number>([Math.floor(rng() * length)]);
  while (selected.size < count) { const frontier = new Set<number>(); selected.forEach((index) => neighbors(index, size).forEach((next) => { if (!selected.has(next)) frontier.add(next); })); selected.add(choose([...frontier], rng)); }
  return maskFromIndices(length, [...selected]);
}
function validDistances(difficulty: ShapeCompletionDifficulty, distance: number): boolean {
  if (difficulty === 'easy') return distance >= 4;
  if (difficulty === 'hard') return distance === 2;
  return distance === 2 || distance === 4;
}
function tryPuzzle(difficulty: ShapeCompletionDifficulty, rng: () => number): ShapeCompletionPuzzle | null {
  const spec = SPECS[difficulty]; const length = spec.gridSize ** 2;
  const targetCount = randomInt(spec.targetMin, spec.targetMax, rng); const target = growConnectedTarget(spec.gridSize, targetCount, rng);
  const targetIndices = target.map((active, index) => active ? index : -1).filter((index) => index >= 0);
  const possibleMissingCounts = fisherYates(Array.from({ length: spec.missingMax - spec.missingMin + 1 }, (_, i) => spec.missingMin + i), rng);
  for (const missingCount of possibleMissingCounts) {
    const partitions = fisherYates(combinations(targetIndices, missingCount), rng);
    for (const missingIndices of partitions) {
      const missing = maskFromIndices(length, missingIndices); const base = target.map((cell, index) => cell && !missing[index]);
      if (activeShapeCellCount(base) < 2 || !isShapeMaskConnected(base, spec.gridSize) || !isShapeMaskConnected(missing, spec.gridSize)) continue;
      const available = base.map((active, index) => active ? -1 : index).filter((index) => index >= 0);
      const pool = fisherYates(combinations(available, missingCount), rng).map((indices) => maskFromIndices(length, indices)).filter((candidate) => {
        const distance = shapeMaskDistance(candidate, missing);
        return shapeMaskKey(candidate) !== shapeMaskKey(missing) && isShapeMaskConnected(candidate, spec.gridSize) && validDistances(difficulty, distance) && shapeMaskKey(combineShapeMasks(base, candidate)) !== shapeMaskKey(target);
      });
      if (difficulty === 'normal' && !pool.some((candidate) => shapeMaskDistance(candidate, missing) === 2)) continue;
      const distractors: ShapeMask[] = [];
      if (difficulty === 'normal') { const close = pool.find((candidate) => shapeMaskDistance(candidate, missing) === 2); if (close) distractors.push(close); }
      for (const candidate of pool) { if (distractors.length === 3) break; if (!distractors.some((item) => shapeMaskKey(item) === shapeMaskKey(candidate))) distractors.push(candidate); }
      if (distractors.length !== 3) continue;
      const shuffled = fisherYates([{ mask: missing, correct: true }, ...distractors.map((mask) => ({ mask, correct: false }))], rng);
      const correctIndex = shuffled.findIndex((candidate) => candidate.correct);
      const candidates = shuffled.map((candidate) => candidate.mask);
      if (correctIndex < 0 || countValidCompletions(base, candidates, target) !== 1) continue;
      return { gridSize: spec.gridSize, target, base, missing, candidates, correctIndex: correctIndex as 0 | 1 | 2 | 3 };
    }
  }
  return null;
}
export function generateShapeCompletionPuzzle(difficulty: ShapeCompletionDifficulty, rng: () => number = Math.random): ShapeCompletionPuzzle {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) { const puzzle = tryPuzzle(difficulty, rng); if (puzzle) return puzzle; }
  throw new Error(`Unable to generate a valid ${difficulty} shape-completion puzzle.`);
}
export function normalizeShapeCompletionDifficulty(value: unknown): ShapeCompletionDifficulty { return value === 'easy' || value === 'hard' ? value : 'normal'; }
export function normalizeShapeCompletionSeconds(value: unknown): ShapeCompletionSeconds { const rounded = Math.round(Number(value)); return Math.min(6, Math.max(2, Number.isFinite(rounded) ? rounded : 4)) as ShapeCompletionSeconds; }