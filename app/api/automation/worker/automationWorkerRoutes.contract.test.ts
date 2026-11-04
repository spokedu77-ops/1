import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261105120000_admin_feedback_correction_queue.sql'),
  'utf8',
);
const hardening = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261105140000_admin_feedback_correction_queue_hardening.sql'),
  'utf8',
);
const claimRoute = readFileSync(
  join(process.cwd(), 'app/api/automation/worker/claim/route.ts'),
  'utf8',
);
const completeRoute = readFileSync(
  join(process.cwd(), 'app/api/automation/worker/jobs/[id]/complete/route.ts'),
  'utf8',
);
const enqueueRoute = readFileSync(
  join(process.cwd(), 'app/api/admin/automation/feedback-correction/enqueue/route.ts'),
  'utf8',
);
const consumeRoute = readFileSync(
  join(process.cwd(), 'app/api/admin/automation/feedback-correction/consume/route.ts'),
  'utf8',
);
const saveRoute = readFileSync(
  join(process.cwd(), 'app/api/admin/teachers-classes/save/route.ts'),
  'utf8',
);

describe('feedback correction automation contracts', () => {
  it('locks queue table to service_role and denies browser roles', () => {
    expect(migration).toContain('admin_feedback_correction_jobs_deny_all');
    expect(migration).toContain('using (false)');
    expect(migration).toContain('grant select, insert, update on public.admin_feedback_correction_jobs to service_role');
    expect(migration).toContain('for update skip locked');
  });

  it('worker routes require automation worker auth, not admin cookies', () => {
    expect(claimRoute).toContain('requireAutomationWorker');
    expect(completeRoute).toContain('requireAutomationWorker');
    expect(claimRoute).not.toContain('requireAdmin');
    expect(completeRoute).not.toContain('requireAdmin');
  });

  it('worker complete does not mutate sessions (draft stays on job row)', () => {
    expect(completeRoute).not.toContain(".from('sessions')");
    expect(completeRoute).toContain('admin_feedback_correction_complete_job');
    expect(enqueueRoute).not.toContain('.update(');
    expect(consumeRoute).not.toContain(".from('sessions')");
  });

  it('human approval still uses existing teachers-classes save', () => {
    expect(saveRoute).toContain(".from('sessions')");
    expect(saveRoute).toContain('requireAdmin');
  });

  it('RPC grants exclude authenticated', () => {
    expect(migration).toContain('revoke all on function public.admin_feedback_correction_claim_jobs');
    expect(migration).toContain('from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.admin_feedback_correction_claim_jobs');
  });

  it('hardening adds idempotent complete, lease check, and bounded fail retry', () => {
    expect(hardening).toContain("if v_row.status = 'completed' then");
    expect(hardening).toContain('JOB_LEASE_EXPIRED');
    expect(hardening).toContain('max_attempts_exceeded');
    expect(hardening).toContain("set status = 'pending'");
  });

  it('complete route handles idempotent completed jobs', () => {
    expect(completeRoute).toContain("job.status === 'completed'");
    expect(completeRoute).toContain('idempotent');
  });
});
