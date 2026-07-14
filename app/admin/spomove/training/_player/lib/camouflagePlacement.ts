import { pickSimonPolePosition } from './signals';

export type CamouflagePlacementMode = 'center' | 'variant';

/** 도형 실루엣이 canvas 밖으로 잘리지 않도록 하는 보수 반경 비율 — 별·플러스·화살표 등 최대 외곽 ≈ size */
export const CAMO_SHAPE_RADIUS_RATIO = 0.55;

export function camoShapeSize(canvasW: number, canvasH: number): number {
  return Math.min(canvasW, canvasH) * 0.35;
}

export function camoShapeRadius(size: number): number {
  return size * CAMO_SHAPE_RADIUS_RATIO;
}

/** 실루엣 반경이 canvas 안에 들어가도록 정규화 margin 계산 */
export function camoPlacementMargin(canvasW: number, canvasH: number, size: number): number {
  const radius = camoShapeRadius(size);
  const marginX = radius / canvasW;
  const marginY = radius / canvasH;
  return Math.max(0.125, marginX, marginY);
}

export function pickCamouflageCenter(canvasW: number, canvasH: number): { cx: number; cy: number } {
  return { cx: canvasW / 2, cy: canvasH / 2 };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pickCamouflageVariantPosition(
  canvasW: number,
  canvasH: number,
  edgeIdx: number,
  size: number,
): { cx: number; cy: number } {
  const margin = camoPlacementMargin(canvasW, canvasH, size);
  const { posX, posY } = pickSimonPolePosition(edgeIdx, margin);
  const radius = camoShapeRadius(size);
  return {
    cx: clamp(posX * canvasW, radius, canvasW - radius),
    cy: clamp(posY * canvasH, radius, canvasH - radius),
  };
}

export function resolveCamouflagePosition(
  mode: CamouflagePlacementMode,
  canvasW: number,
  canvasH: number,
  edgeIdx: number,
  size: number,
): { cx: number; cy: number } {
  if (mode === 'center') return pickCamouflageCenter(canvasW, canvasH);
  return pickCamouflageVariantPosition(canvasW, canvasH, edgeIdx, size);
}
