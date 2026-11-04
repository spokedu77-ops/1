import { NextResponse } from 'next/server';
import {
  readAutomationWorkerId,
  requireAutomationWorker,
} from '@/app/lib/server/automationWorkerAuth';
import {
  parseJobRow,
  toWorkerPayload,
  loadSessionCorrectionSnapshot,
} from '@/app/lib/server/feedbackCorrectionJobs';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { FEEDBACK_CORRECTION_MAX_ATTEMPTS } from '@/app/lib/automation/feedbackCorrectionPolicy';

type Body = { limit?: unknown; leaseSeconds?: unknown };

export async function POST(request: Request) {
  const auth = requireAutomationWorker(request);
  if (!auth.ok) return auth.response;

  let body: Body = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const limit = typeof body.limit === 'number' ? body.limit : Number(body.limit ?? 3);
  const leaseSeconds =
    typeof body.leaseSeconds === 'number' ? body.leaseSeconds : Number(body.leaseSeconds ?? 900);

  const workerId = readAutomationWorkerId(request);
  const service = getServiceSupabase();

  const { data: claimed, error } = await service.rpc('admin_feedback_correction_claim_jobs', {
    p_worker_id: workerId,
    p_limit: Number.isFinite(limit) ? limit : 3,
    p_lease_seconds: Number.isFinite(leaseSeconds) ? leaseSeconds : 900,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const jobs = (claimed ?? []).map((row: Record<string, unknown>) => parseJobRow(row));
  const payloads = [];

  for (const job of jobs) {
    const loaded = await loadSessionCorrectionSnapshot(service, job.session_id);
    payloads.push({
      job_id: job.id,
      session_id: job.session_id,
      attempt_count: job.attempt_count,
      max_attempts: FEEDBACK_CORRECTION_MAX_ATTEMPTS,
      context: loaded.ok
        ? toWorkerPayload(job, loaded.lessonPlanContent)
        : {
            job_id: job.id,
            session_id: job.session_id,
            error: loaded.code,
            instruction: 'session context unavailable',
          },
    });
  }

  return NextResponse.json({ ok: true, workerId, jobs: payloads });
}
