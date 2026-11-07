import { NextResponse } from 'next/server';
import { requireAutomationWorker } from '@/app/lib/server/automationWorkerAuth';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { commitRunGrant, verifyRunGrant } from '@/app/lib/automation/feedbackRunGrant';

type Body = { jobId?: unknown; grant?: unknown };

/** Called by the local bridge only. The browser never receives the worker secret. */
export async function POST(request: Request) {
  const auth = requireAutomationWorker(request);
  if (!auth.ok) return auth.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
  const grant = typeof body.grant === 'string' ? body.grant.trim() : '';
  if (!jobId || !grant) return NextResponse.json({ error: 'GRANT_MALFORMED' }, { status: 400 });

  let verified: ReturnType<typeof verifyRunGrant>;
  try {
    verified = verifyRunGrant(grant, jobId);
  } catch {
    return NextResponse.json({ error: 'RUN_GRANT_SECRET_MISSING' }, { status: 500 });
  }
  if (!verified.ok) return NextResponse.json({ error: verified.code }, { status: 401 });

  const service = getServiceSupabase();
  const { data, error } = await service
    .from('admin_feedback_correction_jobs')
    .select('id, status')
    .eq('id', jobId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
  if (data.status !== 'pending') return NextResponse.json({ error: 'JOB_NOT_PENDING' }, { status: 409 });

  commitRunGrant(verified.jti);
  return NextResponse.json({ ok: true, jobId });
}
