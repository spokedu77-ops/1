/** Pure stimulus model for the SPOMOVE visual-search activity.
 * The four on-screen zones follow the existing participant-facing SPOMAT layout:
 * top-left red, top-right yellow, bottom-left green, bottom-right blue.
 * Each round presents exactly one target; a presented target is NOT a scored hit.
 */
export type VisualSearchZone = 0 | 1 | 2 | 3;
export type VisualSearchShapeType = 'CIRCLE' | 'SQUARE';
export type VisualSearchStage = 'pop-out' | 'conjunction' | 'moving';

export type VisualSearchShape = {
  x: number;
  y: number;
  zone: VisualSearchZone;
  type: VisualSearchShapeType;
  color: string;
  isTarget: boolean;
  animOffset: number;
};
export type VisualSearchRound = {
  shapes: VisualSearchShape[];
  targetIndex: number;
  targetZone: VisualSearchZone;
  stage: VisualSearchStage;
};

export const VISUAL_SEARCH_ZONE_COLORS = [
  '#EF4444', // top left: red
  '#FACC15', // top right: yellow
  '#22C55E', // bottom left: green
  '#3B82F6', // bottom right: blue
] as const;

export const VISUAL_SEARCH_ALLOWED_COUNTS = [10, 20, 30, 40] as const;
export const VISUAL_SEARCH_REVEAL_MS = 1500;

export function visualSearchStage(round: number): VisualSearchStage {
  return round >= 5 ? 'moving' : round >= 3 ? 'conjunction' : 'pop-out';
}

export function visualSearchStimulusCount(round: number): number {
  return Math.min(80, 20 + Math.max(1, Math.floor(round)) * 10);
}

export function normalizeVisualSearchSpeed(seconds: number): number {
  if (!Number.isFinite(seconds)) return 5;
  return Math.min(10, Math.max(1, Math.round(seconds * 2) / 2));
}

export function normalizeVisualSearchRounds(rounds: number): number {
  return VISUAL_SEARCH_ALLOWED_COUNTS.includes(rounds as (typeof VISUAL_SEARCH_ALLOWED_COUNTS)[number])
    ? rounds
    : 20;
}

function randomZone(random: () => number): VisualSearchZone {
  return Math.min(3, Math.floor(Math.max(0, random()) * 4)) as VisualSearchZone;
}

export function zoneAt(x: number, y: number, width: number, height: number): VisualSearchZone {
  const right = x >= width / 2;
  const bottom = y >= height / 2;
  return (bottom ? (right ? 3 : 2) : (right ? 1 : 0));
}

export function buildVisualSearchRound(
  round: number,
  width: number,
  height: number,
  random: () => number = Math.random,
): VisualSearchRound {
  const safeWidth = Math.max(320, width);
  const safeHeight = Math.max(240, height);
  const stage = visualSearchStage(round);
  const numShapes = visualSearchStimulusCount(round);
  const halfWidth = safeWidth / 2;
  const halfHeight = safeHeight / 2;
  // Reserve the central split and screen edges. Movement never crosses the split.
  const insetX = Math.min(halfWidth * 0.3, Math.max(20, safeWidth * 0.045));
  const insetY = Math.min(halfHeight * 0.3, Math.max(18, safeHeight * 0.045));
  const shapes: VisualSearchShape[] = Array.from({ length: numShapes }, () => {
    const zone = randomZone(random);
    const right = zone === 1 || zone === 3;
    const bottom = zone === 2 || zone === 3;
    const x = (right ? halfWidth : 0) + insetX + random() * (halfWidth - 2 * insetX);
    const y = (bottom ? halfHeight : 0) + insetY + random() * (halfHeight - 2 * insetY);
    // Distractors: blue circles or red squares in conjunction mode.
    const blue = stage === 'pop-out' || random() >= 0.5;
    return {
      x,
      y,
      zone,
      type: blue ? 'CIRCLE' : 'SQUARE',
      color: blue ? '#3B82F6' : '#EF4444',
      isTarget: false,
      animOffset: random() * Math.PI * 2,
    };
  });
  const targetIndex = Math.min(numShapes - 1, Math.floor(random() * numShapes));
  const target = shapes[targetIndex]!;
  target.isTarget = true;
  // Pop-out: one red circle. Conjunction: one blue square.
  target.type = stage === 'pop-out' ? 'CIRCLE' : 'SQUARE';
  target.color = stage === 'pop-out' ? '#EF4444' : '#3B82F6';
  return { shapes, targetIndex, targetZone: target.zone, stage };
}

/** Compatibility with existing ReactTrainCompleteStats lane order: red, blue, green, yellow. */
export function zonesToReactTrainLanes(zones: readonly number[]): [number, number, number, number] {
  return [zones[0] ?? 0, zones[3] ?? 0, zones[2] ?? 0, zones[1] ?? 0];
}
