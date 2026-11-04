import { NextResponse } from 'next/server';
import {
  readAutomationWorkerId,
  requireAutomationWorker,
} from '@/app/lib/server/automationWorkerAuth';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { parseJobRow } from '@/app/lib/server/feedbackCorrectionJobs';
import { FEEDBACK_CORRECTION_MAX_ATTEMPTS } from '@/app/lib/automation/feedbackCorrectionPolicy';

type Body = { errorCode?: unknown; errorDetail?: unknown };

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

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const errorCode = typeof body.errorCode === 'string' ? body.errorCode.trim() : 'worker_error';
  const errorDetail = typeof body.errorDetail === 'string' ? body.errorDetail.trim() : null;

  const workerId = readAutomationWorkerId(request);
  const service = getServiceSupabase();
  const { data, error } = await service.rpc('admin_feedback_correction_fail_job', {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_error_code: errorCode,
    p_error_detail: errorDetail ? errorDetail.slice(0, 500) : null,
    p_max_attempts: FEEDBACK_CORRECTION_MAX_ATTEMPTS,
  });

  if (error) {
    const message = error.message ?? 'fail_mark_failed';
    const status = message.includes('JOB_') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  const failed = parseJobRow(data as Record<string, unknown>);
  return NextResponse.json({
    ok: true,
    job: {
      id: failed.id,
      status: failed.status,
      error_code: failed.error_code,
    },
  });
}
