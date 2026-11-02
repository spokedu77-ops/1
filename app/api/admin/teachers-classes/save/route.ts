import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getServiceSupabase } from '@/app/lib/server/adminAuth';
import { isFutureSessionDay } from '@/app/lib/server/sessionFeedbackGuard';

type SaveBody = {
  sessionId: string;
  status: 'finished' | 'verified';
  students_text: string;
  feedback_fields: unknown;
  photo_url: unknown;
  file_url: unknown;
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.sessionId || (body.status !== 'finished' && body.status !== 'verified')) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data: session, error: readError } = await supabase.from('sessions')
    .select('id,start_at,updated_at').eq('id', body.sessionId).maybeSingle();
  if (readError) return NextResponse.json({ error: 'SESSION_FEEDBACK_LOOKUP_FAILED' }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 404 });
  if (isFutureSessionDay(session.start_at)) {
    return NextResponse.json({ error: '미래 수업에는 피드백을 저장하거나 검수 승인할 수 없습니다.' }, { status: 400 });
  }
  let update = supabase
    .from('sessions')
    .update({
      status: body.status,
      students_text: body.students_text,
      feedback_fields: body.feedback_fields,
      photo_url: body.photo_url,
      file_url: body.file_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.sessionId)
    .eq('start_at', session.start_at);
  update = session.updated_at === null ? update.is('updated_at', null) : update.eq('updated_at', session.updated_at);
  const { data: saved, error } = await update.select('id').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!saved) return NextResponse.json({ error: 'SESSION_FEEDBACK_STALE' }, { status: 409 });

  return NextResponse.json({ ok: true });
}
