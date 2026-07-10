import {
  getOfficialSpomovePresetGuide,
  SPOMOVE_BODY_FUNCTION_LABELS,
  SPOMOVE_KEY_ACTION_LABELS,
  SPOMOVE_THINKING_LEVEL_LABELS,
  type SpomoveTargetGroup,
} from './officialSpomovePresetGuides';
import type { OfficialSpomovePreset } from './officialSpomovePresets';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

export type SpomovePresetDisplayModel = {
  displayTitle: string;
  axisLabel: string;
  programLabel: string;
  variantLabel: string;
  targetLabel: string;
  difficultyLabel: string;
  settingLabel: string;
  bodyFunctionLabel: string;
  durationLabel: string;
  padLayoutVariant: ReturnType<typeof getSpomovePadLayoutVariant>;
  isAvailable: boolean;
};

const TARGET_LABELS: Record<SpomoveTargetGroup, string> = {
  preschool: '미취학',
  elementaryLower: '초저',
  elementaryUpper: '초고',
  specialSupport: '특수',
};

function buildTargetLabel(groups: SpomoveTargetGroup[]): string {
  if (groups.length === 0) return '';
  const s = new Set(groups);
  if (s.size >= 4) return '전 연령';
  if (s.has('preschool') && s.has('elementaryLower') && s.has('elementaryUpper')) return '미취학·초등';
  if (s.has('elementaryLower') && s.has('elementaryUpper') && s.has('specialSupport')) return '초등 전학년·특수';
  if (s.has('preschool') && s.has('elementaryLower') && s.has('specialSupport')) return '미취학·초저·특수';
  if (s.has('preschool') && s.has('elementaryLower')) return '미취학·초저';
  if (s.has('elementaryLower') && s.has('elementaryUpper')) return '초등 전학년';
  if (s.has('elementaryUpper') && s.has('specialSupport')) return '초고·특수';
  return groups.slice(0, 2).map((g) => TARGET_LABELS[g]).join('·');
}

function stripBgmCopy(value: string): string {
  return value
    .split('·')
    .map((part) => part.trim())
    .filter((part) => part && !/BGM|bgm/i.test(part))
    .join(' · ');
}

function buildVariantLabel(preset: OfficialSpomovePreset): string {
  if (preset.engine.bodyLabelMode) return preset.engine.bodyLabelMode;
  const segments = preset.title.split(/[·쨌]/).map((segment) => segment.trim()).filter(Boolean);
  if (segments.length >= 2) return segments[segments.length - 1]!;
  if (preset.programGroup === 'dive') return 'DIVE';
  if (preset.programGroup === 'bonus') return '보너스';
  return preset.programTitle;
}

function buildDurationLabel(preset: OfficialSpomovePreset): string {
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') {
    return `세션 ${preset.engine.flowDuration ?? 25}초`;
  }
  if (preset.engine.mode === 'reactTrain') {
    return stripBgmCopy(preset.settingSummary);
  }
  if (preset.engine.mode === 'spatial') {
    if (preset.engine.level === 1 || preset.engine.level === 2) {
      return `1~2.5초 랜덤 · ${preset.rounds}라운드`;
    }
    return `${preset.cueSeconds}초 · ${preset.rounds}라운드`;
  }
  return `${preset.cueSeconds}초 · ${preset.rounds}회`;
}

function buildBodyFunctionLabel(preset: OfficialSpomovePreset): string {
  const guide = getOfficialSpomovePresetGuide(preset);
  return guide.bodyFunctions
    .slice(0, 2)
    .map((fn) => SPOMOVE_BODY_FUNCTION_LABELS[fn])
    .join(' · ');
}

export function getSpomovePresetDisplayModel(preset: OfficialSpomovePreset): SpomovePresetDisplayModel {
  const guide = getOfficialSpomovePresetGuide(preset);
  const durationLabel = buildDurationLabel(preset);
  return {
    displayTitle: preset.title,
    axisLabel: preset.axisTitle,
    programLabel: preset.programTitle,
    variantLabel: buildVariantLabel(preset),
    targetLabel: buildTargetLabel(guide.targetGroups),
    difficultyLabel: SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel],
    settingLabel: durationLabel,
    bodyFunctionLabel: buildBodyFunctionLabel(preset),
    durationLabel,
    padLayoutVariant: getSpomovePadLayoutVariant(preset),
    isAvailable: preset.isReady,
  };
}

export type SpomoveCardTag = {
  key: 'difficulty' | 'target' | 'setting' | 'bodyFunction';
  label: string;
  value: string;
};

export function buildSpomoveCardTags(preset: OfficialSpomovePreset): SpomoveCardTag[] {
  const display = getSpomovePresetDisplayModel(preset);
  return [
    { key: 'difficulty', label: '난이도', value: display.difficultyLabel || '-' },
    { key: 'target', label: '대상', value: display.targetLabel || '-' },
    { key: 'setting', label: '설정', value: display.settingLabel || '-' },
    { key: 'bodyFunction', label: '신체기능', value: display.bodyFunctionLabel || '-' },
  ];
}

export function buildSpomoveGuidelineNarrative(preset: OfficialSpomovePreset): string {
  const guide = getOfficialSpomovePresetGuide(preset);
  const display = getSpomovePresetDisplayModel(preset);
  const actions = guide.keyActions
    .map((action) => SPOMOVE_KEY_ACTION_LABELS[action])
    .join(', ');

  const parts = [
    preset.description,
    preset.salesCopy ? `${preset.salesCopy}.` : '',
    actions ? `아이들은 ${actions}을 중심으로 참여합니다.` : '',
    display.targetLabel ? `추천 대상은 ${display.targetLabel}입니다.` : '',
    preset.recommendedUse ? `수업에서는 ${preset.recommendedUse} 상황에 사용하면 효과적입니다.` : '',
  ].filter(Boolean);

  return parts.join(' ');
}
