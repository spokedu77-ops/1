import { readFile } from 'node:fs/promises';
import pg from 'pg';

const adminUrl = process.env.STAGE2A_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const database = `spokedu_stage2c_qa_${process.pid}`;
const teacher = (n) => `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const session = (n) => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const teachers = Array.from({ length: 8 }, (_, index) => teacher(index + 1));
const autoReason = '트리거: sessions.status sync';
const assistants = (...ids) => `EXTRA_TEACHERS:${JSON.stringify(ids.map((id) => ({ id, price: 10000 })))}`;
const results = [];
const record = (name, pass, evidence) => results.push({ name, pass, evidence });

async function expectError(client, sql, params, expected) {
  try {
    await client.query(sql, params);
    return { matched: false, message: null };
  } catch (error) {
    return { matched: error?.message === expected, message: error?.message };
  }
}

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
try {
  await admin.query(`create database ${database}`);
  const dbUrl = adminUrl.replace(/\/postgres(?:\?.*)?$/, `/${database}`);
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`
      create schema private;
      create schema extensions;
      create table public.users(id uuid primary key);
      create table public.sessions(
        id uuid primary key, title text not null, status text not null,
        created_by uuid, memo text, students_text text,
        start_at timestamptz not null, end_at timestamptz not null,
        price integer, group_id uuid
      );
      create table public.session_count_logs(
        id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.users(id),
        session_id uuid, session_title text, count_change integer not null, reason text
      );
      create unique index session_count_logs_session_teacher_key
        on public.session_count_logs(session_id,teacher_id) where session_id is not null;
    `);
    await client.query('insert into public.users(id) select unnest($1::uuid[])', [teachers]);
    const baseline = await readFile(new URL('../supabase/migrations/20261022210000_reconcile_completed_session_main_teacher_count.sql', import.meta.url), 'utf8');
    const stage2a = await readFile(new URL('../supabase/migrations/20261026163542_stage2a_sync_assistant_teacher_counts.sql', import.meta.url), 'utf8');
    const stage2c = await readFile(new URL('../supabase/migrations/20261026171825_stage2c_teacher_schedule_conflict_guard.sql', import.meta.url), 'utf8');
    await client.query(baseline);
    await client.query(stage2a);

    const legacyA = session(1);
    const legacyB = session(2);
    await client.query("insert into public.sessions values ($1,'legacy A','opened',$2,null,null,'2026-11-01T01:00:00Z','2026-11-01T02:00:00Z',10000,null)", [legacyA, teachers[6]]);
    await client.query("insert into public.sessions values ($1,'legacy B','opened',$2,null,null,'2026-11-01T01:30:00Z','2026-11-01T02:30:00Z',10000,null)", [legacyB, teachers[6]]);
    await client.query(stage2c);

    const noBackfill = await client.query('select count(*)::int count from private.session_teacher_schedule_slots');
    record('existing conflicts are not backfilled', noBackfill.rows[0].count === 0, noBackfill.rows[0]);
    await client.query("update public.sessions set status='verified' where id=$1", [legacyA]);
    record('status-only legacy transition remains compatible', true, { sessionId: legacyA });

    const base = session(10);
    await client.query("insert into public.sessions values ($1,'base','opened',$2,null,null,'2026-12-01T01:00:00Z','2026-12-01T02:00:00Z',10000,null)", [base, teachers[0]]);
    const mainMain = await expectError(client, "insert into public.sessions values ($1,'main-main','opened',$2,null,null,'2026-12-01T01:30:00Z','2026-12-01T02:30:00Z',10000,null)", [session(11), teachers[0]], 'TEACHER_SCHEDULE_CONFLICT');
    record('main-main partial overlap blocked', mainMain.matched, mainMain);

    const mainAssist = await expectError(client, "insert into public.sessions values ($1,'main-assist','opened',$2,$3,null,'2026-12-01T01:15:00Z','2026-12-01T01:45:00Z',10000,null)", [session(12), teachers[1], assistants(teachers[0])], 'TEACHER_SCHEDULE_CONFLICT');
    record('main-assistant overlap blocked', mainAssist.matched, mainAssist);

    const assistBase = session(13);
    await client.query("insert into public.sessions values ($1,'assist base','opened',$2,$3,null,'2026-12-02T01:00:00Z','2026-12-02T02:00:00Z',10000,null)", [assistBase, teachers[1], assistants(teachers[2])]);
    const assistAssist = await expectError(client, "insert into public.sessions values ($1,'assist-assist','opened',$2,$3,null,'2026-12-02T01:30:00Z','2026-12-02T02:30:00Z',10000,null)", [session(14), teachers[3], assistants(teachers[2])], 'TEACHER_SCHEDULE_CONFLICT');
    record('assistant-assistant overlap blocked', assistAssist.matched, assistAssist);

    const adjacent = session(15);
    await client.query("insert into public.sessions values ($1,'adjacent','opened',$2,null,null,'2026-12-01T02:00:00Z','2026-12-01T03:00:00Z',10000,null)", [adjacent, teachers[0]]);
    record('exactly adjacent sessions allowed', true, { sessionId: adjacent });

    for (const [index, status] of ['cancelled', 'postponed', 'deleted'].entries()) {
      await client.query("insert into public.sessions values ($1,$2,$3,$4,null,null,'2026-12-01T01:10:00Z','2026-12-01T01:20:00Z',10000,null)", [session(20 + index), status, status, teachers[0]]);
    }
    record('cancelled postponed deleted excluded', true, { statuses: ['cancelled', 'postponed', 'deleted'] });

    await client.query("update public.sessions set start_at='2026-12-01T03:00:00Z',end_at='2026-12-01T04:00:00Z' where id=$1", [adjacent]);
    record('self session is excluded from conflict query', true, { sessionId: adjacent });

    const rollbackTarget = session(30);
    await client.query("insert into public.sessions values ($1,'rollback target','opened',$2,null,null,'2026-12-03T01:00:00Z','2026-12-03T02:00:00Z',10000,null)", [rollbackTarget, teachers[4]]);
    const rollbackBefore = await client.query('select start_at,end_at from public.sessions where id=$1', [rollbackTarget]);
    const updateConflict = await expectError(client, "update public.sessions set created_by=$2,start_at='2026-12-01T01:30:00Z',end_at='2026-12-01T02:30:00Z' where id=$1", [rollbackTarget, teachers[0]], 'TEACHER_SCHEDULE_CONFLICT');
    const rollbackAfter = await client.query('select start_at,end_at,created_by from public.sessions where id=$1', [rollbackTarget]);
    record('single update conflict rolls back', updateConflict.matched && rollbackAfter.rows[0].created_by === teachers[4] && String(rollbackAfter.rows[0].start_at) === String(rollbackBefore.rows[0].start_at), { updateConflict, after: rollbackAfter.rows[0] });

    const batchA = session(31);
    const batchB = session(32);
    await client.query("insert into public.sessions values ($1,'batch A','opened',$2,null,null,'2026-12-04T01:00:00Z','2026-12-04T02:00:00Z',10000,null),($3,'batch B','opened',$4,null,null,'2026-12-04T03:00:00Z','2026-12-04T04:00:00Z',10000,null)", [batchA, teachers[4], batchB, teachers[5]]);
    const batchConflict = await expectError(client, 'select public.admin_apply_session_schedule_changes($1::jsonb)', [JSON.stringify([{ id: batchA, price: 20000 }, { id: batchB, created_by: teachers[0], start_at: '2026-12-01T01:30:00Z', end_at: '2026-12-01T02:30:00Z' }])], 'TEACHER_SCHEDULE_CONFLICT');
    const batchAfter = await client.query('select id,price,created_by from public.sessions where id=any($1::uuid[]) order by id', [[batchA, batchB]]);
    record('batch change is all-or-nothing', batchConflict.matched && batchAfter.rows.every((row) => row.price === 10000), { batchConflict, rows: batchAfter.rows });

    const groupId = '90000000-0000-4000-8000-000000000001';
    const shiftA = session(40);
    const shiftB = session(41);
    await client.query("insert into public.sessions values ($1,'shift A','opened',$2,null,null,'2026-12-10T01:00:00Z','2026-12-10T02:00:00Z',10000,$5),($3,'shift B','opened',$4,null,null,'2026-12-17T01:00:00Z','2026-12-17T02:00:00Z',10000,$5)", [shiftA, teachers[7], shiftB, teachers[7], groupId]);
    await client.query("update public.sessions set start_at='2026-12-24T01:00:00Z',end_at='2026-12-24T02:00:00Z' where id=$1", [shiftB]);
    await client.query("update public.sessions set start_at='2026-12-17T01:00:00Z',end_at='2026-12-17T02:00:00Z' where id=$1", [shiftA]);
    await client.query("update public.sessions set start_at='2026-12-10T01:00:00Z',end_at='2026-12-10T02:00:00Z' where id=$1", [shiftA]);
    await client.query("update public.sessions set start_at='2026-12-17T01:00:00Z',end_at='2026-12-17T02:00:00Z' where id=$1", [shiftB]);
    record('ordered postpone and restore shifts remain compatible', true, { shiftA, shiftB });

    const concurrentA = session(50);
    const concurrentB = session(51);
    const first = new pg.Client({ connectionString: dbUrl });
    const second = new pg.Client({ connectionString: dbUrl });
    await Promise.all([first.connect(), second.connect()]);
    let secondError = null;
    try {
      await first.query('begin');
      await first.query("insert into public.sessions values ($1,'concurrent A','opened',$2,null,null,'2026-12-20T01:00:00Z','2026-12-20T02:00:00Z',10000,null)", [concurrentA, teachers[3]]);
      const pending = second.query("insert into public.sessions values ($1,'concurrent B','opened',$2,null,null,'2026-12-20T01:30:00Z','2026-12-20T02:30:00Z',10000,null)", [concurrentB, teachers[3]]).catch((error) => { secondError = error; });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await first.query('commit');
      await pending;
    } finally {
      await Promise.allSettled([first.query('rollback'), second.query('rollback')]);
      await Promise.all([first.end(), second.end()]);
    }
    record('concurrent overlapping writes serialize and one fails', secondError?.message === 'TEACHER_SCHEDULE_CONFLICT', { message: secondError?.message });

    const privileges = await client.query(`select
      has_function_privilege('public','public.trg_session_teacher_schedule_conflict_guard()','execute') trigger_public,
      has_function_privilege('anon','public.admin_apply_session_schedule_changes(jsonb)','execute') rpc_anon,
      has_function_privilege('authenticated','public.admin_apply_session_schedule_changes(jsonb)','execute') rpc_authenticated,
      has_function_privilege('service_role','public.admin_apply_session_schedule_changes(jsonb)','execute') rpc_service`);
    record('trigger and batch RPC privileges are restricted', !privileges.rows[0].trigger_public && !privileges.rows[0].rpc_anon && !privileges.rows[0].rpc_authenticated && privileges.rows[0].rpc_service, privileges.rows[0]);

    const passed = results.every((result) => result.pass);
    console.log(JSON.stringify({ database, passed, results }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally { await client.end(); }
} finally {
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()', [database]);
  await admin.query(`drop database if exists ${database}`);
  await admin.end();
}
