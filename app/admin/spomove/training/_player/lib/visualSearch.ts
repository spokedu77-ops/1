import type { ColorStimulusCounts } from './trainingResultSummary';

export const VISUAL_SEARCH_REVEAL_SECONDS = 3;
export const VISUAL_SEARCH_WHITE = '#F8FAFC';
export const VISUAL_SEARCH_GRAY = '#64748B';
export const VISUAL_SEARCH_ZONES = [
  { id: 'red', name: '빨강', color: '#ef4444', fill: '#441B25' },
  { id: 'yellow', name: '노랑', color: '#facc15', fill: '#39300F' },
  { id: 'green', name: '초록', color: '#22c55e', fill: '#103323' },
  { id: 'blue', name: '파랑', color: '#3b82f6', fill: '#182F53' },
] as const;

export type SearchShape = {
  x: number; y: number; zone: number; offset: number;
  color: typeof VISUAL_SEARCH_WHITE | typeof VISUAL_SEARCH_GRAY; type: 'cross' | 'plus'; target: boolean;
};

export type VisualSearchStage = 1 | 2;
export type VisualSearchTargetCount = 1 | 2;
export function normalizeSearchStage(value?: number): VisualSearchStage { return value === 2 ? 2 : 1; }
export function normalizeSearchTargetCount(stage?: number, value?: number): VisualSearchTargetCount {
  return normalizeSearchStage(stage) === 2 && value === 2 ? 2 : 1;
}

export function normalizeSearchSeconds(value?: number) {
  return Number.isFinite(value) ? Math.min(6, Math.max(1, Math.round(value! * 2) / 2)) : 5;
}

export function normalizeSearchReps(value?: number) {
  return [5, 10, 15, 20, 30, 40].includes(value ?? 0) ? value! : 20;
}

export function isSearchSymbolOnlyRound(stage: VisualSearchStage, round: number, totalRounds: number) {
  return stage === 1 && round <= Math.floor(normalizeSearchReps(totalRounds) / 2);
}

export function getVisualSearchShapeCount(stage: VisualSearchStage, round: number, totalRounds: number): number {
  const start = stage === 1 ? 10 : 20;
  const max = stage === 1 ? 30 : 60;
  const total = normalizeSearchReps(totalRounds);
  const safeRound = Number.isFinite(round) ? Math.max(1, Math.min(total, round)) : 1;
  return Math.round(start + (max - start) * (safeRound - 1) / (total - 1));
}

/** Four by four slots per zone leave room for labels, shape radius and bounded motion. */
export function generateSearchShapes(options: {
  stage: VisualSearchStage; targetCount: VisualSearchTargetCount; round: number; totalRounds: number;
  targetVariantOffset?: number;
}, random = Math.random): SearchShape[] {
  const { stage, round, totalRounds } = options;
  const count = getVisualSearchShapeCount(stage, round, totalRounds);
  const targetCount = normalizeSearchTargetCount(stage, options.targetCount);
  // Symbol-only rounds alternate the rare shape; conjunction rounds cycle all
  // four combinations. Neither repeats the previous round's target.
  const baseVariant = ((round - 1 + (options.targetVariantOffset ?? 0)) % 4 + 4) % 4;
  const variant = isSearchSymbolOnlyRound(stage, round, totalRounds) ? baseVariant % 2 : baseVariant;
  const targetType: SearchShape['type'] = variant % 2 === 0 ? 'cross' : 'plus';
  const otherType: SearchShape['type'] = targetType === 'cross' ? 'plus' : 'cross';
  const targetColor = variant < 2 ? VISUAL_SEARCH_WHITE : VISUAL_SEARCH_GRAY;
  const otherColor = targetColor === VISUAL_SEARCH_WHITE ? VISUAL_SEARCH_GRAY : VISUAL_SEARCH_WHITE;
  const slots = Array.from({ length: 64 }, (_, index) => index);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j]!, slots[i]!];
  }
  // Select target slots first, guaranteeing different zones without retry loops.
  const first = slots[0]!;
  const targets = targetCount === 2 ? [first, slots.find(slot => Math.floor(slot / 16) !== Math.floor(first / 16))!] : [first];
  const selected = [...targets, ...slots.filter(slot => !targets.includes(slot))].slice(0, count);
  return selected.map((slot, index) => {
    const zone = Math.floor(slot / 16);
    const local = slot % 16;
    const target = index < targetCount;
    const sameColor = target || isSearchSymbolOnlyRound(stage, round, totalRounds) || (index - targetCount) % 2 === 0;
    return {
      zone, target, x: (zone % 2) * 0.5 + 0.08 + (local % 4) * 0.11,
      y: Math.floor(zone / 2) * 0.5 + 0.13 + Math.floor(local / 4) * 0.10,
      offset: random() * Math.PI * 2,
      color: sameColor ? targetColor : otherColor,
      type: target || !sameColor ? targetType : otherType,
    };
  });
}

/** Two straight segments per symbol; no image, font glyph, texture, or shadow. */
export function drawSearchSymbol(ctx: CanvasRenderingContext2D, shape: SearchShape, x: number, y: number, radius: number) {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = Math.max(2, radius * 0.38);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  if (shape.type === 'plus') {
    ctx.moveTo(x - radius, y); ctx.lineTo(x + radius, y);
    ctx.moveTo(x, y - radius); ctx.lineTo(x, y + radius);
  } else {
    const diagonal = radius * 0.78;
    ctx.moveTo(x - diagonal, y - diagonal); ctx.lineTo(x + diagonal, y + diagonal);
    ctx.moveTo(x - diagonal, y + diagonal); ctx.lineTo(x + diagonal, y - diagonal);
  }
  ctx.stroke();
}

/** Bounded, elapsed-time motion cannot cross the quadrant border or depend on FPS. */
export function searchShapePosition(shape: SearchShape, stage: VisualSearchStage, elapsedSeconds: number) {
  const motion = stage === 2 ? 0.008 : 0;
  return { x: shape.x + Math.cos(elapsedSeconds + shape.offset) * motion,
    y: shape.y + Math.sin(elapsedSeconds + shape.offset) * motion };
}

export function registerSearchTask(counts: ColorStimulusCounts, shapes: SearchShape[]) {
  const next = { ...counts };
  for (const target of shapes.filter(shape => shape.target)) {
    const id = VISUAL_SEARCH_ZONES[target.zone]!.id;
    next[id] += 1;
  }
  return next;
}
