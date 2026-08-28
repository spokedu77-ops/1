import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canAccessProgram, requireMoveReportTrackSession } from '@/app/lib/server/moveReportAuth';

type Props = { params: Promise<{ id: string }> };

export default async function MoveTrackSessionPage({ params }: Props) {
  const { id } = await params;
  const auth = await requireMoveReportTrackSession();
  if (!auth.ok) notFound();

  const supabase = getServiceSupabase();
  const { data: session } = await supabase
    .from('mr_track_sessions')
    .select('id, program_id, session_number, session_date, status')
    .eq('id', id)
    .maybeSingle();
  if (!session) notFound();

  const allowed = await canAccessProgram(auth.userId, session.program_id, { isAdmin: auth.isAdmin });
  if (!allowed) notFound();

  const { data: enrollments } = await supabase
    .from('mr_program_children')
    .select('child_id')
    .eq('program_id', session.program_id);

  const childIds = (enrollments ?? []).map((e) => e.child_id);
  if (childIds.length === 0) {
    return (
      <main className="mr-page mr-track-page">
        <div className="mr-page-inner mr-content-max">
          <p className="mr-track-sub">등록된 아동이 없습니다.</p>
        </div>
      </main>
    );
  }

  type ChildRow = { id: string; child_code: string; child_name?: string };
  let children: ChildRow[] = [];

  if (auth.role === 'viewer') {
    const { data } = await supabase
      .from('mr_children_impact_safe')
      .select('id, child_code')
      .in('id', childIds);
    children = (data ?? []) as ChildRow[];
  } else {
    const { data } = await supabase
      .from('mr_children')
      .select('id, child_code, child_name')
      .in('id', childIds);
    children = (data ?? []) as ChildRow[];
  }

  const { data: records } = await supabase
    .from('mr_session_child_records')
    .select('child_id, is_draft, participation_level')
    .eq('session_id', id);

  const recordByChild = new Map((records ?? []).map((r) => [r.child_id, r]));

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
        <p className="mr-track-sub">{session.status}</p>
        <h2 className="mr-track-section-title">아동</h2>
        <ul className="mr-track-program-list">
          {children.map((child) => {
            const rec = recordByChild.get(child.id);
            const label = auth.role === 'viewer' ? child.child_code : (child.child_name ?? child.child_code);
            return (
              <li key={child.id}>
                <Link
                  href={`/move-report/track/sessions/${id}/children/${child.id}`}
                  className="mr-track-program-card"
                >
                  <span className="mr-track-program-name">{label}</span>
                  <span className="mr-track-program-meta">
                    {rec ? (rec.is_draft ? '작성 중' : '완료') : '미기록'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
