import { describe, expect, it } from 'vitest';
import { isClassOpsSelectableTeacher, isClassOpsTeacherOptionLabel } from './classOpsTeacherSelection';

describe('classOpsTeacherSelection', () => {
  it('keeps registered operators selectable with legacy test emails', () => {
    const row = {
      name: '김구민',
      email: 'kimkoomin+test@spokedu.com',
      role: 'admin',
      is_admin: true,
      is_active: true,
    };
    expect(isClassOpsTeacherOptionLabel(row)).toBe(true);
    expect(isClassOpsSelectableTeacher(row)).toBe(true);
  });

  it('excludes QA fixture names from selectable teachers', () => {
    expect(
      isClassOpsSelectableTeacher({
        name: 'SPOMOVE QA',
        email: 'qa@example.com',
        role: 'teacher',
        is_active: true,
      }),
    ).toBe(false);
  });

  it('requires active accounts for bundle selection', () => {
    expect(
      isClassOpsSelectableTeacher({
        name: '김윤기',
        email: 'kimyoonki@spokedu.com',
        role: 'admin',
        is_admin: true,
        is_active: false,
      }),
    ).toBe(false);
  });

  it('keeps staff operators selectable by name on legacy test emails', () => {
    expect(
      isClassOpsSelectableTeacher({
        name: '김윤기',
        email: 'legacy@spokedu.test',
        role: 'teacher',
        is_active: true,
      }),
    ).toBe(true);
  });
});
