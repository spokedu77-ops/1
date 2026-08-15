import type { Program } from '../types';
import { getPublicLessonTags, normalizeTagKey } from '../lib/lessonDisplayModel';
import {
  getTrustedProgramVideoUrl,
  getVideoThumbnail,
  programHasPlayableVideo,
  resolveProgramHero,
} from '../lib/program-media';

export type RelatedLessonVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  href: string;
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

export function selectRelatedLessonVideos(
  current: Program,
  programs: Program[],
  limit = 3,
): RelatedLessonVideo[] {
  const currentTags = new Set(getPublicLessonTags(current.tags).map(normalizeTagKey));
  const currentGrade = normalizedParts(current.grade);
  const currentCategory = normalizeTagKey(current.category);

  return programs
    .filter((candidate) => candidate.id !== current.id && programHasPlayableVideo(candidate))
    .map((candidate) => {
      const candidateTags = new Set(getPublicLessonTags(candidate.tags).map(normalizeTagKey));
      const tagOverlap = sharedPartCount(currentTags, candidateTags);
      const sameCategory = normalizeTagKey(candidate.category) === currentCategory;
      const gradeOverlap = sharedPartCount(currentGrade, normalizedParts(candidate.grade));
      return {
        candidate,
        score: tagOverlap * 100 + Number(sameCategory) * 20 + Math.min(gradeOverlap, 3) * 5,
      };
    })
    .sort((left, right) =>
      right.score - left.score ||
      left.candidate.title.localeCompare(right.candidate.title, 'ko') ||
      left.candidate.id.localeCompare(right.candidate.id),
    )
    .slice(0, Math.max(0, limit))
    .map(({ candidate }) => {
      const videoUrl = getTrustedProgramVideoUrl(candidate);
      return {
        id: candidate.id,
        title: candidate.title,
        thumbnailUrl: resolveProgramHero(candidate) ?? getVideoThumbnail(videoUrl) ?? null,
        href: `/spokedu-master/library/${candidate.id}`,
      };
    });
}
