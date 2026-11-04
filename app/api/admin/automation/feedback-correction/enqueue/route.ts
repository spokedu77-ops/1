import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { loadSessionCorrectionSnapshot } from '@/app/lib/server/feedbackCorrectionJobs';

type Body = { sessionId?: unknown };

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId이 필요합니다.' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const loaded = await loadSessionCorrectionSnapshot(service, sessionId);
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.code }, { status: loaded.status });
  }

  const idempotencyKey = `feedback-correction:${sessionId}:${Date.now()}`;
  const { data, error } = await service
    .from('admin_feedback_correction_jobs')
    .insert({
      session_id: sessionId,
      status: 'pending',
      idempotency_key: idempotencyKey,
      input_snapshot: loaded.snapshot,
      requested_by: auth.userId,
    })
    .select('id, session_id, status, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: '이미 처리 대기 중인 AI 교정 요청이 있습니다.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job: data });
}
