import type { SupabaseClient } from '@supabase/supabase-js';

const LOG_COUNT_PAGE_SIZE = 1000;

/** session_count_logs 건수를 강사별로 집계 (PostgREST 1000행 제한 우회) */
export async function fetchTeacherLogCounts(
  supabase: SupabaseClient,
  teacherIds: string[]
): Promise<Record<string, number>> {
  const logCountByTeacher: Record<string, number> = {};
  if (teacherIds.length === 0) return logCountByTeacher;

  let offset = 0;
  while (true) {
    const { data: logRows, error } = await supabase
      .from('session_count_logs')
      .select('teacher_id')
      .in('teacher_id', teacherIds)
      .range(offset, offset + LOG_COUNT_PAGE_SIZE - 1);

    if (error) throw error;
    if (!logRows?.length) break;

    for (const row of logRows) {
      const tid = row.teacher_id as string;
      if (tid) logCountByTeacher[tid] = (logCountByTeacher[tid] || 0) + 1;
    }

    if (logRows.length < LOG_COUNT_PAGE_SIZE) break;
    offset += LOG_COUNT_PAGE_SIZE;
  }

  return logCountByTeacher;
}
