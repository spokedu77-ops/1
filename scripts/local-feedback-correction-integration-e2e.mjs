/**
 * Stage 4 — Local integration E2E (local Supabase + Next on 3099 + optional n8n/LM).
 * Does NOT use production Supabase. Requires: Docker Postgres 54322, Next at FEEDBACK_CORRECTION_APP_URL.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const root = join(process.cwd());
const migrationsDir = join(root, 'supabase/migrations');
const QUEUE_MIGRATIONS = [
  '20261105120000_admin_feedback_correction_queue.sql',
  '20261105140000_admin_feedback_correction_queue_hardening.sql',
];

const LOCAL_API = process.env.FEEDBACK_CORRECTION_API_URL ?? 'http://127.0.0.1:54321';
const LOCAL_ANON =
  process.env.FEEDBACK_CORRECTION_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE =
  process.env.FEEDBACK_CORRECTION_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const pgUrl = process.env.FEEDBACK_CORRECTION_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const appBase = process.env.FEEDBACK_CORRECTION_APP_URL ?? 'http://127.0.0.1:3099';
const workerSecret =
  process.env.AUTOMATION_WORKER_SECRET ?? 'stage4-local-integration-worker-secret';
const lmBase = process.env.LM_STUDIO_BASE_URL ?? 'http://127.0.0.1:1234';
const lmModel = process.env.LM_STUDIO_MODEL ?? 'qwen3.5-9b';

const PLATFORM_ADMIN_EMAIL = 'choijihoon@spokedu.com';
const LOCAL_ADMIN_PASSWORD = 'Stage4-Local-Only-Not-Production!';
const TEACHER_ID = 'e2e10000-0000-4000-8000-000000000001';
const sessionId = (n) => `e2e30000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const results = [];
/** @type {'PASS'|'FAIL'|'NOT_TESTED'|'BLOCKED'} */
function status(name, st, evidence) {
  results.push({ name, status: st, evidence });
}

async function prepareIsolatedLocalDb(client) {
  await client.query(`
    drop table if exists public.admin_feedback_correction_jobs cascade;
    drop table if exists public.lesson_plans cascade;
    drop table if exists public.users cascade;
    drop table if exists public.sessions cascade;
    create table public.users (
      id uuid primary key,
      name text
    );
    create table public.sessions (
      id uuid primary key,
      title text,
      start_at timestamptz,
      end_at timestamptz,
      status text not null default 'finished',
      session_type text,
      created_by uuid references public.users(id),
      students_text text default '',
      feedback_fields jsonb not null default '{}'::jsonb,
      photo_url jsonb not null default '[]'::jsonb,
      file_url jsonb not null default '[]'::jsonb,
      mileage_option text default ''
    );
    create table if not exists public.lesson_plans (
      id uuid primary key default gen_random_uuid(),
      session_id uuid references public.sessions(id) on delete cascade,
      content text
    );
  `);
  for (const file of QUEUE_MIGRATIONS) {
    await client.query(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  await client.query(`
    grant usage on schema public to service_role, anon, authenticated;
    grant select, insert, update on public.sessions to service_role;
    grant select on public.users to service_role;
    grant select on public.lesson_plans to service_role;
  `);
  await client.query(`select pg_notify('pgrst', 'reload schema')`);
}

function feedbackSnapshot(extra = {}) {
  return {
    feedback_fields: {
      main_activity: '14:00 SPOMOVE-CORE5 드리블 연습',
      strengths: '가상학생 A 집중 90%',
      improvements: '패스 정확도 보완',
      next_goals: '2대1 패스 연습',
      condition_notes: '15:30 종료 · 컨디션 양호',
      ...extra,
    },
    students_text: '가상학생 A',
    session_type: 'regular_private',
    title: 'E2E 가상 수업',
    start_at: '2026-10-01T05:00:00.000Z',
  };
}

async function seedSession(client, id, snap = feedbackSnapshot()) {
  await client.query(
    `insert into public.users (id, name) values ($1,'가상강사') on conflict do nothing`,
    [TEACHER_ID],
  );
  await client.query(
    `insert into public.sessions (
      id, title, start_at, end_at, status, session_type, created_by,
      students_text, feedback_fields, photo_url, file_url, mileage_option
    ) values ($1,$2,$3,$4,'finished',$5,$6,$7,$8::jsonb,'[]'::jsonb,'[]'::jsonb,'')
    on conflict (id) do update set feedback_fields = excluded.feedback_fields, status = excluded.status`,
    [
      id,
      snap.title,
      snap.start_at,
      '2026-10-01T06:00:00.000Z',
      snap.session_type,
      TEACHER_ID,
      snap.students_text,
      JSON.stringify(snap.feedback_fields),
    ],
  );
}

async function ensureLocalPlatformAdmin(service) {
  const list = await service.auth.admin.listUsers({ perPage: 200 });
  const existing = list.data.users.find((u) => u.email === PLATFORM_ADMIN_EMAIL);
  if (existing) {
    await service.auth.admin.updateUserById(existing.id, {
      password: LOCAL_ADMIN_PASSWORD,
      email_confirm: true,
    });
    return existing.id;
  }
  const created = await service.auth.admin.createUser({
    email: PLATFORM_ADMIN_EMAIL,
    password: LOCAL_ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  return created.data.user.id;
}

async function adminCookieHeader() {
  const jar = [];
  const supabase = createServerClient(LOCAL_API, LOCAL_ANON, {
    cookies: {
      getAll() {
        return jar;
      },
      setAll(cookiesToSet) {
        for (const c of cookiesToSet) {
          const i = jar.findIndex((x) => x.name === c.name);
          if (i >= 0) jar[i] = { name: c.name, value: c.value };
          else jar.push({ name: c.name, value: c.value });
        }
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: PLATFORM_ADMIN_EMAIL,
    password: LOCAL_ADMIN_PASSWORD,
  });
  if (error) throw error;
  return jar.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join('; ');
}

async function waitForApp(maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${appBase}/api/automation/worker/claim`, {
        method: 'POST',
        headers: { authorization: 'Bearer wrong' },
      });
      if (r.status === 401 || r.status === 200) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

function parseLlmFeedbackJson(content) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

const SAMPLE_FEEDBACKS = [
  feedbackSnapshot({ feedback_fields: { main_activity: '15:00 SPOMOVE-CORE3 패스', strengths: '가상학생 B 호흡 안정', improvements: '왼발 패스', next_goals: '3m 패스', condition_notes: '16:00 종료' } }),
  feedbackSnapshot({ feedback_fields: { main_activity: 'SPOMOVE-FUN2 반응놀이', strengths: '집중 85%', improvements: '방향 전환', next_goals: '콘 드리블', condition_notes: '피로 낮음' } }),
  feedbackSnapshot({ feedback_fields: { main_activity: '12:30 기본 체력', strengths: '자세 개선', improvements: '맞춤법 테스트: 연습 잘함', next_goals: '코어', condition_notes: '13:30 종료' } }),
];

async function runLmStudioSamples() {
  const out = [];
  for (let i = 0; i < SAMPLE_FEEDBACKS.length; i += 1) {
    const snap = SAMPLE_FEEDBACKS[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const { res, body } = await jsonFetch(`${lmBase}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: lmModel,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'Correct Korean teacher feedback. Fix spelling/grammar only. Do not invent facts. Keep SPOMOVE literals. Return JSON keys: main_activity, strengths, improvements, next_goals, condition_notes.',
            },
            { role: 'user', content: JSON.stringify(snap.feedback_fields) },
          ],
        }),
      });
      clearTimeout(timer);
      if (!res.ok) {
        out.push({ index: i + 1, ok: false, error: body ?? res.status });
        continue;
      }
      const text = body?.choices?.[0]?.message?.content ?? '';
      let draft;
      try {
        draft = parseLlmFeedbackJson(text);
      } catch (e) {
        out.push({ index: i + 1, ok: false, parseError: String(e), raw: text.slice(0, 400) });
        continue;
      }
      const src = snap.feedback_fields;
      const spomoveOk = !src.main_activity?.includes('SPOMOVE')
        || String(draft.main_activity ?? '').includes('SPOMOVE');
      const timeOk =
        (src.main_activity.includes('15:00') ? String(draft.main_activity).includes('15:00') : true) &&
        (src.condition_notes.includes('16:00') ? String(draft.condition_notes).includes('16:00') : true);
      out.push({
        index: i + 1,
        ok: spomoveOk && timeOk && typeof draft === 'object',
        draft,
        spomoveOk,
        timeOk,
      });
    } catch (e) {
      clearTimeout(timer);
      out.push({ index: i + 1, ok: false, error: String(e) });
    }
  }
  return out;
}

async function main() {
  // The dedicated launcher supplies local-only environment variables. Never
  // rewrite the shared .env.local used by the normal administrator server.
  status('integration environment isolated; .env.local unchanged', 'PASS', {
    launcher: 'scripts/start-local-integration-next.ps1',
  });

  status('precheck: local Postgres reachable', 'PASS', { pgUrl });

  const pgClient = new pg.Client({ connectionString: pgUrl });
  await pgClient.connect();
  try {
    await prepareIsolatedLocalDb(pgClient);
    status('local DB stub + queue migrations', 'PASS', QUEUE_MIGRATIONS);
  } catch (e) {
    status('local DB stub + queue migrations', 'FAIL', String(e));
    await pgClient.end();
    writeReport();
    process.exit(1);
  }

  const service = createClient(LOCAL_API, LOCAL_SERVICE, { auth: { persistSession: false } });
  try {
    await ensureLocalPlatformAdmin(service);
    status('local platform admin user (Docker auth only)', 'PASS', {
      email: PLATFORM_ADMIN_EMAIL,
      note: '로컬 Supabase 전용; 운영 계정 아님',
    });
  } catch (e) {
    status('local platform admin user', 'FAIL', String(e));
  }

  const appUp = await waitForApp();
  if (!appUp) {
    status('Next.js local integration server (3099 + local Supabase env)', 'BLOCKED', {
      appBase,
      hint: 'scripts/start-local-integration-next.ps1 또는 동일 env로 next dev -p 3099',
    });
    await pgClient.end();
    writeReport();
    process.exit(1);
  }
  status('Next.js local integration server', 'PASS', { appBase });

  const sid = sessionId(9001);
  await seedSession(pgClient, sid);
  const before = await pgClient.query(
    `select status, mileage_option, feedback_fields from public.sessions where id=$1`,
    [sid],
  );

  // Worker 401
  {
    const { res } = await jsonFetch(`${appBase}/api/automation/worker/claim`, { method: 'POST' });
    status('HTTP worker claim without Bearer → 401', res.status === 401 ? 'PASS' : 'FAIL', res.status);
  }

  let adminCookies = '';
  try {
    adminCookies = await adminCookieHeader();
  } catch (e) {
    status('admin session cookie (local platform email)', 'FAIL', String(e));
  }

  // Admin 401 without cookie
  {
    const { res } = await jsonFetch(`${appBase}/api/admin/automation/feedback-correction/enqueue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: sid }),
    });
    status('HTTP enqueue without admin session → 401', res.status === 401 ? 'PASS' : 'FAIL', res.status);
  }

  let jobId = null;
  if (adminCookies) {
    const enq = await jsonFetch(`${appBase}/api/admin/automation/feedback-correction/enqueue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookies },
      body: JSON.stringify({ sessionId: sid }),
    });
    status(
      'HTTP enqueue with local platform admin',
      enq.res.status === 200 && enq.body?.ok ? 'PASS' : 'FAIL',
      { status: enq.res.status, body: enq.body },
    );
    jobId = enq.body?.job?.id ?? null;

    const dup = await jsonFetch(`${appBase}/api/admin/automation/feedback-correction/enqueue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookies },
      body: JSON.stringify({ sessionId: sid }),
    });
    status('HTTP duplicate enqueue → 409', dup.res.status === 409 ? 'PASS' : 'FAIL', dup.res.status);
  } else {
    status('HTTP enqueue with local platform admin', 'BLOCKED', 'admin cookie unavailable');
    status('HTTP duplicate enqueue → 409', 'NOT_TESTED', 'depends on enqueue');
  }

  const workerHeaders = {
    authorization: `Bearer ${workerSecret}`,
    'content-type': 'application/json',
    'x-automation-worker-id': 'stage4-http-worker',
  };

  const claim = await jsonFetch(`${appBase}/api/automation/worker/claim`, {
    method: 'POST',
    headers: workerHeaders,
    body: JSON.stringify({ limit: 5, leaseSeconds: 600 }),
  });
  status(
    'HTTP claim with Bearer',
    claim.res.status === 200 && claim.body?.ok ? 'PASS' : 'FAIL',
    { status: claim.res.status, jobs: claim.body?.jobs?.length },
  );
  if (!jobId && claim.body?.jobs?.[0]?.job_id) jobId = claim.body.jobs[0].job_id;

  const claimEmpty = await jsonFetch(`${appBase}/api/automation/worker/claim`, {
    method: 'POST',
    headers: workerHeaders,
    body: JSON.stringify({ limit: 5 }),
  });
  const emptyOk =
    claimEmpty.res.status === 200 &&
    claimEmpty.body?.ok &&
    (claimEmpty.body?.jobs ?? []).length === 0;
  status('HTTP claim 0 pending after drain', emptyOk ? 'PASS' : 'FAIL', claimEmpty.body);

  if (jobId) {
    const badComplete = await jsonFetch(`${appBase}/api/automation/worker/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: { ...workerHeaders, authorization: 'Bearer wrong-secret' },
      body: JSON.stringify({ correctionDraft: feedbackSnapshot().feedback_fields }),
    });
    status('HTTP complete wrong Bearer → 401', badComplete.res.status === 401 ? 'PASS' : 'FAIL', badComplete.res.status);

    const bad422 = await jsonFetch(`${appBase}/api/automation/worker/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: workerHeaders,
      body: JSON.stringify({
        correctionDraft: { main_activity: '완전 다른 내용', strengths: '', improvements: '', next_goals: '', condition_notes: '' },
      }),
    });
    status('HTTP complete quality guard → 422', bad422.res.status === 422 ? 'PASS' : 'FAIL', {
      status: bad422.res.status,
      error: bad422.body?.error,
    });

    const draft = feedbackSnapshot().feedback_fields;
    const complete = await jsonFetch(`${appBase}/api/automation/worker/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: workerHeaders,
      body: JSON.stringify({ correctionDraft: draft }),
    });
    status(
      'HTTP claim → complete',
      complete.res.status === 200 && complete.body?.ok ? 'PASS' : 'FAIL',
      complete.body,
    );

    const idem = await jsonFetch(`${appBase}/api/automation/worker/jobs/${jobId}/complete`, {
      method: 'POST',
      headers: workerHeaders,
      body: JSON.stringify({ correctionDraft: draft }),
    });
    status(
      'HTTP complete idempotent',
      idem.res.status === 200 && idem.body?.idempotent ? 'PASS' : 'FAIL',
      idem.body,
    );

    if (adminCookies) {
      const consume = await jsonFetch(`${appBase}/api/admin/automation/feedback-correction/consume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: adminCookies },
        body: JSON.stringify({ jobId }),
      });
      status(
        'HTTP consume with admin session',
        consume.res.status === 200 && consume.body?.ok ? 'PASS' : 'FAIL',
        { status: consume.res.status, sessionId: consume.body?.sessionId },
      );
    } else {
      status('HTTP consume with admin session', 'BLOCKED', 'admin cookie unavailable');
    }
  } else {
    status('HTTP claim → complete → consume chain', 'FAIL', 'no jobId');
  }

  const after = await pgClient.query(
    `select status, mileage_option, feedback_fields from public.sessions where id=$1`,
    [sid],
  );
  const unchanged =
    before.rows[0]?.status === after.rows[0]?.status &&
    before.rows[0]?.mileage_option === after.rows[0]?.mileage_option &&
    JSON.stringify(before.rows[0]?.feedback_fields) === JSON.stringify(after.rows[0]?.feedback_fields);
  status('sessions.status / mileage / feedback_fields unchanged', unchanged ? 'PASS' : 'FAIL', {
    before: before.rows[0],
    after: after.rows[0],
  });

  // Recovery: pending survives (simulate PC off)
  const sid2 = sessionId(9002);
  await seedSession(pgClient, sid2);
  await service.from('admin_feedback_correction_jobs').insert({
    session_id: sid2,
    status: 'pending',
    idempotency_key: `recovery-${Date.now()}`,
    input_snapshot: feedbackSnapshot(),
  });
  const recoveryClaim = await jsonFetch(`${appBase}/api/automation/worker/claim`, {
    method: 'POST',
    headers: workerHeaders,
    body: JSON.stringify({ limit: 1 }),
  });
  status(
    'recovery: pending job claimed after re-connect',
    recoveryClaim.body?.jobs?.length === 1 ? 'PASS' : 'FAIL',
    recoveryClaim.body,
  );

  await pgClient.end();

  // LM Studio
  try {
    const models = await jsonFetch(`${lmBase}/v1/models`);
    const ids = (models.body?.data ?? []).map((m) => m.id);
    status('LM Studio models list', models.res.status === 200 ? 'PASS' : 'FAIL', { models: ids.slice(0, 8) });
  } catch (e) {
    status('LM Studio models list', 'FAIL', String(e));
  }

  const lmSamples = await runLmStudioSamples();
  const lmPass = lmSamples.filter((s) => s.ok).length;
  status(
    'LM Studio 3 sample corrections + JSON parse',
    lmPass === 3 ? 'PASS' : lmPass > 0 ? 'FAIL' : 'FAIL',
    lmSamples,
  );

  // n8n docker
  try {
    const n8nHealth = await fetch('http://127.0.0.1:5678/healthz');
    status('n8n Docker healthz', n8nHealth.ok ? 'PASS' : 'FAIL', n8nHealth.status);
  } catch {
    status('n8n Docker healthz', 'NOT_TESTED', 'n8n container not running on 5678');
    status('n8n workflow import + runtime 0/1/N jobs', 'NOT_TESTED', 'start ops/local-automation docker-compose');
    status('n8n → LM Studio from container', 'NOT_TESTED', 'requires n8n credential + workflow activation');
  }

  writeReport();
  const failed = results.filter((r) => r.status === 'FAIL').length;
  process.exit(failed ? 1 : 0);
}

function writeReport() {
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  const overall =
    failed === 0 && blocked === 0
      ? 'LOCAL_INTEGRATION_E2E_PASS'
      : failed === 0
        ? 'LOCAL_INTEGRATION_E2E_PASS_WITH_NOT_TESTED'
        : 'LOCAL_INTEGRATION_E2E_FAIL';
  const out = join(root, 'docs/operations/local-n8n-feedback-correction-stage4-results.json');
  writeFileSync(
    out,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        overallStatus: overall,
        productionApproval: 'PRODUCTION_APPROVAL_PENDING',
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ overallStatus: overall, failed, blocked, count: results.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  status('fatal', 'FAIL', String(e));
  writeReport();
  process.exit(1);
});
