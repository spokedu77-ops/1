import type { Program } from '../types';
import { LESSON_TAG_PREFIX, mergeStrengthBodyFunctions, parseTaggedValues } from '../lib/lessonDisplay';
import { getPublicLessonTags, normalizeTagKey } from '../lib/lessonDisplayModel';
import {
  getTrustedProgramVideoUrl,
  getVideoThumbnail,
  isInterimDedicatedHero,
  isStockPlaceholderImage,
  programHasPlayableVideo,
} from '../lib/program-media';

export const RELATED_LESSON_REASONS = [
  '신체 기능 유사',
  '같은 교구',
  '동작 패턴 유사',
  '관련 활동',
] as const;

export type RelatedLessonVideoReason = (typeof RELATED_LESSON_REASONS)[number];

export type RelatedLessonVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  href: string;
  reason: RelatedLessonVideoReason;
};

type RankedCandidate = {
  candidate: Program;
  axisScore: number;
  overall: number;
};

function normalizedParts(value: string) {
  return new Set(
    value
      .split(/[,/·]/)
      .map(normalizeTagKey)
      .filter(Boolean),
  );
}

function sharedPartCount(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function bodyFunctionKeys(program: Program) {
  return new Set(
    mergeStrengthBodyFunctions(parseTaggedValues(program.tags, LESSON_TAG_PREFIX.bodyFunction)).map(normalizeTagKey),
  );
}

function movementKeys(program: Program) {
  return new Set(
    parseTaggedValues(program.tags, LESSON_TAG_PREFIX.movement).flatMap((value) => [...normalizedParts(value)]),
  );
}

function equipmentKeys(program: Program) {
  const keys = new Set<string>();
  for (const item of program.equipment ?? []) {
    const whole = normalizeTagKey(item);
    if (whole) keys.add(whole);
    for (const part of item.split(/[\s,/·]+/)) {
      const key = normalizeTagKey(part);
      if (key && !/^\d+개?$/.test(key)) keys.add(key);
    }
  }
  return keys;
}

function overallRelevance(current: Program, candidate: Program) {
  const currentTags = new Set(getPublicLessonTags(current.tags).map(normalizeTagKey));
  const candidateTags = new Set(getPublicLessonTags(candidate.tags).map(normalizeTagKey));
  const tagOverlap = sharedPartCount(currentTags, candidateTags);
  const currentCategory = normalizeTagKey(current.category);
  const candidateCategory = normalizeTagKey(candidate.category);
  const sameCategory = Boolean(currentCategory) && Boolean(candidateCategory) && candidateCategory === currentCategory;
  const gradeOverlap = sharedPartCount(normalizedParts(current.grade), normalizedParts(candidate.grade));
  return tagOverlap * 100 + Number(sameCategory) * 20 + Math.min(gradeOverlap, 3) * 5;
}

function compareRanked(left: RankedCandidate, right: RankedCandidate) {
  return (
    right.axisScore - left.axisScore ||
    right.overall - left.overall ||
    left.candidate.title.localeCompare(right.candidate.title, 'ko') ||
    left.candidate.id.localeCompare(right.candidate.id)
  );
}

function pickBestUnused(
  candidates: Program[],
  usedIds: Set<string>,
  axisScoreOf: (candidate: Program) => number,
  current: Program,
) {
  const ranked = candidates
    .filter((candidate) => !usedIds.has(candidate.id))
    .map((candidate) => ({
      candidate,
      axisScore: axisScoreOf(candidate),
      overall: overallRelevance(current, candidate),
    }))
    .filter((item) => item.axisScore > 0)
    .sort(compareRanked);
  return ranked[0]?.candidate ?? null;
}

function getDedicatedRelatedThumbnail(program: Program): string | undefined {
  const setupImage = program.lessonDetail?.setupImageUrl?.trim();
  return [program.thumbnailUrl, program.lessonDetail?.heroImageUrl]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(
      value &&
      value !== setupImage &&
      !isStockPlaceholderImage(value) &&
      !isInterimDedicatedHero(value),
    ));
}

function toRelatedVideo(candidate: Program, reason: RelatedLessonVideoReason): RelatedLessonVideo {
  const videoUrl = getTrustedProgramVideoUrl(candidate);
  return {
    id: candidate.id,
    title: candidate.title,
    thumbnailUrl: getVideoThumbnail(videoUrl) ?? getDedicatedRelatedThumbnail(candidate) ?? null,
    href: `/spokedu-master/library/${candidate.id}`,
    reason,
  };
}

export function selectRelatedLessonVideos(
  current: Program,
  programs: Program[],
  limit = 3,
): RelatedLessonVideo[] {
  const cap = Math.max(0, limit);
  if (cap === 0) return [];

  const playable = programs.filter((candidate) => candidate.id !== current.id && programHasPlayableVideo(candidate));
  const usedIds = new Set<string>();
  const selected: RelatedLessonVideo[] = [];

  const currentBody = bodyFunctionKeys(current);
  const currentEquipment = equipmentKeys(current);
  const currentMovement = movementKeys(current);

  const axes: Array<{ reason: RelatedLessonVideoReason; scoreOf: (candidate: Program) => number }> = [
    {
      reason: '신체 기능 유사',
      scoreOf: (candidate) => sharedPartCount(currentBody, bodyFunctionKeys(candidate)),
    },
    {
      reason: '같은 교구',
      scoreOf: (candidate) => sharedPartCount(currentEquipment, equipmentKeys(candidate)),
    },
    {
      reason: '동작 패턴 유사',
      scoreOf: (candidate) => sharedPartCount(currentMovement, movementKeys(candidate)),
    },
  ];

  for (const axis of axes) {
    if (selected.length >= cap) break;
    const winner = pickBestUnused(playable, usedIds, axis.scoreOf, current);
    if (!winner) continue;
    usedIds.add(winner.id);
    selected.push(toRelatedVideo(winner, axis.reason));
  }

  while (selected.length < cap) {
    const winner = pickBestUnused(playable, usedIds, (candidate) => overallRelevance(current, candidate), current);
    if (!winner) break;
    usedIds.add(winner.id);
    selected.push(toRelatedVideo(winner, '관련 활동'));
  }

  return selected;
}
