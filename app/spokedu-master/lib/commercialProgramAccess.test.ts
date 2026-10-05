import { describe, expect, it } from 'vitest';
import {
  FREE_PREVIEW_PROGRAM_ID,
  WEEKLY_PROGRAM_IDS,
  canAccessProgramLessonContent,
  getProgramAccessBadge,
  isFreePreviewProgramId,
  isProgramLessonLocked,
  selectWeeklyProgramsById,
} from './commercialProgramAccess';

describe('MASTER commercial program access', () => {
  it('derives the single free preview from the first weekly slot', () => {
    expect(WEEKLY_PROGRAM_IDS).toHaveLength(4);
    expect(FREE_PREVIEW_PROGRAM_ID).toBe(WEEKLY_PROGRAM_IDS[0]);
    expect(isFreePreviewProgramId(FREE_PREVIEW_PROGRAM_ID)).toBe(true);
    expect(isFreePreviewProgramId(WEEKLY_PROGRAM_IDS[1])).toBe(false);
  });

  it('selects weekly programs only by the explicit fixed-order SSOT', () => {
    const programs = [...WEEKLY_PROGRAM_IDS].reverse().map((id) => ({ id }));
    expect(selectWeeklyProgramsById(programs).map((program) => program.id)).toEqual(WEEKLY_PROGRAM_IDS);
  });

  it('gives Free full access only to the first weekly slot and Lite-locks every other program', () => {
    expect(canAccessProgramLessonContent({ programId: FREE_PREVIEW_PROGRAM_ID, canUseLibrary: false })).toBe(true);
    for (const id of WEEKLY_PROGRAM_IDS.slice(1)) {
      expect(isProgramLessonLocked({ programId: id, canUseLibrary: false })).toBe(true);
    }
    expect(isProgramLessonLocked({ programId: 'arbitrary-catalog-program', canUseLibrary: false })).toBe(true);
    expect(getProgramAccessBadge({ programId: FREE_PREVIEW_PROGRAM_ID, canUseLibrary: false })).toBe('Free');
    expect(getProgramAccessBadge({ programId: WEEKLY_PROGRAM_IDS[1], canUseLibrary: false })).toBe('Lite');
  });

  it('opens every 놀이체육 for Lite and Premium library access', () => {
    for (const id of WEEKLY_PROGRAM_IDS) {
      expect(canAccessProgramLessonContent({ programId: id, canUseLibrary: true })).toBe(true);
      expect(getProgramAccessBadge({ programId: id, canUseLibrary: true })).toBeNull();
    }
    expect(canAccessProgramLessonContent({ programId: '999', canUseLibrary: true })).toBe(true);
  });
});
