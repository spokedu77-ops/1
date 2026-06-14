import type { Program } from '../types';
import { displayMasterDuration } from './programDisplayTags';
import { resolveProgramHero } from './program-media';

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
  duration: string;
  tags: string[];
  functions: string[];
  movements: string[];
  equipment: string[];
  coachScript: string;
  briefingNotes: string[];
  activityMethod: string[];
  variationMethod: string[];
  parentNote: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  heroImageUrl: string | null;
  setupImageUrl: string | null;
  galleryImageUrls: string[];
};

export function buildLessonDisplayModel(program: Program): LessonDisplayModel {
  const detail = program.lessonDetail;
  return {
    id: program.id,
    title: cleanValue(program.title),
    theme: cleanValue(program.category),
    target: cleanValue(detail?.recommendedAge || program.grade),
    space: cleanValue(program.space),
    duration: displayMasterDuration(program.duration),
    tags: getPublicLessonTags(program.tags),
    functions: program.tags
      .filter((tag) => tag.startsWith('신체 기능:'))
      .map((tag) => tag.slice('신체 기능:'.length).trim())
      .filter(Boolean),
    movements: program.tags
      .filter((tag) => tag.startsWith('움직임:'))
      .map((tag) => tag.slice('움직임:'.length).trim())
      .filter(Boolean),
    equipment: cleanList(program.equipment),
    coachScript: cleanValue(detail?.coachScript),
    briefingNotes: cleanList(detail?.briefingNotes),
    activityMethod: cleanList(detail?.rules?.length ? detail.rules : program.steps),
    variationMethod: cleanList(detail?.variations),
    parentNote: cleanValue(detail?.parentNote),
    videoUrl: cleanValue(detail?.videoUrl) || null,
    thumbnailUrl: cleanValue(program.thumbnailUrl) || null,
    heroImageUrl: cleanValue(resolveProgramHero(program)) || null,
    setupImageUrl: cleanValue(detail?.setupImageUrl) || null,
    galleryImageUrls: cleanList(detail?.galleryImageUrls),
  };
}
