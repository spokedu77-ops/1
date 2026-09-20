import { COLORS, spatialArrowFillForDirection } from '../constants';

export type RelativeCompassDifficulty = 'easy' | 'normal' | 'hard';
export type RelativeCompassSeconds = 2 | 3 | 4 | 5 | 6;
export type RelativeCompassPosition = { x: 0 | 1; y: 0 | 1 };
export type RelativeDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

const CARDINALS: RelativeDirection[] = ['up', 'down', 'left', 'right'];
const DIAGONALS: RelativeDirection[] = ['up-left', 'up-right', 'down-left', 'down-right'];

const VECTOR: Record<RelativeDirection, { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }> = {
  up: { dx: 0, dy: -1 },
  'up-right': { dx: 1, dy: -1 },
  right: { dx: 1, dy: 0 },
  'down-right': { dx: 1, dy: 1 },
  down: { dx: 0, dy: 1 },
  'down-left': { dx: -1, dy: 1 },
  left: { dx: -1, dy: 0 },
  'up-left': { dx: -1, dy: -1 },
};

const PAD_AT: Record<string, (typeof COLORS)[number]> = {
  '0,0': COLORS.find((c) => c.id === 'red')!,
  '1,0': COLORS.find((c) => c.id === 'yellow')!,
  '0,1': COLORS.find((c) => c.id === 'green')!,
  '1,1': COLORS.find((c) => c.id === 'blue')!,
};

const ARROW_META: Record<RelativeDirection, { id: RelativeDirection; label: string; icon: string }> = {
  up: { id: 'up', label: '위', icon: '↑' },
  down: { id: 'down', label: '아래', icon: '↓' },
  left: { id: 'left', label: '왼쪽', icon: '←' },
  right: { id: 'right', label: '오른쪽', icon: '→' },
  'up-left': { id: 'up-left', label: '왼쪽 위', icon: '↖' },
  'up-right': { id: 'up-right', label: '오른쪽 위', icon: '↗' },
  'down-left': { id: 'down-left', label: '왼쪽 아래', icon: '↙' },
  'down-right': { id: 'down-right', label: '오른쪽 아래', icon: '↘' },
};

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

export function padAt(pos: RelativeCompassPosition) {
  return PAD_AT[`${pos.x},${pos.y}`]!;
}

export function randomStartPosition(): RelativeCompassPosition {
  return { x: Math.random() < 0.5 ? 0 : 1, y: Math.random() < 0.5 ? 0 : 1 };
}

export function applyDirection(
  pos: RelativeCompassPosition,
  direction: RelativeDirection,
): RelativeCompassPosition | null {
  const { dx, dy } = VECTOR[direction];
  const x = pos.x + dx;
  const y = pos.y + dy;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x: x as 0 | 1, y: y as 0 | 1 };
}

export function compassPool(difficulty: RelativeCompassDifficulty): readonly RelativeDirection[] {
  return difficulty === 'hard' ? [...CARDINALS, ...DIAGONALS] : CARDINALS;
}

export function validDirections(
  pos: RelativeCompassPosition,
  difficulty: RelativeCompassDifficulty,
): RelativeDirection[] {
  return compassPool(difficulty).filter((direction) => applyDirection(pos, direction) !== null);
}

export function pickDirection(
  pos: RelativeCompassPosition,
  difficulty: RelativeCompassDifficulty,
): RelativeDirection {
  return pick(validDirections(pos, difficulty));
}

export function arrowFillHex(
  direction: RelativeDirection,
  difficulty: RelativeCompassDifficulty,
): string {
  if (difficulty === 'easy') return '#FFFFFF';
  if (CARDINALS.includes(direction)) return spatialArrowFillForDirection(direction, COLORS, 'compass');
  return '#FFFFFF';
}

export function buildStartSignal(pos: RelativeCompassPosition): Record<string, unknown> {
  const color = padAt(pos);
  return {
    type: 'full_color',
    bg: color.bg,
    content: {
      colorId: color.id,
      symbol: color.symbol,
      textColor: color.text,
      name: color.name,
      imageUrl: null,
    },
    voice: null,
  };
}

export function buildArrowSignal(
  direction: RelativeDirection,
  difficulty: RelativeCompassDifficulty,
): Record<string, unknown> {
  return {
    type: 'arrow',
    bg: '#000000',
    content: {
      ...ARROW_META[direction],
      fillHex: arrowFillHex(direction, difficulty),
    },
    voice: null,
  };
}
