/**
 * Commercial catalog contract. The order is product truth and must not be
 * derived from DB display order, creation time, popularity, or user profile.
 *
 * Program lesson-content access is plan + FREE_PREVIEW_PROGRAM_ID only.
 * `program.isPro` / `sm_is_pro` must not be used for runtime entitlement.
 */
export const WEEKLY_PROGRAM_IDS = ['68', '201', '204', '61'] as const;

export const FREE_PREVIEW_PROGRAM_ID = WEEKLY_PROGRAM_IDS[0];

export const FREE_PREVIEW_PROGRAM_IDS = [FREE_PREVIEW_PROGRAM_ID] as const;

export function isFreePreviewProgramId(value: string | number | null | undefined) {
  return String(value ?? '') === FREE_PREVIEW_PROGRAM_ID;
}

export function canAccessProgramLessonContent(args: {
  programId: string | number | null | undefined;
  canUseLibrary: boolean;
}) {
  if (args.canUseLibrary) return true;
  return isFreePreviewProgramId(args.programId);
}

export function isProgramLessonLocked(args: {
  programId: string | number | null | undefined;
  canUseLibrary: boolean;
}) {
  return !canAccessProgramLessonContent(args);
}

export function getProgramAccessBadge(args: {
  programId: string | number | null | undefined;
  canUseLibrary: boolean;
}): '무료 체험' | 'Lite' | null {
  if (args.canUseLibrary) return null;
  return isFreePreviewProgramId(args.programId) ? '무료 체험' : 'Lite';
}

export function selectWeeklyProgramsById<T extends { id: string }>(programs: T[]): T[] {
  const byId = new Map(programs.map((program) => [program.id, program]));
  return WEEKLY_PROGRAM_IDS
    .map((id) => byId.get(id))
    .filter((program): program is T => Boolean(program));
}
