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
  it('locks weekly order and the single free preview to ID 68', () => {
    expect(WEEKLY_PROGRAM_IDS).toEqual(['68', '201', '204', '61']);
    expect(FREE_PREVIEW_PROGRAM_ID).toBe('68');
    expect(FREE_PREVIEW_PROGRAM_ID).toBe(WEEKLY_PROGRAM_IDS[0]);
    expect(isFreePreviewProgramId(FREE_PREVIEW_PROGRAM_ID)).toBe(true);
    expect(isFreePreviewProgramId(WEEKLY_PROGRAM_IDS[1])).toBe(false);
  });

  it('selects weekly programs only by the explicit fixed-order SSOT', () => {
    const programs = [...WEEKLY_PROGRAM_IDS].reverse().map((id) => ({ id }));
    expect(selectWeeklyProgramsById(programs).map((program) => program.id)).toEqual(WEEKLY_PROGRAM_IDS);
  });

  it('gives Free full access only to program 68 and Lite-locks the rest', () => {
    expect(canAccessProgramLessonContent({ programId: '68', canUseLibrary: false })).toBe(true);
    expect(isProgramLessonLocked({ programId: '201', canUseLibrary: false })).toBe(true);
    expect(isProgramLessonLocked({ programId: '204', canUseLibrary: false })).toBe(true);
    expect(isProgramLessonLocked({ programId: '61', canUseLibrary: false })).toBe(true);
    expect(getProgramAccessBadge({ programId: '68', canUseLibrary: false })).toBe('무료 체험');
    expect(getProgramAccessBadge({ programId: '201', canUseLibrary: false })).toBe('Lite');
  });

  it('opens every 놀이체육 for Lite and Premium library access', () => {
    for (const id of WEEKLY_PROGRAM_IDS) {
      expect(canAccessProgramLessonContent({ programId: id, canUseLibrary: true })).toBe(true);
      expect(getProgramAccessBadge({ programId: id, canUseLibrary: true })).toBeNull();
    }
    expect(canAccessProgramLessonContent({ programId: '999', canUseLibrary: true })).toBe(true);
  });
});
