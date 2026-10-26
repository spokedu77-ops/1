import { readFile } from 'node:fs/promises';
import pg from 'pg';

const root = new URL('../', import.meta.url);
const adminUrl = process.env.STAGE2A_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const database = `spokedu_stage2a_package_qa_${process.pid}`;
const version = '20261026163542';
const autoReason = '트리거: sessions.status sync';
const ids = {
  main: '30000000-0000-4000-8000-000000000001',
  assistant: '30000000-0000-4000-8000-000000000002',
  manual: '30000000-0000-4000-8000-000000000003',
  session: '40000000-0000-4000-8000-000000000001',
};

const read = (relative) => readFile(new URL(relative, root), 'utf8');
const normalizePrefix = (sql) => sql.replace(/^\\set ON_ERROR_STOP on\s*/i, '');
const snapshot = async (client) => {
  const history = await client.query('select version,statements,name,created_by,idempotency_key,rollback from supabase_migrations.schema_migrations order by version');
  const logs = await client.query('select id,teacher_id,session_id,session_title,count_change,reason,created_at from public.session_count_logs order by id');
  const functions = await client.query("select p.oid::regprocedure::text signature,md5(pg_get_functiondef(p.oid)) definition_md5 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('clear_session_count_logs_for_session','sync_session_count_logs_for_session','trg_session_count_logs_sync') order by p.proname");
  const triggers = await client.query("select tgname,pg_get_triggerdef(oid,true) definition from pg_trigger where tgrelid='public.sessions'::regclass and not tgisinternal order by tgname");
  return { history: history.rows, logs: logs.rows, functions: functions.rows, triggers: triggers.rows };
};

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
try {
  await admin.query(`create database ${database}`);
  const dbUrl = adminUrl.replace(/\/postgres(?:\?.*)?$/, `/${database}`);
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query(`
      create schema supabase_migrations;
      create table supabase_migrations.schema_migrations(
        version text primary key,
        statements text[],
        name text,
        created_by text,
        idempotency_key text,
        rollback text[]
      );
      insert into supabase_migrations.schema_migrations(version,name,statements)
      values ('20261023135727','reconcile_completed_session_main_teacher_count',array['baseline']),
             ('20261026163452','spokedu_master_refund_request_workflow',array['unrelated']);
      create table public.users(id uuid primary key);
      create table public.sessions(
        id uuid primary key,
        title text not null,
        status text not null,
        created_by uuid,
        memo text,
        students_text text
      );
      create table public.session_count_logs(
        id uuid primary key default gen_random_uuid(),
        teacher_id uuid not null references public.users(id),
        session_id uuid,
        session_title text,
        count_change integer not null,
        reason text,
        created_at timestamptz not null default clock_timestamp()
      );
      create unique index session_count_logs_session_teacher_key
        on public.session_count_logs(session_id,teacher_id)
        where session_id is not null;
    `);
    await client.query('insert into public.users(id) select unnest($1::uuid[])', [[ids.main, ids.assistant, ids.manual]]);
    const baseline = await read('supabase/migrations/20261022210000_reconcile_completed_session_main_teacher_count.sql');
    const migration = await read('supabase/migrations/20261026163542_stage2a_sync_assistant_teacher_counts.sql');
    const productionPrefix = normalizePrefix(await read('ops/stage2a-single-apply/apply-prefix.sql'));
    const suffixTemplate = await read('ops/stage2a-single-apply/apply-suffix.sql');
    const suffix = suffixTemplate.replace('__STAGE2A_MIGRATION_SQL__', () => migration);
    await client.query(baseline);
    await client.query(
      "insert into public.sessions values ($1,'package QA','finished',$2,$3,null)",
      [ids.session, ids.main, `memo\nEXTRA_TEACHERS:${JSON.stringify([{ id: ids.assistant }])}`],
    );
    await client.query(
      'insert into public.session_count_logs(teacher_id,session_id,session_title,count_change,reason) values ($1,null,$2,1,$3)',
      [ids.manual, 'manual historical', 'manual correction'],
    );

    const before = await snapshot(client);
    const fixtureHashes = new Map(before.functions.map((row) => [row.signature, row.definition_md5]));
    const prefix = productionPrefix
      .replace('bdf00fa20fa1b402c0467f85ca08bdb2', fixtureHashes.get('clear_session_count_logs_for_session(uuid)'))
      .replace('f40c581d701913b8aea6725983d9d43f', fixtureHashes.get('sync_session_count_logs_for_session(uuid)'))
      .replace('20e13ce02f7ca3972051087e3c8a7802', fixtureHashes.get('trg_session_count_logs_sync()'));

    let injectedRollback = false;
    let injectedFailureMessage = null;
    await client.query('begin');
    try {
      await client.query(prefix);
      await client.query(migration);
      await client.query("do $failure$ begin raise exception 'STAGE2A_INJECTED_FAILURE'; end $failure$");
      await client.query(suffix);
      await client.query('commit');
    } catch (error) {
      injectedFailureMessage = error.message;
      injectedRollback = error.message.includes('STAGE2A_INJECTED_FAILURE');
      await client.query('rollback');
    }
    const afterFailure = await snapshot(client);
    const helperAfterFailure = await client.query("select to_regprocedure('public.session_count_teacher_ids(uuid,text)') is not null present");
    if (!injectedRollback || JSON.stringify(before) !== JSON.stringify(afterFailure) || helperAfterFailure.rows[0].present) {
      throw new Error(`failure injection did not roll back schema, data, and history: ${JSON.stringify({ injectedFailureMessage, stateEqual: JSON.stringify(before) === JSON.stringify(afterFailure), helperPresent: helperAfterFailure.rows[0].present, beforeFunctions: before.functions })}`);
    }

    await client.query('begin');
    await client.query(prefix);
    await client.query(migration);
    await client.query(suffix);
    await client.query('commit');

    const after = await snapshot(client);
    const targetRows = after.history.filter((row) => row.version === version);
    const unrelatedBefore = before.history;
    const unrelatedAfter = after.history.filter((row) => row.version !== version);
    const trigger = after.triggers.find((row) => row.tgname === 'trg_session_count_logs_sync');
    const privileges = await client.query(`
      select
        has_function_privilege('public','public.session_count_teacher_ids(uuid,text)','execute') helper_public,
        has_function_privilege('anon','public.session_count_teacher_ids(uuid,text)','execute') helper_anon,
        has_function_privilege('authenticated','public.session_count_teacher_ids(uuid,text)','execute') helper_authenticated
    `);
    const assertions = {
      exactVersionRecorded: targetRows.length === 1,
      exactSqlTracked: targetRows[0]?.statements?.length === 1
        && targetRows[0].statements[0].replace(/\r\n/g, '\n') === migration.replace(/\r\n/g, '\n'),
      otherHistoryUnchanged: JSON.stringify(unrelatedBefore) === JSON.stringify(unrelatedAfter),
      triggerWatchesMemo: trigger?.definition.includes('UPDATE OF status, created_by, memo'),
      helperPrivilegesRevoked: Object.values(privileges.rows[0]).every((value) => value === false),
      clearSyncPreserved: JSON.stringify(before.functions.filter((row) => !row.signature.startsWith('trg_session_count_logs_sync')))
        === JSON.stringify(after.functions.filter((row) => !row.signature.startsWith('trg_session_count_logs_sync'))),
      countLogsUnchanged: JSON.stringify(before.logs) === JSON.stringify(after.logs),
    };

    let duplicateBlocked = false;
    await client.query('begin');
    try {
      await client.query(prefix);
      await client.query('rollback');
    } catch (error) {
      duplicateBlocked = error.message.includes('STAGE2A_VERSION_ALREADY_APPLIED');
      await client.query('rollback');
    }
    assertions.duplicateApplyBlocked = duplicateBlocked;

    const passed = Object.values(assertions).every(Boolean);
    console.log(JSON.stringify({
      database,
      passed,
      injectedRollback,
      assertions,
      historyRowsBefore: before.history.length,
      historyRowsAfter: after.history.length,
    }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await client.end();
  }
} finally {
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()', [database]);
  await admin.query(`drop database if exists ${database}`);
  await admin.end();
}
