import {
  isKnownPlatformAdminEmail,
  isPlatformAdminFromUserRow,
} from '@/app/lib/auth/platformAdminIdentity';
import { ADMIN_NAMES } from '@/app/lib/constants/admin';

const QA_TEST_LABEL = /spomove|qa|test|\uD14C\uC2A4\uD2B8/i;
const CLASS_OPS_TEACHER_ROLES = ['teacher', 'admin', 'master'] as const;

export type ClassOpsTeacherCandidate = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  is_active?: boolean | null;
};

/** Directory display only; operational assignment options retain their own rules. */
export function isActualClassOpsTeacher(row: ClassOpsTeacherCandidate): boolean {
  const name = row.name?.trim() ?? '';
  return row.role === 'teacher' && Boolean(name) && name !== '미정'
    && !isRegisteredOperator(row) && isClassOpsTeacherOptionLabel(row);
}

function isRegisteredOperator(row: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
}): boolean {
  const name = row.name?.trim() ?? '';
  if ((ADMIN_NAMES as readonly string[]).includes(name)) return true;
  return isPlatformAdminFromUserRow(row) || isKnownPlatformAdminEmail(row.email);
}

/** QA/test 라벨 제외 — 등록된 운영진은 legacy test 이메일도 배정 가능 (class-ops/reference 와 동일). */
export function isClassOpsTeacherOptionLabel(row: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  is_admin?: boolean | null;
}): boolean {
  if (QA_TEST_LABEL.test(row.name ?? '')) return false;
  if (isRegisteredOperator(row)) return true;
  return !QA_TEST_LABEL.test(`${row.name ?? ''} ${row.email ?? ''}`);
}

/** 기존 수업 상세(번들) 메인·보조 강사 변경 — class-ops/reference filterTeachers 와 동일 기준 */
export function isClassOpsSelectableTeacher(row: ClassOpsTeacherCandidate): boolean {
  if (row.is_active === false) return false;
  const role = row.role ?? '';
  const registered = isRegisteredOperator(row);
  if (!CLASS_OPS_TEACHER_ROLES.includes(role as (typeof CLASS_OPS_TEACHER_ROLES)[number]) && !registered) {
    return false;
  }
  return isClassOpsTeacherOptionLabel(row);
}
