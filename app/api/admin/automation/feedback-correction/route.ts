import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { parseJobRow } from '@/app/lib/server/feedbackCorrectionJobs';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const sessionId = new URL(request.url).searchParams.get('sessionId')?.trim() ?? '';
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId이 필요합니다.' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { data, error } = await service
    .from('admin_feedback_correction_jobs')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobs = (data ?? []).map((row) => parseJobRow(row as Record<string, unknown>));
  const active = jobs.find((job) => job.status === 'pending' || job.status === 'processing') ?? null;
  const latestCompleted =
    jobs.find((job) => job.status === 'completed' && !job.consumed_at) ?? null;

  return NextResponse.json({
    ok: true,
    active,
    latestCompleted,
    history: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      consumedAt: job.consumed_at,
      errorCode: job.error_code,
      sourceFeedback: job.input_snapshot?.feedback_fields ?? {},
      correctionDraft: job.correction_draft,
    })),
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      created_at: job.created_at,
      completed_at: job.completed_at,
      consumed_at: job.consumed_at,
      error_code: job.error_code,
    })),
  });
}
