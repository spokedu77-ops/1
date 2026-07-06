export type MoleHole = {
  id: number;
  xPct: number;
  yPct: number;
  scale?: number;
  rotateDeg?: number;
};

/** 단일 화면: 15개 구멍 (% 좌표, play field 기준) */
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

/** 2패널 — 왼쪽 (패널 내부 % 좌표) */
export const MOLE_HOLES_LEFT: MoleHole[] = [
  { id: 100, xPct: 14, yPct: 14, scale: 0.95 },
  { id: 101, xPct: 38, yPct: 10, scale: 1.05, rotateDeg: 3 },
  { id: 102, xPct: 62, yPct: 16, scale: 0.98 },
  { id: 103, xPct: 82, yPct: 24, scale: 1.02, rotateDeg: -4 },
  { id: 104, xPct: 10, yPct: 38, scale: 1.0 },
  { id: 105, xPct: 32, yPct: 34, scale: 0.96 },
  { id: 106, xPct: 56, yPct: 40, scale: 1.08 },
  { id: 107, xPct: 78, yPct: 44, scale: 0.94, rotateDeg: 5 },
  { id: 108, xPct: 18, yPct: 58, scale: 1.04 },
  { id: 109, xPct: 42, yPct: 54, scale: 0.97 },
  { id: 110, xPct: 66, yPct: 60, scale: 1.06 },
  { id: 111, xPct: 24, yPct: 76, scale: 0.95, rotateDeg: -3 },
  { id: 112, xPct: 50, yPct: 72, scale: 1.02 },
  { id: 113, xPct: 74, yPct: 78, scale: 0.98 },
];

/** 2패널 — 오른쪽 (패널 내부 % 좌표) */
export const MOLE_HOLES_RIGHT: MoleHole[] = [
  { id: 200, xPct: 16, yPct: 12, scale: 1.0, rotateDeg: 4 },
  { id: 201, xPct: 40, yPct: 18, scale: 0.96 },
  { id: 202, xPct: 64, yPct: 10, scale: 1.04 },
  { id: 203, xPct: 84, yPct: 20, scale: 0.98 },
  { id: 204, xPct: 12, yPct: 36, scale: 1.06, rotateDeg: -5 },
  { id: 205, xPct: 36, yPct: 42, scale: 0.94 },
  { id: 206, xPct: 58, yPct: 36, scale: 1.02 },
  { id: 207, xPct: 80, yPct: 40, scale: 0.97 },
  { id: 208, xPct: 20, yPct: 56, scale: 1.05 },
  { id: 209, xPct: 44, yPct: 62, scale: 0.95, rotateDeg: 3 },
  { id: 210, xPct: 68, yPct: 58, scale: 1.08 },
  { id: 211, xPct: 28, yPct: 74, scale: 0.96 },
  { id: 212, xPct: 52, yPct: 78, scale: 1.0 },
  { id: 213, xPct: 76, yPct: 74, scale: 1.03, rotateDeg: -4 },
];

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
