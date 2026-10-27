import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const apiUrl = process.env.STAGE2_REST_URL ?? 'http://127.0.0.1:54321';
const dbUrl = process.env.STAGE2_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const serviceKey = process.env.STAGE2_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const ownerId = randomUUID();
const otherOwnerId = randomUUID();
const classId = randomUUID();
const studentA = randomUUID();
const studentB = randomUUID();
const sessionId = randomUUID();
const email = `stage2-p0-${ownerId}@example.invalid`;
const db = new pg.Client({ connectionString: dbUrl });
const supabase = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, db: { retry: false } });
const results = [];
const record = (name, pass, evidence) => results.push({ name, pass, evidence });

async function rpc(name, body) {
  const started = performance.now();
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { status: response.status, payload, elapsedMs: Math.round(performance.now() - started) };
}

await db.connect();
let bootstrapped = false;
try {
  const fixtureExists = await db.query(`select to_regprocedure('public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb)') is not null and to_regclass('public.spokedu_master_sessions') is not null present`);
  if (!fixtureExists.rows[0].present) {
    bootstrapped = true;
    await db.query(`
      drop function if exists public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb) cascade;
      drop function if exists public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text) cascade;
      drop function if exists public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb) cascade;
      drop function if exists public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb) cascade;
    `);
    await db.query(`
      create table public.spokedu_master_classes(id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,name text not null,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz);
      create table public.spokedu_master_students(id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,name text not null,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz);
      create table public.spokedu_master_class_students(owner_id uuid not null,class_id uuid not null,student_id uuid not null,primary key(class_id,student_id));
      create table public.spokedu_master_sessions(id uuid primary key,owner_id uuid not null,class_id uuid not null,start_at timestamptz not null,end_at timestamptz not null,status text not null,memo text,started_at timestamptz,completed_at timestamptz,roster_locked_at timestamptz,deleted_at timestamptz,updated_at timestamptz default now());
      create table public.spokedu_master_session_attendance(id uuid primary key default gen_random_uuid(),owner_id uuid not null,session_id uuid not null,student_id uuid not null,student_name_snapshot text not null,status text not null,unique(session_id,student_id));
      create table public.spokedu_master_session_programs(id uuid primary key default gen_random_uuid(),owner_id uuid,session_id uuid);
      create table public.spokedu_master_class_records(id uuid primary key default gen_random_uuid(),owner_id uuid not null,session_id uuid,legacy_id text,class_date date not null,lesson_title text,class_id text,program_id bigint,program_title text,record_type text not null,memo text,application_idea text,parent_note_snapshot text,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz);
      create table public.spokedu_master_class_record_students(id uuid primary key default gen_random_uuid(),owner_id uuid not null,record_id uuid not null references public.spokedu_master_class_records(id) on delete cascade,student_id uuid,student_legacy_id text,student_name_snapshot text not null,attendance text not null,focused boolean default false,skills text[] default '{}',memo text,observation_score numeric,created_at timestamptz default now(),updated_at timestamptz default now());
      create or replace function public.spokedu_master_class_integrity_lock(uuid,uuid) returns void language sql as $$ select $$;
      create or replace function public.spokedu_master_save_session(p_owner_id uuid,p_session_id uuid,p_class_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_status text,p_memo text,p_programs jsonb,p_attendance jsonb) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$ begin update public.spokedu_master_sessions set class_id=p_class_id,start_at=p_start_at,end_at=p_end_at,status=p_status,memo=nullif(btrim(p_memo),''),updated_at=now() where id=p_session_id and owner_id=p_owner_id and deleted_at is null; if not found then raise exception using errcode='P0002',message='session not found'; end if; return p_session_id; end $$;
      create or replace function public.spokedu_master_complete_session(p_owner_id uuid,p_session_id uuid,p_class_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_memo text,p_attendance jsonb) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$ begin update public.spokedu_master_sessions set status='completed',memo=nullif(btrim(p_memo),''),completed_at=now(),updated_at=now() where id=p_session_id and owner_id=p_owner_id and deleted_at is null; if not found then raise exception using errcode='P0002',message='session not found'; end if; delete from public.spokedu_master_session_attendance where owner_id=p_owner_id and session_id=p_session_id; insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,student_name_snapshot,status) select p_owner_id,p_session_id,s.id,s.name,item->>'status' from jsonb_array_elements(p_attendance) item join public.spokedu_master_students s on s.id=(item->>'studentId')::uuid and s.owner_id=p_owner_id; return p_session_id; end $$;
      create or replace function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) returns void language sql security definer set search_path=pg_catalog,public as $$ select $$;
      create or replace function public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb) returns uuid language sql security definer set search_path=pg_catalog,public as $$ select $2 $$;
    `);
    const captureMigration = await readFile(new URL('../supabase/migrations/20261025152845_harden_spokedu_master_session_capture_concurrency.sql', import.meta.url), 'utf8');
    const expandMigration = await readFile(new URL('../supabase/migrations/20261026115102_stage2_session_writes_expand.sql', import.meta.url), 'utf8');
    await db.query(captureMigration);
    await db.query(expandMigration);
    await db.query(`notify pgrst, 'reload schema'`);
  }
  const aclBefore = await db.query(`select oid::regprocedure::text signature,proacl from pg_proc where oid in (
    'public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb)'::regprocedure,
    'public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text)'::regprocedure,
    'public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb)'::regprocedure,
    'public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb)'::regprocedure
  ) order by signature`);
  const migration = await readFile(new URL('../supabase/migrations/20261027160642_stage2_p0_conflict_http_409.sql', import.meta.url), 'utf8');
  await db.query(migration);
  await db.query(`notify pgrst, 'reload schema'`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const aclAfter = await db.query(`select oid::regprocedure::text signature,proacl from pg_proc where oid in (
    'public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb)'::regprocedure,
    'public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text)'::regprocedure,
    'public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb)'::regprocedure,
    'public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb)'::regprocedure
  ) order by signature`);
  record('function ACLs preserved', JSON.stringify(aclBefore.rows) === JSON.stringify(aclAfter.rows), aclAfter.rows);

  const { error: userError } = await supabase.auth.admin.createUser({ id: ownerId, email, password: randomUUID(), email_confirm: true });
  if (userError) throw userError;
  await db.query(`insert into public.spokedu_master_classes(id,owner_id,name) values($1,$2,'Stage 2 P0 QA')`, [classId, ownerId]);
  await db.query(`insert into public.spokedu_master_students(id,owner_id,name) values($1,$3,'Student A'),($2,$3,'Student B')`, [studentA, studentB, ownerId]);
  await db.query(`insert into public.spokedu_master_class_students(owner_id,class_id,student_id) values($1,$2,$3),($1,$2,$4)`, [ownerId, classId, studentA, studentB]);
  const startAt = new Date(Date.now() + 86_400_000).toISOString();
  const endAt = new Date(Date.now() + 90_000_000).toISOString();
  await db.query(`insert into public.spokedu_master_sessions(id,owner_id,class_id,start_at,end_at,status,memo,started_at) values($1,$2,$3,$4,$5,'scheduled','base',now())`, [sessionId, ownerId, classId, startAt, endAt]);

  const attendanceOk = await rpc('spokedu_master_update_session_attendance_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_version: 1,
    p_changes: [{ studentId: studentA, status: 'present' }, { studentId: studentB, status: 'absent' }],
  });
  const attendanceConflict = await rpc('spokedu_master_update_session_attendance_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_version: 1,
    p_changes: [{ studentId: studentB, status: 'present' }],
  });
  record('attendance success', attendanceOk.status === 200, attendanceOk);
  record('attendance stale HTTP 409 once', attendanceConflict.status === 409 && attendanceConflict.payload?.code === 'PT409' && attendanceConflict.elapsedMs < 5_000, attendanceConflict);

  const memoOk = await rpc('spokedu_master_save_session_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_memo_version: 1, p_class_id: classId,
    p_start_at: startAt, p_end_at: endAt, p_status: 'scheduled', p_memo: 'memo-current',
  });
  const memoConflict = await rpc('spokedu_master_save_session_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_memo_version: 1, p_class_id: classId,
    p_start_at: startAt, p_end_at: endAt, p_status: 'scheduled', p_memo: 'memo-stale',
  });
  record('memo success', memoOk.status === 200, memoOk);
  record('memo stale HTTP 409 once', memoConflict.status === 409 && memoConflict.payload?.code === 'PT409' && memoConflict.elapsedMs < 5_000, memoConflict);

  const captureOk = await rpc('spokedu_master_save_session_capture_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_version: null, p_next_session_note: 'next-current',
    p_observation_changes: [{ student_id: studentA, memo: 'A current' }, { student_id: studentB, memo: 'B current' }],
  });
  const captureConflict = await rpc('spokedu_master_save_session_capture_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_version: 0, p_next_session_note: 'next-stale',
    p_observation_changes: [{ student_id: studentA, memo: 'A stale' }],
  });
  record('capture success', captureOk.status === 200, captureOk);
  record('capture stale HTTP 409 once', captureConflict.status === 409 && captureConflict.payload?.code === 'PT409' && captureConflict.elapsedMs < 5_000, captureConflict);

  const completionOk = await rpc('spokedu_master_complete_session_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_memo_version: 2, p_expected_attendance_version: 2,
    p_class_id: classId, p_start_at: startAt, p_end_at: endAt, p_memo: 'completed-current',
    p_attendance: [{ studentId: studentA, status: 'present' }, { studentId: studentB, status: 'absent' }],
  });
  const completionConflict = await rpc('spokedu_master_complete_session_v2', {
    p_owner_id: ownerId, p_session_id: sessionId, p_expected_memo_version: 2, p_expected_attendance_version: 2,
    p_class_id: classId, p_start_at: startAt, p_end_at: endAt, p_memo: 'completed-stale',
    p_attendance: [{ studentId: studentA, status: 'absent' }, { studentId: studentB, status: 'present' }],
  });
  record('completion success', completionOk.status === 200, completionOk);
  record('completion stale HTTP 409 once', completionConflict.status === 409 && completionConflict.payload?.code === 'PT409' && completionConflict.elapsedMs < 5_000, completionConflict);

  const preserved = await db.query(`select s.memo,s.memo_version,s.attendance_version,r.application_idea,r.capture_version,
    (select jsonb_object_agg(a.student_name_snapshot,a.status) from public.spokedu_master_session_attendance a where a.session_id=s.id) attendance,
    (select jsonb_object_agg(c.student_name_snapshot,c.memo) from public.spokedu_master_class_record_students c where c.record_id=r.id) observations
    from public.spokedu_master_sessions s join public.spokedu_master_class_records r on r.session_id=s.id where s.id=$1`, [sessionId]);
  const state = preserved.rows[0];
  record('latest values and other student preserved', state?.memo === 'completed-current' && state?.application_idea === 'next-current'
    && state?.observations?.['Student A'] === 'A current' && state?.observations?.['Student B'] === 'B current'
    && state?.attendance?.['Student A'] === 'present' && state?.attendance?.['Student B'] === 'absent', state);

  const crossOwner = await rpc('spokedu_master_save_session_v2', {
    p_owner_id: otherOwnerId, p_session_id: sessionId, p_expected_memo_version: 3, p_class_id: classId,
    p_start_at: startAt, p_end_at: endAt, p_status: 'completed', p_memo: 'intrusion',
  });
  record('wrong owner denied', crossOwner.status >= 400 && crossOwner.payload?.code === 'P0002', crossOwner);

  await db.query(`create or replace function pg_temp.real_serialization_failure() returns void language plpgsql as $$ begin raise exception using errcode='40001',message='real serialization failure'; end $$`);
  let realSerializationCode = null;
  try { await db.query('select pg_temp.real_serialization_failure()'); } catch (error) { realSerializationCode = error.code; }
  record('real serialization failure remains distinct', realSerializationCode === '40001', realSerializationCode);
} finally {
  await db.query('delete from public.spokedu_master_class_records where owner_id=$1', [ownerId]).catch(() => undefined);
  await db.query('delete from public.spokedu_master_sessions where owner_id=$1', [ownerId]).catch(() => undefined);
  await db.query('delete from public.spokedu_master_students where owner_id=$1', [ownerId]).catch(() => undefined);
  await db.query('delete from public.spokedu_master_classes where owner_id=$1', [ownerId]).catch(() => undefined);
  await supabase.auth.admin.deleteUser(ownerId).catch(() => undefined);
  if (bootstrapped) {
    await db.query(`
      drop table if exists public.spokedu_master_stage2_write_gate cascade;
      drop table if exists public.spokedu_master_class_record_students cascade;
      drop table if exists public.spokedu_master_class_records cascade;
      drop table if exists public.spokedu_master_session_programs cascade;
      drop table if exists public.spokedu_master_session_attendance cascade;
      drop table if exists public.spokedu_master_sessions cascade;
      drop table if exists public.spokedu_master_class_students cascade;
      drop table if exists public.spokedu_master_students cascade;
      drop table if exists public.spokedu_master_classes cascade;
      drop function if exists public.spokedu_master_class_integrity_lock(uuid,uuid) cascade;
      drop function if exists public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) cascade;
      drop function if exists public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) cascade;
      drop function if exists public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) cascade;
      drop function if exists public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb) cascade;
      drop function if exists public.spokedu_master_enforce_stage2_write_gate() cascade;
      drop function if exists public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb) cascade;
      drop function if exists public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text) cascade;
      drop function if exists public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb) cascade;
      drop function if exists public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb) cascade;
      notify pgrst, 'reload schema';
    `).catch(() => undefined);
  }
  await db.end();
}

console.log(JSON.stringify({ passed: results.every((item) => item.pass), results }, null, 2));
if (results.some((item) => !item.pass)) process.exitCode = 1;
