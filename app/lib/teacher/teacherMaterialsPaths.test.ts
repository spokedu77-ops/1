import { describe, expect, it } from 'vitest';
import { isTeacherMaterialsGatedPath } from './teacherMaterialsPaths';

describe('inactive teacher route policy', () => {
  it('allows only the teacher settlement report', () => {
    expect(isTeacherMaterialsGatedPath('/teacher/report')).toBe(false);
    expect(isTeacherMaterialsGatedPath('/teacher/report/history')).toBe(false);
  });

  it.each([
    '/teacher',
    '/teacher/my-classes',
    '/teacher/curriculum',
    '/teacher/spomove',
    '/teacher/inventory',
    '/teacher/lesson-plans',
  ])('blocks inactive teachers from %s', (pathname) => {
    expect(isTeacherMaterialsGatedPath(pathname)).toBe(true);
  });

  it('does not affect routes outside teacher', () => {
    expect(isTeacherMaterialsGatedPath('/admin')).toBe(false);
    expect(isTeacherMaterialsGatedPath('/login')).toBe(false);
  });
});
