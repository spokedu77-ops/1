/**
 * ColorGate shared definitions.
 *
 * Keep this in sync with flow-lab. The production flow currently consumes the
 * stage/HUD definitions only; 3D gate rendering lives in flow-lab.
 */

import type { FlowModuleKey } from './flowModules';

export const GATE_COLOR_IDS = ['red', 'yellow', 'green', 'blue'] as const;
export type GateColorId = (typeof GATE_COLOR_IDS)[number];
export const COLOR_GATE_FIXED_COLOR_ID: GateColorId = 'blue';
export const PLAYABLE_GATE_COLOR_IDS = [COLOR_GATE_FIXED_COLOR_ID] as const satisfies readonly GateColorId[];

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
export const COLOR_GATE_POSE_LABEL = '런지 펀치';
export const COLOR_GATE_POSE_INSTRUCTION =
  '한쪽 다리를 앞으로 굽히고 팔을 앞으로 뻗으세요';

export const COLOR_GATE_ACTION_SEQUENCE: FlowModuleKey[] = ['reach'];

export function buildColorGateCue(gateColorId: GateColorId): string {
  return `${GATE_COLORS[gateColorId].label}으로!`;
}

export function buildColorGateInstruction(gateColorId: GateColorId): string {
  const color = GATE_COLORS[gateColorId];
  return `${color.label} 패드로 이동한 뒤 「${COLOR_GATE_POSE_LABEL}」 자세를 취하세요`;
}
