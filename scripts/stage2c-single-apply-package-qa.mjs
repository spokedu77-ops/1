import { readFile } from 'node:fs/promises';
import pg from 'pg';

const root = new URL('../', import.meta.url);
const adminUrl = process.env.STAGE2A_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const database = `spokedu_stage2c_package_qa_${process.pid}`;
const read = (path) => readFile(new URL(path, root), 'utf8');
const stripPsql = (sql) => sql.replace(/^\\set ON_ERROR_STOP on\s*/i, '');
const snapshot = async (client) => ({
  history: (await client.query('select * from supabase_migrations.schema_migrations order by version')).rows,
  sessions: (await client.query('select * from public.sessions order by id')).rows,
  logs: (await client.query('select * from public.session_count_logs order by id')).rows,
});

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
try {
  await admin.query(`create database ${database}`);
  const dbUrl = adminUrl.replace(/\/postgres(?:\?.*)?$/, `/${database}`);
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`
      create schema private; create schema extensions; create schema supabase_migrations;
      create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text,created_by text,idempotency_key text,rollback text[]);
      create table public.users(id uuid primary key);
      create table public.sessions(id uuid primary key,title text not null,status text not null,created_by uuid,memo text,students_text text,start_at timestamptz not null,end_at timestamptz not null,price integer,group_id uuid);
      create table public.session_count_logs(id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.users(id),session_id uuid,session_title text,count_change integer not null,reason text,created_at timestamptz not null default clock_timestamp());
      create unique index session_count_logs_session_teacher_key on public.session_count_logs(session_id,teacher_id) where session_id is not null;
    `);
    const baseline = await read('supabase/migrations/20261022210000_reconcile_completed_session_main_teacher_count.sql');
    const stage2a = await read('supabase/migrations/20261026163542_stage2a_sync_assistant_teacher_counts.sql');
    const migration = await read('supabase/migrations/20261026171825_stage2c_teacher_schedule_conflict_guard.sql');
    const prefix = stripPsql(await read('ops/stage2c-single-apply/apply-prefix.sql'));
    const suffix = (await read('ops/stage2c-single-apply/apply-suffix.sql')).replace('__STAGE2C_MIGRATION_SQL__', () => migration);
    await client.query(baseline);
    await client.query(stage2a);
    await client.query("insert into supabase_migrations.schema_migrations(version,name,statements) values ('20261026163542','stage2a',array['stage2a']),('20261026163452','unrelated',array['unrelated'])");
    const teacher = '71000000-0000-4000-8000-000000000001';
    const session = '81000000-0000-4000-8000-000000000001';
    await client.query('insert into public.users values ($1)', [teacher]);
    await client.query("insert into public.sessions values ($1,'existing','opened',$2,null,null,'2026-12-01T01:00Z','2026-12-01T02:00Z',10000,null)", [session, teacher]);
    const before = await snapshot(client);

    let rollbackPass = false;
    await client.query('begin');
    try {
      await client.query(prefix); await client.query(migration);
      await client.query("do $$ begin raise exception 'STAGE2C_INJECTED_FAILURE'; end $$");
      await client.query(suffix); await client.query('commit');
    } catch (error) {
      rollbackPass = error.message.includes('STAGE2C_INJECTED_FAILURE');
      await client.query('rollback');
    }
    rollbackPass &&= JSON.stringify(await snapshot(client)) === JSON.stringify(before)
      && !(await client.query("select to_regclass('private.session_teacher_schedule_slots') is not null present")).rows[0].present;

    await client.query('begin'); await client.query(prefix); await client.query(migration); await client.query(suffix); await client.query('commit');
    const after = await snapshot(client);
    const target = after.history.filter((row) => row.version === '20261026171825');
    const privileges = (await client.query(`select
      has_function_privilege('public','public.trg_session_teacher_schedule_conflict_guard()','execute') trigger_public,
      has_function_privilege('anon','public.admin_apply_session_schedule_changes(jsonb)','execute') rpc_anon,
      has_function_privilege('authenticated','public.admin_apply_session_schedule_changes(jsonb)','execute') rpc_authenticated,
      has_function_privilege('service_role','public.admin_apply_session_schedule_changes(jsonb)','execute') rpc_service`)).rows[0];
    let duplicateBlocked = false;
    await client.query('begin');
    try { await client.query(prefix); await client.query('rollback'); }
    catch (error) { duplicateBlocked = error.message.includes('STAGE2C_VERSION_ALREADY_APPLIED'); await client.query('rollback'); }
    const assertions = {
      rollbackPass,
      exactVersionRecorded: target.length === 1,
      exactSqlTracked: target[0]?.statements?.[0]?.replace(/\r\n/g, '\n') === migration.replace(/\r\n/g, '\n'),
      otherHistoryUnchanged: JSON.stringify(before.history) === JSON.stringify(after.history.filter((row) => row.version !== '20261026171825')),
      sourceDataUnchanged: JSON.stringify(before.sessions) === JSON.stringify(after.sessions) && JSON.stringify(before.logs) === JSON.stringify(after.logs),
      noHistoricalBackfill: (await client.query('select count(*)::int count from private.session_teacher_schedule_slots')).rows[0].count === 0,
      aclRestricted: !privileges.trigger_public && !privileges.rpc_anon && !privileges.rpc_authenticated && privileges.rpc_service,
      duplicateBlocked,
    };
    const passed = Object.values(assertions).every(Boolean);
    console.log(JSON.stringify({ database, passed, assertions }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally { await client.end(); }
} finally {
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()', [database]);
  await admin.query(`drop database if exists ${database}`);
  await admin.end();
}
