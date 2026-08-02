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

/**
 * 카드 표시 제목: 프로그램명 태그·구 카탈로그 번호(N번) 잔여물 제거.
 * 예: "반응인지 1번 · 공간 방향" → "공간 방향"
 *     "시지각 반응 · 매직 아이" → "매직 아이"
 */
function buildDisplayTitle(preset: OfficialSpomovePreset): string {
  let title = preset.title.trim();
  if (!title) return title;

  const program = preset.programTitle.trim();
  // 반응 인지 ↔ 반응인지 등 공백 유무 alias
  const aliases = new Set<string>(
    [program, program.replace(/\s+/g, ''), program.replace(/\s+/g, ' ')].filter(Boolean),
  );

  for (const alias of aliases) {
    if (!alias) continue;
    // "{프로그램} · 나머지"
    const dotted = new RegExp(`^${escapeRegExp(alias)}\\s*[·:]\\s*(.+)$`);
    const dottedMatch = title.match(dotted);
    if (dottedMatch?.[1]) {
      title = dottedMatch[1].trim();
      break;
    }

    // "{프로그램} N번 · 나머지" → "나머지" (N번은 잔여물)
    const numbered = new RegExp(`^${escapeRegExp(alias)}\\s*\\d+번\\s*[·:]\\s*(.+)$`);
    const numberedMatch = title.match(numbered);
    if (numberedMatch?.[1]) {
      title = numberedMatch[1].trim();
      break;
    }
  }

  // 접두 제거 후에도 남은 "N번 · " 잔여물
  title = title.replace(/^\d+번\s*[·:]\s*/, '').trim();
  return title || preset.title.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getSpomovePresetDisplayModel(preset: OfficialSpomovePreset): SpomovePresetDisplayModel {
  const guide = getOfficialSpomovePresetGuide(preset);
  const durationLabel = buildDurationLabel(preset);
  return {
    displayTitle: buildDisplayTitle(preset),
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
  const display = getSpomovePresetDisplayModel(preset);
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
