/**
 * The admin-authored recommendation slots are the runtime product truth.
 * Slot 1 is also the single Free quick-preview; slots 2-4 require Lite.
 */
export const WEEKLY_RECOMMENDATION_SLOT_COUNT = 4;

type WeeklyProgram = {
  id: string;
  isHot?: boolean;
  homeSortOrder?: number;
};

export function selectWeeklyPrograms<T extends WeeklyProgram>(programs: T[]): T[] {
  return programs
    .filter((program) => (
      program.isHot === true
      && Number.isInteger(program.homeSortOrder)
      && Number(program.homeSortOrder) >= 1
      && Number(program.homeSortOrder) <= WEEKLY_RECOMMENDATION_SLOT_COUNT
    ))
    .sort((a, b) => Number(a.homeSortOrder) - Number(b.homeSortOrder))
    .slice(0, WEEKLY_RECOMMENDATION_SLOT_COUNT);
}

export function getFreePreviewProgramId<T extends WeeklyProgram>(programs: T[]) {
  return programs.find((program) => program.isHot === true && program.homeSortOrder === 1)?.id ?? null;
}

export function isFreePreviewProgramId(
  value: string | number | null | undefined,
  freePreviewProgramId: string | number | null | undefined,
) {
  return freePreviewProgramId != null && String(value ?? '') === String(freePreviewProgramId);
}

export function canAccessProgramLessonContent(args: {
  programId: string | number | null | undefined;
  canUseLibrary: boolean;
  freePreviewProgramId: string | number | null | undefined;
}) {
  if (args.canUseLibrary) return true;
  return isFreePreviewProgramId(args.programId, args.freePreviewProgramId);
}

export function canAccessProgramFullDetail(args: { canUseLibrary: boolean }) {
  return args.canUseLibrary;
}

export function isProgramFullDetailLocked(args: { canUseLibrary: boolean }) {
  return !canAccessProgramFullDetail(args);
}

export function isProgramLessonLocked(args: {
  programId: string | number | null | undefined;
  canUseLibrary: boolean;
  freePreviewProgramId: string | number | null | undefined;
}) {
  return !canAccessProgramLessonContent(args);
}

export function getProgramAccessBadge(args: {
  programId: string | number | null | undefined;
  canUseLibrary: boolean;
  freePreviewProgramId: string | number | null | undefined;
}): 'Free' | 'Lite' | null {
  if (args.canUseLibrary) return null;
  return isFreePreviewProgramId(args.programId, args.freePreviewProgramId) ? 'Free' : 'Lite';
}
