import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { fetchTeacherLogCounts } from '@/app/admin/users/fetchTeacherLogCounts';
import { isZeroFeeStaff } from '@/app/lib/staffTeacherFees';
import { isClassOpsTeacherOptionLabel } from '@/app/admin/classes/lib/classOpsTeacherSelection';

const TEACHER_COLUMNS = [
  'id',
  'name',
  'role', 'email', 'is_admin',
  'is_active',
  'session_count',
  'fee_private',
  'fee_group',
  'fee_center_main',
  'fee_center_assist',
].join(', ');

type TeacherReferenceRow = {
  role?: string; email?: string; is_admin?: boolean;
  id: string;
  name: string;
  is_active: boolean | null;
  session_count: number | null;
  fee_private: number | null;
  fee_group: number | null;
  fee_center_main: number | null;
  fee_center_assist: number | null;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('users')
    .select(TEACHER_COLUMNS)
    .in('role', ['teacher', 'admin', 'master'])
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'class_ops_teachers_fetch_failed' }, { status: 500 });
  }

  const teachers = (data ?? []) as unknown as TeacherReferenceRow[];
  try {
    // Calendar options are separate from the historical teacher directory.
    const { data: candidates, error: candidatesError } = await supabase.from('users')
      .select('id, name, email, role, is_admin').eq('is_active', true)
      .in('role', ['teacher', 'admin', 'master']).order('name', { ascending: true });
    if (candidatesError) throw candidatesError;
    // Class Ops uses the registered staff directory. MASTER billing/profile
    // records and Auth lookups must not be prerequisites for selecting staff.
    const filterTeachers = (candidates ?? [])
      .filter((candidate) => isClassOpsTeacherOptionLabel(candidate))
      .map((candidate) => ({ id: candidate.id, name: candidate.name }));
    const logCounts = await fetchTeacherLogCounts(supabase, teachers.map((teacher) => String(teacher.id)));
    return NextResponse.json(
      {
        filterTeachers,
        teachers: teachers.map((teacher) => ({
          ...teacher,
          ...(isZeroFeeStaff(teacher) ? { fee_private: 0, fee_group: 0, fee_center_main: 0, fee_center_assist: 0 } : {}),
          is_active: teacher.is_active ?? true,
          log_count: logCounts[String(teacher.id)] ?? 0,
        })),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'class_ops_counts_fetch_failed' }, { status: 500 });
  }
}
