import { describe, expect, it } from 'vitest';
import { buildStudentAgeOptions, collectStudentGroupOptions, STUDENT_AGE_PRESETS } from './studentAddPresets';

describe('studentAddPresets', () => {
  it('collects unique student groups excluding defaults', () => {
    expect(collectStudentGroupOptions(['초등 A반', '유아반', '초등 A반', '미분류', '', null])).toEqual([
      '유아반',
      '초등 A반',
    ]);
  });

  it('merges age presets with previously used custom meta values', () => {
    const options = buildStudentAgeOptions(['8세(초등학교 1학년)', '9세 / 3개월차']);
    expect(options.slice(0, STUDENT_AGE_PRESETS.length)).toEqual([...STUDENT_AGE_PRESETS]);
    expect(options).toContain('9세 / 3개월차');
  });
});
