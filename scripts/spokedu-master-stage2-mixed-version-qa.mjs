import { readFile } from 'node:fs/promises';
import pg from 'pg';

const adminUrl = process.env.STAGE2_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const database = `spokedu_stage2_transition_${process.pid}`;
const owner = '10000000-0000-4000-8000-000000000011';
const classId = '20000000-0000-4000-8000-000000000011';
const studentA = '30000000-0000-4000-8000-000000000011';
const studentB = '30000000-0000-4000-8000-000000000012';
const sessionId = '40000000-0000-4000-8000-000000000011';
const results = [];
const record = (name, pass, evidence) => results.push({ name, pass, evidence });

async function asService(client, sql, params = []) {
  await client.query('begin');
  try {
    await client.query('set local role service_role');
    const result = await client.query(sql, params);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function deniedAsService(client, sql, params = []) {
  try {
    await asService(client, sql, params);
    return false;
  } catch (error) {
    return error?.code === '42501';
  }
}

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
try {
  await admin.query(`create database ${database}`);
  const dbUrl = adminUrl.replace(/\/postgres$/, `/${database}`);
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  try {
    await db.query(`
      create table public.spokedu_master_classes(id uuid primary key,owner_id uuid not null,name text not null,deleted_at timestamptz);
      create table public.spokedu_master_students(id uuid primary key,owner_id uuid not null,name text not null,deleted_at timestamptz);
      create table public.spokedu_master_class_students(owner_id uuid not null,class_id uuid not null,student_id uuid not null,primary key(class_id,student_id));
      create table public.spokedu_master_sessions(
        id uuid primary key,owner_id uuid not null,class_id uuid not null,class_name_snapshot text not null,
        start_at timestamptz not null,end_at timestamptz not null,status text not null,memo text,
        started_at timestamptz,completed_at timestamptz,roster_locked_at timestamptz,deleted_at timestamptz,updated_at timestamptz default now()
      );
      create table public.spokedu_master_session_attendance(
        id uuid primary key default gen_random_uuid(),owner_id uuid not null,session_id uuid not null,student_id uuid not null,
        student_name_snapshot text not null,status text not null,unique(session_id,student_id)
      );
      create table public.spokedu_master_session_programs(id uuid primary key default gen_random_uuid());
      create table public.spokedu_master_class_records(
        id uuid primary key default gen_random_uuid(),owner_id uuid not null,legacy_id text,class_date date not null,
        lesson_title text,class_id text,program_id bigint,program_title text,record_type text,memo text,application_idea text,
        parent_note_snapshot text,created_at timestamptz default now(),updated_at timestamptz default now(),deleted_at timestamptz
      );
      create table public.spokedu_master_class_record_students(
        id uuid primary key default gen_random_uuid(),owner_id uuid not null,record_id uuid not null,student_id uuid,
        student_legacy_id text,student_name_snapshot text not null,attendance text not null,focused boolean not null,
        skills text[] not null,memo text,observation_score integer,created_at timestamptz default now(),updated_at timestamptz default now()
      );
      create or replace function public.spokedu_master_class_integrity_lock(uuid,uuid) returns void language sql as $$ select $$;

      create or replace function public.spokedu_master_save_session(
        p_owner_id uuid,p_session_id uuid,p_class_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_status text,p_memo text,p_programs jsonb,p_attendance jsonb
      ) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
      begin
        update public.spokedu_master_sessions set class_id=p_class_id,start_at=p_start_at,end_at=p_end_at,status=p_status,memo=nullif(btrim(p_memo),''),updated_at=now()
        where id=p_session_id and owner_id=p_owner_id and deleted_at is null;
        if not found then raise exception using errcode='P0002',message='session not found'; end if;
        return p_session_id;
      end $$;
      create or replace function public.spokedu_master_replace_session_attendance(p_owner_id uuid,p_session_id uuid,p_attendance jsonb)
      returns void language plpgsql security definer set search_path=pg_catalog,public as $$
      begin
        delete from public.spokedu_master_session_attendance where owner_id=p_owner_id and session_id=p_session_id;
        insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,student_name_snapshot,status)
        select p_owner_id,p_session_id,s.id,s.name,item->>'status' from jsonb_array_elements(p_attendance) item
        join public.spokedu_master_students s on s.id=(item->>'studentId')::uuid and s.owner_id=p_owner_id;
      end $$;
      create or replace function public.spokedu_master_complete_session(
        p_owner_id uuid,p_session_id uuid,p_class_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_memo text,p_attendance jsonb
      ) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
      begin
        perform public.spokedu_master_replace_session_attendance(p_owner_id,p_session_id,p_attendance);
        update public.spokedu_master_sessions set status='completed',memo=nullif(btrim(p_memo),''),completed_at=now(),updated_at=now()
        where id=p_session_id and owner_id=p_owner_id and deleted_at is null;
        if not found then raise exception using errcode='P0002',message='session not found'; end if;
        return p_session_id;
      end $$;

      revoke all on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) from public,anon,authenticated;
      revoke all on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) from public,anon,authenticated;
      revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
      grant execute on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) to service_role;
      grant execute on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) to service_role;
      grant execute on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
    `);

    const legacyCapture = await readFile(new URL('../supabase/migrations/20260827120000_spokedu_master_session_capture.sql', import.meta.url), 'utf8');
    const captureV2 = await readFile(new URL('../supabase/migrations/20261025152845_harden_spokedu_master_session_capture_concurrency.sql', import.meta.url), 'utf8');
    const expand = await readFile(new URL('../supabase/migrations/20261026115102_stage2_session_writes_expand.sql', import.meta.url), 'utf8');
    const contract = await readFile(new URL('../supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql', import.meta.url), 'utf8');
    await db.query(legacyCapture);
    await db.query(captureV2);

    await db.query(`insert into public.spokedu_master_classes values ($1,$2,'Transition Class',null)`, [classId, owner]);
    await db.query(`insert into public.spokedu_master_students values ($1,$3,'Student A',null),($2,$3,'Student B',null)`, [studentA, studentB, owner]);
    await db.query(`insert into public.spokedu_master_class_students values ($1,$2,$3),($1,$2,$4)`, [owner, classId, studentA, studentB]);
    await db.query(`insert into public.spokedu_master_sessions(id,owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,started_at) values ($1,$2,$3,'Transition Class',now(),now()+interval '1 hour','scheduled','before-expand',now())`, [sessionId, owner, classId]);

    await asService(db, `select public.spokedu_master_save_session($1,$2,$3,now(),now()+interval '1 hour','scheduled','old-api-old-db','[]'::jsonb,'[]'::jsonb)`, [owner, sessionId, classId]);
    const oldDbMemo = await db.query(`select memo from public.spokedu_master_sessions where id=$1`, [sessionId]);
    record('old API + old DB', oldDbMemo.rows[0].memo === 'old-api-old-db', oldDbMemo.rows[0]);

    await db.query(expand);
    const preserved = await db.query(`select memo,memo_version,attendance_version from public.spokedu_master_sessions where id=$1`, [sessionId]);
    await asService(db, `select public.spokedu_master_save_session($1,$2,$3,now(),now()+interval '1 hour','scheduled','old-api-expand-db','[]'::jsonb,'[]'::jsonb)`, [owner, sessionId, classId]);
    const afterOldExpand = await db.query(`select memo,memo_version,attendance_version from public.spokedu_master_sessions where id=$1`, [sessionId]);
    record('old API + expand DB', preserved.rows[0].memo === 'old-api-old-db' && afterOldExpand.rows[0].memo === 'old-api-expand-db'
      && afterOldExpand.rows[0].memo_version === '1' && afterOldExpand.rows[0].attendance_version === '1', { before: preserved.rows[0], after: afterOldExpand.rows[0] });

    await asService(db, `select public.spokedu_master_save_session_v2($1,$2,1,$3,now(),now()+interval '1 hour','scheduled','new-api-expand-db')`, [owner, sessionId, classId]);
    const newDbMemo = await db.query(`select memo,memo_version from public.spokedu_master_sessions where id=$1`, [sessionId]);
    record('new API + expand DB', newDbMemo.rows[0].memo === 'new-api-expand-db' && newDbMemo.rows[0].memo_version === '2', newDbMemo.rows[0]);

    await asService(db, `select public.spokedu_master_update_session_attendance_v2($1,$2,1,$3::jsonb)`, [owner, sessionId, JSON.stringify([{ studentId: studentA, status: 'present' }])]);
    await asService(db, `select public.spokedu_master_replace_session_attendance($1,$2,$3::jsonb)`, [owner, sessionId, JSON.stringify([{ studentId: studentB, status: 'absent' }])]);
    const mixedRows = await db.query(`select student_id,status from public.spokedu_master_session_attendance where session_id=$1 order by student_id`, [sessionId]);
    const mixedVersion = await db.query(`select attendance_version from public.spokedu_master_sessions where id=$1`, [sessionId]);
    record('mixed version overwrite risk reproduced', mixedRows.rowCount === 1 && mixedRows.rows[0].student_id === studentB && mixedVersion.rows[0].attendance_version === '2', { rows: mixedRows.rows, version: mixedVersion.rows[0] });

    await asService(db, `select public.spokedu_master_save_session_capture($1,$2,'legacy',$3::jsonb)`, [owner, sessionId, JSON.stringify([{ student_id: studentA, memo: 'A legacy' }])]);
    await asService(db, `select public.spokedu_master_save_session_capture_v2($1,$2,1,'v2',$3::jsonb)`, [owner, sessionId, JSON.stringify([{ student_id: studentA, memo: 'A v2' }])]);
    await asService(db, `select public.spokedu_master_save_session_capture($1,$2,'legacy overwrite',$3::jsonb)`, [owner, sessionId, JSON.stringify([{ student_id: studentB, memo: 'B legacy' }])]);
    const captureState = await db.query(`select r.capture_version,c.student_id,c.memo from public.spokedu_master_class_records r join public.spokedu_master_class_record_students c on c.record_id=r.id where r.session_id=$1`, [sessionId]);
    record('legacy capture bypass reproduced', captureState.rowCount === 1 && captureState.rows[0].student_id === studentB && captureState.rows[0].capture_version === '2', captureState.rows);

    const blocker = new pg.Client({ connectionString: dbUrl });
    const gateOperator = new pg.Client({ connectionString: dbUrl });
    await Promise.all([blocker.connect(), gateOperator.connect()]);
    let gateWaitObserved = false;
    let legacyGateCode = null;
    let v2GateCode = null;
    try {
      await blocker.query('begin');
      await blocker.query(`update public.spokedu_master_sessions set memo='in-flight-before-gate' where id=$1`, [sessionId]);
      const enableGate = (async () => {
        await gateOperator.query('begin');
        await gateOperator.query('select pg_advisory_xact_lock(742021,2)');
        await gateOperator.query(`update public.spokedu_master_stage2_write_gate set blocked=true,reason='qa',updated_at=now() where singleton`);
        await gateOperator.query('commit');
      })();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const waiting = await db.query(`select count(*)::int count from pg_locks where locktype='advisory' and classid=742021 and objid=2 and mode='ExclusiveLock' and not granted`);
      gateWaitObserved = waiting.rows[0].count === 1;
      await blocker.query('commit');
      await enableGate;
      try {
        await asService(db, `select public.spokedu_master_save_session($1,$2,$3,now(),now()+interval '1 hour','scheduled','legacy-during-gate','[]'::jsonb,'[]'::jsonb)`, [owner, sessionId, classId]);
      } catch (error) { legacyGateCode = error?.code ?? null; }
      try {
        await asService(db, `select public.spokedu_master_save_session_v2($1,$2,$3,$4,now(),now()+interval '1 hour','scheduled','v2-during-gate')`, [owner, sessionId, 2, classId]);
      } catch (error) { v2GateCode = error?.code ?? null; }
      await db.query(`begin; select pg_advisory_xact_lock(742021,2); update public.spokedu_master_stage2_write_gate set blocked=false,reason=null,updated_at=now() where singleton; commit`);
    } finally {
      await blocker.query('rollback').catch(() => {});
      await gateOperator.query('rollback').catch(() => {});
      await Promise.all([blocker.end(), gateOperator.end()]);
    }
    const afterGate = await db.query(`select memo from public.spokedu_master_sessions where id=$1`, [sessionId]);
    record('write gate drains and blocks old/new writes', gateWaitObserved && legacyGateCode === '55P03' && v2GateCode === '55P03' && afterGate.rows[0].memo === 'in-flight-before-gate', {
      gateWaitObserved, legacyGateCode, v2GateCode, memo: afterGate.rows[0].memo,
    });

    const permissionRows = await db.query(`
      select p.proname,r.rolname,case when r.rolname='PUBLIC' then exists (
        select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        where acl.grantee=0 and acl.privilege_type='EXECUTE'
      ) else has_function_privilege(r.rolname,p.oid,'execute') end can_execute,
        pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join (values ('PUBLIC'),('anon'),('authenticated'),('service_role')) r(rolname)
      where n.nspname='public' and p.proname in (
        'spokedu_master_update_session_attendance_v2','spokedu_master_save_session_v2','spokedu_master_complete_session_v2',
        'spokedu_master_replace_session_attendance','spokedu_master_save_session','spokedu_master_complete_session','spokedu_master_save_session_capture'
      )
      order by p.proname,r.rolname
    `);
    record('expand legacy/v2 privileges and security attributes', permissionRows.rows.every((row) => row.owner === 'postgres' && row.prosecdef === true
      && row.proconfig?.some((value) => value === 'search_path=pg_catalog, public')
      && row.can_execute === (row.rolname === 'service_role')), permissionRows.rows);

    await db.query(contract);
    const latestVersion = await db.query(`select memo_version from public.spokedu_master_sessions where id=$1`, [sessionId]);
    await asService(db, `select public.spokedu_master_save_session_v2($1,$2,$3,$4,now(),now()+interval '1 hour','scheduled','new-api-contract-db')`, [owner, sessionId, latestVersion.rows[0].memo_version, classId]);
    const afterContract = await db.query(`select memo from public.spokedu_master_sessions where id=$1`, [sessionId]);
    record('new API + contract DB', afterContract.rows[0].memo === 'new-api-contract-db', afterContract.rows[0]);

    const denied = {
      attendance: await deniedAsService(db, `select public.spokedu_master_replace_session_attendance($1,$2,'[]'::jsonb)`, [owner, sessionId]),
      session: await deniedAsService(db, `select public.spokedu_master_save_session($1,$2,$3,now(),now()+interval '1 hour','scheduled','denied','[]'::jsonb,'[]'::jsonb)`, [owner, sessionId, classId]),
      completion: await deniedAsService(db, `select public.spokedu_master_complete_session($1,$2,$3,now(),now()+interval '1 hour','denied','[]'::jsonb)`, [owner, sessionId, classId]),
      capture: await deniedAsService(db, `select public.spokedu_master_save_session_capture($1,$2,'denied','[]'::jsonb)`, [owner, sessionId]),
    };
    const contractPrivileges = await db.query(`
      select p.proname,r.rolname,case when r.rolname='PUBLIC' then exists (
        select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        where acl.grantee=0 and acl.privilege_type='EXECUTE'
      ) else has_function_privilege(r.rolname,p.oid,'execute') end can_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      cross join (values ('PUBLIC'),('anon'),('authenticated'),('service_role')) r(rolname)
      where n.nspname='public' and p.proname in (
        'spokedu_master_replace_session_attendance','spokedu_master_save_session','spokedu_master_complete_session','spokedu_master_save_session_capture'
      ) order by p.proname,r.rolname
    `);
    record('old API + contract DB safely denied', Object.values(denied).every(Boolean)
      && contractPrivileges.rows.every((row) => row.can_execute === false), { actualCalls: denied, privileges: contractPrivileges.rows });
  } finally {
    await db.end();
  }

  console.log(JSON.stringify({ database, passed: results.every((item) => item.pass), results }, null, 2));
  if (results.some((item) => !item.pass)) process.exitCode = 1;
} finally {
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()`, [database]);
  await admin.query(`drop database if exists ${database}`);
  await admin.end();
}
