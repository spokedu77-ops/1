import { describe, expect, it } from 'vitest';
import { claimStudentCreateSubmit, studentCreateLegacyId } from './studentCreateSubmit';

describe('student create double submit', () => {
  it('reuses one legacy id for the same draft, including a second invocation', () => {
    const lock = { current: false };
    const legacyId = studentCreateLegacyId(null, () => 'draft-1');
    expect(claimStudentCreateSubmit(lock)).toBe(true);
    expect(claimStudentCreateSubmit(lock)).toBe(false);
    expect(studentCreateLegacyId(legacyId, () => 'draft-2')).toBe('draft-1');
    expect(studentCreateLegacyId(legacyId, () => 'draft-2')).toBe('draft-1');
  });

  it('allows the same name when the next sheet gets a new legacy id', () => {
    const first = studentCreateLegacyId(null, () => 'draft-1');
    const second = studentCreateLegacyId(null, () => 'draft-2');
    expect(first).not.toBe(second);
  });
});
