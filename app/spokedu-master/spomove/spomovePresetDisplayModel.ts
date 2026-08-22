import {
  getOfficialSpomovePresetGuide,
  SPOMOVE_BODY_FUNCTION_LABELS,
  SPOMOVE_RESPONSE_TYPE_LABELS,
  SPOMOVE_KEY_ACTION_LABELS,
  SPOMOVE_TARGET_GROUP_LABELS,
  SPOMOVE_THINKING_LEVEL_LABELS,
  type SpomoveTargetGroup,
} from './officialSpomovePresetGuides';
import type { SpomoveFocusTag, SpomovePresetContentOverride } from '@/app/lib/spomove/spomoveOfficialAssets';
import {
  MODES,
  catalogBasicUiLevel,
  catalogSpatialUiLevel,
} from '@/app/admin/spomove/training/_player/constants';
import {
  resolveSpomoveGuideContentState,
  type SpomoveGuideLegacyManual,
} from '@/app/lib/spomove/spomoveGuideContentState';
import type { SpomoveGuideValidationIssue } from '@/app/lib/spomove/spomoveGuideContract';
import type { OfficialSpomovePreset, OfficialSpomoveProgramGroup } from './officialSpomovePresets';
import { getPresetMovementSummary } from './movements/presetMovementSummary';
import { MOVEMENT_REGISTRY } from './movements/movementRegistry';
import { getSpomovePadLayoutVariant } from './spomovePadLayout';

export type SpomovePresetDisplayModel = {
  displayTitle: string;
  shortDescription: string;
  axisLabel: string;
  programLabel: string;
  variantLabel: string;
  targetLabel: string;
  difficultyLabel: string;
  settingLabel: string;
  bodyFunctionLabel: string;
  supportMeta: string;
  supportMetaParts: string[];
  durationLabel: string;
  padLayoutVariant: ReturnType<typeof getSpomovePadLayoutVariant>;
  isAvailable: boolean;
};

export type SpomoveGuideContentReadiness =
  | 'incomplete'
  | 'needs-improvement'
  | 'ready'
  | 'home-ready';

export type SpomoveGuideAudience = 'public' | 'adminPreview';

export type SpomoveGuideDisplayMode =
  | 'published'
  | 'legacy'
  | 'preparing'
  | 'draftPreview'
  | 'invalidPreview';

export type SpomoveGuideFallbackReference = {
  instruction: string;
  coachScript: string;
  focusTags: string[];
  easier: string;
  harder: string;
};

type SpomoveGuideDisplayModelBase = {
  title: string;
  programGroupLabel: string;
  guideMode: SpomoveGuideDisplayMode;
  isOfficialGuide: boolean;
  recommendedMovementLabel: string | null;
  objective: string | null;
  teachingPoints: string[];
  instruction: string | null;
  legacyManual: SpomoveGuideLegacyManual | null;
  coachScript: string | null;
  focusTags: string[];
  easier: string | null;
  harder: string | null;
  successCriteria?: string;
  commonMistake?: string;
  movementVariation?: string;
  ruleVariation?: string;
  operationVariation?: string;
  matCount: number;
  cueSeconds: number;
  rounds: number;
  contentReadiness: SpomoveGuideContentReadiness;
};

export type PublicSpomoveGuideDisplayModel = SpomoveGuideDisplayModelBase & {
  audience: 'public';
  guideMode: 'published' | 'legacy' | 'preparing';
  validationIssues?: never;
  fallbackReference?: never;
};

export type AdminSpomoveGuideDisplayModel = SpomoveGuideDisplayModelBase & {
  audience: 'adminPreview';
  guideMode: SpomoveGuideDisplayMode;
  validationIssues: SpomoveGuideValidationIssue[];
  fallbackReference?: SpomoveGuideFallbackReference;
};

export type SpomoveGuideDisplayModel =
  | PublicSpomoveGuideDisplayModel
  | AdminSpomoveGuideDisplayModel;

export const SPOMOVE_FOCUS_TAG_LABELS: Record<SpomoveFocusTag, string> = {
  simpleReaction: '단순반응',
  choiceReaction: '선택반응',
  responseInhibition: '반응 억제',
  attentionShift: '주의 전환',
  visualSearch: '시각 탐색',
  sequenceMemory: '순차 기억',
  ruleSwitching: '규칙 전환',
  movementCoordination: '이동 협응',
  lowerBodyCoordination: '하체 협응',
  upperLowerCoordination: '상·하지 협응',
  balanceControl: '균형 조절',
  landingControl: '착지 조절',
  postureControl: '자세 유지',
  directionControl: '방향 조절',
  individual: '개인 수행',
  simultaneous: '동시 수행',
  turnTaking: '교대 활동',
  cooperative: '협동 활동',
  competitive: '경쟁 활동',
};

function buildTargetLabel(groups: SpomoveTargetGroup[]): string {
  if (groups.length === 0) return '';
  const s = new Set(groups);
  if (s.size >= 4) return '전 연령';
  if (s.has('preschool') && s.has('elementaryLower') && s.has('elementaryUpper')) return '미취학·초등';
  if (s.has('elementaryLower') && s.has('elementaryUpper') && s.has('specialSupport')) return '초등 전학년·특수';
  if (s.has('preschool') && s.has('elementaryLower') && s.has('specialSupport')) return '미취학·초등 저학년·특수';
  if (s.has('preschool') && s.has('elementaryLower')) return '미취학·초등 저학년';
  if (s.has('elementaryLower') && s.has('elementaryUpper')) return '초등 전학년';
  if (s.has('elementaryUpper') && s.has('specialSupport')) return '초등 고학년·특수';
  return groups.slice(0, 2).map((g) => SPOMOVE_TARGET_GROUP_LABELS[g]).join('·');
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
  if (preset.engine.spatialArrowColorMode === 'color') return '색상 모드';
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
      return `1-2.5초 랜덤 · ${preset.rounds}라운드`;
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

const THEME_LABELS: Record<string, string> = {
  color: '색상',
  fruit: '과일',
  animal: '동물',
  food: '음식',
  nature: '자연',
  vehicle: '탈 것',
  mix: '믹스',
};

function displayModeId(preset: OfficialSpomovePreset): keyof typeof MODES | null {
  if (preset.programGroup === 'visual-reaction') return 'reactTrain';
  if (preset.programGroup === 'reaction-cognition') return 'basic';
  if (preset.programGroup === 'simon') return 'simon';
  if (preset.programGroup === 'flanker') return 'flanker';
  if (preset.programGroup === 'stroop') return 'stroop';
  if (preset.programGroup === 'sequential-memory') return 'spatial';
  if (preset.programGroup === 'dive' || preset.programGroup === 'bonus') return 'flow';
  return null;
}

function catalogLevelId(preset: OfficialSpomovePreset, modeId: keyof typeof MODES): number {
  if (modeId === 'basic') return catalogBasicUiLevel(preset.engine.level);
  if (modeId === 'spatial') return catalogSpatialUiLevel(preset.engine.level);
  if (modeId === 'flanker' && preset.engine.level === 6) return 2;
  if (modeId === 'flow') return preset.engine.flowFeatures?.includes('colorGate') ? 2 : 1;
  return preset.engine.level;
}

function cleanDisplayTitle(value: string): string {
  return value
    .replace(/\b\d+\s*(?:단계|분할|칸|원)\b\s*/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*·\s*$/u, '')
    .trim();
}

function buildDisplayTitle(preset: OfficialSpomovePreset, contentOverride?: SpomovePresetContentOverride): string {
  if (preset.programGroup === 'flanker' || preset.programGroup === 'stroop' || preset.programGroup === 'sequential-memory') {
    const escapedProgramTitle = preset.programTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return cleanDisplayTitle(preset.title.replace(new RegExp(`^${escapedProgramTitle}(?:\\s+\\d+번)?\\s*·\\s*`, 'u'), ''));
  }
  if (preset.programGroup === 'simon') {
    return cleanDisplayTitle(preset.title.replace(/^사이먼 이펙트\s*·\s*/u, ''));
  }
  if (contentOverride?.displayTitle?.trim()) return cleanDisplayTitle(contentOverride.displayTitle.trim());
  const modeId = displayModeId(preset);
  if (modeId) {
    const mode = MODES[modeId];
    const catalogId = catalogLevelId(preset, modeId);
    const level = mode.levels.find((item) => item.id === catalogId);
    if (level?.name) {
      const base = level.name.replace(/^\(보류\)\s*/u, '').trim();
      // Keep the theme in the title: otherwise every basic card is only
      // "2분할 자극"/"4분할 자극" and cannot be distinguished at a glance.
      const theme = preset.engine.variantColorTheme ? THEME_LABELS[preset.engine.variantColorTheme] : null;
      if (theme && !base.includes(theme)) return `${base} · ${theme}`;
      const normalizedBase = cleanDisplayTitle(base);
      const variant = optionMeta(preset);
      return variant && !normalizedBase.includes(variant) ? `${normalizedBase} · ${variant}` : normalizedBase;
    }
  }
  const segments = preset.title.split('·').map((segment) => segment.trim()).filter(Boolean);
  const normalizedBase = cleanDisplayTitle(segments[segments.length - 1] ?? preset.title.trim());
  const variant = optionMeta(preset);
  return variant && !normalizedBase.includes(variant) ? `${normalizedBase} · ${variant}` : normalizedBase;
}

function compactRecommendedUse(preset: OfficialSpomovePreset): string[] {
  return preset.recommendedUse
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/BGM|자동|확률|50%|20%|30%|엔진/i.test(part))
    .slice(0, 2);
}

function difficultyFact(preset: OfficialSpomovePreset): string | null {
  const fact = preset.executionFacts.find((item) => item.label === '난이도')?.value.trim();
  if (!fact) return null;
  if (fact.includes('쉬움') && fact.includes('보통')) return null;
  if (fact.includes('1~') || fact.includes('50%')) return null;
  return fact;
}

function optionMeta(preset: OfficialSpomovePreset): string | null {
  const theme = preset.engine.variantColorTheme ? THEME_LABELS[preset.engine.variantColorTheme] : null;
  if (theme) return theme;
  if (preset.engine.spatialArrowColorMode === 'color') return '보통';
  if (preset.engine.bodyLabelMode === 'easy') return '쉬움';
  if (preset.engine.bodyLabelMode === 'hard') return '어려움';
  if (preset.engine.handFootDifficulty === 'easy') return '쉬움';
  if (preset.engine.handFootDifficulty === 'normal') return '보통';
  if (preset.engine.handFootDifficulty === 'hard') return '어려움';
  if (preset.engine.simonPoleCount === 2) return '어려움';
  if (preset.engine.simonPoleCount === 1) return '보통';
  if (preset.engine.camouflagePlacement === 'center') return '보통';
  if (preset.engine.camouflagePlacement === 'variant') return '어려움';
  if (preset.engine.goalkeeperTier === 1) return '쉬움';
  if (preset.engine.goalkeeperTier === 2) return '보통';
  if (preset.engine.moleLookMode === 'variant') return '보통';
  if (preset.engine.colorTrackerDualPanel) return '어려움';
  if (preset.engine.colorTrackerTier) return '보통';
  if (preset.engine.numberCartTier) return `${preset.engine.numberCartTier}단계`;
  if (preset.engine.level === 1 && preset.engine.mode === 'basic') return '쉬움';
  return difficultyFact(preset);
}

function buildSupportMetaParts(preset: OfficialSpomovePreset): string[] {
  const parts = [optionMeta(preset), ...compactRecommendedUse(preset)]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return Array.from(new Set(parts)).slice(0, 3);
}

export function getSpomovePresetDisplayModel(
  preset: OfficialSpomovePreset,
  contentOverride?: SpomovePresetContentOverride,
): SpomovePresetDisplayModel {
  const guide = getOfficialSpomovePresetGuide(preset);
  const durationLabel = buildDurationLabel(preset);
  const supportMetaParts = buildSupportMetaParts(preset);
  const effectiveSupportMetaParts = contentOverride?.catalogTags?.length
    ? contentOverride.catalogTags
    : supportMetaParts;
  return {
    displayTitle: buildDisplayTitle(preset, contentOverride),
    shortDescription: contentOverride?.shortDescription?.trim() || preset.description,
    axisLabel: preset.axisTitle,
    programLabel: preset.programTitle,
    variantLabel: contentOverride?.variantLabel?.trim() || buildVariantLabel(preset),
    targetLabel: buildTargetLabel(guide.targetGroups),
    difficultyLabel: SPOMOVE_THINKING_LEVEL_LABELS[guide.thinkingLevel],
    settingLabel: durationLabel,
    bodyFunctionLabel: buildBodyFunctionLabel(preset),
    supportMeta: supportMetaParts.join(' · '),
    supportMetaParts: effectiveSupportMetaParts,
    durationLabel,
    padLayoutVariant: getSpomovePadLayoutVariant(preset),
    isAvailable: preset.isReady,
  };
}

export function sortSpomovePresetsByDisplayTitle(presets: readonly OfficialSpomovePreset[]): OfficialSpomovePreset[] {
  return [...presets].sort((a, b) =>
    getSpomovePresetDisplayModel(a).displayTitle.localeCompare(
      getSpomovePresetDisplayModel(b).displayTitle,
      'ko',
    ),
  );
}

export const SPOMOVE_PROGRAM_GROUP_SECTION_ORDER = [
  'reaction-cognition',
  'visual-reaction',
  'simon',
  'flanker',
  'stroop',
  'sequential-memory',
  'dive',
] as const;

export type SpomoveProgramGroupSectionId = (typeof SPOMOVE_PROGRAM_GROUP_SECTION_ORDER)[number];

export function resolveSpomoveProgramGroupSection(
  programGroup: OfficialSpomoveProgramGroup,
): SpomoveProgramGroupSectionId {
  return programGroup === 'bonus' ? 'dive' : programGroup;
}

export function sortSpomovePresetsByCatalogOrder(
  presets: readonly OfficialSpomovePreset[],
): OfficialSpomovePreset[] {
  return [...presets].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildSpomoveProgramGroupSections(presets: readonly OfficialSpomovePreset[]): Array<{
  programGroup: SpomoveProgramGroupSectionId;
  presets: OfficialSpomovePreset[];
}> {
  const sorted = sortSpomovePresetsByCatalogOrder(presets);
  return SPOMOVE_PROGRAM_GROUP_SECTION_ORDER.map((programGroup) => ({
    programGroup,
    presets: sorted.filter(
      (preset) => resolveSpomoveProgramGroupSection(preset.programGroup) === programGroup,
    ),
  })).filter((section) => section.presets.length > 0);
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

function fallbackFocusTags(preset: OfficialSpomovePreset): string[] {
  const guide = getOfficialSpomovePresetGuide(preset);
  const response = SPOMOVE_RESPONSE_TYPE_LABELS[guide.responseType];
  const body = guide.bodyFunctions
    .slice(0, 2)
    .map((fn) => SPOMOVE_BODY_FUNCTION_LABELS[fn]);
  return [response, ...body].filter(Boolean).slice(0, 3);
}

function fallbackInstruction(preset: OfficialSpomovePreset): string {
  const movementSummary = getPresetMovementSummary(preset);
  const movement = movementSummary?.officialRecommended
    ? MOVEMENT_REGISTRY[movementSummary.officialRecommended.baseMovement]
    : null;
  if (movement) {
    return movement.instruction;
  }
  if (preset.movementProfileId === 'bodyCueBuiltIn' || preset.movementProfileId === 'diveBuiltIn') {
    return '화면이 안내하는 신체 지시를 확인한 뒤 바로 수행합니다.';
  }
  return '화면 지시를 확인한 뒤 정해진 위치와 규칙에 맞춰 반응합니다.';
}

function fallbackCoachScript(preset: OfficialSpomovePreset): string {
  const movementSummary = getPresetMovementSummary(preset);
  const movement = movementSummary?.officialRecommended
    ? MOVEMENT_REGISTRY[movementSummary.officialRecommended.baseMovement]
    : null;
  return movement?.teacherCue ?? '화면을 먼저 보고, 신호에 맞춰 움직이세요.';
}

function fallbackEasier(preset: OfficialSpomovePreset): string {
  const movementSummary = getPresetMovementSummary(preset);
  const movement = movementSummary?.officialRecommended
    ? MOVEMENT_REGISTRY[movementSummary.officialRecommended.baseMovement]
    : null;
  return movement?.easyVariation ?? '자극 시간을 늘리고 한 가지 규칙부터 천천히 진행합니다.';
}

function fallbackHarder(preset: OfficialSpomovePreset): string {
  const movementSummary = getPresetMovementSummary(preset);
  const movement = movementSummary?.officialRecommended
    ? MOVEMENT_REGISTRY[movementSummary.officialRecommended.baseMovement]
    : null;
  return movement?.hardVariation ?? '자극 시간을 줄이고 연속 반응이나 추가 조건을 더해 진행합니다.';
}

function resolveContentReadiness(contentOverride?: SpomovePresetContentOverride): SpomoveGuideContentReadiness {
  const guide = contentOverride?.movementGuide;
  if (guide) {
    return guide.successCriteria || guide.commonMistake || guide.variations ? 'home-ready' : 'ready';
  }
  if (contentOverride?.activityMethod?.trim() || contentOverride?.activityConcept?.trim()) {
    return 'needs-improvement';
  }
  return 'incomplete';
}

export function buildSpomoveGuideDisplayModel({
  preset,
  contentOverride,
  audience,
  matCount,
  cueSeconds,
}: {
  preset: OfficialSpomovePreset;
  contentOverride?: SpomovePresetContentOverride;
  audience: SpomoveGuideAudience;
  matCount?: number;
  cueSeconds?: number;
}): SpomoveGuideDisplayModel {
  const display = getSpomovePresetDisplayModel(preset, contentOverride);
  const movementSummary = getPresetMovementSummary(preset);
  const state = resolveSpomoveGuideContentState({ preset, contentOverride });
  const guide =
    state.publishedGuide ??
    (audience === 'adminPreview' ? state.draftGuide : null);
  const guideMode: SpomoveGuideDisplayMode =
    state.structured === 'publishedValid'
      ? 'published'
      : audience === 'adminPreview' && state.structured === 'draft'
        ? 'draftPreview'
        : audience === 'adminPreview' && state.structured === 'publishedInvalid'
          ? 'invalidPreview'
          : state.legacyManual
            ? 'legacy'
            : 'preparing';
  const officialGuide = state.structured === 'publishedValid';
  const movementLabel =
    !officialGuide || !state.publishedGuide
      ? null
      : state.publishedGuide.movement === null
        ? null
        : MOVEMENT_REGISTRY[state.publishedGuide.movement.baseMovement]?.label ?? movementSummary?.recommendedLabel ?? null;
  const fallbackReference =
    audience === 'adminPreview'
      ? {
          instruction: fallbackInstruction(preset),
          coachScript: fallbackCoachScript(preset),
          focusTags: fallbackFocusTags(preset),
          easier: fallbackEasier(preset),
          harder: fallbackHarder(preset),
        }
      : undefined;
  const base = {
    title: display.displayTitle,
    programGroupLabel: display.programLabel,
    guideMode,
    isOfficialGuide: officialGuide,
    recommendedMovementLabel: movementLabel,
    objective: officialGuide || audience === 'adminPreview' ? (guide?.objective ?? null) : null,
    teachingPoints:
      (officialGuide || audience === 'adminPreview') && guide?.teachingPoints?.length
        ? [...guide.teachingPoints]
        : [],
    instruction: officialGuide || audience === 'adminPreview' ? (guide?.instruction ?? null) : null,
    legacyManual: state.legacyManual,
    coachScript: officialGuide || audience === 'adminPreview' ? (guide?.coachScript ?? null) : null,
    focusTags: (officialGuide || audience === 'adminPreview') && guide?.focusTags?.length
      ? guide.focusTags.map((tag) => SPOMOVE_FOCUS_TAG_LABELS[tag])
      : [],
    easier: officialGuide || audience === 'adminPreview' ? (guide?.easier ?? null) : null,
    harder: officialGuide || audience === 'adminPreview' ? (guide?.harder ?? null) : null,
    successCriteria: officialGuide || audience === 'adminPreview' ? guide?.successCriteria : undefined,
    commonMistake: officialGuide || audience === 'adminPreview' ? guide?.commonMistake : undefined,
    movementVariation: officialGuide || audience === 'adminPreview' ? guide?.variations?.movement : undefined,
    ruleVariation: officialGuide || audience === 'adminPreview' ? guide?.variations?.rule : undefined,
    operationVariation: officialGuide || audience === 'adminPreview' ? guide?.variations?.operation : undefined,
    matCount: matCount ?? movementSummary?.minMats ?? 1,
    cueSeconds: cueSeconds ?? preset.cueSeconds,
    rounds: preset.rounds,
    contentReadiness: resolveContentReadiness(contentOverride),
  };
  if (audience === 'adminPreview') {
    return {
      ...base,
      audience,
      validationIssues: state.validationIssues,
      fallbackReference,
    };
  }

  return {
    ...base,
    audience,
    guideMode: guideMode === 'draftPreview' || guideMode === 'invalidPreview' ? 'preparing' : guideMode,
  };
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
