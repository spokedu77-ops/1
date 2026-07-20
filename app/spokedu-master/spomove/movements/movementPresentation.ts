import { MOVEMENT_REGISTRY } from './movementRegistry';
import type {
  LimbRule,
  MovementBodyFocus,
  MovementImpactLevel,
  MovementPick,
  MovementReturnRule,
  MovementStartPosition,
} from './movementTypes';

export type MovementPresentationGroup = 'feet' | 'hands' | 'postureBalance';

export type MovementPresentation = {
  pick: MovementPick;
  label: string;
  shortLabel: string;
  group: MovementPresentationGroup;
  groupLabel: string;
  bodyFocusLabel: string;
  impactLabel: string;
  jumpLabel: string;
  startLabel: string;
  returnLabel: string;
  instruction: string;
  safetyNote: string | null;
};

const GROUP_LABEL: Record<MovementPresentationGroup, string> = {
  feet: '발 동작',
  hands: '손 동작',
  postureBalance: '자세·균형',
};

const BODY_FOCUS_LABEL: Record<MovementBodyFocus, string> = {
  feet: '발',
  hands: '손',
  wholeBody: '전신',
  balance: '균형',
};

const IMPACT_LABEL: Record<MovementImpactLevel, string> = {
  low: '낮은 강도',
  medium: '중간 강도',
  high: '높은 강도',
};

const START_LABEL: Record<MovementStartPosition, string> = {
  behindMat: '매트 밖 시작',
  onMat: '매트 위 시작',
};

const RETURN_LABEL: Record<MovementReturnRule, string> = {
  returnOutside: '준비 위치로 복귀',
  holdOnTarget: '목표에서 유지',
  stayAndTransition: '위치에서 다음으로 전환',
};

/** 사용자 9표현 — 메뉴 분류용. 허용 여부는 listAllowedMovementPicks가 SSOT */
const USER_LABELS: Record<string, { label: string; shortLabel: string }> = {
  'footTap:free': { label: '자유발 터치', shortLabel: '자유발 터치' },
  'footTap:sameSide': { label: '같은 쪽 발 터치', shortLabel: '같은 쪽 발' },
  'footTap:oppositeSide': { label: '교차발 터치', shortLabel: '교차발' },
  'handTouch:free': { label: '자유손 터치', shortLabel: '자유손 터치' },
  'handTouch:sameSide': { label: '같은 쪽 손 터치', shortLabel: '같은 쪽 손' },
  'handTouch:oppositeSide': { label: '교차손 터치', shortLabel: '교차손' },
  'stepHold:free': { label: '밟고 정지', shortLabel: '밟고 정지' },
  'squatTouch:free': { label: '스쿼트 터치', shortLabel: '스쿼트' },
  'lungeReach:free': { label: '런지 리치', shortLabel: '런지' },
};

const GROUP_ORDER: MovementPresentationGroup[] = ['feet', 'hands', 'postureBalance'];

function pickKey(pick: MovementPick) {
  return `${pick.baseMovement}:${pick.limbRule}`;
}

function groupForPick(pick: MovementPick): MovementPresentationGroup {
  if (pick.baseMovement === 'footTap') return 'feet';
  if (pick.baseMovement === 'handTouch') return 'hands';
  return 'postureBalance';
}

export function getMovementPresentation(pick: MovementPick): MovementPresentation {
  const def = MOVEMENT_REGISTRY[pick.baseMovement];
  const user = USER_LABELS[pickKey(pick)];
  const group = groupForPick(pick);
  return {
    pick,
    label: user?.label ?? def.label,
    shortLabel: user?.shortLabel ?? def.shortLabel,
    group,
    groupLabel: GROUP_LABEL[group],
    bodyFocusLabel: BODY_FOCUS_LABEL[def.bodyFocus],
    impactLabel: IMPACT_LABEL[def.impactLevel],
    jumpLabel: def.jumpFree ? '점프 없음' : '점프 포함',
    startLabel: START_LABEL[def.defaultStartPosition],
    returnLabel: RETURN_LABEL[def.defaultReturnRule],
    instruction: def.instruction,
    safetyNote: def.safetyNote ?? null,
  };
}

export function groupMovementPresentations(
  picks: MovementPick[],
): Array<{ group: MovementPresentationGroup; groupLabel: string; items: MovementPresentation[] }> {
  const buckets = new Map<MovementPresentationGroup, MovementPresentation[]>();
  for (const pick of picks) {
    const presentation = getMovementPresentation(pick);
    const list = buckets.get(presentation.group) ?? [];
    list.push(presentation);
    buckets.set(presentation.group, list);
  }
  return GROUP_ORDER.filter((group) => buckets.has(group)).map((group) => ({
    group,
    groupLabel: GROUP_LABEL[group],
    items: buckets.get(group)!,
  }));
}

/** SideRule 시각화 — free는 마커 없음 */
export function limbMarkersForRule(limbRule: LimbRule): {
  left: 'L' | 'R' | null;
  right: 'L' | 'R' | null;
} {
  if (limbRule === 'sameSide') return { left: 'L', right: 'R' };
  if (limbRule === 'oppositeSide') return { left: 'R', right: 'L' };
  return { left: null, right: null };
}
