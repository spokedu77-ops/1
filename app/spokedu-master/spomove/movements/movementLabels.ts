import type { LimbRule, MovementPick } from './movementTypes';
import { MOVEMENT_REGISTRY } from './movementRegistry';

const DISPLAY_LABELS: Record<string, string> = {
  'footTap:free': '자유발 터치',
  'footTap:sameSide': '같은 쪽 발 터치',
  'footTap:oppositeSide': '반대발 터치',
  'handTouch:free': '자유손 터치',
  'handTouch:sameSide': '같은 쪽 손 터치',
  'handTouch:oppositeSide': '반대손 터치',
  'stepHold:free': '밟고 정지',
  'squatTouch:free': '스쿼트 터치',
  'lungeReach:free': '런지 리치',
};

const HUD_LABELS: Record<string, string> = {
  'footTap:free': '편한 발로 터치',
  'footTap:sameSide': '왼쪽=왼발 · 오른쪽=오른발',
  'footTap:oppositeSide': '왼쪽=오른발 · 오른쪽=왼발',
  'handTouch:free': '편한 손으로 터치',
  'handTouch:sameSide': '왼쪽=왼손 · 오른쪽=오른손',
  'handTouch:oppositeSide': '왼쪽=오른손 · 오른쪽=왼손',
  'stepHold:free': '색을 밟고 잠시 정지',
  'squatTouch:free': '몸을 낮춰 손으로 터치',
  'lungeReach:free': '한 발 내딛고 길게 뻗기',
};

function key(pick: MovementPick) {
  return `${pick.baseMovement}:${pick.limbRule}`;
}

export function movementDisplayLabel(pick: MovementPick): string {
  return DISPLAY_LABELS[key(pick)] ?? MOVEMENT_REGISTRY[pick.baseMovement].label;
}

export function movementHudLabel(pick: MovementPick): string {
  return HUD_LABELS[key(pick)] ?? MOVEMENT_REGISTRY[pick.baseMovement].shortLabel;
}

export function limbRuleNeedsExtraCueSeconds(limbRule: LimbRule) {
  return limbRule === 'sameSide' || limbRule === 'oppositeSide';
}

/** sameSide/oppositeSide는 최소 3초 */
export function effectiveMinimumCueSeconds(pick: MovementPick): number {
  const base = MOVEMENT_REGISTRY[pick.baseMovement].minimumCueSeconds;
  if (limbRuleNeedsExtraCueSeconds(pick.limbRule)) return Math.max(base, 3);
  return base;
}
