import { cleanText } from './clean';
import { normalizeLessonTheme } from './lessonTheme';
import {
  displayMasterDuration,
  normalizeMasterSpace,
  normalizeMasterTarget,
  parseMasterTargets,
} from './programDisplayTags';
import type { Program } from '../types';

const PLACEHOLDER_PATTERN = /확인 필요|정보 없음|미정|undefined|null|도구 정보 아직 없음|활동 공간 확인/i;

export const LESSON_TAG_PREFIX = {
  movement: '움직임:',
  bodyFunction: '신체 기능:',
  groupSize: '인원:',
} as const;

export function isLessonPlaceholder(value?: string | null) {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER_PATTERN.test(text);
}

export function parseTaggedValues(tags: string[] | undefined, prefix: string): string[] {
  return (tags ?? [])
    .filter((tag) => tag.startsWith(prefix))
    .map((tag) => tag.slice(prefix.length).trim())
    .filter((item) => item && !isLessonPlaceholder(item));
}

export function formatTaggedValues(tags: string[] | undefined, prefix: string, fallback = '') {
  const values = parseTaggedValues(tags, prefix);
  return values.length ? values.join(', ') : fallback;
}

const STRENGTH_BODY_FUNCTIONS = new Set(['근력', '근지구력']);

export function mergeStrengthBodyFunctions(values: string[]): string[] {
  const merged: string[] = [];
  let strengthAdded = false;

  for (const value of values) {
    if (STRENGTH_BODY_FUNCTIONS.has(value)) {
      if (!strengthAdded) {
        merged.push('근력·근지구력');
        strengthAdded = true;
      }
      continue;
    }
    merged.push(value);
  }

  return merged;
}

export function formatBodyFunctions(values: string[]) {
  return mergeStrengthBodyFunctions(values).join(', ');
}

export function getLessonTitle(program: Program, fallback = 'SPOKEDU 수업') {
  return cleanText(program.title, fallback);
}

export function getLessonTheme(program: Program) {
  const value = normalizeLessonTheme(cleanText(program.category, ''));
  return isLessonPlaceholder(value) ? '' : value;
}

export function getLessonTarget(program: Program) {
  const detail = program.lessonDetail;
  const raw = normalizeMasterTarget(detail?.recommendedAge || program.grade);
  const parsed = parseMasterTargets(raw);
  const value = parsed.length ? parsed.join(', ') : raw;
  return isLessonPlaceholder(value) ? '' : value;
}

export function getLessonFunction(program: Program) {
  const fromTags = parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction);
  if (fromTags.length > 0) return formatBodyFunctions(fromTags);
  const focus = cleanText(program.lessonDetail?.developmentFocus, '');
  return isLessonPlaceholder(focus) ? '' : focus;
}

export function getLessonMovement(program: Program) {
  return formatTaggedValues(program.tags, LESSON_TAG_PREFIX.movement);
}

export function getLessonSpace(program: Program) {
  const value = normalizeMasterSpace(program.space);
  return isLessonPlaceholder(value) ? '' : value;
}

export function getLessonTime(program: Program) {
  const value = displayMasterDuration(program.duration);
  return isLessonPlaceholder(value) ? '' : value;
}

export function getLessonScript(program: Program) {
  const detail = program.lessonDetail;
  const script = cleanText(detail?.coachScript, '') || cleanText(program.description, '');
  return isLessonPlaceholder(script) ? '' : script;
}

export function getLessonEquipment(program: Program) {
  return program.equipment.map((item) => item.trim()).filter((item) => item && !isLessonPlaceholder(item));
}

export function getLessonRules(program: Program) {
  const detail = program.lessonDetail;
  const rules = detail?.rules?.length ? detail.rules : program.steps;
  return rules.filter((item) => item.trim() && !isLessonPlaceholder(item));
}

export function getLessonVariations(program: Program) {
  return (program.lessonDetail?.variations ?? []).filter((item) => item.trim() && !isLessonPlaceholder(item));
}

export function getLessonBriefingNotes(program: Program) {
  return (program.lessonDetail?.briefingNotes ?? []).filter((item) => item.trim() && !isLessonPlaceholder(item));
}

export function getLessonSetupNotes(program: Program) {
  return (program.lessonDetail?.setupNotes ?? []).filter((item) => item.trim() && !isLessonPlaceholder(item));
}

export function getLessonSafetyNotes(program: Program) {
  return (program.lessonDetail?.safetyNotes ?? []).filter((item) => item.trim() && !isLessonPlaceholder(item));
}

export function getLessonFieldTips(program: Program) {
  return (program.lessonDetail?.fieldTips ?? []).filter((item) => item.trim() && !isLessonPlaceholder(item));
}
