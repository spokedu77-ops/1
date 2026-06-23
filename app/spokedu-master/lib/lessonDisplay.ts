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

const BODY_FUNCTION_DISPLAY_ORDER = ['유연성', '민첩성', '순발력', '협응력', '근력·근지구력', '심폐지구력', '리듬감', '평형성'] as const;
const STRENGTH_BODY_FUNCTIONS = new Set(['근력', '근지구력', '근력·근지구력']);

export function mergeStrengthBodyFunctions(values: string[]): string[] {
  const normalized = new Set<string>();
  const unknown: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (STRENGTH_BODY_FUNCTIONS.has(value)) {
      normalized.add('근력·근지구력');
      continue;
    }
    if ((BODY_FUNCTION_DISPLAY_ORDER as readonly string[]).includes(trimmed)) {
      normalized.add(trimmed);
      continue;
    }
    if (!unknown.includes(trimmed)) unknown.push(trimmed);
  }

  return [
    ...BODY_FUNCTION_DISPLAY_ORDER.filter((value) => normalized.has(value)),
    ...unknown,
  ];
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
