export type MoleHole = {
  id: number;
  xPct: number;
  yPct: number;
  scale?: number;
  rotateDeg?: number;
};

/** 단일 화면: 20개 구멍 (% 좌표, play field 기준) */
export const MOLE_HOLES_SINGLE: MoleHole[] = [
  { id: 0, xPct: 12, yPct: 18, scale: 0.92, rotateDeg: -4 },
  { id: 1, xPct: 28, yPct: 12, scale: 1.05 },
  { id: 2, xPct: 48, yPct: 8, scale: 0.98, rotateDeg: 3 },
  { id: 3, xPct: 68, yPct: 14, scale: 1.02 },
  { id: 4, xPct: 86, yPct: 22, scale: 0.94, rotateDeg: 5 },
  { id: 5, xPct: 8, yPct: 42, scale: 1.0 },
  { id: 6, xPct: 24, yPct: 38, scale: 0.96, rotateDeg: -6 },
  { id: 7, xPct: 42, yPct: 32, scale: 1.08 },
  { id: 8, xPct: 58, yPct: 36, scale: 0.97 },
  { id: 9, xPct: 76, yPct: 40, scale: 1.04, rotateDeg: 4 },
  { id: 10, xPct: 92, yPct: 48, scale: 0.93 },
  { id: 11, xPct: 16, yPct: 62, scale: 1.06 },
  { id: 12, xPct: 34, yPct: 58, scale: 0.95, rotateDeg: -3 },
  { id: 13, xPct: 52, yPct: 54, scale: 1.1 },
  { id: 14, xPct: 72, yPct: 60, scale: 0.98 },
  { id: 15, xPct: 88, yPct: 68, scale: 1.02, rotateDeg: 6 },
  { id: 16, xPct: 22, yPct: 78, scale: 0.94 },
  { id: 17, xPct: 46, yPct: 74, scale: 1.05 },
  { id: 18, xPct: 64, yPct: 80, scale: 0.96, rotateDeg: -5 },
  { id: 19, xPct: 82, yPct: 84, scale: 1.0 },
];

const MIN_HOLE_PAIR_DISTANCE_PCT = 18;

function holeDistancePct(a: MoleHole, b: MoleHole): number {
  const dx = a.xPct - b.xPct;
  const dy = a.yPct - b.yPct;
  return Math.hypot(dx, dy);
}

export function pickRandomHole(
  holes: MoleHole[],
  excludeId: number,
): MoleHole {
  if (holes.length <= 1) return holes[0]!;
  let pick = holes[Math.floor(Math.random() * holes.length)]!;
  for (let i = 0; i < 8 && pick.id === excludeId; i++) {
    pick = holes[Math.floor(Math.random() * holes.length)]!;
  }
  if (pick.id === excludeId) {
    pick = holes.find((h) => h.id !== excludeId) ?? pick;
  }
  return pick;
}

export function pickTwoDifferentHoles(
  holes: MoleHole[],
  excludeA = -1,
  excludeB = -1,
): [MoleHole, MoleHole] {
  if (holes.length < 2) {
    const only = holes[0]!;
    return [only, only];
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const a = pickRandomHole(holes, excludeA);
    const b = pickRandomHole(holes, a.id === excludeB ? excludeA : excludeB);
    if (a.id === b.id) continue;
    if (holeDistancePct(a, b) < MIN_HOLE_PAIR_DISTANCE_PCT) continue;
    return [a, b];
  }

  const shuffled = [...holes].sort(() => Math.random() - 0.5);
  let bestA = shuffled[0]!;
  let bestB = shuffled[1]!;
  let bestDist = holeDistancePct(bestA, bestB);
  for (let i = 0; i < shuffled.length; i += 1) {
    for (let j = i + 1; j < shuffled.length; j += 1) {
      const dist = holeDistancePct(shuffled[i]!, shuffled[j]!);
      if (dist > bestDist) {
        bestA = shuffled[i]!;
        bestB = shuffled[j]!;
        bestDist = dist;
      }
    }
  }
  return [bestA, bestB];
}

export function pickTwoDifferentColors<T extends { lane: number }>(pool: readonly T[]): [T, T] {
  const a = pool[Math.floor(Math.random() * pool.length)]!;
  let b = pool[Math.floor(Math.random() * pool.length)]!;
  for (let i = 0; i < 8 && b.lane === a.lane; i++) {
    b = pool[Math.floor(Math.random() * pool.length)]!;
  }
  if (b.lane === a.lane) {
    b = pool.find((c) => c.lane !== a.lane) ?? b;
  }
  return [a, b];
}
