import { PROGRAMS as STATIC_PROGRAMS } from './data';
import { applyTrustedReferenceVideo, resolveTrustedReferenceVideoUrl } from './verified-program-video';
import type { Program } from '../types';

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
}

/** API curriculum과 제목이 맞는 정적 패키지의 비주얼·HOT·정렬을 보강한다. */
export function enrichProgramsWithStaticVisuals(programs: Program[]): Program[] {
  const staticByTitle = new Map<string, Program>();
  for (const program of STATIC_PROGRAMS) {
    staticByTitle.set(normalizeTitle(program.title), program);
  }

  return programs.map((program) => {
    const patch = staticByTitle.get(normalizeTitle(program.title));
    if (!patch) return program;

    const staticHero = patch.lessonDetail?.heroImageUrl ?? patch.thumbnailUrl;
    const apiHero = program.lessonDetail?.heroImageUrl ?? program.thumbnailUrl;
    const mergedHero = apiHero || staticHero;
    const mergedThumb = program.thumbnailUrl || mergedHero || patch.thumbnailUrl;

    const detail = program.lessonDetail;
    if (!detail) {
      return {
        ...program,
        thumbnailUrl: mergedThumb,
      };
    }

    const mergedVideo =
      resolveTrustedReferenceVideoUrl(detail.videoUrl, program) ||
      resolveTrustedReferenceVideoUrl(patch.lessonDetail?.videoUrl, { id: patch.id, title: patch.title });

    return applyTrustedReferenceVideo({
      ...program,
      thumbnailUrl: mergedThumb,
      lessonDetail: {
        ...detail,
        heroImageUrl: mergedHero,
        videoUrl: mergedVideo,
      },
    });
  });
}
