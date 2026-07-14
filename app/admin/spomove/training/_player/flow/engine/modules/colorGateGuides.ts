/**
 * ColorGate shared definitions.
 *
 * Keep this in sync with flow-lab. The production flow currently consumes the
 * stage/HUD definitions only; 3D gate rendering lives in flow-lab.
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

export function buildColorGateCue(gateColorId: GateColorId): string {
  return `${GATE_COLORS[gateColorId].label}으로!`;
}

export function buildColorGateInstruction(gateColorId: GateColorId, action: FlowModuleKey): string {
  const color = GATE_COLORS[gateColorId];
  return `${color.label} 패드로 이동한 뒤 「${COLOR_GATE_POSE_LABELS[action]}」 자세를 취하세요`;
}
