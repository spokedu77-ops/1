import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { canAccessProgram, requireMoveReportTrackSession } from '@/app/lib/server/moveReportAuth';

type Props = { params: Promise<{ id: string }> };

export default async function MoveTrackProgramDetailPage({ params }: Props) {
  const { id } = await params;
  const auth = await requireMoveReportTrackSession();
  if (!auth.ok) notFound();

  const allowed = await canAccessProgram(auth.userId, id, { isAdmin: auth.isAdmin });
  if (!allowed) notFound();

  const supabase = getServiceSupabase();
  const { data: program } = await supabase.from('mr_programs').select('*').eq('id', id).maybeSingle();
  if (!program) notFound();

  const { data: sessions } = await supabase
    .from('mr_track_sessions')
    .select('id, session_number, session_date, status')
    .eq('program_id', id)
    .order('session_number', { ascending: true });

  return (
    <main className="mr-page mr-track-page">
      <div className="grain" aria-hidden />
      <div className="mr-page-inner mr-content-max">
        <Link href="/move-report/track/programs" className="btn-ghost mr-coach-back" style={{ textDecoration: 'none', marginBottom: 20 }}>
          ← 사업 목록
        </Link>
        <h1 className="mr-track-title" style={{ fontSize: '1.35rem' }}>
          {program.program_name}
        </h1>
        <p className="mr-track-sub">
          {program.status} · {program.total_sessions}회 · {program.session_minutes}분
        </p>
        <Link href={`/move-report/track/sessions/new?programId=${id}`} className="btn-fire mr-track-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
          회기 기록 시작
        </Link>
        <h2 className="mr-track-section-title">회기</h2>
        <ul className="mr-track-program-list">
          {(sessions ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/move-report/track/sessions/${s.id}`} className="mr-track-program-card">
                <span className="mr-track-program-name">{s.session_number}회기</span>
                <span className="mr-track-program-meta">
                  {s.session_date} · {s.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
