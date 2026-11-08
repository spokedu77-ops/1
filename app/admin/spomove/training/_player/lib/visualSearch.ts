import type { ColorStimulusCounts } from './trainingResultSummary';

export const VISUAL_SEARCH_REVEAL_SECONDS = 3;
export const VISUAL_SEARCH_ZONES = [
  { id: 'red', name: '빨강', color: '#ef4444' },
  { id: 'yellow', name: '노랑', color: '#facc15' },
  { id: 'green', name: '초록', color: '#22c55e' },
  { id: 'blue', name: '파랑', color: '#3b82f6' },
] as const;

export type SearchShape = {
  x: number; y: number; zone: number; offset: number;
  color: 'red' | 'blue'; type: 'circle' | 'square'; target: boolean;
};

export function normalizeSearchSeconds(value?: number) {
  return Number.isFinite(value) ? Math.min(10, Math.max(1, Math.round(value! * 2) / 2)) : 5;
}

export function normalizeSearchReps(value?: number) {
  return [10, 20, 30, 40].includes(value ?? 0) ? value! : 20;
}

/** Normalized positions survive resize; each stimulus remains inside its SPOMAT zone. */
export function generateSearchShapes(round: number, random = Math.random): SearchShape[] {
  const count = Math.min(80, 20 + round * 10);
  const targetIndex = Math.floor(random() * count);
  const slots = Array.from({ length: 80 }, (_, index) => index);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  return Array.from({ length: count }, (_, index) => {
    const slot = slots[index]!;
    const zone = Math.floor(slot / 20);
    const local = slot % 20;
    const target = index === targetIndex;
    const square = round >= 3 && !target && random() > 0.5;
    return {
      zone, target, x: (zone % 2) * 0.5 + 0.05 + (local % 5) * 0.1,
      y: Math.floor(zone / 2) * 0.5 + 0.085 + Math.floor(local / 5) * 0.11,
      offset: random() * Math.PI * 2,
      color: target ? (round < 3 ? 'red' : 'blue') : square ? 'red' : 'blue',
      type: target ? (round < 3 ? 'circle' : 'square') : square ? 'square' : 'circle',
    };
  });
}

/** Bounded, elapsed-time motion cannot cross the quadrant border or depend on FPS. */
export function searchShapePosition(shape: SearchShape, round: number, elapsedSeconds: number) {
  const motion = round >= 5 ? 0.008 : 0;
  return { x: shape.x + Math.cos(elapsedSeconds + shape.offset) * motion,
    y: shape.y + Math.sin(elapsedSeconds + shape.offset) * motion };
}

export function registerSearchTask(counts: ColorStimulusCounts, shapes: SearchShape[]) {
  const target = shapes.find(shape => shape.target)!;
  const id = VISUAL_SEARCH_ZONES[target.zone]!.id;
  return { ...counts, [id]: counts[id] + 1 };
}
