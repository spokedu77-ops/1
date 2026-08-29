import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canAccessProgram, requireMoveReportTrackInstructor } from '@/app/lib/server/moveReportAuth';

type Props = { params: Promise<{ id: string }> };

function recordStatus(rec: { is_draft: boolean } | undefined) {
  if (!rec) return { label: '미기록', className: 'mr-track-status--pending' };
  if (rec.is_draft) return { label: '기록중', className: 'mr-track-status--draft' };
  return { label: '완료 ✓', className: 'mr-track-status--done' };
}

export default async function MoveTrackSessionPage({ params }: Props) {
  const { id } = await params;
  const auth = await requireMoveReportTrackInstructor();
  if (!auth.ok) notFound();

  const supabase = getServiceSupabase();
  const { data: session } = await supabase
    .from('mr_track_sessions')
    .select('id, program_id, session_number, session_date, status')
    .eq('id', id)
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
    .eq('program_id', session.program_id);

  const childIds = (enrollments ?? []).map((e) => e.child_id);
  const { data: children } = childIds.length
    ? await supabase.from('mr_children').select('id, child_code, child_name').in('id', childIds)
    : { data: [] };

  const { data: records } = await supabase
    .from('mr_session_child_records')
    .select('child_id, is_draft')
    .eq('session_id', id);

  const recordByChild = new Map((records ?? []).map((r) => [r.child_id, r]));
  const doneCount = (records ?? []).filter((r) => !r.is_draft).length;
  const total = children?.length ?? 0;

  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <Link href={`/move-report/track/programs/${session.program_id}`} className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 20 }}>
          ← 사업
        </Link>
        <h1 className="mr-track-title" style={{ fontSize: '1.35rem' }}>
          {session.session_number}회기 · {session.session_date}
        </h1>
        <p className="mr-track-sub">
          {total}명 중 {doneCount}명 기록 완료
        </p>
        <h2 className="mr-track-section-title">아동</h2>
        <ul className="mr-track-program-list">
          {(children ?? []).map((child) => {
            const rec = recordByChild.get(child.id);
            const st = recordStatus(rec);
            return (
              <li key={child.id}>
                <Link href={`/move-report/track/sessions/${id}/children/${child.id}`} className="mr-track-program-card">
                  <span className="mr-track-program-name">{child.child_name ?? child.child_code}</span>
                  <span className={`mr-track-status ${st.className}`}>{st.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
