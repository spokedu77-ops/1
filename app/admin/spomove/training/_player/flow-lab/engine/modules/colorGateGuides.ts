/**
 * 색 포즈 관문 — 4색 배경 + 포즈 실루엣 SSOT
 */

import type { FlowModuleKey } from './flowModules';

export const GATE_COLOR_IDS = ['red', 'yellow', 'green', 'blue'] as const;
export type GateColorId = (typeof GATE_COLOR_IDS)[number];

export interface GateColorDef {
  bg: string;
  label: string;
  text: string;
}

export const GATE_COLORS: Record<GateColorId, GateColorDef> = {
  red:    { bg: '#b91c1c', label: '빨강', text: '#ffffff' },
  yellow: { bg: '#ca8a04', label: '노랑', text: '#111827' },
  green:  { bg: '#15803d', label: '초록', text: '#ffffff' },
  blue:   { bg: '#1d4ed8', label: '파랑', text: '#ffffff' },
};

/** 3레인 합쳐 문 너비 (BridgeRenderer.LANE_WIDTH × 3) */
export const COLOR_GATE_SPAN_LANES = 3;

/** 제공 포즈 PNG (배경 사진 → 실루엣 추출) */
export const COLOR_GATE_POSE_IMAGE_URL = '/spomove/dive/color-gate/lunge-reach.png';

/** Phase 1: 런지+앞팔 뻗기 포즈 1종만 */
export const COLOR_GATE_POSE_LABEL = '런지 펀치';
export const COLOR_GATE_POSE_INSTRUCTION =
  '한쪽 다리를 앞으로 굽히고 팔을 앞으로 뻗으세요';

/** 관문 동작 순서 (추후 5종 확장) */
export const COLOR_GATE_ACTION_SEQUENCE: FlowModuleKey[] = ['reach'];

let poseImageCache: HTMLImageElement | null = null;
let poseImageLoadPromise: Promise<HTMLImageElement | null> | null = null;

export function preloadColorGatePoseImage(): Promise<HTMLImageElement | null> {
  if (poseImageCache) return Promise.resolve(poseImageCache);
  if (poseImageLoadPromise) return poseImageLoadPromise;

  poseImageLoadPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      poseImageCache = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = COLOR_GATE_POSE_IMAGE_URL;
  });
  return poseImageLoadPromise;
}

export function pickRandomGateColor(): GateColorId {
  return GATE_COLOR_IDS[Math.floor(Math.random() * GATE_COLOR_IDS.length)]!;
}

export function buildColorGateCue(gateColorId: GateColorId, _actionCue?: string): string {
  return `${GATE_COLORS[gateColorId].label}으로!`;
}

export function buildColorGateInstruction(gateColorId: GateColorId): string {
  const color = GATE_COLORS[gateColorId];
  return `${color.label} 패드로 이동한 뒤 「${COLOR_GATE_POSE_LABEL}」 자세를 취하세요`;
}

const SILHOUETTE_LUM_THRESHOLD = 105;

/** 게이트 패널 캔버스 — 배경색 + 포즈 실루엣 (4색 × 1회만 생성) */
export function buildColorGatePanelCanvas(
  gateColorId: GateColorId,
  action: FlowModuleKey,
  poseImage: HTMLImageElement | null,
  lowRes: boolean,
): HTMLCanvasElement {
  const w = lowRes ? 256 : 768;
  const h = lowRes ? 384 : 1152;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = GATE_COLORS[gateColorId].bg;
  ctx.fillRect(0, 0, w, h);

  if (poseImage) {
    const scale = Math.min(w / poseImage.width, h / poseImage.height) * 0.88;
    const dw = poseImage.width * scale;
    const dh = poseImage.height * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    const sample = document.createElement('canvas');
    sample.width = w;
    sample.height = h;
    const sctx = sample.getContext('2d');
    if (sctx) {
      sctx.drawImage(poseImage, dx, dy, dw, dh);
      const src = sctx.getImageData(0, 0, w, h);
      const out = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < src.data.length; i += 4) {
        const lum =
          0.299 * src.data[i]!
          + 0.587 * src.data[i + 1]!
          + 0.114 * src.data[i + 2]!;
        if (lum < SILHOUETTE_LUM_THRESHOLD) {
          out.data[i] = 20;
          out.data[i + 1] = 24;
          out.data[i + 2] = 32;
          out.data[i + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
      return canvas;
    }
  }

  ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
  ctx.save();
  ctx.scale(w / 120, h / 200);
  for (const d of getPoseSilhouettePaths(action)) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
  return canvas;
}

/** SVG 폴백 (이미지 로드 실패 시) */
export function getPoseSilhouettePaths(action: FlowModuleKey): string[] {
  const lungeReach = [
    'M72 52 C64 52 58 58 56 66 L52 98 C50 108 54 118 62 122 L58 152 L52 182 L62 182 L66 154 L70 154 L74 182 L84 182 L78 152 L74 122 C82 118 86 108 84 98 L80 66 C78 58 72 52 64 52 Z',
    'M56 78 L18 72 L14 80 L52 88 Z',
    'M62 122 L48 168 L38 178 L44 186 L58 158 L68 130 Z',
    'M74 122 L88 168 L98 178 L92 186 L78 158 L68 130 Z',
  ];
  if (action === 'reach') return lungeReach;
  return lungeReach;
}
