/**
 * 색 포즈 관문 — 4색 배경 + 포즈 실루엣 SSOT (prod 동기화)
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

export const COLOR_GATE_SPAN_LANES = 3;
export const COLOR_GATE_POSE_IMAGE_URL = '/spomove/dive/color-gate/lunge-reach.png';
export const COLOR_GATE_POSE_LABEL = '런지 펀치';
export const COLOR_GATE_POSE_INSTRUCTION =
  '한쪽 다리를 앞으로 굽히고 팔을 앞으로 뻗으세요';

export const COLOR_GATE_ACTION_SEQUENCE: FlowModuleKey[] = ['reach'];

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

export function getPoseSilhouettePaths(_action: FlowModuleKey): string[] {
  return [
    'M72 52 C64 52 58 58 56 66 L52 98 C50 108 54 118 62 122 L58 152 L52 182 L62 182 L66 154 L70 154 L74 182 L84 182 L78 152 L74 122 C82 118 86 108 84 98 L80 66 C78 58 72 52 64 52 Z',
    'M56 78 L18 72 L14 80 L52 88 Z',
    'M62 122 L48 168 L38 178 L44 186 L58 158 L68 130 Z',
    'M74 122 L88 168 L98 178 L92 186 L78 158 L68 130 Z',
  ];
}
