/**
 * ColorGate shared definitions.
 *
 * This module intentionally does not decide bridge lanes. ColorGate is its own
 * stage mode; the lab engine renders gates directly in the shared background.
 */

import type { FlowModuleKey } from './flowModules';

export const GATE_COLOR_IDS = ['red', 'yellow', 'green', 'blue'] as const;
export type GateColorId = (typeof GATE_COLOR_IDS)[number];
export const PLAYABLE_GATE_COLOR_IDS = GATE_COLOR_IDS;

export interface GateColorDef {
  bg: string;
  label: string;
  text: string;
  hex: number;
}

export const GATE_COLORS: Record<GateColorId, GateColorDef> = {
  red:    { bg: '#b91c1c', label: '빨강', text: '#ffffff', hex: 0xb91c1c },
  yellow: { bg: '#ca8a04', label: '노랑', text: '#111827', hex: 0xca8a04 },
  green:  { bg: '#15803d', label: '초록', text: '#ffffff', hex: 0x15803d },
  blue:   { bg: '#1d4ed8', label: '파랑', text: '#ffffff', hex: 0x1d4ed8 },
};

export const COLOR_GATE_POSE_IMAGE_URL = '/spomove/dive/color-gate/lunge-reach.png';
export const COLOR_GATE_POSE_IMAGE_URLS = [
  '/spomove/dive/color-gate/lunge-reach.png',
  '/spomove/dive/color-gate/2d6432ee-9de6-4fa1-b688-57a1cfd63474.png',
  '/spomove/dive/color-gate/e265bc34-9722-408c-8235-29a64fc2254c.png',
  '/spomove/dive/color-gate/f00b1d2b-1251-4b6f-9567-b3ffedb2b27e.png',
] as const;
export const COLOR_GATE_ACTION_SEQUENCE: FlowModuleKey[] = ['jump', 'punch', 'kick', 'duck', 'reach'];

export const COLOR_GATE_POSE_LABELS: Record<FlowModuleKey, string> = {
  jump: '점프',
  punch: '펀치',
  kick: '킥',
  duck: '숙이기',
  reach: '런지 펀치',
  faster: '속도 올리기',
  colorGate: '색 포즈 관문',
};

export const COLOR_GATE_POSE_INSTRUCTIONS: Record<FlowModuleKey, string> = {
  jump: '양발로 가볍게 점프하세요',
  punch: '앞으로 주먹을 뻗어 펀치하세요',
  kick: '한쪽 발을 들어 앞으로 차세요',
  duck: '몸을 빠르게 낮춰 숙이세요',
  reach: '한쪽 다리를 앞으로 굽히고 팔을 앞으로 뻗으세요',
  faster: '속도를 유지하세요',
  colorGate: '색 관문을 통과하세요',
};

/** 구 import 호환 — 오버레이로 QA 클릭이 막히지 않게 alias 유지 */
export const COLOR_GATE_POSE_LABEL = COLOR_GATE_POSE_LABELS;
export const COLOR_GATE_POSE_INSTRUCTION = COLOR_GATE_POSE_INSTRUCTIONS;
export const COLOR_GATE_FIXED_COLOR_ID = 'red' as GateColorId;

const SILHOUETTE_ALPHA_MIN = 16;
const SILHOUETTE_LUMA_MAX = 150;
const SILHOUETTE_RGB = { r: 10, g: 10, b: 12 };

let poseImageCache: HTMLImageElement | null = null;
let poseImageLoadPromise: Promise<HTMLImageElement | null> | null = null;
let poseImagesCache: HTMLImageElement[] | null = null;
let poseImagesLoadPromise: Promise<HTMLImageElement[]> | null = null;

export function preloadColorGatePoseImage(): Promise<HTMLImageElement | null> {
  if (poseImageCache) return Promise.resolve(poseImageCache);
  if (poseImageLoadPromise) return poseImageLoadPromise;

  poseImageLoadPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      poseImageCache = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = COLOR_GATE_POSE_IMAGE_URL;
  });
  return poseImageLoadPromise;
}

export function preloadColorGatePoseImages(): Promise<HTMLImageElement[]> {
  if (poseImagesCache) return Promise.resolve(poseImagesCache);
  if (poseImagesLoadPromise) return poseImagesLoadPromise;

  poseImagesLoadPromise = Promise.all(
    COLOR_GATE_POSE_IMAGE_URLS.map((url) => new Promise<HTMLImageElement | null>((resolve) => {
      if (typeof window === 'undefined') {
        resolve(null);
        return;
      }
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    })),
  ).then((images) => {
    const loaded = images.filter((img): img is HTMLImageElement => img !== null);
    poseImagesCache = loaded;
    if (!poseImageCache && loaded[0]) poseImageCache = loaded[0];
    return loaded;
  });
  return poseImagesLoadPromise;
}

export function buildColorGateCue(gateColorId: GateColorId): string {
  return `${GATE_COLORS[gateColorId].label}으로!`;
}

export function buildColorGateInstruction(gateColorId: GateColorId, action: FlowModuleKey): string {
  const color = GATE_COLORS[gateColorId];
  return `${color.label} 패드로 이동한 뒤 「${COLOR_GATE_POSE_LABELS[action]}」 자세를 취하세요`;
}

export function buildColorGateSilhouetteCanvas(
  poseImage: HTMLImageElement,
  lowRes: boolean,
): HTMLCanvasElement {
  const w = lowRes ? 128 : 192;
  const h = lowRes ? 192 : 288;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sample = document.createElement('canvas');
  sample.width = w;
  sample.height = h;
  const sampleCtx = sample.getContext('2d');
  if (!sampleCtx) return canvas;

  const scale = Math.min(w / poseImage.width, h / poseImage.height) * 0.9;
  const dw = poseImage.width * scale;
  const dh = poseImage.height * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  sampleCtx.drawImage(poseImage, dx, dy, dw, dh);

  const sampleData = sampleCtx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < out.data.length; i += 4) {
    const alpha = sampleData.data[i + 3]!;
    const luma =
      0.2126 * sampleData.data[i]!
      + 0.7152 * sampleData.data[i + 1]!
      + 0.0722 * sampleData.data[i + 2]!;
    if (alpha >= SILHOUETTE_ALPHA_MIN && luma <= SILHOUETTE_LUMA_MAX) {
      out.data[i] = SILHOUETTE_RGB.r;
      out.data[i + 1] = SILHOUETTE_RGB.g;
      out.data[i + 2] = SILHOUETTE_RGB.b;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return canvas;
}
