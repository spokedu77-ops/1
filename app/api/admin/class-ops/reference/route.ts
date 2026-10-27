import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { fetchTeacherLogCounts } from '@/app/admin/users/fetchTeacherLogCounts';

const TEACHER_COLUMNS = [
  'id',
  'name',
  'is_active',
  'session_count',
  'fee_private',
  'fee_group',
  'fee_center_main',
  'fee_center_assist',
].join(', ');

type TeacherReferenceRow = {
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
    .eq('role', 'teacher')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'class_ops_teachers_fetch_failed' }, { status: 500 });
  }

  const teachers = (data ?? []) as unknown as TeacherReferenceRow[];
  try {
    const logCounts = await fetchTeacherLogCounts(supabase, teachers.map((teacher) => String(teacher.id)));
    return NextResponse.json(
      {
        teachers: teachers.map((teacher) => ({
          ...teacher,
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
