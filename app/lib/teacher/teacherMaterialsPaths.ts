/** 종료 강사(is_active=false)에게 차단할 teacher 자료 경로 */

export function isTeacherCurriculumPath(pathname: string | null): boolean {
  return pathname != null && pathname.startsWith('/teacher/curriculum');
}

export function isTeacherSpomovePath(pathname: string | null): boolean {
  return pathname != null && pathname.startsWith('/teacher/spomove');
}

export function isTeacherMaterialsGatedPath(pathname: string | null): boolean {
  return isTeacherCurriculumPath(pathname) || isTeacherSpomovePath(pathname);
}
