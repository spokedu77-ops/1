import { PROGRAMS as STATIC_PROGRAMS } from './data';
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
    const mergedHero = apiHero ?? staticHero;
    const mergedThumb = program.thumbnailUrl ?? patch.thumbnailUrl ?? mergedHero;

    const apiOrder = program.homeSortOrder ?? 9999;
    const patchOrder = patch.homeSortOrder ?? 9999;
    const mergedOrder = Math.min(apiOrder, patchOrder);

    const detail = program.lessonDetail ?? patch.lessonDetail;
    if (!detail) return program;

    return {
      ...program,
      thumbnailUrl: mergedThumb,
      isHot: program.isHot || Boolean(patch.isHot),
      homeSortOrder: mergedOrder,
      lessonDetail: {
        ...detail,
        heroImageUrl: mergedHero,
        rules: detail.rules?.length ? detail.rules : patch.lessonDetail?.rules ?? detail.rules,
        setupNotes: detail.setupNotes?.length ? detail.setupNotes : patch.lessonDetail?.setupNotes ?? [],
        videoUrl: detail.videoUrl ?? patch.lessonDetail?.videoUrl,
        objective: detail.objective || patch.lessonDetail?.objective || program.description,
        developmentFocus: detail.developmentFocus || patch.lessonDetail?.developmentFocus || '',
      },
    };
  });
}
