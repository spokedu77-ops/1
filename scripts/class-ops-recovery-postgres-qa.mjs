import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

// Deliberately does not load .env.local or accept a production DATABASE_URL.
const adminUrl = process.env.CLASS_OPS_LOCAL_PG_URL ?? 'postgresql://postgres:classops-local-qa@127.0.0.1:55432/postgres';
const parsedUrl = new URL(adminUrl);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsedUrl.hostname)) throw new Error('ISOLATED_LOCAL_DATABASE_REQUIRED');
const database = `classops_recovery_qa_${process.pid}`;
const url = new URL(adminUrl); url.pathname = '/' + database;
const admin = new pg.Client({ connectionString: adminUrl });
const client = new pg.Client({ connectionString: url.href });
const teachers = Array.from({ length: 12 }, () => randomUUID());
const results = []; const observedDefects = [];
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const snapshot = async () => (await client.query(`select jsonb_build_object(
  'sessions',(select coalesce(jsonb_agg(to_jsonb(s) order by id),'[]') from sessions s),
  'session_count_logs',(select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from session_count_logs l),
  'mileage_logs',(select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from mileage_logs l),
  'users.points',(select jsonb_agg(jsonb_build_object('id',id,'points',points) order by id) from users)) state`)).rows[0].state;
async function test(name, fn) { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.stack }); } }
async function unchangedFailure(fn, expected) {
  const before = await snapshot(); let error;
  try { await fn(); } catch (caught) { error = caught; }
  assert.ok(error, 'expected failure'); assert.match(error.message, expected);
  assert.deepEqual(await snapshot(), before, 'all four data areas must be unchanged');
}
const extras = (rows) => 'EXTRA_TEACHERS:' + JSON.stringify(rows);
async function fixture(weekdays = [0], options = {}) {
  const group = randomUUID(); const rows = [];
  for (let i = 0; i < (options.count ?? 4); i++) {
    const slot = i % weekdays.length; const day = weekdays[slot] + Math.floor(i / weekdays.length) * 7;
    const start = new Date(Date.UTC(2026, 10, 2 + day, 1 + slot)); const end = new Date(+start + (60 + slot * 30) * 60000);
    const assistants = options.noAssist ? [] : [{ id: teachers[slot * 3 + 1], price: slot ? 25000 : 0 }, { id: teachers[slot * 3 + 2], price: slot ? 0 : 12000 }];
    const memo = `일반 메모 ${i}  \nKEEP_META:{"round":${i},"text":"preserve ] ["}` + (assistants.length ? '\n' + extras(assistants) : '');
    const row = (await client.query(`insert into sessions(id,group_id,title,start_at,end_at,status,created_by,price,memo,round_index,round_total,sequence_number,round_display)
      values($1,$2,$3,$4,$5,'opened',$6,$7,$8,$9,$10,$9,$11) returning *`, [randomUUID(), group, '격리 QA 수업', start, end, teachers[slot * 3], 50000 + slot * 10000, memo, i + 1, options.count ?? 4, `${i + 1}/${options.count ?? 4}`])).rows[0];
    rows.push(row);
  }
  return { group, rows };
}
const rpc = async (row, mode = 'postpone', key = randomUUID(), connection = client) => (await connection.query('select public.admin_apply_class_postpone($1,$2,$3,$4) result', [row.id, mode, row.start_at, key])).rows[0].result;
const ghost = async (id) => (await client.query('select * from sessions where id=$1', [id])).rows[0];
const dispose = async (group) => { await client.query('delete from mileage_logs where session_id in(select id from sessions where group_id=$1)', [group]); await client.query('delete from session_count_logs where session_id in(select id from sessions where group_id=$1)', [group]); await client.query('delete from sessions where group_id=$1', [group]); };
await admin.connect();
try {
  await admin.query(`create database ${database}`); await client.connect();
  await client.query(`create schema private; create schema extensions;
    do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;
    create table users(id uuid primary key, points bigint not null default 100000);
    create table sessions(id uuid primary key default gen_random_uuid(), group_id uuid,title text not null,
      start_at timestamptz not null,end_at timestamptz not null,status text,created_by uuid references users(id),price integer,memo text,
      students_text text,mileage_option text,round_index integer,round_total integer,sequence_number integer,round_display text,session_type text,
      created_at timestamptz default now(),updated_at timestamptz default now(),short_code text,feedback_fields jsonb,completion_status jsonb,photo_url jsonb,file_url jsonb);
    create table session_count_logs(id uuid primary key default gen_random_uuid(), teacher_id uuid not null references users(id),session_id uuid,session_title text,count_change integer not null,reason text);
    create unique index session_count_logs_session_teacher_key on session_count_logs(session_id,teacher_id) where session_id is not null;
    create table mileage_logs(id uuid primary key default gen_random_uuid(),teacher_id uuid not null references users(id),session_id uuid,amount bigint,reason text,session_title text,session_started_at timestamptz);
    create table private.phase2_mileage_request_results(request_key text primary key,operation text,payload_hash text,result jsonb,created_at timestamptz default now());`);
  await client.query('insert into users(id) select unnest($1::uuid[])', [teachers]);
  const holidays = await read('supabase/migrations/20261023150000_mileage_holiday_and_admin_cancel.sql');
  await client.query(holidays.slice(0, holidays.indexOf('create or replace function public.admin_apply_session_linked_mileage')));
  await client.query("insert into kr_public_holiday_coverage(calendar_year,source_version) values(2026,'isolated fixture'); insert into kr_public_holidays values('2026-12-25','격리 공휴일 fixture','legal')");
  await client.query(await read('ops/class-ops-recovery/fixtures/production-linked-mileage.sql'));
  await client.query(await read('supabase/migrations/20261022210000_reconcile_completed_session_main_teacher_count.sql'));
  await client.query(await read('supabase/migrations/20261026163542_stage2a_sync_assistant_teacher_counts.sql'));
  await client.query(await read('supabase/migrations/20261026171825_stage2c_teacher_schedule_conflict_guard.sql'));
  await client.query(await read('ops/class-ops-recovery/fixtures/production-postpone.sql'));

  // Reproduce audited defects using the exact read-only production function capture.
  { const f = await fixture([0, 3]); const before = f.rows[0]; const result = await rpc(before); const moved = await ghost(before.id);
    observedDefects.push({ name: 'production RPC leaves source assistants on destination weekday', reproduced: moved.memo === before.memo && moved.created_by === teachers[3] });
    await dispose(f.group); }
  { const f = await fixture([0], { count: 1 }); await client.query("update sessions set status='finished' where id=$1", [f.rows[0].id]);
    const result = await rpc(f.rows[0]); observedDefects.push({ name: 'production RPC accepts finished session', reproduced: result.ok === true }); await dispose(f.group); }
  assert.ok(observedDefects.every((defect) => defect.reproduced));
  await client.query(await read('supabase/migrations/20261029171409_classops_assistant_postpone_recovery.sql'));

  for (const weekdays of [[0], [0, 3]]) await test(`postpone/undo ${weekdays.length} weekday(s): dates, main, both assistants/fees, exact memo and all four areas`, async () => {
    const f = await fixture(weekdays); const before = await snapshot(); const result = await rpc(f.rows[0]);
    for (let i = 0; i < f.rows.length; i++) {
      const moved = await ghost(f.rows[i].id); const destination = f.rows[i + 1] ?? f.rows[weekdays.length === 1 ? 3 : 2];
      assert.equal(moved.created_by, destination.created_by); assert.equal(moved.price, destination.price);
      const currentAssistants = (await client.query('select private.classops_read_assistants($1) assistants', [moved.memo])).rows[0].assistants;
      const destinationAssistants = (await client.query('select private.classops_read_assistants($1) assistants', [destination.memo])).rows[0].assistants;
      assert.deepEqual(currentAssistants, destinationAssistants); assert.ok(moved.memo.startsWith(f.rows[i].memo.split('\nEXTRA_TEACHERS:')[0]));
      assert.equal(moved.round_index, i + 1);
      const nextStart = i + 1 < f.rows.length ? f.rows[i + 1].start_at : new Date(+f.rows[i].start_at + (weekdays.length === 1 ? 7 : 4) * 86400000 - (weekdays.length === 1 ? 0 : 3600000));
      assert.equal(+moved.start_at, +nextStart);
    }
    assert.equal((await client.query('select count(*)::int n from mileage_logs where session_id=$1', [result.sessionId])).rows[0].n, 3);
    await rpc(await ghost(result.sessionId), 'undo'); assert.deepEqual(await snapshot(), before);
    await dispose(f.group);
  });
  await test('no-assistant ghost is safe with nested snapshot metadata', async () => { const f = await fixture([0], { noAssist: true, count: 1 }); const before = await snapshot(); const result = await rpc(f.rows[0]); await rpc(await ghost(result.sessionId), 'undo'); assert.deepEqual(await snapshot(), before); await dispose(f.group); });
  await test('three operational weekdays require review with no writes', async () => { const f = await fixture([0, 2, 4], { count: 3 }); await unchangedFailure(() => rpc(f.rows[0]), /POSTPONE_WEEKDAY_TEMPLATE_AMBIGUOUS/); await dispose(f.group); });
  for (const status of ['finished', 'verified']) await test(`${status}: direct and downstream postpone restrictions preserve counting`, async () => {
    const f = await fixture(); await client.query('update sessions set status=$2 where id=$1', [f.rows[1].id, status]);
    await unchangedFailure(() => rpc(f.rows[1]), /POSTPONE_INVALID_STATUS/); await unchangedFailure(() => rpc(f.rows[0]), /POSTPONE_SETTLED_SESSION_CONFLICT/); await dispose(f.group);
  });
  await test('manual/historical count logs abort the whole cascade without loss', async () => { const f = await fixture(); await client.query("insert into session_count_logs(teacher_id,session_id,session_title,count_change,reason) values($1,$2,'historical',2,'Stage 2B manual history')", [teachers[0], f.rows[2].id]); await unchangedFailure(() => rpc(f.rows[0]), /POSTPONE_SESSION_COUNT_MANUAL_CONFLICT/); await dispose(f.group); });
  await test('existing completed history before the shifted range is unchanged', async () => { const f = await fixture(); await client.query("update sessions set status='verified' where id=$1", [f.rows[0].id]); const before = await snapshot(); const result = await rpc(f.rows[1]); await rpc(await ghost(result.sessionId), 'undo'); assert.deepEqual(await snapshot(), before); await dispose(f.group); });
  await test('request deduction is -5000 for main+two assistants and fully reversed', async () => { const f = await fixture(); const before = await snapshot(); const result = await rpc(f.rows[0], 'postpone_request'); const logs = (await client.query('select amount from mileage_logs where session_id=$1', [result.sessionId])).rows; assert.deepEqual(logs.map((row) => Number(row.amount)), [-5000, -5000, -5000]); await rpc(await ghost(result.sessionId), 'undo'); assert.deepEqual(await snapshot(), before); await dispose(f.group); });
  await test('holiday postpone credit is 0P, no synthetic grant or reversal', async () => { const f = await fixture([0], { count: 1 }); await client.query("update sessions set start_at='2026-12-25T01:00Z',end_at='2026-12-25T02:00Z' where id=$1", [f.rows[0].id]); const row = await ghost(f.rows[0].id); const before = await snapshot(); const result = await rpc(row); const after = await snapshot(); assert.deepEqual(after['users.points'], before['users.points']); assert.deepEqual(after.mileage_logs, before.mileage_logs); await rpc(await ghost(result.sessionId), 'undo'); assert.deepEqual(await snapshot(), before); await dispose(f.group); });
  await test('same request replays exactly; changed payload cannot reuse request ID', async () => { const f = await fixture(); const key = randomUUID(); const result = await rpc(f.rows[0], 'postpone', key); const before = await snapshot(); const replay = await rpc(f.rows[0], 'postpone', key); assert.equal(replay.replayed, true); assert.equal(replay.sessionId, result.sessionId); assert.deepEqual(await snapshot(), before); await unchangedFailure(() => rpc(f.rows[0], 'postpone_request', key), /POSTPONE_IDEMPOTENCY_CONFLICT/); await unchangedFailure(() => rpc(f.rows[0]), /POSTPONE_STALE_SESSION/); await rpc(await ghost(result.sessionId), 'undo'); await dispose(f.group); });
  for (const patch of ["price=price+1", "memo=memo || E'\\n관리자 수정'", "created_by='" + teachers[10] + "'"]) await test(`undo after later edit (${patch.split('=')[0]}) is rejected atomically incl mileage reversal`, async () => { const f = await fixture(); const result = await rpc(f.rows[0]); await client.query(`update sessions set ${patch} where id=$1`, [f.rows[1].id]); const ghostRow = await ghost(result.sessionId); await unchangedFailure(() => rpc(ghostRow, 'undo'), /POSTPONE_RESTORE_STATE_CHANGED/); await dispose(f.group); });
  await test('legacy missing/old snapshot and historical mileage require review; no invented data', async () => {
    const f = await fixture([0], { count: 1 }); await client.query("update sessions set status='postponed' where id=$1", [f.rows[0].id]);
    await unchangedFailure(() => rpc(f.rows[0], 'undo'), /POSTPONE_SNAPSHOT_MISSING/);
    await client.query("update sessions set memo='POSTPONE_SNAPSHOT:[{}]' where id=$1", [f.rows[0].id]); await unchangedFailure(() => rpc(f.rows[0], 'undo'), /POSTPONE_SNAPSHOT_REVIEW_REQUIRED/);
    await client.query("insert into mileage_logs(teacher_id,session_id,amount,reason) values($1,$2,100,'역사 수동 마일리지')", [teachers[0], f.rows[0].id]); await unchangedFailure(() => rpc(f.rows[0], 'undo'), /POSTPONE_LEGACY_MILEAGE_REVIEW_REQUIRED/); await dispose(f.group);
  });
  await test('teacher collision on the final shifted slot rolls back all four areas', async () => {
    const f = await fixture(); const blockerGroup = randomUUID();
    await client.query("insert into sessions(id,group_id,title,status,created_by,start_at,end_at,price) values($1,$2,'충돌 fixture','opened',$3,$4,$5,0)", [randomUUID(), blockerGroup, teachers[1], new Date(+f.rows[3].start_at + 7 * 86400000), new Date(+f.rows[3].end_at + 7 * 86400000)]);
    await unchangedFailure(() => rpc(f.rows[0]), /TEACHER_SCHEDULE_CONFLICT/); await dispose(f.group); await dispose(blockerGroup);
  });
  for (const sameKey of [false, true]) await test(`two administrators serialize postpone (${sameKey ? 'same' : 'different'} request ID)`, async () => {
    const f = await fixture(); const other = new pg.Client({ connectionString: url.href }); await other.connect();
    try { const key = randomUUID(); await client.query('begin'); const first = await rpc(f.rows[0], 'postpone', key); let secondError; let second;
      const pending = rpc(f.rows[0], 'postpone', sameKey ? key : randomUUID(), other).then((result) => { second = result; }).catch((error) => { secondError = error; });
      await new Promise((resolve) => setTimeout(resolve, 100)); await client.query('commit'); const before = await snapshot(); await pending;
      assert.deepEqual(await snapshot(), before); if (sameKey) assert.equal(second?.replayed, true); else assert.match(secondError?.message ?? '', /POSTPONE_STALE_SESSION/);
      await rpc(await ghost(first.sessionId), 'undo');
    } finally { await client.query('rollback'); await other.end(); await dispose(f.group); }
  });
  await test('assistant additions/deletion and zero fees survive reads, counts and byte-exact snapshot metadata', async () => {
    const f = await fixture([0], { count: 1, noAssist: true }); const row = f.rows[0];
    const suffix = '\nPOSTPONE_SNAPSHOT:[{"oldMemo":"KEEP_META:{}"}]\nTAIL:preserve all bytes  ';
    await client.query('update sessions set memo=memo || $2,status=\'verified\' where id=$1', [row.id, suffix]);
    for (const assistants of [[{ id: teachers[1], price: 0 }], [{ id: teachers[1], price: 0 }, { id: teachers[2], price: 33000 }], [{ id: teachers[1], price: 0 }, { id: teachers[3], price: 45000 }], [{ id: teachers[3], price: 45000 }]]) {
      const before = await ghost(row.id); await client.query('update sessions set memo=private.classops_replace_assistants(memo,$2) where id=$1 and memo is not distinct from $3 returning *', [row.id, JSON.stringify(assistants), before.memo]);
      const stored = await ghost(row.id); assert.ok(stored.memo.includes(suffix)); assert.deepEqual((await client.query('select private.classops_read_assistants(memo) rows from sessions where id=$1', [row.id])).rows[0].rows, assistants);
      const logs = (await client.query('select teacher_id from session_count_logs where session_id=$1 order by teacher_id', [row.id])).rows.map((log) => log.teacher_id); assert.deepEqual(logs, [row.created_by, ...assistants.map((assistant) => assistant.id)].sort());
    }
    await dispose(f.group);
  });
  await test('CAS assistant save: two administrators cannot overwrite each other', async () => {
    const f = await fixture([0], { count: 1 }); const original = f.rows[0]; const other = new pg.Client({ connectionString: url.href }); await other.connect();
    try { await client.query('begin'); await client.query('update sessions set memo=$2 where id=$1 and memo is not distinct from $3', [original.id, extras([{ id: teachers[6], price: 0 }]), original.memo]);
      const pending = other.query('update sessions set memo=$2 where id=$1 and memo is not distinct from $3 returning *', [original.id, extras([{ id: teachers[7], price: 20000 }]), original.memo]);
      await new Promise((resolve) => setTimeout(resolve, 100)); await client.query('commit'); const before = await snapshot(); const second = await pending; assert.equal(second.rowCount, 0); assert.deepEqual(await snapshot(), before);
    } finally { await client.query('rollback'); await other.end(); await dispose(f.group); }
  });
  await test('RLS silent no-op and denied permissions preserve all four areas', async () => {
    const f = await fixture([0], { count: 1 }); await client.query('alter table sessions enable row level security; grant select,update on sessions to authenticated; create policy qa_select on sessions for select to authenticated using(true)');
    const before = await snapshot(); await client.query('set role authenticated'); const result = await client.query('update sessions set price=100 where id=$1 returning id', [f.rows[0].id]); assert.equal(result.rowCount, 0); await client.query('reset role'); assert.deepEqual(await snapshot(), before);
    await client.query('revoke update on sessions from authenticated'); await client.query('set role authenticated'); await assert.rejects(() => client.query('update sessions set price=100 where id=$1', [f.rows[0].id]), /permission denied/); await client.query('reset role'); assert.deepEqual(await snapshot(), before); await client.query('alter table sessions disable row level security'); await dispose(f.group);
  });
  await test('RPC privileges remain service-only; private helpers are not public APIs', async () => {
    const row = (await client.query(`select has_function_privilege('anon','public.admin_apply_class_postpone(uuid,text,timestamptz,uuid)','execute') anon,has_function_privilege('authenticated','public.admin_apply_class_postpone(uuid,text,timestamptz,uuid)','execute') authenticated,has_function_privilege('service_role','public.admin_apply_class_postpone(uuid,text,timestamptz,uuid)','execute') service,has_function_privilege('public','private.classops_replace_assistants(text,jsonb)','execute') helper_public`)).rows[0]; assert.deepEqual(row, { anon: false, authenticated: false, service: true, helper_public: false });
  });
  await test('settlement failure after partial log/points writes rolls back the entire cascade', async () => {
    const f = await fixture();
    await client.query(`create function private.qa_fail_last_mileage() returns trigger language plpgsql as $$ begin if new.teacher_id='${teachers[2]}'::uuid then raise exception 'QA_SETTLEMENT_FAILURE'; end if; return new; end $$; create trigger qa_mileage_failure before insert on mileage_logs for each row execute function private.qa_fail_last_mileage()`);
    try { await unchangedFailure(() => rpc(f.rows[0]), /QA_SETTLEMENT_FAILURE/); }
    finally { await client.query('drop trigger qa_mileage_failure on mileage_logs; drop function private.qa_fail_last_mileage()'); await dispose(f.group); }
  });
  await test('restore schedule conflict rolls back prior mileage reversal', async () => {
    const f = await fixture(); const result = await rpc(f.rows[0]); const blockerGroup = randomUUID();
    await client.query("insert into sessions(id,group_id,title,status,created_by,start_at,end_at,price) values($1,$2,'복구 충돌 fixture','opened',$3,$4,$5,0)", [randomUUID(), blockerGroup, teachers[0], f.rows[0].start_at, f.rows[0].end_at]);
    await unchangedFailure(async () => rpc(await ghost(result.sessionId), 'undo'), /TEACHER_SCHEDULE_CONFLICT/); await dispose(f.group); await dispose(blockerGroup);
  });
  const expected = (row) => Object.fromEntries(['start_at', 'end_at', 'created_by', 'memo', 'price', 'status'].map((key) => [key, row[key] ?? null]));
  await test('bulk CAS detects one stale row before any updates', async () => {
    const f = await fixture(); const changes = f.rows.map((row) => ({ id: row.id, price: 12345, expected: expected(row) }));
    await client.query('update sessions set memo=memo || $2 where id=$1', [f.rows[2].id, '\n다른 관리자 수정']);
    await unchangedFailure(() => client.query('select admin_apply_session_checked_changes($1)', [JSON.stringify(changes)]), /SESSION_UPDATE_STALE/); await dispose(f.group);
  });
  await test('checked bulk delegates Stage 2C and rolls back earlier successful changes', async () => {
    const f = await fixture(); const sorted = [...f.rows].sort((a, b) => a.id.localeCompare(b.id)); const first = sorted[0], last = sorted.at(-1);
    const changes = [{ id: first.id, price: 12345, expected: expected(first) }, { id: last.id, start_at: first.start_at, end_at: first.end_at, expected: expected(last) }];
    await unchangedFailure(() => client.query('select admin_apply_session_checked_changes($1)', [JSON.stringify(changes)]), /TEACHER_SCHEDULE_CONFLICT/); await dispose(f.group);
  });
  await test('checked bulk succeeds with actual stored zero and service-only privileges', async () => {
    const f = await fixture(); const changes = f.rows.map((row) => ({ id: row.id, price: 0, expected: expected(row) }));
    assert.equal((await client.query('select admin_apply_session_checked_changes($1) n', [JSON.stringify(changes)])).rows[0].n, f.rows.length);
    for (const row of f.rows) assert.equal((await ghost(row.id)).price, 0);
    const privileges = (await client.query("select has_function_privilege('anon','public.admin_apply_session_checked_changes(jsonb)','execute') anon,has_function_privilege('authenticated','public.admin_apply_session_checked_changes(jsonb)','execute') authenticated,has_function_privilege('service_role','public.admin_apply_session_checked_changes(jsonb)','execute') service")).rows[0]; assert.deepEqual(privileges, { anon: false, authenticated: false, service: true }); await dispose(f.group);
  });
} finally {
  await client.end().catch(() => {}); await admin.query('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()', [database]); await admin.query(`drop database if exists ${database}`); await admin.end();
  const report = { isolatedDatabase: database, productionMutation: 'NONE', observedDefects, passed: results.every((result) => result.pass), results };
  await mkdir('.tmp/class-ops-recovery-qa', { recursive: true }); await writeFile('.tmp/class-ops-recovery-qa/postgres-results.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exitCode = 1;
}
