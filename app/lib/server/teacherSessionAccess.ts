import { parseExtraTeachers } from '@/app/admin/classes-shared/lib/sessionUtils';

export type TeacherOwnedSession = {
  created_by?: string | null;
  memo?: string | null;
  students_text?: string | null;
};

export function canTeacherEditSession(userId: string, session: TeacherOwnedSession): boolean {
  const normalizedUserId = String(userId || '').trim().toLowerCase();
  if (!normalizedUserId) return false;
  if (String(session.created_by || '').trim().toLowerCase() === normalizedUserId) return true;

  for (const raw of [session.memo, session.students_text]) {
    if (!raw?.includes('EXTRA_TEACHERS:')) continue;
    if (
      parseExtraTeachers(raw).extraTeachers.some(
        (teacher) => String(teacher.id || '').trim().toLowerCase() === normalizedUserId,
      )
    ) {
      return true;
    }
  }
  return false;
}
