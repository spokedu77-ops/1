import { pickSimonPolePosition } from './signals';

export type CamouflagePlacementMode = 'center' | 'variant';

/**
 * 도형 실루엣이 canvas 밖으로 잘리지 않도록 하는 보수 반경 비율.
 * 별·다이아몬드 outerR ≈ size 이므로 1.0 (하트 가로 ≈ 0.57·size).
 */
export const CAMO_SHAPE_RADIUS_RATIO = 1;

export function camoShapeSize(canvasW: number, canvasH: number): number {
  const m = Math.min(canvasW, canvasH);
  if (m <= 0) return 0;
  // 짧은 변의 35% — 지름이 짧은 변을 넘지 않도록 상한(비율≤0.49)
  return Math.min(m * 0.35, m * 0.49);
}

export function camoShapeRadius(size: number): number {
  return size * CAMO_SHAPE_RADIUS_RATIO;
}

/** 실루엣 반경이 canvas 안에 들어가도록 정규화 margin 계산 */
export function camoPlacementMargin(canvasW: number, canvasH: number, size: number): number {
  if (canvasW <= 0 || canvasH <= 0) return 0.125;
  const radius = camoShapeRadius(size);
  const marginX = radius / canvasW;
  const marginY = radius / canvasH;
  return Math.max(0.125, marginX, marginY);
}

function clamp(n: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(max, Math.max(min, n));
}

/** 반경을 고려해 좌표를 canvas 안으로 클램프 (캔버스가 도형보다 작으면 중앙) */
export function clampCamouflagePoint(
  canvasW: number,
  canvasH: number,
  cx: number,
  cy: number,
  size: number,
): { cx: number; cy: number } {
  if (canvasW <= 0 || canvasH <= 0) return { cx: 0, cy: 0 };
  const radius = camoShapeRadius(size);
  return {
    cx: clamp(cx, radius, canvasW - radius),
    cy: clamp(cy, radius, canvasH - radius),
  };
}

export function pickCamouflageCenter(
  canvasW: number,
  canvasH: number,
  size: number,
): { cx: number; cy: number } {
  return clampCamouflagePoint(canvasW, canvasH, canvasW / 2, canvasH / 2, size);
}

export function pickCamouflageVariantPosition(
  canvasW: number,
  canvasH: number,
  edgeIdx: number,
  size: number,
): { cx: number; cy: number } {
  const margin = camoPlacementMargin(canvasW, canvasH, size);
  const { posX, posY } = pickSimonPolePosition(edgeIdx, margin);
  return clampCamouflagePoint(canvasW, canvasH, posX * canvasW, posY * canvasH, size);
}

export function resolveCamouflagePosition(
  mode: CamouflagePlacementMode,
  canvasW: number,
  canvasH: number,
  edgeIdx: number,
  size: number,
): { cx: number; cy: number } {
  if (mode === 'center') return pickCamouflageCenter(canvasW, canvasH, size);
  return pickCamouflageVariantPosition(canvasW, canvasH, edgeIdx, size);
}

/**
 * setupCanvas가 ctx에 dpr 스케일을 건 상태에서 Path2D(CSS 좌표)를 검사할 때 사용.
 * isPointInPath의 (x,y)는 비트맵 좌표이고, path에는 CTM이 적용된다.
 */
export function isCamoCssPointInPath(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  cssX: number,
  cssY: number,
  dpr: number,
): boolean {
  const s = dpr > 0 ? dpr : 1;
  return ctx.isPointInPath(path, cssX * s, cssY * s);
}
