import { describe, expect, it } from 'vitest';
import { FREE_PREVIEW_PROGRAM_ID, WEEKLY_PROGRAM_IDS, isFreePreviewProgramId, selectWeeklyProgramsById } from './commercialProgramAccess';

describe('MASTER commercial program access', () => {
  it('locks the single free preview to the first weekly program', () => {
    expect(FREE_PREVIEW_PROGRAM_ID).toBe(WEEKLY_PROGRAM_IDS[0]);
    expect(isFreePreviewProgramId(FREE_PREVIEW_PROGRAM_ID)).toBe(true);
    expect(isFreePreviewProgramId(WEEKLY_PROGRAM_IDS[1])).toBe(false);
  });

  it('selects weekly programs only by the explicit fixed-order SSOT', () => {
    const programs = [...WEEKLY_PROGRAM_IDS].reverse().map((id) => ({ id }));
    expect(selectWeeklyProgramsById(programs).map((program) => program.id)).toEqual(WEEKLY_PROGRAM_IDS);
  });
});
