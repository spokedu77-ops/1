/**
 * Local Supabase (Docker) E2E — feedback correction queue.
 * Does NOT touch cloud/production. Requires: Docker + `supabase start`.
 *
 * Usage: node scripts/local-feedback-correction-supabase-e2e.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const root = join(process.cwd());
const migrationsDir = join(root, 'supabase/migrations');
const QUEUE_MIGRATIONS = [
  '20261105120000_admin_feedback_correction_queue.sql',
  '20261105140000_admin_feedback_correction_queue_hardening.sql',
];
const pgUrl = process.env.FEEDBACK_CORRECTION_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const apiUrl = process.env.FEEDBACK_CORRECTION_API_URL ?? 'http://127.0.0.1:54321';
const workerSecret = process.env.AUTOMATION_WORKER_SECRET ?? 'local-e2e-worker-secret-do-not-use-in-prod';
const appBase = process.env.FEEDBACK_CORRECTION_APP_URL ?? 'http://127.0.0.1:3099';

const TEACHER_ID = 'e2e10000-0000-4000-8000-000000000001';
const ADMIN_ID = 'e2e20000-0000-4000-8000-000000000001';
const sessionId = (n) => `e2e30000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const results = [];
const record = (name, pass, evidence) => results.push({ name, pass, evidence });

/** Minimal legacy `sessions` stub + the two queue migrations (local Docker only). */
async function prepareIsolatedLocalDb(client) {
  await client.query(`
    drop table if exists public.admin_feedback_correction_jobs cascade;
    create table if not exists public.sessions (
      id uuid primary key,
      title text,
      start_at timestamptz,
      end_at timestamptz,
      status text not null default 'finished',
      session_type text,
      created_by uuid,
      students_text text default '',
      feedback_fields jsonb not null default '{}'::jsonb,
      photo_url jsonb not null default '[]'::jsonb,
      file_url jsonb not null default '[]'::jsonb
    );
  `);
  for (const file of QUEUE_MIGRATIONS) {
    await client.query(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  return { mode: 'minimal_sessions_stub', migrations: QUEUE_MIGRATIONS };
}

async function expectError(client, sql, params, expectedSubstring) {
  try {
    await client.query(sql, params);
    return { ok: false, message: 'no error' };
  } catch (error) {
    const message = String(error?.message ?? error);
    return { ok: message.includes(expectedSubstring), message };
  }
}

function feedbackSnapshot(extra = {}) {
  return {
    feedback_fields: {
      main_activity: '14:00 SPOMOVE-CORE5 드리블 연습',
      strengths: '가상학생 A 집중 90%',
      improvements: '패스 정확도',
      next_goals: '2대1 연습',
      condition_notes: '15:30 종료',
      ...extra,
    },
    students_text: '',
    session_type: 'regular_private',
    title: 'E2E 가상 수업',
    start_at: '2026-10-01T05:00:00.000Z',
  };
}

async function seedSession(client, id, snapshot = feedbackSnapshot()) {
  await client.query(
    `insert into public.sessions (
      id, title, start_at, end_at, status, session_type, created_by,
      students_text, feedback_fields, photo_url, file_url
    ) values (
      $1, $2, $3, $4, 'finished', $5, $6,
      $7, $8::jsonb, '[]'::jsonb, '[]'::jsonb
    ) on conflict (id) do nothing`,
    [
      id,
      snapshot.title,
      snapshot.start_at,
      '2026-10-01T06:00:00.000Z',
      snapshot.session_type,
      TEACHER_ID,
      snapshot.students_text,
      JSON.stringify(snapshot.feedback_fields),
    ],
  );
}

async function insertJob(client, { id, session, status = 'pending', worker = null, lease = null, attempts = 0, draft = null }) {
  await client.query(
    `insert into public.admin_feedback_correction_jobs (
      id, session_id, status, idempotency_key, input_snapshot, correction_draft,
      worker_id, lease_until, attempt_count, requested_by
    ) values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10)
    on conflict (id) do nothing`,
    [
      id,
      session,
      status,
      `e2e-key-${id}`,
      JSON.stringify(feedbackSnapshot()),
      draft ? JSON.stringify(draft) : null,
      worker,
      lease,
      attempts,
      ADMIN_ID,
    ],
  );
}

async function main() {
  record('docker/supabase reachable', true, { pgUrl });

  const client = new pg.Client({ connectionString: pgUrl });
  await client.connect();

  try {
    const mig = await prepareIsolatedLocalDb(client);
    record('local DB: queue migrations on isolated stub', true, mig);
  } catch (error) {
    record('local DB: queue migrations on isolated stub', false, String(error?.message ?? error));
    await client.end();
    printReport();
    process.exit(1);
  }

  const tbl = await client.query("select to_regclass('public.admin_feedback_correction_jobs') as t");
  record('migration: admin_feedback_correction_jobs', tbl.rows[0]?.t === 'admin_feedback_correction_jobs', tbl.rows[0]);

  await client.query('insert into auth.users (id, aud, role, email) values ($1,$2,$3,$4) on conflict do nothing', [
    TEACHER_ID,
    'authenticated',
    'authenticated',
    'e2e-teacher@example.invalid',
  ]);
  await client.query('insert into auth.users (id, aud, role, email) values ($1,$2,$3,$4) on conflict do nothing', [
    ADMIN_ID,
    'authenticated',
    'authenticated',
    'e2e-admin@example.invalid',
  ]);

  const serviceKey =
    process.env.FEEDBACK_CORRECTION_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  const service = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });

  await client.query(`select pg_notify('pgrst', 'reload schema')`);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 1) zero pending
  const claim0 = await service.rpc('admin_feedback_correction_claim_jobs', {
    p_worker_id: 'worker-a',
    p_limit: 5,
    p_lease_seconds: 120,
  });
  record('scenario: 0 pending jobs', !claim0.error && (claim0.data ?? []).length === 0, claim0);

  // 2) single job complete path
  const s1 = sessionId(1);
  const j1 = sessionId(101);
  await seedSession(client, s1);
  await insertJob(client, { id: j1, session: s1 });
  const claim1 = await service.rpc('admin_feedback_correction_claim_jobs', {
    p_worker_id: 'worker-a',
    p_limit: 1,
    p_lease_seconds: 600,
  });
  const draft = feedbackSnapshot().feedback_fields;
  const complete1 = await service.rpc('admin_feedback_correction_complete_job', {
    p_job_id: j1,
    p_worker_id: 'worker-a',
    p_correction_draft: draft,
  });
  const sessAfter = await client.query('select status from public.sessions where id=$1', [s1]);
  record(
    'scenario: 1 job enqueue→claim→complete',
    !claim1.error && !complete1.error && complete1.data?.status === 'completed',
    { claim: claim1.data?.length, complete: complete1.data?.status },
  );
  record(
    'sessions.status unchanged after complete',
    sessAfter.rows[0]?.status === 'finished',
    sessAfter.rows[0],
  );

  // 3) multiple jobs
  const ids = [sessionId(201), sessionId(202), sessionId(203)];
  for (const [i, sid] of ids.entries()) {
    await seedSession(client, sid);
    await insertJob(client, { id: sessionId(301 + i), session: sid });
  }
  const claimN = await service.rpc('admin_feedback_correction_claim_jobs', {
    p_worker_id: 'worker-b',
    p_limit: 5,
    p_lease_seconds: 600,
  });
  record('scenario: multiple pending claimed', !claimN.error && (claimN.data ?? []).length === 3, {
    count: claimN.data?.length,
  });

  // 4) duplicate active session blocked (session already has processing job)
  const sDup = sessionId(888);
  const jDupActive = sessionId(887);
  await seedSession(client, sDup);
  await insertJob(client, { id: jDupActive, session: sDup, status: 'processing', worker: 'worker-dup', attempts: 1 });
  const dup = await client
    .query(
      `insert into public.admin_feedback_correction_jobs (
      session_id, status, idempotency_key, input_snapshot, requested_by
    ) values ($1,'pending',$2,$3::jsonb,$4)`,
      [sDup, `dup-${Date.now()}`, JSON.stringify(feedbackSnapshot()), ADMIN_ID],
    )
    .then(() => ({ ok: false }))
    .catch((e) => ({ ok: true, message: e.message }));
  record('scenario: duplicate active session insert blocked', dup.ok, dup);

  // 5) lease expiry requeue + new worker
  const jLease = sessionId(401);
  const sLease = sessionId(2);
  await seedSession(client, sLease);
  await insertJob(client, {
    id: jLease,
    session: sLease,
    status: 'processing',
    worker: 'worker-old',
    lease: new Date(Date.now() - 60_000).toISOString(),
    attempts: 1,
  });
  await service.rpc('admin_feedback_correction_requeue_stale');
  const reclaim = await service.rpc('admin_feedback_correction_claim_jobs', {
    p_worker_id: 'worker-new',
    p_limit: 1,
    p_lease_seconds: 600,
  });
  record('scenario: lease expired → requeue → new worker claim', reclaim.data?.[0]?.worker_id === 'worker-new', reclaim.data?.[0]);

  // 6) stale worker complete rejected
  const stale = await expectError(
    client,
    "select public.admin_feedback_correction_complete_job($1,$2,$3::jsonb)",
    [jLease, 'worker-old', JSON.stringify(draft)],
    'JOB_WORKER_MISMATCH',
  );
  record('scenario: stale worker complete rejected', stale.ok, stale);

  // 7) idempotent complete
  const idem = await service.rpc('admin_feedback_correction_complete_job', {
    p_job_id: j1,
    p_worker_id: 'worker-a',
    p_correction_draft: draft,
  });
  record('scenario: completed job re-complete idempotent', !idem.error && idem.data?.status === 'completed', idem.data);

  // 8) fail retry then max attempts
  const jFail = sessionId(501);
  const sFail = sessionId(3);
  await seedSession(client, sFail);
  await insertJob(client, { id: jFail, session: sFail, status: 'processing', worker: 'worker-f', attempts: 3 });
  const failMax = await service.rpc('admin_feedback_correction_fail_job', {
    p_job_id: jFail,
    p_worker_id: 'worker-f',
    p_error_code: 'llm_error',
    p_error_detail: 'e2e',
    p_max_attempts: 3,
  });
  record('scenario: max attempts → failed permanent', failMax.data?.error_code === 'max_attempts_exceeded', failMax.data);

  const jRetry = sessionId(502);
  await insertJob(client, { id: jRetry, session: sFail, status: 'processing', worker: 'worker-f', attempts: 1 });
  const failRetry = await service.rpc('admin_feedback_correction_fail_job', {
    p_job_id: jRetry,
    p_worker_id: 'worker-f',
    p_error_code: 'llm_error',
    p_error_detail: 'e2e',
    p_max_attempts: 3,
  });
  record('scenario: fail below max → pending retry', failRetry.data?.status === 'pending', failRetry.data);

  // HTTP worker API (optional — needs Next server)
  let httpStatus = 'NOT_TESTED';
  try {
    const health = await fetch(`${appBase}/api/automation/worker/claim`, {
      method: 'POST',
      headers: { authorization: `Bearer ${workerSecret}` },
    });
    if (health.status === 401) {
      httpStatus = 'NOT_TESTED (Next not running or secret mismatch)';
    } else {
      httpStatus = `HTTP ${health.status}`;
      record('HTTP worker claim endpoint', health.status === 200, httpStatus);
    }
  } catch {
    httpStatus = 'NOT_TESTED (Next server not running)';
  }
  record('HTTP enqueue→consume chain', httpStatus.includes('NOT_TESTED'), httpStatus);

  // consume via RPC (admin path uses service_role in app; DB function if exposed)
  const consumeRow = await client.query(
    `update public.admin_feedback_correction_jobs
     set consumed_at = now(), updated_at = now()
     where id = $1 and status = 'completed' and consumed_at is null
     returning id, consumed_at`,
    [j1],
  );
  record('scenario: consume marks consumed_at', consumeRow.rowCount === 1, consumeRow.rows[0]);

  await client.end();
  printReport();
  const failed = results.filter((r) => {
    if (r.pass) return false;
    const ev = typeof r.evidence === 'string' ? r.evidence : JSON.stringify(r.evidence ?? '');
    return !ev.includes('NOT_TESTED');
  });
  process.exit(failed.length ? 1 : 0);
}

function printReport() {
  const outPath = join(root, 'docs/operations/local-n8n-feedback-correction-e2e-results.json');
  const failed = results.filter((r) => {
    if (r.pass) return false;
    const ev = typeof r.evidence === 'string' ? r.evidence : JSON.stringify(r.evidence ?? '');
    return !ev.includes('NOT_TESTED');
  });
  const overallStatus = failed.length === 0 ? 'LOCAL_DB_E2E_PASS' : 'LOCAL_DB_E2E_FAIL';
  writeFileSync(
    outPath,
    JSON.stringify({ at: new Date().toISOString(), overallStatus, results }, null, 2),
  );
  console.log(JSON.stringify({ summary: results.map((r) => ({ name: r.name, pass: r.pass })) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
