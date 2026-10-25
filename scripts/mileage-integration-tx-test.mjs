/**
 * PostgreSQL integration tests in one transaction (ROLLBACK — no durable changes).
 * Requires SPOKEDU_MASTER_DATABASE_URL in .env.local
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

function loadDatabaseUrl() {
  const env = readFileSync('.env.local', 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('SPOKEDU_MASTER_DATABASE_URL='));
  return line?.slice('SPOKEDU_MASTER_DATABASE_URL='.length).trim().replace(/^"|"$/g, '') ?? '';
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const client = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false } });
await client.connect();

const results = [];
const run = async (name, fn) => {
  await client.query('SAVEPOINT mileage_test');
  try {
    await fn();
    results.push({ name, ok: true });
    await client.query('RELEASE SAVEPOINT mileage_test');
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT mileage_test');
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

await client.query('BEGIN');
try {
  const migration = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261023150000_mileage_holiday_and_admin_cancel.sql'),
    'utf8',
  );
  await client.query(migration);

  await run('holiday 10/3 postpone credit 0P', async () => {
    const { rows } = await client.query(
      `select private.phase2_mileage_total('수업 연기', timestamptz '2026-10-02T15:00:00+00') as t`,
    );
    assert(Number(rows[0].t) === 0, `expected 0 got ${rows[0].t}`);
  });

  await run('holiday 10/5 and 10/9 zero credit', async () => {
    for (const iso of ['2026-10-04T15:00:00+00', '2026-10-08T15:00:00+00']) {
      const { rows } = await client.query(
        `select private.phase2_mileage_total('수업 연기,당일 연기', $1::timestamptz) as t`,
        [iso],
      );
      assert(Number(rows[0].t) === 0, iso);
    }
  });

  await run('weekday postpone +2500', async () => {
    const { rows } = await client.query(
      `select private.phase2_mileage_total('수업 연기', timestamptz '2026-10-23T01:00:00+00') as t`,
    );
    assert(Number(rows[0].t) === 2500, rows[0].t);
  });

  await run('holiday postpone_request -5000 kept', async () => {
    const { rows } = await client.query(
      `select private.phase2_mileage_total('수업 연기 요청', timestamptz '2026-10-02T15:00:00+00') as t`,
    );
    assert(Number(rows[0].t) === -5000, rows[0].t);
  });

  const teacherA = randomUUID();
  const teacherB = randomUUID();
  const sessionId = randomUUID();
  const groupId = randomUUID();

  await client.query(
    `insert into users (id, name, email, role, points) values
      ($1, 'TX-A', $3, 'teacher', 0),
      ($2, 'TX-B', $4, 'teacher', 0)`,
    [teacherA, teacherB, `tx-a-${teacherA}@example.com`, `tx-b-${teacherB}@example.com`],
  );

  await client.query(
    `insert into sessions (
       id, title, start_at, end_at, status, created_by, group_id, mileage_option,
       session_type, round_index, round_total, price
     ) values (
       $1, 'TX Session',
       timestamptz '2026-10-02T15:00:00+00', timestamptz '2026-10-02T16:00:00+00',
       'postponed', $2, $3, '',
       'private', 1, 1, 0
     )`,
    [sessionId, teacherA, groupId],
  );

  await run('holiday postpone settle 0 logs + restore undo', async () => {
    const key1 = randomUUID().replace(/-/g, '') + 'ab';
    await client.query(`select public.admin_apply_session_linked_mileage($1, '수업 연기', '', $2)`, [
      sessionId,
      key1,
    ]);
    const { rows: logs } = await client.query(
      `select count(*)::int as c from mileage_logs where session_id = $1`,
      [sessionId],
    );
    assert(logs[0].c === 0, 'holiday should not insert logs');
    const key2 = randomUUID().replace(/-/g, '') + 'cd';
    await client.query(`select public.admin_apply_session_linked_mileage($1, '', '수업 연기', $2)`, [
      sessionId,
      key2,
    ]);
    const { rows: opt } = await client.query(`select mileage_option from sessions where id = $1`, [sessionId]);
    assert(opt[0].mileage_option === '', 'restored option');
  });

  await client.query(
    `update sessions set mileage_option = '수업 연기' where id = $1`,
    [sessionId],
  );
  await client.query(
    `insert into mileage_logs (teacher_id, amount, reason, session_title, session_id, session_started_at)
     values ($1, 2500, '[수업연동] 지급: 수업 연기', 'TX', $2, (select start_at from sessions where id = $2))`,
    [teacherA, sessionId],
  );
  await client.query(`update users set points = 2500 where id = $1`, [teacherA]);
  await client.query(
    `insert into mileage_logs (teacher_id, amount, reason, session_title, session_id, session_started_at)
     values ($1, 2500, '[수업연동/보조] 지급: 수업 연기', 'TX', $2, (select start_at from sessions where id = $2))`,
    [teacherB, sessionId],
  );
  await client.query(`update users set points = 2500 where id = $1`, [teacherB]);

  await run('cancel single log leaves assist intact', async () => {
    const { rows: mainLog } = await client.query(
      `select id, amount, reason from mileage_logs where session_id = $1 and teacher_id = $2`,
      [sessionId, teacherA],
    );
    const key = randomUUID().replace(/-/g, '') + 'ef';
    await client.query(
      `select public.admin_cancel_mileage_log($1, $2, $3, $4, $5)`,
      [teacherA, mainLog[0].id, mainLog[0].amount, mainLog[0].reason, key],
    );
    const { rows: remain } = await client.query(
      `select count(*)::int as c from mileage_logs where session_id = $1`,
      [sessionId],
    );
    assert(remain[0].c === 1, 'assist log should remain');
    const { rows: pts } = await client.query(`select points from users where id = $1`, [teacherB]);
    assert(Number(pts[0].points) === 2500, 'assist points unchanged');
  });

  await run('partial cancel then re-settle change action postpone undo flow', async () => {
    const teacherC = randomUUID();
    const teacherD = randomUUID();
    await client.query(
      `insert into users (id, name, email, role, points) values
        ($1, 'TX-C', $3, 'teacher', 0), ($2, 'TX-D', $4, 'teacher', 0)`,
      [teacherC, teacherD, `tx-c-${teacherC}@example.com`, `tx-d-${teacherD}@example.com`],
    );
    const weekdaySession = randomUUID();
    const weekdayGroup = randomUUID();
    await client.query(
      `insert into sessions (
         id, title, start_at, end_at, status, created_by, group_id, mileage_option, memo,
         session_type, round_index, round_total, price
       ) values (
         $1, 'TX Weekday', timestamptz '2026-10-23T01:00:00+00', timestamptz '2026-10-23T02:00:00+00',
         'opened', $2, $3, '',
         'EXTRA_TEACHERS:' || $4::text,
         'private', 1, 1, 0
       )`,
      [weekdaySession, teacherC, weekdayGroup, JSON.stringify([{ id: teacherD, price: 0 }])],
    );

    const settleKey = randomUUID().replace(/-/g, '') + 'mn';
    await client.query(
      `select public.admin_apply_session_linked_mileage($1, '수업 연기', '', $2)`,
      [weekdaySession, settleKey],
    );
    const { rows: bothLogs } = await client.query(
      `select teacher_id, amount from mileage_logs where session_id = $1 order by teacher_id`,
      [weekdaySession],
    );
    assert(bothLogs.length === 2, 'main+assist settled');
    assert(bothLogs.every((r) => Number(r.amount) === 2500), '2500 each');

    const { rows: mainRow } = await client.query(
      `select id, amount, reason from mileage_logs where session_id = $1 and teacher_id = $2`,
      [weekdaySession, teacherC],
    );
    const cancelMainKey = randomUUID().replace(/-/g, '') + 'op';
    await client.query(
      `select public.admin_cancel_mileage_log($1, $2, $3, $4, $5)`,
      [teacherC, mainRow[0].id, mainRow[0].amount, mainRow[0].reason, cancelMainKey],
    );
    const { rows: ptsB } = await client.query(`select points from users where id = $1`, [teacherD]);
    assert(Number(ptsB[0].points) === 2500, 'assist points unchanged after main cancel');
    const { rows: cnt } = await client.query(
      `select count(*)::int as c from mileage_logs where session_id = $1`,
      [weekdaySession],
    );
    assert(cnt[0].c === 1, 'one assist log remains');

    const reSaveKey = randomUUID().replace(/-/g, '') + 'qr';
    await client.query(
      `select public.admin_apply_session_linked_mileage($1, '수업 연기', '수업 연기', $2)`,
      [weekdaySession, reSaveKey],
    );
    const { rows: ptsAfter } = await client.query(
      `select id, points from users where id = any($1::uuid[]) order by id`,
      [[teacherC, teacherD]],
    );
    assert(Number(ptsAfter.find((r) => r.id === teacherD)?.points) === 2500, 'assist not double-paid on re-save');
    assert(
      (await client.query(`select count(*)::int as c from mileage_logs where session_id = $1`, [weekdaySession])).rows[0]
        .c === 2,
      'two logs after re-save',
    );

    const changeKey = randomUUID().replace(/-/g, '') + 'st';
    await client.query(
      `select public.admin_apply_session_linked_mileage($1, '보고 지연', '수업 연기', $2)`,
      [weekdaySession, changeKey],
    );
    const { rows: delayAmt } = await client.query(
      `select amount from mileage_logs where session_id = $1 and teacher_id = $2`,
      [weekdaySession, teacherC],
    );
    assert(Number(delayAmt[0].amount) === -2500, 'changed to report delay');

    const undoKey = randomUUID().replace(/-/g, '') + 'uv';
    await client.query(
      `select public.admin_apply_session_linked_mileage($1, '', '보고 지연', $2)`,
      [weekdaySession, undoKey],
    );
    assert(
      (await client.query(`select mileage_option from sessions where id = $1`, [weekdaySession])).rows[0].mileage_option ===
        '',
      'cleared after undo settle',
    );

    await client.query('SAVEPOINT dup_cancel_attempt');
    const dupKey = randomUUID().replace(/-/g, '') + 'wx';
    try {
      await client.query(
        `select public.admin_cancel_mileage_log($1, $2, $3, $4, $5)`,
        [teacherC, mainRow[0].id, mainRow[0].amount, mainRow[0].reason, dupKey],
      );
      assert(false, 'duplicate cancel should fail');
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT dup_cancel_attempt');
      const msg = error instanceof Error ? error.message : String(error);
      assert(msg.includes('MILEAGE_ALREADY_CANCELLED') || msg.includes('MILEAGE_LOG_STALE'), msg);
    }
  });

  await run('cancel holiday historical +2500 by actual amount', async () => {
    const orphanId = randomUUID();
    await client.query(
      `insert into mileage_logs (id, teacher_id, amount, reason, session_title, session_started_at)
       values ($1, $2, 2500, '[수업연동] 원복: 수업 연기', 'orphan', timestamptz '2026-10-02T15:00:00+00')`,
      [orphanId, teacherA],
    );
    await client.query(`update users set points = points + 2500 where id = $1`, [teacherA]);
    const key = randomUUID().replace(/-/g, '') + 'gh';
    await client.query(
      `select public.admin_cancel_mileage_log($1, $2, 2500, '[수업연동] 원복: 수업 연기', $3)`,
      [teacherA, orphanId, key],
    );
    const { rows } = await client.query(`select count(*)::int as c from mileage_logs where id = $1`, [orphanId]);
    assert(rows[0].c === 0, 'orphan cancelled');
  });

  await run('session settlement cancel all linked', async () => {
    const key = randomUUID().replace(/-/g, '') + 'ij';
    await client.query(`select public.admin_cancel_session_linked_settlement($1, '수업 연기', $2)`, [
      sessionId,
      key,
    ]);
    const { rows } = await client.query(
      `select count(*)::int as c from mileage_logs where session_id = $1`,
      [sessionId],
    );
    assert(rows[0].c === 0, 'all linked removed');
  });

  await run('idempotent cancel replay', async () => {
    const logId = randomUUID();
    const key = randomUUID().replace(/-/g, '') + 'kl';
    await client.query(
      `insert into mileage_logs (id, teacher_id, amount, reason, session_title)
       values ($1, $2, 1000, '운영진 수동', 't')`,
      [logId, teacherA],
    );
    await client.query(`update users set points = points + 1000 where id = $1`, [teacherA]);
    await client.query(
      `select public.admin_cancel_mileage_log($1, $2, 1000, '운영진 수동', $3)`,
      [teacherA, logId, key],
    );
    await client.query(
      `select public.admin_cancel_mileage_log($1, $2, 1000, '운영진 수동', $3)`,
      [teacherA, logId, key],
    );
    const { rows } = await client.query(
      `select count(*)::int as c from private.mileage_log_cancel_audits where original_log_id = $1`,
      [logId],
    );
    assert(rows[0].c === 1, 'single audit row');
  });

  const countBefore = await client.query(`select count(*)::int as c from session_count_logs`);
  await run('mileage cancel does not touch session_count_logs', async () => {
    const countAfter = await client.query(`select count(*)::int as c from session_count_logs`);
    assert(countAfter.rows[0].c === countBefore.rows[0].c, 'session count unchanged');
  });
} finally {
  await client.query('ROLLBACK');
}

await client.end();

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
