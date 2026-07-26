import { parseMasterTargets } from './programDisplayTags';
import type { Program } from '../types';

/** 온보딩 ageGroups → 프로그램 대상 매칭 점수. 정보 없으면 0 (기존 순서 유지). */
export function scoreProgramForAgeGroups(
  program: Program,
  ageGroups: string[] | null | undefined,
): number {
  if (!ageGroups?.length) return 0;

  const targets = parseMasterTargets(program.lessonDetail?.recommendedAge || program.grade);
  const prefersPreschool = ageGroups.includes('유치부');
  const prefersElementary = ageGroups.some(
    (group) => group === '초등 저학년' || group === '초등 고학년' || group === '중등',
  );

  let score = 0;
  if (prefersPreschool && targets.includes('미취학')) score += 2;
  if (prefersElementary && targets.includes('초등학생 이상')) score += 2;
  return score;
}

/** 점수 높은 프로그램이 앞으로 오도록 비교 (동점이면 0 → 기존 정렬 유지). */
export function compareByAgeGroupPreference(
  a: Program,
  b: Program,
  ageGroups: string[] | null | undefined,
): number {
  return scoreProgramForAgeGroups(b, ageGroups) - scoreProgramForAgeGroups(a, ageGroups);
}

/** 안정 정렬: 연령 선호 후 원래 순서를 보존한다. */
export function sortProgramsByAgeGroupPreference(
  programs: Program[],
  ageGroups: string[] | null | undefined,
): Program[] {
  if (!ageGroups?.length) return programs;
  return programs
    .map((program, index) => ({ program, index }))
    .sort(
      (a, b) =>
        compareByAgeGroupPreference(a.program, b.program, ageGroups) || a.index - b.index,
    )
    .map(({ program }) => program);
}
