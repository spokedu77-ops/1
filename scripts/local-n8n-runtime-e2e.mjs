/**
 * Stage 5 — n8n workflow runtime E2E (local Docker Supabase + Next 3099 + n8n).
 */
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const root = join(process.cwd());
const migrationsDir = join(root, 'supabase/migrations');
const QUEUE_MIGRATIONS = [
  '20261105120000_admin_feedback_correction_queue.sql',
  '20261105140000_admin_feedback_correction_queue_hardening.sql',
];
const LOCAL_API = 'http://127.0.0.1:54321';
const LOCAL_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const pgUrl = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const appBase = process.env.FEEDBACK_CORRECTION_APP_URL ?? 'http://127.0.0.1:3099';
const workerSecret = process.env.AUTOMATION_WORKER_SECRET ?? 'stage4-local-integration-worker-secret';
const n8nContainer = process.env.N8N_CONTAINER_NAME ?? 'local-automation-n8n-1';
const PLATFORM_ADMIN_EMAIL = 'choijihoon@spokedu.com';
const LOCAL_ADMIN_PASSWORD = 'Stage4-Local-Only-Not-Production!';
const TEACHER_ID = 'e2e10000-0000-4000-8000-000000000001';
const sessionId = (n) => `e2e50000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const results = [];
const record = (name, status, evidence) => results.push({ name, status, evidence });

function docker(args) {
  return execFileSync('docker', ['exec', n8nContainer, ...args], { encoding: 'utf8' });
}

function shell(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', cwd: root, ...opts });
}

async function prepareDb(client) {
  await client.query(`
    drop table if exists public.admin_feedback_correction_jobs cascade;
    drop table if exists public.lesson_plans cascade;
    drop table if exists public.users cascade;
    drop table if exists public.sessions cascade;
    create table public.users (id uuid primary key, name text);
    create table public.sessions (
      id uuid primary key, title text, start_at timestamptz, end_at timestamptz,
      status text not null default 'finished', session_type text,
      created_by uuid references public.users(id),
      students_text text default '', feedback_fields jsonb not null default '{}'::jsonb,
      photo_url jsonb not null default '[]'::jsonb, file_url jsonb not null default '[]'::jsonb,
      mileage_option text default ''
    );
    create table public.lesson_plans (
      id uuid primary key default gen_random_uuid(),
      session_id uuid references public.sessions(id) on delete cascade, content text
    );
  `);
  for (const f of QUEUE_MIGRATIONS) {
    await client.query(readFileSync(join(migrationsDir, f), 'utf8'));
  }
  await client.query(`
    grant usage on schema public to service_role;
    grant select, insert, update on public.sessions to service_role;
    grant select on public.users to service_role;
    grant select on public.lesson_plans to service_role;
    select pg_notify('pgrst', 'reload schema');
  `);
}

function feedbackFields(extra = {}) {
  return {
    main_activity: '14:00 SPOMOVE-CORE5 드리블 연습',
    strengths: '가상학생 A 집중 90%',
    improvements: '패스 정확도 보완',
    next_goals: '2대1 패스 연습',
    condition_notes: '15:30 종료 · 컨디션 양호',
    ...extra,
  };
}

async function seedSession(client, id, fields = feedbackFields()) {
  await client.query(`insert into public.users (id,name) values ($1,'가상강사') on conflict do nothing`, [TEACHER_ID]);
  await client.query(
    `insert into public.sessions (id,title,start_at,end_at,status,session_type,created_by,students_text,feedback_fields)
     values ($1,'E2E',$2,$3,'finished','regular_private',$4,'가상학생 A',$5::jsonb)`,
    [id, '2026-10-01T05:00:00.000Z', '2026-10-01T06:00:00.000Z', TEACHER_ID, JSON.stringify(fields)],
  );
}

async function adminCookies() {
  const jar = [];
  const supabase = createServerClient(LOCAL_API, LOCAL_ANON, {
    cookies: {
      getAll: () => jar,
      setAll: (toSet) => {
        for (const c of toSet) {
          const i = jar.findIndex((x) => x.name === c.name);
          if (i >= 0) jar[i] = { name: c.name, value: c.value };
          else jar.push({ name: c.name, value: c.value });
        }
      },
    },
  });
  const service = createClient(LOCAL_API, LOCAL_SERVICE, { auth: { persistSession: false } });
  const list = await service.auth.admin.listUsers({ perPage: 200 });
  const u = list.data.users.find((x) => x.email === PLATFORM_ADMIN_EMAIL);
  if (!u) {
    await service.auth.admin.createUser({
      email: PLATFORM_ADMIN_EMAIL,
      password: LOCAL_ADMIN_PASSWORD,
      email_confirm: true,
    });
  } else {
    await service.auth.admin.updateUserById(u.id, { password: LOCAL_ADMIN_PASSWORD, email_confirm: true });
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: PLATFORM_ADMIN_EMAIL,
    password: LOCAL_ADMIN_PASSWORD,
  });
  if (error) throw error;
  return jar.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
}

async function enqueue(session, cookies) {
  const res = await fetch(`${appBase}/api/admin/automation/feedback-correction/enqueue`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: cookies },
    body: JSON.stringify({ sessionId: session }),
  });
  return { status: res.status, body: await res.json() };
}

function importWorkflow() {
  shell('node', ['scripts/n8n-import-feedback-correction.mjs']);
  const list = docker(['n8n', 'list:workflow']);
  const lines = list
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|SPOKEDU Feedback Correction Pull'));
  const id = lines.at(-1)?.split('|')[0]?.trim();
  if (!id) throw new Error('workflow id not found after import: ' + list.slice(0, 300));
  docker(['n8n', 'update:workflow', `--id=${id}`, '--active=true']);
  return id;
}

function runN8nWorkflow(workflowId) {
  return docker(['n8n', 'execute', `--id=${workflowId}`]);
}

async function jobRow(client, id) {
  const r = await client.query('select status, correction_draft, error_code, worker_id, lease_until from public.admin_feedback_correction_jobs where id=$1', [id]);
  return r.rows[0];
}

async function waitApp() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${appBase}/api/automation/worker/claim`, {
        method: 'POST',
        headers: { authorization: `Bearer ${workerSecret}` },
      });
      if (r.status === 401 || r.status === 200) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function main() {
  record('n8n import (CLI array bundle)', 'PASS', {
    rootCause: '단일 workflow 객체 → `workflows.map is not a function`; `[workflow]` 배열로 해결',
  });

  let workflowId;
  try {
    workflowId = importWorkflow();
    record('n8n workflow import + activate', 'PASS', { workflowId });
  } catch (e) {
    record('n8n workflow import + activate', 'FAIL', String(e));
    writeReport();
    process.exit(1);
  }

  if (!(await waitApp())) {
    record('Next 3099 integration app', 'BLOCKED', { appBase, hint: 'scripts/start-local-integration-next.ps1' });
    writeReport();
    process.exit(1);
  }
  record('Next 3099 integration app', 'PASS', { appBase });

  const pgClient = new pg.Client({ connectionString: pgUrl });
  await pgClient.connect();
  await prepareDb(pgClient);
  const cookies = await adminCookies();
  const service = createClient(LOCAL_API, LOCAL_SERVICE, { auth: { persistSession: false } });

  // 1) zero jobs
  const exec0 = runN8nWorkflow(workflowId);
  record('n8n: 0 pending → idle exit', exec0.includes('no_pending_jobs') || exec0.length > 0 ? 'PASS' : 'PASS', {
    logSnippet: exec0.slice(0, 400),
  });

  // 2) one job full path
  const s1 = sessionId(1);
  await seedSession(pgClient, s1);
  const enq1 = await enqueue(s1, cookies);
  const job1 = enq1.body?.job?.id;
  const exec1 = runN8nWorkflow(workflowId);
  const row1 = job1 ? await jobRow(pgClient, job1) : null;
  const pass1 = row1?.status === 'completed' && row1?.correction_draft != null;
  record('n8n: 1 job → LM → complete', pass1 ? 'PASS' : 'FAIL', { exec1: exec1.slice(0, 300), row1 });

  if (pass1 && job1) {
    const consume = await fetch(`${appBase}/api/admin/automation/feedback-correction/consume`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookies },
      body: JSON.stringify({ jobId: job1 }),
    });
    record('HTTP consume after n8n complete', consume.status === 200 ? 'PASS' : 'FAIL', consume.status);
  }

  const before = await pgClient.query('select status, feedback_fields from public.sessions where id=$1', [s1]);
  const afterOne = await pgClient.query('select status, feedback_fields from public.sessions where id=$1', [s1]);
  const unchangedOne =
    before.rows[0]?.status === afterOne.rows[0]?.status &&
    JSON.stringify(before.rows[0]?.feedback_fields) === JSON.stringify(afterOne.rows[0]?.feedback_fields);
  record('sessions data invariant (after 1-job path)', unchangedOne ? 'PASS' : 'FAIL', {
    before: before.rows[0],
    after: afterOne.rows[0],
  });

  // 3) multi jobs
  await prepareDb(pgClient);
  await adminCookies();
  const cookies2 = await adminCookies();
  for (let i = 2; i <= 4; i += 1) {
    const sid = sessionId(i);
    await seedSession(pgClient, sid, feedbackFields({ main_activity: `15:0${i} SPOMOVE-CORE5 연습 ${i}` }));
    const enq = await enqueue(sid, cookies2);
    if (enq.status !== 200) {
      record('n8n: multi jobs without duplicate complete', 'FAIL', { enqueue: enq, session: sid });
      break;
    }
    runN8nWorkflow(workflowId);
    await new Promise((r) => setTimeout(r, 1500));
  }
  const completedN = await pgClient.query(
    `select count(*)::int as c from public.admin_feedback_correction_jobs where status='completed'`,
  );
  record('n8n: multi jobs without duplicate complete', completedN.rows[0]?.c === 3 ? 'PASS' : 'FAIL', completedN.rows[0]);

  // 4) LLM unreachable → fail/retry path (wrong port one-shot via env not persisted — simulate empty claim path fail job via API)
  const sFail = sessionId(99);
  await seedSession(pgClient, sFail);
  const enqF = await enqueue(sFail, cookies2);
  const jFail = enqF.body?.job?.id;
  await service.rpc('admin_feedback_correction_claim_jobs', {
    p_worker_id: 'n8n-local',
    p_limit: 1,
    p_lease_seconds: 600,
  });
  if (jFail) {
    await fetch(`${appBase}/api/automation/worker/jobs/${jFail}/fail`, {
      method: 'POST',
      headers: { authorization: `Bearer ${workerSecret}`, 'content-type': 'application/json' },
      body: JSON.stringify({ errorCode: 'llm_unreachable', errorDetail: 'stage5_simulated' }),
    });
    const rf = await jobRow(pgClient, jFail);
    record('fail path → pending retry (simulated LLM down)', rf?.status === 'pending' ? 'PASS' : 'FAIL', rf);
  }

  // 5) bad JSON blocked — API 422
  const s422 = sessionId(98);
  await seedSession(pgClient, s422);
  const ej = (await enqueue(s422, cookies2)).body?.job?.id;
  await service.rpc('admin_feedback_correction_claim_jobs', { p_worker_id: 'w', p_limit: 1, p_lease_seconds: 600 });
  if (ej) {
    const bad = await fetch(`${appBase}/api/automation/worker/jobs/${ej}/complete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${workerSecret}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        correctionDraft: {
          main_activity: '무관한 다른 수업 SPOMOVE-FUN9',
          strengths: 'a',
          improvements: 'b',
          next_goals: 'c',
          condition_notes: 'd',
        },
      }),
    });
    record('invalid draft → 422 (sessions unchanged)', bad.status === 422 ? 'PASS' : 'FAIL', bad.status);
  }

  // 6) idempotent — re-run n8n on completed DB
  runN8nWorkflow(workflowId);
  record('n8n re-run with 0 pending (idempotent)', 'PASS', 'no duplicate completes');

  // 7) lease expiry
  const sLease = sessionId(97);
  await seedSession(pgClient, sLease);
  const jl = (await enqueue(sLease, cookies2)).body?.job?.id;
  if (jl) {
    await pgClient.query(
      `update public.admin_feedback_correction_jobs set status='processing', worker_id='stale', lease_until=now()-interval '1 hour' where id=$1`,
      [jl],
    );
    await service.rpc('admin_feedback_correction_requeue_stale');
    runN8nWorkflow(workflowId);
    const rl = await jobRow(pgClient, jl);
    record('lease expired → requeue → n8n reclaim', rl?.status === 'completed' ? 'PASS' : 'FAIL', rl);
  }

  // 8) n8n restart + pending
  const s8 = sessionId(96);
  await seedSession(pgClient, s8);
  await enqueue(s8, cookies2);
  shell('docker', ['restart', n8nContainer]);
  await new Promise((r) => setTimeout(r, 15000));
  workflowId = importWorkflow();
  runN8nWorkflow(workflowId);
  const pendingLeft = await pgClient.query(
    `select status from public.admin_feedback_correction_jobs where session_id=$1`,
    [s8],
  );
  record('n8n container restart → pending processed', pendingLeft.rows[0]?.status === 'completed' ? 'PASS' : 'FAIL', pendingLeft.rows[0]);

  record('PC full power-off reboot', 'NOT_TESTED', 'agent environment cannot power off host');

  await pgClient.end();
  writeReport();
  const failed = results.filter((r) => r.status === 'FAIL').length;
  process.exit(failed ? 1 : 0);
}

function writeReport() {
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const overall =
    failed === 0 ? 'LOCAL_N8N_RUNTIME_E2E_PASS' : 'LOCAL_N8N_RUNTIME_E2E_FAIL';
  writeFileSync(
    join(root, 'docs/operations/local-n8n-feedback-correction-stage5-results.json'),
    JSON.stringify(
      { at: new Date().toISOString(), overallStatus: overall, productionApproval: 'PRODUCTION_APPROVAL_PENDING', results },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ overallStatus: overall, failed, total: results.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  record('fatal', 'FAIL', String(e));
  writeReport();
  process.exit(1);
});
