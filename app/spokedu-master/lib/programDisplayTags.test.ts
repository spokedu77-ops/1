import { describe, expect, it } from 'vitest';

import {
  getMasterParticipantFormat,
  parseMasterParticipantFormats,
  setMasterParticipantFormatTag,
} from './programDisplayTags';

describe('Master participant format tags', () => {
  it('reads only the allowed participant formats from structured tags', () => {
    expect(parseMasterParticipantFormats(['인원:개인전', '인원:2인 1조', '인원:팀전'])).toEqual([
      '개인전',
      '2인 1조',
      '팀전',
    ]);
    expect(parseMasterParticipantFormats(['인원:12명', '인원:소그룹', '신체 기능:균형'])).toEqual([]);
  });

  it('uses the first valid participant format when multiple tags exist', () => {
    expect(getMasterParticipantFormat(['인원:12명', '인원:팀전', '인원:개인전'])).toBe('팀전');
  });

  it('replaces the participant tag while preserving unrelated structured tags', () => {
    expect(setMasterParticipantFormatTag(['움직임:이동', '인원:개인전', '인원:팀전'], '2인 1조')).toEqual([
      '움직임:이동',
      '인원:2인 1조',
    ]);
  });

  it('removes participant tags when the next value is empty or unsupported', () => {
    expect(setMasterParticipantFormatTag(['신체 기능:협응', '인원:팀전'], '')).toEqual(['신체 기능:협응']);
    expect(setMasterParticipantFormatTag(['신체 기능:협응', '인원:팀전'], '4명')).toEqual(['신체 기능:협응']);
  });
});
