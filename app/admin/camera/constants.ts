/**
 * SPOKEDU 카메라 앱 — 공통 상수
 */

export const DIFF = {
  easy:   { r: 0.11,  speed: 0.008, bonus: 1.4, spawn: 4 },
  normal: { r: 0.08,  speed: 0.013, bonus: 1.0, spawn: 3 },
  hard:   { r: 0.055, speed: 0.020, bonus: 0.8, spawn: 2 },
} as const;

export type DiffKey = keyof typeof DIFF;

export const PLAYER_COLORS = [
  { hex: '#2563EB', rgba: '37,99,235' },
  { hex: '#D97706', rgba: '217,119,6' },
  { hex: '#16A34A', rgba: '22,163,74' },
] as const;

export const MODE_META: Record<string, { label: string; emoji: string }> = {
  speed:    { label: '스피드 스타',  emoji: '⚡' },
  sequence: { label: '넘버 시퀀스',  emoji: '🔢' },
  shape:    { label: '쉐이프 헌터',  emoji: '🔷' },
  moving:   { label: '무빙 캐치',    emoji: '🎯' },
  balance:  { label: '밸런스 포즈',  emoji: '🧘' },
  mirror:   { label: '미러 게임',    emoji: '🪞' },
};

export const SHAPES = ['circle', 'square', 'triangle'] as const;
export type ShapeType = (typeof SHAPES)[number];

export const SHAPE_KO: Record<ShapeType, string> = {
  circle: '동그라미',
  square: '네모',
  triangle: '세모',
};

export const COLOR_POOL = [
  '#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0891B2', '#D97706',
];

/** MediaPipe 손/손가락 랜드마크 인덱스 (wrists + pinky + index tips) */
export const TOUCH_IDX = [15, 16, 19, 20, 17, 18];

export const POSES = [
  { name: '양팔 벌리기',   check: (lm: { x: number; y: number }[]) => Math.abs(lm[15].x - lm[16].x) > 0.55 },
  { name: '두 손 머리 위', check: (lm: { x: number; y: number }[]) => lm[15].y < lm[11].y - 0.10 && lm[16].y < lm[12].y - 0.10 },
  { name: '왼손 하늘로',   check: (lm: { x: number; y: number }[]) => lm[15].y < lm[11].y - 0.15 && lm[16].y > lm[12].y - 0.05 },
  { name: '오른손 하늘로', check: (lm: { x: number; y: number }[]) => lm[16].y < lm[12].y - 0.15 && lm[15].y > lm[11].y - 0.05 },
];

export const MIRROR_POSES = [
  { name: '양팔 벌리기',         instruction: '양팔을 옆으로 쭉 펴세요',      check: (lm: { x: number; y: number }[]) => Math.abs(lm[15].x - lm[16].x) > 0.50 },
  { name: '두 손 머리 위로',      instruction: '두 팔을 머리 위로 올리세요',   check: (lm: { x: number; y: number }[]) => lm[15].y < lm[11].y - 0.08 && lm[16].y < lm[12].y - 0.08 },
  { name: '왼손 위, 오른손 아래', instruction: '왼손은 위로, 오른손은 아래로', check: (lm: { x: number; y: number }[]) => lm[15].y < lm[11].y - 0.12 && lm[16].y > lm[12].y + 0.05 },
];

export const POSE_HOLD_MS = 2000;
export const MIRROR_HOLD_MS = 1500;

export const STORAGE_KEY = 'spokedu_v8';

/** 로비 설정 기본값 (Store 비었을 때 및 초기 state 일원화) */
export const DEFAULT_SETTINGS = {
  diff: 'normal' as const,
  dur: 30,
  multiOn: true,
  soundOn: true,
};
