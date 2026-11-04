import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { parseJobRow } from '@/app/lib/server/feedbackCorrectionJobs';
import type { FeedbackFields } from '@/app/lib/feedbackValidation';

type Body = { jobId?: unknown };

/** Loads correction draft into admin review — does not mutate sessions. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
  if (!jobId) {
    return NextResponse.json({ error: 'jobId가 필요합니다.' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { data: row, error } = await service
    .from('admin_feedback_correction_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });

  const job = parseJobRow(row as Record<string, unknown>);
  if (job.status !== 'completed' || !job.correction_draft) {
    return NextResponse.json({ error: '교정 초안이 아직 준비되지 않았습니다.' }, { status: 409 });
  }

  const consumedAt = new Date().toISOString();
  const { error: updateError } = await service
    .from('admin_feedback_correction_jobs')
    .update({ consumed_at: consumedAt, updated_at: consumedAt })
    .eq('id', jobId)
    .is('consumed_at', null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: job.session_id,
    correctionDraft: job.correction_draft as FeedbackFields,
    inputSnapshot: job.input_snapshot,
  });
}
