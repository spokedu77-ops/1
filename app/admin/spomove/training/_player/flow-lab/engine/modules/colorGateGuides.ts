/**
 * ColorGate shared definitions.
 *
 * 2단계 Color Gate 전용 포즈 키 — 1단계 장애물(FlowModuleKey)과 분리.
 */

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

/** Color Gate 실루엣 포즈 — 이미지 파일명(stem)과 1:1 */
export type ColorGatePoseKey =
  | 'jump'
  | 'kick'
  | 'side-squat'
  | 'lunge-reach'
  | 'star'
  | 'high-knee'
  | 'single-leg-balance'
  | 'side-lunge'
  | 'bridge'
  | 'plank'
  | 'side-plank'
  | 'bird-dog'
  | 'v-sit'
  | 'seated-toe-touch'
  | 'downward-dog'
  | 'partner-hold'
  | 'partner-squat'
  | 'partner-high-five';

export const COLOR_GATE_POSE_IMAGE_MAP: Record<ColorGatePoseKey, string> = {
  jump:                 '/spomove/dive/color-gate/jump.png',
  kick:                 '/spomove/dive/color-gate/kick.png',
  'side-squat':         '/spomove/dive/color-gate/side-squat.png',
  'lunge-reach':        '/spomove/dive/color-gate/lunge-reach.png',
  star:                 '/spomove/dive/color-gate/star.png',
  'high-knee':          '/spomove/dive/color-gate/high-knee.png',
  'single-leg-balance': '/spomove/dive/color-gate/single-leg-balance.png',
  'side-lunge':         '/spomove/dive/color-gate/side-lunge.png',
  bridge:               '/spomove/dive/color-gate/bridge.png',
  plank:                '/spomove/dive/color-gate/plank.png',
  'side-plank':         '/spomove/dive/color-gate/side-plank.png',
  'bird-dog':           '/spomove/dive/color-gate/bird-dog.png',
  'v-sit':              '/spomove/dive/color-gate/v-sit.png',
  'seated-toe-touch':   '/spomove/dive/color-gate/seated-toe-touch.png',
  'downward-dog':       '/spomove/dive/color-gate/downward-dog.png',
  'partner-hold':       '/spomove/dive/color-gate/partner-hold.png',
  'partner-squat':      '/spomove/dive/color-gate/partner-squat.png',
  'partner-high-five':  '/spomove/dive/color-gate/partner-high-five.png',
};

/** 관문에서 순환 제시할 포즈 순서 */
export const COLOR_GATE_POSE_SEQUENCE: ColorGatePoseKey[] = [
  'jump',
  'kick',
  'side-squat',
  'lunge-reach',
  'star',
  'high-knee',
  'single-leg-balance',
  'side-lunge',
  'bridge',
  'plank',
  'side-plank',
  'bird-dog',
  'v-sit',
  'seated-toe-touch',
  'downward-dog',
  'partner-hold',
  'partner-squat',
  'partner-high-five',
];

/** HUD 라벨 — 이미지 파일명(stem)과 동일 */
export const COLOR_GATE_POSE_LABELS: Record<ColorGatePoseKey, string> = {
  jump:                 'jump',
  kick:                 'kick',
  'side-squat':         'side-squat',
  'lunge-reach':        'lunge-reach',
  star:                 'star',
  'high-knee':          'high-knee',
  'single-leg-balance': 'single-leg-balance',
  'side-lunge':         'side-lunge',
  bridge:               'bridge',
  plank:                'plank',
  'side-plank':         'side-plank',
  'bird-dog':           'bird-dog',
  'v-sit':              'v-sit',
  'seated-toe-touch':   'seated-toe-touch',
  'downward-dog':       'downward-dog',
  'partner-hold':       'partner-hold',
  'partner-squat':      'partner-squat',
  'partner-high-five':  'partner-high-five',
};

export const COLOR_GATE_POSE_INSTRUCTIONS: Record<ColorGatePoseKey, string> = {
  jump:                 'jump 자세를 취하세요',
  kick:                 'kick 자세를 취하세요',
  'side-squat':         'side-squat 자세를 취하세요',
  'lunge-reach':        'lunge-reach 자세를 취하세요',
  star:                 'star 자세를 취하세요',
  'high-knee':          'high-knee 자세를 취하세요',
  'single-leg-balance': 'single-leg-balance 자세를 취하세요',
  'side-lunge':         'side-lunge 자세를 취하세요',
  bridge:               'bridge 자세를 취하세요',
  plank:                'plank 자세를 취하세요',
  'side-plank':         'side-plank 자세를 취하세요',
  'bird-dog':           'bird-dog 자세를 취하세요',
  'v-sit':              'v-sit 자세를 취하세요',
  'seated-toe-touch':   'seated-toe-touch 자세를 취하세요',
  'downward-dog':       'downward-dog 자세를 취하세요',
  'partner-hold':       '두 명이 함께 partner-hold 자세를 취하세요',
  'partner-squat':      '두 명이 함께 partner-squat 자세를 취하세요',
  'partner-high-five':  '두 명이 함께 partner-high-five 자세를 취하세요',
};

export const COLOR_GATE_FIXED_COLOR_ID = 'red' as GateColorId;

const SILHOUETTE_ALPHA_MIN = 16;
const SILHOUETTE_LUMA_MAX = 150;
const SILHOUETTE_RGB = { r: 10, g: 10, b: 12 };

const poseImageCacheByPose = new Map<ColorGatePoseKey, HTMLImageElement>();
let poseImagesLoadPromise: Promise<Map<ColorGatePoseKey, HTMLImageElement>> | null = null;

function loadPoseImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadColorGatePoseImages(): Promise<Map<ColorGatePoseKey, HTMLImageElement>> {
  if (poseImagesLoadPromise) return poseImagesLoadPromise;

  poseImagesLoadPromise = Promise.all(
    COLOR_GATE_POSE_SEQUENCE.map(async (pose) => {
      const url = COLOR_GATE_POSE_IMAGE_MAP[pose];
      const cached = poseImageCacheByPose.get(pose);
      if (cached) return [pose, cached] as const;
      const img = await loadPoseImage(url);
      if (img) poseImageCacheByPose.set(pose, img);
      return [pose, img] as const;
    }),
  ).then((entries) => {
    const map = new Map<ColorGatePoseKey, HTMLImageElement>();
    for (const [pose, img] of entries) {
      if (img) map.set(pose, img);
    }
    return map;
  });
  return poseImagesLoadPromise;
}

export function getColorGatePoseImage(pose: ColorGatePoseKey): HTMLImageElement | null {
  return poseImageCacheByPose.get(pose) ?? null;
}

export function buildColorGateCue(gateColorId: GateColorId): string {
  return `${GATE_COLORS[gateColorId].label}으로!`;
}

export function buildColorGateInstruction(gateColorId: GateColorId, pose: ColorGatePoseKey): string {
  const color = GATE_COLORS[gateColorId];
  return `${color.label} 패드로 이동한 뒤\n「${COLOR_GATE_POSE_LABELS[pose]}」 자세를 취하세요`;
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
