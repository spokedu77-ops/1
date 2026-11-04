import { NextResponse } from 'next/server';
import {
  readAutomationWorkerId,
  requireAutomationWorker,
} from '@/app/lib/server/automationWorkerAuth';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import {
  parseJobRow,
  validateWorkerCompletionDraft,
} from '@/app/lib/server/feedbackCorrectionJobs';

type Body = { correctionDraft?: unknown };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = requireAutomationWorker(request);
  if (!auth.ok) return auth.response;

  const { id: jobId } = await context.params;
  if (!jobId) {
    return NextResponse.json({ error: 'job id required' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const service = getServiceSupabase();
  const { data: existing, error: readError } = await service
    .from('admin_feedback_correction_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });

  const job = parseJobRow(existing as Record<string, unknown>);
  if (job.status === 'completed') {
    return NextResponse.json({
      ok: true,
      idempotent: true,
      job: {
        id: job.id,
        session_id: job.session_id,
        status: job.status,
        completed_at: job.completed_at,
      },
    });
  }
  const validated = validateWorkerCompletionDraft(job.input_snapshot, body.correctionDraft);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 });
  }

  const workerId = readAutomationWorkerId(request);
  const { data, error } = await service.rpc('admin_feedback_correction_complete_job', {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_correction_draft: validated.draft,
  });

  if (error) {
    const message = error.message ?? 'complete_failed';
    const status = message.includes('JOB_') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const completed = parseJobRow(data as Record<string, unknown>);
  return NextResponse.json({
    ok: true,
    job: {
      id: completed.id,
      session_id: completed.session_id,
      status: completed.status,
      completed_at: completed.completed_at,
    },
  });
}
