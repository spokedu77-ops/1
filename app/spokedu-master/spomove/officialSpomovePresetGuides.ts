import type { OfficialFlowFeatureKey, OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomoveTargetGroup =
  | 'preschool'
  | 'elementaryLower'
  | 'elementaryUpper'
  | 'specialSupport';

export type SpomoveThinkingLevel = 'easy' | 'normal' | 'hard';

export type SpomoveResponseType = 'direct' | 'select' | 'memory' | 'rule';

export type SpomoveKeyAction =
  | 'padMove'
  | 'directionChange'
  | 'inPlaceStep'
  | 'jump'
  | 'duck'
  | 'punch'
  | 'kick'
  | 'handTouch'
  | 'sequenceMove'
  | 'continuousMove';

export type SpomoveBodyFunction =
  | 'agility'
  | 'quickness'
  | 'coordination'
  | 'balance'
  | 'flexibility'
  | 'endurance';

export type SpomovePresetGuide = {
  targetGroups: SpomoveTargetGroup[];
  thinkingLevel: SpomoveThinkingLevel;
  responseType: SpomoveResponseType;
  keyActions: SpomoveKeyAction[];
  bodyFunctions: SpomoveBodyFunction[];
};

export const SPOMOVE_TARGET_GROUP_LABELS: Record<SpomoveTargetGroup, string> = {
  preschool: '미취학',
  elementaryLower: '초저',
  elementaryUpper: '초고',
  specialSupport: '특수',
};

export const SPOMOVE_THINKING_LEVEL_LABELS: Record<SpomoveThinkingLevel, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export const SPOMOVE_RESPONSE_TYPE_LABELS: Record<SpomoveResponseType, string> = {
  direct: '보고 바로 반응',
  select: '골라서 반응',
  memory: '기억해서 반응',
  rule: '규칙에 맞춰 반응',
};

export const SPOMOVE_KEY_ACTION_LABELS: Record<SpomoveKeyAction, string> = {
  padMove: '패드 이동',
  directionChange: '방향 전환',
  inPlaceStep: '제자리 스텝',
  jump: '점프',
  duck: '숙이기',
  punch: '터치',
  kick: '킥',
  handTouch: '손 터치',
  sequenceMove: '순서대로 이동',
  continuousMove: '연속 이동',
};

export const SPOMOVE_BODY_FUNCTION_LABELS: Record<SpomoveBodyFunction, string> = {
  agility: '민첩성',
  quickness: '순발력',
  coordination: '협응력',
  balance: '균형감',
  flexibility: '유연성',
  endurance: '지구력',
};

function uniqueActions(actions: SpomoveKeyAction[]): SpomoveKeyAction[] {
  return [...new Set(actions)].slice(0, 3);
}

function targetGroupsForPreset(preset: OfficialSpomovePreset): SpomoveTargetGroup[] {
  if (preset.engine.mode === 'basic' && preset.engine.level >= 7 && preset.engine.level <= 10 && preset.engine.bodyLabelMode === 'easy') {
    return ['preschool', 'elementaryLower', 'specialSupport'];
  }
  if (preset.engine.mode === 'basic' && preset.engine.level >= 7 && preset.engine.level <= 10 && preset.engine.bodyLabelMode === 'hard') {
    return ['elementaryLower', 'elementaryUpper', 'specialSupport'];
  }

  if (preset.engine.mode === 'flow') {
    return preset.engine.flowDuration === 60
      ? ['elementaryLower', 'elementaryUpper']
      : ['preschool', 'elementaryLower', 'elementaryUpper'];
  }

  if (preset.engine.mode === 'spatial') {
    return ['elementaryLower', 'elementaryUpper', 'specialSupport'];
  }

  if (preset.engine.mode === 'stroop' || preset.engine.mode === 'flanker' || preset.engine.mode === 'simon') {
    return ['elementaryLower', 'elementaryUpper', 'specialSupport'];
  }

  if (preset.engine.mode === 'reactTrain') {
    return (preset.engine.reactTrainConcurrent ?? 1) >= 3
      ? ['elementaryLower', 'elementaryUpper']
      : ['preschool', 'elementaryLower', 'specialSupport'];
  }

  if (preset.engine.mode === 'basic' && preset.engine.level >= 4) {
    return ['elementaryLower', 'elementaryUpper', 'specialSupport'];
  }

  return ['preschool', 'elementaryLower', 'specialSupport'];
}

function thinkingLevelForPreset(preset: OfficialSpomovePreset): SpomoveThinkingLevel {
  if (preset.engine.mode === 'basic' && preset.engine.level >= 7 && preset.engine.level <= 10 && preset.engine.bodyLabelMode) {
    return preset.engine.bodyLabelMode;
  }

  if (preset.engine.mode === 'flow') {
    return preset.engine.flowDuration === 60 || (preset.engine.flowFeatures ?? []).length >= 2
      ? 'hard'
      : (preset.engine.flowFeatures ?? []).length === 0
        ? 'easy'
        : 'normal';
  }

  if (preset.engine.mode === 'spatial') {
    return preset.engine.level <= 1 ? 'normal' : 'hard';
  }

  if (preset.engine.mode === 'stroop') return 'hard';
  if (preset.engine.mode === 'flanker') return preset.engine.level <= 1 ? 'normal' : 'hard';
  if (preset.engine.mode === 'simon') return preset.engine.level <= 1 ? 'normal' : 'hard';

  if (preset.engine.mode === 'reactTrain') {
    if ((preset.engine.reactTrainConcurrent ?? 1) >= 3 || preset.engine.level >= 5) return 'hard';
    if ((preset.engine.reactTrainConcurrent ?? 1) >= 2 || preset.engine.level >= 3) return 'normal';
    return 'easy';
  }

  if (preset.engine.mode === 'basic') {
    if (preset.engine.level <= 2) return 'easy';
    if (preset.engine.level <= 4) return 'normal';
    return 'hard';
  }

  return 'normal';
}

function responseTypeForPreset(preset: OfficialSpomovePreset): SpomoveResponseType {
  if (preset.engine.mode === 'spatial') return 'memory';
  if (preset.engine.mode === 'simon' || preset.engine.mode === 'flanker' || preset.engine.mode === 'stroop') return 'rule';
  if (preset.engine.mode === 'flow' && (preset.engine.flowFeatures ?? []).includes('colorGate')) return 'select';
  if (preset.engine.mode === 'basic' && preset.engine.level > 1) return 'select';
  return 'direct';
}

function flowFeatureActions(features: OfficialFlowFeatureKey[] | undefined): SpomoveKeyAction[] {
  const actions: SpomoveKeyAction[] = ['jump'];
  for (const feature of features ?? []) {
    if (feature === 'colorGate') actions.push('punch', 'kick', 'duck', 'handTouch');
    if (feature === 'faster') actions.push('continuousMove');
    if (feature === 'punch') actions.push('punch');
    if (feature === 'duck') actions.push('duck');
    if (feature === 'reach') actions.push('handTouch');
    if (feature === 'kick') actions.push('kick');
  }
  return actions;
}

function keyActionsForPreset(preset: OfficialSpomovePreset): SpomoveKeyAction[] {
  if (preset.engine.mode === 'flow') {
    return uniqueActions(flowFeatureActions(preset.engine.flowFeatures));
  }

  if (preset.engine.mode === 'spatial') {
    return ['sequenceMove', 'padMove'];
  }

  if (preset.engine.mode === 'reactTrain') {
    return uniqueActions(['inPlaceStep', 'handTouch', 'continuousMove']);
  }

  if (preset.engine.mode === 'simon' || preset.engine.mode === 'flanker' || preset.engine.mode === 'stroop') {
    return ['directionChange', 'handTouch'];
  }

  if (preset.engine.mode === 'basic' && preset.engine.level === 1) {
    return ['directionChange', 'padMove'];
  }

  return ['padMove', 'directionChange'];
}

function uniqueBodyFunctions(functions: SpomoveBodyFunction[]): SpomoveBodyFunction[] {
  return [...new Set(functions)].slice(0, 3);
}

function bodyFunctionsForPreset(preset: OfficialSpomovePreset): SpomoveBodyFunction[] {
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') {
    return uniqueBodyFunctions(['agility', 'quickness', 'coordination', 'balance']);
  }

  if (preset.engine.mode === 'flow') {
    return uniqueBodyFunctions(['agility', 'endurance', 'coordination']);
  }

  if (preset.engine.mode === 'spatial' || (preset.engine.mode === 'basic' && preset.engine.level === 1)) {
    return uniqueBodyFunctions(['agility', 'quickness', 'coordination']);
  }

  if (preset.engine.mode === 'simon') {
    return uniqueBodyFunctions(['coordination', 'quickness']);
  }

  if (preset.engine.mode === 'reactTrain') {
    return uniqueBodyFunctions(['agility', 'coordination', 'quickness']);
  }

  if (preset.engine.mode === 'flanker' || preset.engine.mode === 'stroop') {
    return uniqueBodyFunctions(['quickness', 'coordination']);
  }

  return uniqueBodyFunctions(['agility', 'quickness']);
}

export function getOfficialSpomovePresetGuide(preset: OfficialSpomovePreset): SpomovePresetGuide {
  return {
    targetGroups: targetGroupsForPreset(preset),
    thinkingLevel: thinkingLevelForPreset(preset),
    responseType: responseTypeForPreset(preset),
    keyActions: keyActionsForPreset(preset),
    bodyFunctions: bodyFunctionsForPreset(preset),
  };
}
