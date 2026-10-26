import { describe, expect, it } from 'vitest';
import {
  canAccessProgramFullDetail,
  canAccessProgramLessonContent,
  getFreePreviewProgramId,
  getProgramAccessBadge,
  isFreePreviewProgramId,
  isProgramFullDetailLocked,
  isProgramLessonLocked,
  selectWeeklyPrograms,
} from './commercialProgramAccess';

const programs = [
  { id: 'third', isHot: true, homeSortOrder: 3 },
  { id: 'catalog', isHot: false, homeSortOrder: 1 },
  { id: 'first', isHot: true, homeSortOrder: 1 },
  { id: 'outside', isHot: true, homeSortOrder: 5 },
  { id: 'second', isHot: true, homeSortOrder: 2 },
  { id: 'fourth', isHot: true, homeSortOrder: 4 },
];

describe('MASTER commercial program access', () => {
  it('selects the four admin-authored weekly slots in saved order', () => {
    expect(selectWeeklyPrograms(programs).map((program) => program.id)).toEqual([
      'first', 'second', 'third', 'fourth',
    ]);
  });

  it('derives the single Free preview from admin slot 1', () => {
    const freePreviewProgramId = getFreePreviewProgramId(programs);
    expect(freePreviewProgramId).toBe('first');
    expect(isFreePreviewProgramId('first', freePreviewProgramId)).toBe(true);
    expect(isFreePreviewProgramId('second', freePreviewProgramId)).toBe(false);
  });

  it('gives Free quick-preview content only to slot 1', () => {
    const freePreviewProgramId = getFreePreviewProgramId(programs);
    expect(canAccessProgramLessonContent({ programId: 'first', canUseLibrary: false, freePreviewProgramId })).toBe(true);
    expect(isProgramLessonLocked({ programId: 'second', canUseLibrary: false, freePreviewProgramId })).toBe(true);
    expect(isProgramLessonLocked({ programId: 'catalog', canUseLibrary: false, freePreviewProgramId })).toBe(true);
    expect(getProgramAccessBadge({ programId: 'first', canUseLibrary: false, freePreviewProgramId })).toBe('Free');
    expect(getProgramAccessBadge({ programId: 'second', canUseLibrary: false, freePreviewProgramId })).toBe('Lite');
  });

  it('requires Lite library access for every full-detail route', () => {
    expect(canAccessProgramFullDetail({ canUseLibrary: false })).toBe(false);
    expect(isProgramFullDetailLocked({ canUseLibrary: false })).toBe(true);
    expect(canAccessProgramFullDetail({ canUseLibrary: true })).toBe(true);
  });

  it('opens every lesson for Lite and Premium library access', () => {
    expect(canAccessProgramLessonContent({ programId: 'catalog', canUseLibrary: true, freePreviewProgramId: null })).toBe(true);
    expect(getProgramAccessBadge({ programId: 'catalog', canUseLibrary: true, freePreviewProgramId: null })).toBeNull();
  });
});
