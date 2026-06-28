import type { Program } from '../types';
import {
  programHasPlayableVideo,
  resolveProgramHero,
} from './program-media';
import {
  findOfficialSpomovePreset,
  officialPresetSessionHref,
  type OfficialSpomovePreset,
} from '../spomove/officialSpomovePresets';

const PLACEHOLDER_PATTERN = /확인 필요|활동 공간 확인|미정|undefined|null|NaN/i;

const KOREAN_PLACEHOLDER_PATTERN = /확인 필요|활동 공간 확인|미정/i;

export function isPlaceholderMeta(value: string | undefined | null): boolean {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER_PATTERN.test(text) || KOREAN_PLACEHOLDER_PATTERN.test(text);
}

export function hasProgramExecutionDetail(program: Program): boolean {
  return Boolean((program.lessonDetail?.rules?.length ?? 0) >= 2 || program.steps.length >= 2);
}

export function hasProgramTeachingSupport(program: Program): boolean {
  const detail = program.lessonDetail;
  return Boolean(
    detail?.safetyNotes?.some((item) => !isPlaceholderMeta(item)) ||
      detail?.variations?.some((item) => !isPlaceholderMeta(item)) ||
      detail?.fieldTips?.some((item) => !isPlaceholderMeta(item)) ||
      (detail?.coachScript && !isPlaceholderMeta(detail.coachScript)) ||
      detail?.briefingNotes?.some((item) => !isPlaceholderMeta(item)),
  );
}

export type ProgramQualityStatus = 'READY' | 'LIMITED' | 'INCOMPLETE';

export type ProgramQualityReport = {
  status: ProgramQualityStatus;
  missing: string[];
};

function hasSpecialSupportTag(program: Program): boolean {
  return program.tags.some((tag) => /specialSupport|특수|느린학습|느린 학습/i.test(tag));
}

function hasSpecialSupportEvidence(program: Program): boolean {
  const detail = program.lessonDetail;
  const text = [
    detail?.coachScript,
    ...(detail?.fieldTips ?? []),
    ...(detail?.variations ?? []),
    ...(detail?.briefingNotes ?? []),
    ...(detail?.safetyNotes ?? []),
  ].join(' ');
  return /속도|반복|단순|시각|단서|도움|감각|안전|speed|repeat|simple|visual|cue|support|sensory/i.test(text);
}

export function getProgramQualityReport(program: Program): ProgramQualityReport {
  const detail = program.lessonDetail;
  const missing: string[] = [];
  const hasTarget = !isPlaceholderMeta(detail?.recommendedAge || program.grade);
  const hasDuration = Boolean(program.duration);
  const hasSpace = !isPlaceholderMeta(program.space);
  const hasEquipment = program.equipment.some((item) => !isPlaceholderMeta(item));
  const hasExecution = hasProgramExecutionDetail(program);
  const hasSafety = Boolean(detail?.safetyNotes?.some((item) => !isPlaceholderMeta(item)));
  const hasTeaching = hasProgramTeachingSupport(program);
  const hasPreview = Boolean(resolveProgramHero(program) || programHasPlayableVideo(program));

  if (!hasTarget) missing.push('대상');
  if (!hasDuration) missing.push('시간');
  if (!hasSpace) missing.push('공간');
  if (!hasEquipment) missing.push('준비물');
  if (!hasExecution) missing.push('진행');
  if (!hasSafety) missing.push('안전');
  if (!hasTeaching) missing.push('지도/변형');
  if (!hasPreview) missing.push('미리보기 자료');
  if (hasSpecialSupportTag(program) && !hasSpecialSupportEvidence(program)) missing.push('특수 대상 지원 근거');

  if (missing.length === 0) return { status: 'READY', missing };
  if (hasTarget && hasDuration && hasSpace && hasEquipment && hasExecution) {
    return { status: 'LIMITED', missing };
  }
  return { status: 'INCOMPLETE', missing };
}

export function getProgramHomeReadiness(program: Program): number {
  const checks = [
    programHasPlayableVideo(program),
    Boolean(resolveProgramHero(program)),
    !isPlaceholderMeta(program.grade),
    !isPlaceholderMeta(program.space),
    Boolean(program.duration),
    program.equipment.some((item) => !isPlaceholderMeta(item)),
    hasProgramExecutionDetail(program),
    hasProgramTeachingSupport(program),
    Boolean(program.description && !isPlaceholderMeta(program.description)),
  ];
  return checks.filter(Boolean).length;
}

export function isProgramHomeRecommendationEligible(program: Program): boolean {
  return getProgramQualityReport(program).status === 'READY';
}

export function hasExplicitSpomoveLink(program: Program): boolean {
  return getOfficialSpomovePresets(program).length > 0;
}

export function getOfficialSpomovePresets(program: Program): OfficialSpomovePreset[] {
  const related = program.lessonDetail?.relatedSpomoveIds ?? [];
  const seen = new Set<string>();
  const presets: OfficialSpomovePreset[] = [];

  for (const id of related) {
    if (seen.has(id)) continue;
    seen.add(id);
    const preset = findOfficialSpomovePreset(id);
    if (preset) presets.push(preset);
  }

  return presets;
}

export function getPrimaryOfficialSpomovePreset(program: Program): OfficialSpomovePreset | null {
  return getOfficialSpomovePresets(program)[0] ?? null;
}

export function hasSpomoveConnectionEvidence(program: Program): boolean {
  const haystack = [
    program.title,
    program.description,
    ...program.tags,
    ...program.equipment,
    ...(program.lessonDetail?.briefingNotes ?? []),
    ...(program.lessonDetail?.fieldTips ?? []),
    ...(program.lessonDetail?.rules ?? []),
    program.lessonDetail?.coachScript,
  ].join(' ');
  return /SPOMOVE|스포무브|화면 활동|화면|반응|신호|인지/i.test(haystack);
}

export function getSupportedOfficialSpomovePresets(program: Program): OfficialSpomovePreset[] {
  if (!hasSpomoveConnectionEvidence(program)) return [];
  return getOfficialSpomovePresets(program);
}

export function getPrimarySupportedSpomovePreset(program: Program): OfficialSpomovePreset | null {
  return getSupportedOfficialSpomovePresets(program)[0] ?? null;
}

export function getSpomoveSessionHref(
  program: Program,
  preset: OfficialSpomovePreset,
  mode: 'projector' | 'class' = 'projector',
): string {
  const url = new URL(officialPresetSessionHref(preset), 'https://spokedu.local');
  url.searchParams.set('mode', mode);
  url.searchParams.set('program', program.id);
  return `${url.pathname}?${url.searchParams.toString()}`;
}
