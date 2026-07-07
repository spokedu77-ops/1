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

function buildDurationLabel(preset: OfficialSpomovePreset): string {
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') {
    return `세션 ${preset.engine.flowDuration ?? 25}초`;
  }
  if (preset.engine.mode === 'reactTrain') {
    return preset.settingSummary;
  }
  if (preset.engine.mode === 'spatial') {
    return `${preset.cueSeconds}초 · ${preset.rounds}라운드`;
  }
  return `${preset.cueSeconds}초 · ${preset.rounds}회`;
}

export function getSpomovePresetDisplayModel(preset: OfficialSpomovePreset): SpomovePresetDisplayModel {
  const guide = getOfficialSpomovePresetGuide(preset);
  return {
    displayTitle: preset.title,
    axisLabel: preset.axisTitle,
    programLabel: preset.programTitle,
    targetLabel: buildTargetLabel(guide.targetGroups),
    difficultyLabel: SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel],
    durationLabel: buildDurationLabel(preset),
    isAvailable: preset.isReady,
  };
}
