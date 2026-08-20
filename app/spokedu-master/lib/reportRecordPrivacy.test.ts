import { describe, expect, it } from 'vitest';
import { isParentReportRecordEligible } from './reportRecordPrivacy';

describe('parent report record privacy', () => {
  it('excludes private lesson notes, including direct record URL candidates', () => {
    expect(isParentReportRecordEligible({ recordType: 'lesson_note' })).toBe(false);
  });

  it('keeps legacy quick and detailed report candidates', () => {
    expect(isParentReportRecordEligible({ recordType: 'quick' })).toBe(true);
    expect(isParentReportRecordEligible({ recordType: 'detailed' })).toBe(true);
  });
});
