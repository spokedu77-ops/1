import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canAccessProgram, requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';
import ChildRecordClient from '../../../../components/ChildRecordClient';

type Props = { params: Promise<{ id: string; childId: string }> };

export default async function MoveTrackChildRecordPage({ params }: Props) {
  const { id: sessionId, childId } = await params;
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) notFound();

  const supabase = getServiceSupabase();
  const { data: session } = await supabase
    .from('mr_track_sessions')
    .select('id, program_id, session_number')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) notFound();

  const allowed = await canAccessProgram(auth.userId, session.program_id, {
    isAdmin: auth.isAdmin,
    allowViewer: false,
  });
  if (!allowed) notFound();

  const { data: enrollments } = await supabase
    .from('mr_program_children')
    .select('child_id')
    .eq('program_id', session.program_id)
    .order('enrolled_at', { ascending: true });

  const childIds = (enrollments ?? []).map((e) => e.child_id);
  if (!childIds.includes(childId)) notFound();

  return (
    <main className="mr-page mr-track-page mr-track-page--record">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max mr-track-record-shell">
        <ChildRecordClient
          sessionId={sessionId}
          childId={childId}
          childIds={childIds}
          sessionNumber={session.session_number}
        />
      </div>
    </main>
  );
}
