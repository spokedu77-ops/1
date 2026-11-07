import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { issueRunGrant } from '@/app/lib/automation/feedbackRunGrant';

type Body = { jobId?: unknown };

/** Issues a fresh one-time grant for a pending job so the admin can resume a local run. */
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
  if (!jobId) return NextResponse.json({ error: 'jobId이 필요합니다.' }, { status: 400 });

  const service = getServiceSupabase();
  const { data, error } = await service
    .from('admin_feedback_correction_jobs')
    .select('id, status')
    .eq('id', jobId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
  if (data.status !== 'pending') return NextResponse.json({ error: 'JOB_NOT_PENDING' }, { status: 409 });

  try {
    return NextResponse.json({ ok: true, jobId, runGrant: issueRunGrant(jobId) });
  } catch {
    return NextResponse.json({ error: 'RUN_GRANT_SECRET_MISSING' }, { status: 500 });
  }
}
