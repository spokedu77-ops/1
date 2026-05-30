import { PROGRAMS as STATIC_PROGRAMS } from './data';
import { getYouTubeId } from './program-media';
import { isFunstickFencingProgram, resolveTrustedReferenceVideoUrl } from './verified-program-video';

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

const STATIC_VIDEO_BY_TITLE = new Map<string, string>();
for (const program of STATIC_PROGRAMS) {
  const url = program.lessonDetail?.videoUrl?.trim();
  if (!url) continue;
  const trusted = resolveTrustedReferenceVideoUrl(url, program);
  if (trusted) STATIC_VIDEO_BY_TITLE.set(normalizeTitle(program.title), trusted);
}

/**
 * Admin seed 전용 — 제목이 정적 패키지와 정확히 일치할 때만 (자동 regex 규칙 없음)
 */
export function resolveReferenceVideoForTitle(title: string): string | undefined {
  const normalized = normalizeTitle(title);
  const fromStatic = STATIC_VIDEO_BY_TITLE.get(normalized);
  if (fromStatic) return fromStatic;

  const staticMatch = STATIC_PROGRAMS.find((program) => normalizeTitle(program.title) === normalized);
  if (!staticMatch) return undefined;
  return resolveTrustedReferenceVideoUrl(staticMatch.lessonDetail?.videoUrl, staticMatch);
}

export function resolveReferenceVideoForSeed(title: string, curriculumId: number): string | undefined {
  if (isFunstickFencingProgram({ id: String(curriculumId), title })) return undefined;
  return resolveReferenceVideoForTitle(title);
}

export function isYouTubeReferenceUrl(url: string | null | undefined): boolean {
  return Boolean(getYouTubeId((url ?? '').trim()));
}
