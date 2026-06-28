import type { Program } from '../types';
import { mergeStrengthBodyFunctions } from './lessonDisplay';
import { resolveProgramHero } from './program-media';
import { getProgramQualityReport, type ProgramQualityReport } from './program-meta';

const INTERNAL_TAG_PREFIXES = ['움직임:', '신체 기능:', '인원:'];

function cleanValue(value?: string | null) {
  return (value ?? '').trim();
}

function cleanList(values?: string[] | null) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function normalizeTagKey(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, '').trim();
}

export function hasCanonicalTag(program: Pick<Program, 'tags'>, canonicalTag: string) {
  const target = normalizeTagKey(canonicalTag);
  return program.tags.some((tag) => normalizeTagKey(tag) === target);
}

export function getPublicLessonTags(tags: string[]) {
  return [...new Set(
    tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => !INTERNAL_TAG_PREFIXES.some((prefix) => tag.startsWith(prefix)))
      .filter((tag) => normalizeTagKey(tag) !== 'SPOMOVE'),
  )];
}

export type LessonDisplayModel = {
  id: string;
  title: string;
  theme: string;
  target: string;
  space: string;
  participantFormat: string;
  tags: string[];
  functions: string[];
  movements: string[];
  equipment: string[];
  coachScript: string;
  previewCoachScript: string;
  briefingNotes: string[];
  setupNotes: string[];
  safetyNotes: string[];
  fieldTips: string[];
  activityMethod: string[];
  variationMethod: string[];
  quality: ProgramQualityReport;
  parentNote: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  heroImageUrl: string | null;
  setupImageUrl: string | null;
  galleryImageUrls: string[];
};

export function getPreviewCoachScript(script: string) {
  const normalized = script.trim();
  if (!normalized) return '';

  const firstLine = normalized
    .split('\n')
    .map((line) => line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''))
    .find(Boolean);
  if (firstLine) return getCompleteSentence(firstLine);

  return getCompleteSentence(normalized);
}

function getCompleteSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const closingMarks = new Set(['"', "'", '”', '’', '」', '』', ')']);
  for (let index = 0; index < trimmed.length; index += 1) {
    if (!'.!?'.includes(trimmed[index]!)) continue;
    let end = index + 1;
    while (end < trimmed.length && closingMarks.has(trimmed[end]!)) {
      end += 1;
    }
    return trimmed.slice(0, end).trim();
  }

  return trimmed;
}

export function buildLessonDisplayModel(program: Program): LessonDisplayModel {
  const detail = program.lessonDetail;
  const coachScript = cleanValue(detail?.coachScript);
  return {
    id: program.id,
    title: cleanValue(program.title),
    theme: cleanValue(program.category),
    target: cleanValue(detail?.recommendedAge || program.grade),
    space: cleanValue(program.space),
    participantFormat: cleanValue(detail?.recommendedPlayers),
    tags: getPublicLessonTags(program.tags),
    functions: mergeStrengthBodyFunctions(program.tags
      .filter((tag) => tag.startsWith('신체 기능:'))
      .map((tag) => tag.slice('신체 기능:'.length).trim())
      .filter(Boolean)),
    movements: program.tags
      .filter((tag) => tag.startsWith('움직임:'))
      .map((tag) => tag.slice('움직임:'.length).trim())
      .filter(Boolean),
    equipment: cleanList(program.equipment),
    coachScript,
    previewCoachScript: getPreviewCoachScript(coachScript),
    briefingNotes: cleanList(detail?.briefingNotes),
    setupNotes: cleanList(detail?.setupNotes),
    safetyNotes: cleanList(detail?.safetyNotes),
    fieldTips: cleanList(detail?.fieldTips),
    activityMethod: cleanList(detail?.rules?.length ? detail.rules : program.steps),
    variationMethod: cleanList(detail?.variations),
    quality: getProgramQualityReport(program),
    parentNote: cleanValue(detail?.parentNote),
    videoUrl: cleanValue(detail?.videoUrl) || null,
    thumbnailUrl: cleanValue(program.thumbnailUrl) || null,
    heroImageUrl: cleanValue(resolveProgramHero(program)) || null,
    setupImageUrl: cleanValue(detail?.setupImageUrl) || null,
    galleryImageUrls: cleanList(detail?.galleryImageUrls),
  };
}
