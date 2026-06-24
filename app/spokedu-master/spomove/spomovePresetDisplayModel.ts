import {
  getOfficialSpomovePresetGuide,
  SPOMOVE_THINKING_LEVEL_LABELS,
  type SpomoveTargetGroup,
} from './officialSpomovePresetGuides';
import type { OfficialSpomovePreset } from './officialSpomovePresets';

export type SpomovePresetDisplayModel = {
  displayTitle: string;
  axisLabel: string;
  programLabel: string;
  targetLabel: string;
  difficultyLabel: string;
  durationLabel: string;
  isAvailable: boolean;
};

const DISPLAY_THEME_LABELS: Record<string, string> = {
  color: '색상',
  fruit: '과일',
  vehicle: '탈것',
  emotion: '감정',
  animal: '동물',
  nature: '자연',
  target: '타겟',
};

const DISPLAY_LEVEL_LABELS: Record<number, string> = {
  1: '공간 방향',
  2: '사분할',
  3: '전면',
  4: '2분할',
  5: '3패널',
};

const TARGET_LABELS: Record<SpomoveTargetGroup, string> = {
  preschool: '미취학',
  elementaryLower: '초등 저학년',
  elementaryUpper: '초등 고학년',
  specialSupport: '특수',
};

function buildTargetLabel(groups: SpomoveTargetGroup[]): string {
  if (groups.length === 0) return '';
  const s = new Set(groups);
  if (s.size >= 4) return '전 연령';
  if (s.has('preschool') && s.has('elementaryLower') && s.has('elementaryUpper')) return '미취학–초등';
  if (s.has('elementaryLower') && s.has('elementaryUpper') && s.has('specialSupport')) return '초등 전학년·특수';
  if (s.has('preschool') && s.has('elementaryLower') && s.has('specialSupport')) return '미취학·초저·특수';
  if (s.has('preschool') && s.has('elementaryLower')) return '미취학–초저';
  if (s.has('elementaryLower') && s.has('elementaryUpper')) return '초등 전학년';
  if (s.has('elementaryUpper') && s.has('specialSupport')) return '초등 고학년·특수';
  return groups.slice(0, 2).map((g) => TARGET_LABELS[g]).join(' · ');
}

function buildDisplayTitle(preset: OfficialSpomovePreset): string {
  const { programGroup, programTitle, engine } = preset;

  if (programGroup === 'reaction-cognition') {
    const levelLabel = DISPLAY_LEVEL_LABELS[engine.level] ?? `${engine.level}단계`;
    if (engine.level === 1) return `${programTitle} · ${levelLabel}`;
    const themeLabel = engine.variantColorTheme
      ? (DISPLAY_THEME_LABELS[engine.variantColorTheme] ?? '')
      : '';
    return themeLabel
      ? `${programTitle} · ${levelLabel} ${themeLabel}`
      : `${programTitle} · ${levelLabel}`;
  }

  if (programGroup === 'visual-reaction') {
    if (engine.level >= 2) return `${programTitle} · 순간 반응`;
    const concurrent = engine.reactTrainConcurrent ?? 1;
    return `${programTitle} · ${concurrent}개 동시`;
  }

  // simon, flanker, stroop, sequential-memory, dive, bonus
  return programTitle;
}

export function getSpomovePresetDisplayModel(preset: OfficialSpomovePreset): SpomovePresetDisplayModel {
  const guide = getOfficialSpomovePresetGuide(preset);
  const isDive = preset.programGroup === 'dive' || preset.programGroup === 'bonus';
  return {
    displayTitle: buildDisplayTitle(preset),
    axisLabel: preset.axisTitle,
    programLabel: preset.programTitle,
    targetLabel: buildTargetLabel(guide.targetGroups),
    difficultyLabel: SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel],
    durationLabel: isDive
      ? `세션 ${preset.engine.flowDuration ?? 25}초`
      : `자극 ${preset.cueSeconds}초`,
    isAvailable: preset.isReady,
  };
}
