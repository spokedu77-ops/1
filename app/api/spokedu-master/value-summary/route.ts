import { reportError } from '@/app/lib/monitoring/errorReporter';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterSession } from '@/app/lib/server/spokeduMasterAccess';
import type { MasterSubscriberValueEvidence } from '@/app/spokedu-master/lib/masterSubscriberValueEvidence';
import { getMasterValueRange } from '@/app/spokedu-master/lib/masterSubscriberValueEvidence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await requireSpokeduMasterSession();
  if (!session.ok) return withPrivateNoStore(session.response);
  const ownerId = session.userId;
  const now = new Date();
  const range = getMasterValueRange(now);
  const supabase = getServiceSupabase();
  try {
    const [{ data: recent, error: recentError }, { data: upcoming, error: upcomingError }, { count: totalClasses, error: classError }, { count: totalSessions, error: sessionError }] = await Promise.all([
      supabase.from('spokedu_master_sessions').select('id,class_id,memo,spokedu_master_session_attendance(id)').eq('owner_id', ownerId).eq('status', 'completed').is('deleted_at', null).gte('completed_at', range.from).lte('completed_at', range.to),
      supabase.from('spokedu_master_sessions').select('id,class_id').eq('owner_id', ownerId).eq('status', 'scheduled').is('deleted_at', null).gt('start_at', now.toISOString()),
      supabase.from('spokedu_master_classes').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).is('deleted_at', null),
      supabase.from('spokedu_master_sessions').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).is('deleted_at', null),
    ]);
    if (recentError || upcomingError || classError || sessionError) throw recentError ?? upcomingError ?? classError ?? sessionError;
    const completed = (recent ?? []) as Array<{ id: string; class_id: string; memo: string | null; spokedu_master_session_attendance?: Array<{ id: string }> }>;
    const future = (upcoming ?? []) as Array<{ id: string; class_id: string }>;
    let memory: MasterSubscriberValueEvidence['memory'] = { available: true, sessionsWithMemo: completed.filter((item) => item.memo?.trim()).length, captureSessions: 0, studentObservations: 0, nextSessionNotes: 0 };
    try {
      const { data: captures, error } = await supabase.from('spokedu_master_class_records')
        .select('session_id,application_idea,spokedu_master_class_record_students(id,memo),spokedu_master_sessions!inner(completed_at)')
        .eq('owner_id', ownerId).is('deleted_at', null).not('session_id', 'is', null)
        .gte('spokedu_master_sessions.completed_at', range.from)
        .lte('spokedu_master_sessions.completed_at', range.to);
      if (error) throw error;
      const scoped = (captures ?? []) as unknown as Array<{ session_id: string | null; application_idea: string | null; spokedu_master_class_record_students?: Array<{ id: string; memo: string | null }> }>;
      memory = { ...memory, captureSessions: scoped.length, studentObservations: scoped.reduce((sum, item) => sum + (item.spokedu_master_class_record_students ?? []).filter((student) => student.memo?.trim()).length, 0), nextSessionNotes: scoped.filter((item) => item.application_idea?.trim()).length };
    } catch (error) {
      memory = { ...memory, available: false };
      await reportError(error, { context: 'spokedu_master.value_summary', tags: { stage: 'memory_optional' } });
    }
    const activeClasses = new Set([...completed.map((item) => item.class_id), ...future.map((item) => item.class_id)]).size;
    const evidence: MasterSubscriberValueEvidence = {
      scope: range,
      operating: { completedSessions: completed.length, sessionsWithAttendance: completed.filter((item) => (item.spokedu_master_session_attendance?.length ?? 0) > 0).length, upcomingSessions: future.length, activeClasses },
      memory,
      preserved: { totalClasses: totalClasses ?? 0, totalSessions: totalSessions ?? 0 },
    };
    return privateNoStoreJson({ data: evidence });
  } catch (error) {
    await reportError(error, { context: 'spokedu_master.value_summary', tags: { stage: 'operating' } });
    return privateNoStoreJson({ error: '최근 운영 요약을 불러오지 못했습니다.' }, { status: 500 });
  }
}
