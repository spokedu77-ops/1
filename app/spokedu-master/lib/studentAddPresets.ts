export const STUDENT_AGE_PRESETS = [
  '5세(유아)',
  '6세(유치원)',
  '7세(유치원)',
  '8세(초등학교 1학년)',
  '9세(초등학교 2학년)',
  '10세(초등학교 3학년)',
  '11세(초등학교 4학년)',
  '12세(초등학교 5학년)',
  '13세(초등학교 6학년)',
  '14세(중학교 1학년)',
  '15세(중학교 2학년)',
  '16세(중학교 3학년)',
] as const;

const EXCLUDED_GROUP_NAMES = new Set(['미분류', '']);

export function collectStudentGroupOptions(groups: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const options: string[] = [];
  for (const group of groups) {
    const trimmed = group?.trim();
    if (!trimmed || EXCLUDED_GROUP_NAMES.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    options.push(trimmed);
  }
  return options.sort((a, b) => a.localeCompare(b, 'ko'));
}

export function buildStudentAgeOptions(existingMetaValues: Array<string | null | undefined>): string[] {
  const seen = new Set<string>(STUDENT_AGE_PRESETS);
  const options: string[] = [...STUDENT_AGE_PRESETS];
  for (const meta of existingMetaValues) {
    const trimmed = meta?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    options.push(trimmed);
  }
  return options;
}
