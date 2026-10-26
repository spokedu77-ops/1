import { readFile } from 'node:fs/promises';
import pg from 'pg';

async function runProductionDryRun() {
  const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8');
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith('SPOKEDU_MASTER_DATABASE_URL='));
  const connectionString = line?.slice('SPOKEDU_MASTER_DATABASE_URL='.length).trim().replace(/^"|"$/g, '');
  if (!connectionString) throw new Error('SPOKEDU_MASTER_DATABASE_URL is required');

  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('begin transaction read only');
    const sessions = await client.query(`
      select id,created_by,memo
      from public.sessions
      where status in ('finished','verified')
    `);
    const logs = await client.query(`
      select session_id,teacher_id,reason
      from public.session_count_logs
      where session_id is not null
    `);

    const allBySession = new Map();
    const autoBySession = new Map();
    for (const row of logs.rows) {
      const allValues = allBySession.get(row.session_id) ?? new Set();
      allValues.add(row.teacher_id);
      allBySession.set(row.session_id, allValues);
      if (row.reason === '트리거: sessions.status sync') {
        const autoValues = autoBySession.get(row.session_id) ?? new Set();
        autoValues.add(row.teacher_id);
        autoBySession.set(row.session_id, autoValues);
      }
    }

    let malformedSessions = 0;
    let missingPairs = 0;
    let stalePairs = 0;
    const affectedSessions = new Set();
    let auditMissingPairs = 0;
    let auditStalePairs = 0;
    const auditAffectedSessions = new Set();
    for (const session of sessions.rows) {
      const raw = session.memo ?? '';
      const hasAssistantMetadata = raw.includes('EXTRA_TEACHERS:');
      const match = raw.match(/EXTRA_TEACHERS:\s*(\[[^\r\n]*\])/);
      let parsed = [];
      if (hasAssistantMetadata) {
        try {
          parsed = match ? JSON.parse(match[1]) : null;
        } catch {
          parsed = null;
        }
      }
      if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item.id !== 'string')) {
        malformedSessions += 1;
        continue;
      }

      const expectedAssistants = new Set(parsed.map((item) => item.id));
      const allActual = allBySession.get(session.id) ?? new Set();
      const actual = autoBySession.get(session.id) ?? new Set();
      for (const teacherId of expectedAssistants) {
        if (!actual.has(teacherId)) {
          missingPairs += 1;
          affectedSessions.add(session.id);
        }
      }
      for (const teacherId of actual) {
        if (teacherId !== session.created_by && !expectedAssistants.has(teacherId)) {
          stalePairs += 1;
          affectedSessions.add(session.id);
        }
      }
      for (const teacherId of expectedAssistants) {
        if (!allActual.has(teacherId)) {
          auditMissingPairs += 1;
          auditAffectedSessions.add(session.id);
        }
      }
      for (const teacherId of actual) {
        if (teacherId !== session.created_by && !expectedAssistants.has(teacherId)) {
          auditStalePairs += 1;
          auditAffectedSessions.add(session.id);
        }
      }
    }

    console.log(JSON.stringify({
      mode: 'READ_ONLY_DRY_RUN',
      writes: 0,
      affectedSessions: affectedSessions.size,
      missingAssistantLogs: missingPairs,
      staleAssistantLogs: stalePairs,
      auditAllLogComparison: {
        affectedSessions: auditAffectedSessions.size,
        missingLogs: auditMissingPairs,
        staleLogs: auditStalePairs,
      },
      malformedSessionsExcluded: malformedSessions,
    }, null, 2));
  } finally {
    await client.query('rollback').catch(() => undefined);
    await client.end();
  }
}

if (process.argv.includes('--production-dry-run')) {
  await runProductionDryRun();
  process.exit(0);
}

const adminUrl = process.env.STAGE2A_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const database = `spokedu_stage2a_qa_${process.pid}`;
const ids = {
  mainA: '10000000-0000-4000-8000-000000000001',
  teacherB: '10000000-0000-4000-8000-000000000002',
  teacherC: '10000000-0000-4000-8000-000000000003',
  teacherD: '10000000-0000-4000-8000-000000000004',
};

const autoReason = '트리거: sessions.status sync';
const results = [];
const admin = new pg.Client({ connectionString: adminUrl });

function record(name, pass, evidence) {
  results.push({ name, pass, evidence });
}

function assistants(...teacherIds) {
  return `memo\nEXTRA_TEACHERS:${JSON.stringify(teacherIds.map((id) => ({ id, price: 10000 })))}`;
}

async function snapshot(client, sessionId) {
  const session = await client.query('select status,created_by,memo from public.sessions where id=$1', [sessionId]);
  const logs = await client.query(
    'select id,teacher_id,count_change,reason,created_at from public.session_count_logs where session_id=$1 order by teacher_id,reason',
    [sessionId],
  );
  return { session: session.rows[0], logs: logs.rows };
}

function teacherIds(snapshotValue, reason = autoReason) {
  return snapshotValue.logs.filter((row) => row.reason === reason).map((row) => row.teacher_id);
}

async function expectError(client, sql, params, message) {
  try {
    await client.query(sql, params);
    return false;
  } catch (error) {
    return error?.message === message;
  }
}

await admin.connect();
try {
  await admin.query(`create database ${database}`);
  const dbUrl = adminUrl.replace(/\/postgres(?:\?.*)?$/, `/${database}`);
  const setup = new pg.Client({ connectionString: dbUrl });
  await setup.connect();
  try {
    await setup.query(`
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
      create unique index session_count_logs_session_teacher_unique
        on public.session_count_logs(session_id,teacher_id)
        where session_id is not null;
    `);
    await setup.query('insert into public.users(id) select unnest($1::uuid[])', [Object.values(ids)]);

    const baseline = await readFile(
      new URL('../supabase/migrations/20261022210000_reconcile_completed_session_main_teacher_count.sql', import.meta.url),
      'utf8',
    );
    const migration = await readFile(
      new URL('../supabase/migrations/20261026163542_stage2a_sync_assistant_teacher_counts.sql', import.meta.url),
      'utf8',
    );
    await setup.query(baseline);
    await setup.query(migration);

    const privileges = await setup.query(`
      select
        has_function_privilege('public','public.session_count_teacher_ids(uuid,text)','execute') helper_public,
        has_function_privilege('anon','public.session_count_teacher_ids(uuid,text)','execute') helper_anon,
        has_function_privilege('authenticated','public.session_count_teacher_ids(uuid,text)','execute') helper_authenticated,
        has_function_privilege('public','public.trg_session_count_logs_sync()','execute') trigger_public
    `);
    const grants = privileges.rows[0];
    record(
      'helper and trigger are not public APIs',
      !grants.helper_public && !grants.helper_anon && !grants.helper_authenticated && !grants.trigger_public,
      grants,
    );

    let sequence = 1;
    const newSessionId = () => `20000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;

    const assistantChange = newSessionId();
    await setup.query(
      "insert into public.sessions values ($1,'assistant change','finished',$2,$3,null)",
      [assistantChange, ids.mainA, assistants(ids.teacherB)],
    );
    await setup.query('update public.sessions set memo=$2 where id=$1', [assistantChange, assistants(ids.teacherC)]);
    let state = await snapshot(setup, assistantChange);
    record('assistant A to B', JSON.stringify(teacherIds(state)) === JSON.stringify([ids.mainA, ids.teacherC]), state);

    await setup.query('update public.sessions set memo=$2 where id=$1', [assistantChange, assistants(ids.teacherB, ids.teacherC)]);
    const added = await snapshot(setup, assistantChange);
    await setup.query('update public.sessions set memo=$2 where id=$1', [assistantChange, assistants(ids.teacherC)]);
    const removed = await snapshot(setup, assistantChange);
    record(
      'assistant add and remove',
      JSON.stringify(teacherIds(added)) === JSON.stringify([ids.mainA, ids.teacherB, ids.teacherC])
        && JSON.stringify(teacherIds(removed)) === JSON.stringify([ids.mainA, ids.teacherC]),
      { added, removed },
    );

    const roleSwap = newSessionId();
    await setup.query("insert into public.sessions values ($1,'role swap','verified',$2,$3,null)", [roleSwap, ids.mainA, assistants(ids.teacherB)]);
    const beforeSwap = await snapshot(setup, roleSwap);
    await setup.query('update public.sessions set created_by=$2,memo=$3 where id=$1', [roleSwap, ids.teacherB, assistants(ids.mainA)]);
    const afterSwap = await snapshot(setup, roleSwap);
    record(
      'main assistant role swap',
      JSON.stringify(teacherIds(afterSwap)) === JSON.stringify([ids.mainA, ids.teacherB])
        && JSON.stringify(beforeSwap.logs.map((row) => row.id).sort()) === JSON.stringify(afterSwap.logs.map((row) => row.id).sort()),
      { beforeSwap, afterSwap },
    );

    const duplicate = newSessionId();
    await setup.query("insert into public.sessions values ($1,'duplicate','finished',$2,$3,null)", [duplicate, ids.mainA, assistants(ids.mainA, ids.teacherB, ids.teacherB)]);
    state = await snapshot(setup, duplicate);
    record('duplicate assignment counted once', JSON.stringify(teacherIds(state)) === JSON.stringify([ids.mainA, ids.teacherB]), state);

    const plainMemo = newSessionId();
    await setup.query("insert into public.sessions values ($1,'plain memo','finished',$2,$3,null)", [plainMemo, ids.mainA, assistants(ids.teacherB)]);
    const beforePlainMemo = await snapshot(setup, plainMemo);
    await setup.query('update public.sessions set memo=$2 where id=$1', [plainMemo, `updated note\nEXTRA_TEACHERS:${JSON.stringify([{ id: ids.teacherB, price: 10000 }])}`]);
    const afterPlainMemo = await snapshot(setup, plainMemo);
    record(
      'plain memo edit does not reprocess counts',
      JSON.stringify(beforePlainMemo.logs.map((row) => row.id)) === JSON.stringify(afterPlainMemo.logs.map((row) => row.id)),
      { beforePlainMemo, afterPlainMemo },
    );

    const malformed = newSessionId();
    await setup.query("insert into public.sessions values ($1,'malformed','finished',$2,$3,null)", [malformed, ids.mainA, assistants(ids.teacherB)]);
    const malformedBefore = await snapshot(setup, malformed);
    const malformedRejected = await expectError(
      setup,
      'update public.sessions set memo=$2 where id=$1',
      [malformed, 'memo\nEXTRA_TEACHERS:[broken'],
      'SESSION_COUNT_EXTRA_TEACHERS_INVALID',
    );
    const malformedAfter = await snapshot(setup, malformed);
    record('malformed metadata rolls back', malformedRejected && JSON.stringify(malformedBefore) === JSON.stringify(malformedAfter), malformedAfter);

    const conflict = newSessionId();
    await setup.query("insert into public.sessions values ($1,'manual conflict','finished',$2,$3,null)", [conflict, ids.mainA, assistants(ids.teacherB)]);
    await setup.query(
      'insert into public.session_count_logs(teacher_id,session_id,session_title,count_change,reason) values ($1,$2,$3,1,$4)',
      [ids.teacherC, conflict, 'manual conflict', 'manual correction'],
    );
    const conflictBefore = await snapshot(setup, conflict);
    const conflictRejected = await expectError(
      setup,
      'update public.sessions set memo=$2 where id=$1',
      [conflict, assistants(ids.teacherC)],
      'SESSION_COUNT_TARGET_LOG_AMBIGUOUS',
    );
    const conflictAfter = await snapshot(setup, conflict);
    record(
      'manual conflict preserves logs and rolls back session',
      conflictRejected && JSON.stringify(conflictBefore) === JSON.stringify(conflictAfter),
      conflictAfter,
    );

    const mainRegression = newSessionId();
    await setup.query("insert into public.sessions values ($1,'main regression','finished',$2,'memo',null)", [mainRegression, ids.mainA]);
    await setup.query('update public.sessions set created_by=$2 where id=$1', [mainRegression, ids.teacherB]);
    state = await snapshot(setup, mainRegression);
    record('existing main teacher reassignment', JSON.stringify(teacherIds(state)) === JSON.stringify([ids.teacherB]), state);

    const scheduled = newSessionId();
    await setup.query("insert into public.sessions values ($1,'scheduled','scheduled',$2,'memo',null)", [scheduled, ids.mainA]);
    await setup.query('update public.sessions set memo=$2 where id=$1', [scheduled, assistants(ids.teacherB)]);
    state = await snapshot(setup, scheduled);
    record('non-completed session ignored', state.logs.length === 0, state);

    const concurrent = newSessionId();
    await setup.query("insert into public.sessions values ($1,'concurrent','finished',$2,$3,null)", [concurrent, ids.mainA, assistants(ids.teacherB)]);
    const first = new pg.Client({ connectionString: dbUrl });
    const second = new pg.Client({ connectionString: dbUrl });
    await Promise.all([first.connect(), second.connect()]);
    try {
      await first.query('begin');
      await first.query('update public.sessions set memo=$2 where id=$1', [concurrent, assistants(ids.teacherC)]);
      const secondUpdate = second.query('update public.sessions set memo=$2 where id=$1', [concurrent, assistants(ids.teacherD)]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await first.query('commit');
      await secondUpdate;
      state = await snapshot(setup, concurrent);
      record('concurrent updates serialize to final assignment', JSON.stringify(teacherIds(state)) === JSON.stringify([ids.mainA, ids.teacherD]), state);
    } finally {
      await Promise.allSettled([first.query('rollback'), second.query('rollback')]);
      await Promise.all([first.end(), second.end()]);
    }

    const unchangedMain = newSessionId();
    await setup.query("insert into public.sessions values ($1,'T13 unchanged main','finished',$2,$3,null)", [unchangedMain, ids.mainA, assistants(ids.teacherB)]);
    const t13Before = await snapshot(setup, unchangedMain);
    await setup.query('update public.sessions set memo=$2 where id=$1', [unchangedMain, assistants(ids.teacherC)]);
    const t13After = await snapshot(setup, unchangedMain);
    const t13MainBefore = t13Before.logs.find((row) => row.teacher_id === ids.mainA);
    const t13MainAfter = t13After.logs.find((row) => row.teacher_id === ids.mainA);
    record(
      'T13 unchanged main automatic log identity is preserved',
      JSON.stringify(t13MainBefore) === JSON.stringify(t13MainAfter)
        && !t13After.logs.some((row) => row.teacher_id === ids.teacherB)
        && t13After.logs.some((row) => row.teacher_id === ids.teacherC && row.reason === autoReason),
      { before: t13Before, after: t13After },
    );

    const historical = newSessionId();
    await setup.query("insert into public.sessions values ($1,'T14 historical','finished',$2,$3,null)", [historical, ids.mainA, assistants(ids.teacherB)]);
    await setup.query(
      'insert into public.session_count_logs(teacher_id,session_id,session_title,count_change,reason) values ($1,$2,$3,1,$4)',
      [ids.teacherD, historical, 'historical stale automatic row', autoReason],
    );
    const historicalBefore = await snapshot(setup, historical);
    await setup.query('update public.sessions set memo=$2 where id=$1', [historical, assistants(ids.teacherC)]);
    const historicalAfter = await snapshot(setup, historical);
    const staleBefore = historicalBefore.logs.find((row) => row.teacher_id === ids.teacherD);
    const staleAfter = historicalAfter.logs.find((row) => row.teacher_id === ids.teacherD);

    const missingSource = newSessionId();
    await setup.query("insert into public.sessions values ($1,'T14 missing source','finished',$2,$3,null)", [missingSource, ids.mainA, assistants(ids.teacherB)]);
    await setup.query('delete from public.session_count_logs where session_id=$1 and teacher_id=$2', [missingSource, ids.teacherB]);
    const missingSourceBefore = await snapshot(setup, missingSource);
    const missingSourceRejected = await expectError(
      setup,
      'update public.sessions set memo=$2 where id=$1',
      [missingSource, assistants(ids.teacherC)],
      'SESSION_COUNT_SOURCE_AUTO_LOG_AMBIGUOUS',
    );
    const missingSourceAfter = await snapshot(setup, missingSource);
    record(
      'T14 unrelated historical mismatch is preserved and ambiguous source rolls back',
      JSON.stringify(staleBefore) === JSON.stringify(staleAfter)
        && missingSourceRejected
        && JSON.stringify(missingSourceBefore) === JSON.stringify(missingSourceAfter),
      { historicalBefore, historicalAfter, missingSourceBefore, missingSourceAfter },
    );

    const swapHistory = newSessionId();
    await setup.query("insert into public.sessions values ($1,'T15 role swap history','verified',$2,$3,null)", [swapHistory, ids.mainA, assistants(ids.teacherB)]);
    const t15Before = await snapshot(setup, swapHistory);
    await setup.query('update public.sessions set created_by=$2,memo=$3 where id=$1', [swapHistory, ids.teacherB, assistants(ids.mainA)]);
    const t15After = await snapshot(setup, swapHistory);
    record(
      'T15 role swap preserves all automatic log history',
      JSON.stringify(t15Before.logs) === JSON.stringify(t15After.logs),
      { before: t15Before, after: t15After },
    );

    const manualHistory = newSessionId();
    await setup.query("insert into public.sessions values ($1,'T16 manual history','finished',$2,$3,null)", [manualHistory, ids.mainA, assistants(ids.teacherB)]);
    await setup.query(
      'insert into public.session_count_logs(teacher_id,session_id,session_title,count_change,reason) values ($1,$2,$3,1,$4)',
      [ids.teacherD, manualHistory, 'manual historical row', 'manual correction'],
    );
    await setup.query(
      'insert into public.session_count_logs(teacher_id,session_id,session_title,count_change,reason) values ($1,$2,$3,1,$4)',
      [ids.teacherC, manualHistory, 'manual target row', 'manual correction'],
    );
    const t16Before = await snapshot(setup, manualHistory);
    const t16Rejected = await expectError(
      setup,
      'update public.sessions set memo=$2 where id=$1',
      [manualHistory, assistants(ids.teacherC)],
      'SESSION_COUNT_TARGET_LOG_AMBIGUOUS',
    );
    const t16After = await snapshot(setup, manualHistory);
    record(
      'T16 manual and historical rows are preserved and target conflict rolls back',
      t16Rejected && JSON.stringify(t16Before) === JSON.stringify(t16After),
      { before: t16Before, after: t16After },
    );

    const failedUpdate = results.find((item) => item.name === 'manual conflict preserves logs and rolls back session');
    record('failed update is fully atomic', Boolean(failedUpdate?.pass), failedUpdate?.evidence);
  } finally {
    await setup.end();
  }

  const passed = results.every((item) => item.pass);
  console.log(JSON.stringify({ database, passed, results }, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()', [database]);
  await admin.query(`drop database if exists ${database}`);
  await admin.end();
}
