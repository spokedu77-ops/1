import { readFile } from 'node:fs/promises';
import pg from 'pg';

const adminUrl = process.env.STAGE2_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const database = `spokedu_stage2_qa_${process.pid}`;
const ownerA = '10000000-0000-4000-8000-000000000001';
const ownerB = '10000000-0000-4000-8000-000000000002';
const classA = '20000000-0000-4000-8000-000000000001';
const studentA = '30000000-0000-4000-8000-000000000001';
const studentB = '30000000-0000-4000-8000-000000000002';
const sessionA = '40000000-0000-4000-8000-000000000001';

const admin = new pg.Client({ connectionString: adminUrl });
const results = [];
const record = (name, pass, evidence) => results.push({ name, pass, evidence });

async function expectConflict(client, sql, params) {
  try { await client.query(sql, params); return false; }
  catch (error) { return error?.code === 'PT409'; }
}

await admin.connect();
try {
  await admin.query(`create database ${database}`);
  const dbUrl = adminUrl.replace(/\/postgres$/, `/${database}`);
  const setup = new pg.Client({ connectionString: dbUrl });
  await setup.connect();
  try {
    await setup.query(`
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
      create table public.spokedu_master_class_records(id uuid primary key default gen_random_uuid());
      create table public.spokedu_master_class_record_students(id uuid primary key default gen_random_uuid());
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
      create or replace function public.spokedu_master_complete_session(
        p_owner_id uuid,p_session_id uuid,p_class_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_memo text,p_attendance jsonb
      ) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
      begin
        update public.spokedu_master_sessions set status='completed',memo=nullif(btrim(p_memo),''),completed_at=now(),updated_at=now()
        where id=p_session_id and owner_id=p_owner_id and deleted_at is null;
        if not found then raise exception using errcode='P0002',message='session not found'; end if;
        delete from public.spokedu_master_session_attendance where owner_id=p_owner_id and session_id=p_session_id;
        insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,student_name_snapshot,status)
        select p_owner_id,p_session_id,s.id,s.name,item->>'status' from jsonb_array_elements(p_attendance) item
        join public.spokedu_master_students s on s.id=(item->>'studentId')::uuid and s.owner_id=p_owner_id;
        return p_session_id;
      end $$;
      create or replace function public.spokedu_master_replace_session_attendance(p_owner_id uuid,p_session_id uuid,p_attendance jsonb)
      returns void language sql security definer set search_path=pg_catalog,public as $$ select $$;
      create or replace function public.spokedu_master_save_session_capture(p_owner_id uuid,p_session_id uuid,p_next_session_note text,p_students jsonb)
      returns uuid language sql security definer set search_path=pg_catalog,public as $$ select p_session_id $$;
      revoke all on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) from public,anon,authenticated;
      revoke all on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) from public,anon,authenticated;
      revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
      revoke all on function public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb) from public,anon,authenticated;
      grant execute on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) to service_role;
      grant execute on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) to service_role;
      grant execute on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
      grant execute on function public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb) to service_role;
    `);
    const migration = await readFile(new URL('../supabase/migrations/20261026115102_stage2_session_writes_expand.sql', import.meta.url), 'utf8');
    const hotfix = await readFile(new URL('../supabase/migrations/20261027160642_stage2_p0_conflict_http_409.sql', import.meta.url), 'utf8');
    const contract = await readFile(new URL('../supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql', import.meta.url), 'utf8');
    await setup.query(migration);
    await setup.query(hotfix);
    await setup.query(`insert into public.spokedu_master_classes values ($1,$2,'QA Class',null)`, [classA, ownerA]);
    await setup.query(`insert into public.spokedu_master_students values ($1,$3,'Student A',null),($2,$3,'Student B',null)`, [studentA, studentB, ownerA]);
    await setup.query(`insert into public.spokedu_master_class_students values ($1,$2,$3),($1,$2,$4)`, [ownerA, classA, studentA, studentB]);
    await setup.query(`insert into public.spokedu_master_sessions(id,owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,started_at) values ($1,$2,$3,'QA Class',now(),now()+interval '1 hour','scheduled','base',now())`, [sessionA, ownerA, classA]);

    const a = new pg.Client({ connectionString: dbUrl });
    const b = new pg.Client({ connectionString: dbUrl });
    await Promise.all([a.connect(), b.connect()]);
    try {
      const first = await a.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,1,$3::jsonb) version`, [ownerA, sessionA, JSON.stringify([{ studentId: studentA, status: 'present' }])]);
      const staleDifferentStudent = await expectConflict(b, `select public.spokedu_master_update_session_attendance_v2($1,$2,1,$3::jsonb)`, [ownerA, sessionA, JSON.stringify([{ studentId: studentB, status: 'absent' }])]);
      const second = await b.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,2,$3::jsonb) version`, [ownerA, sessionA, JSON.stringify([{ studentId: studentB, status: 'absent' }])]);
      const attendanceRows = await setup.query(`select student_id,status from public.spokedu_master_session_attendance where session_id=$1 order by student_id`, [sessionA]);
      record('different-student edits', staleDifferentStudent && first.rows[0].version === '2' && second.rows[0].version === '3' && attendanceRows.rowCount === 2, attendanceRows.rows);

      const sameStudent = await Promise.allSettled([
        a.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,3,$3::jsonb)`, [ownerA, sessionA, JSON.stringify([{ studentId: studentA, status: 'absent' }])]),
        b.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,3,$3::jsonb)`, [ownerA, sessionA, JSON.stringify([{ studentId: studentA, status: 'present' }])]),
      ]);
      record('same-student concurrent edit', sameStudent.filter((item) => item.status === 'fulfilled').length === 1 && sameStudent.some((item) => item.status === 'rejected' && item.reason?.code === 'PT409'), sameStudent.map((item) => item.status));

      const beforeInvalid = await setup.query(`select attendance_version from public.spokedu_master_sessions where id=$1`, [sessionA]);
      let invalidRolledBack = false;
      try {
        await a.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,$3,$4::jsonb)`, [ownerA, sessionA, beforeInvalid.rows[0].attendance_version, JSON.stringify([{ studentId: studentA, status: 'present' }, { studentId: '30000000-0000-4000-8000-999999999999', status: 'present' }])]);
      } catch {}
      const afterInvalid = await setup.query(`select attendance_version from public.spokedu_master_sessions where id=$1`, [sessionA]);
      invalidRolledBack = beforeInvalid.rows[0].attendance_version === afterInvalid.rows[0].attendance_version;
      record('transaction rollback', invalidRolledBack, { before: beforeInvalid.rows[0], after: afterInvalid.rows[0] });

      await a.query(`select public.spokedu_master_save_session_v2($1,$2,1,$3,now(),now()+interval '1 hour','scheduled','memo-a')`, [ownerA, sessionA, classA]);
      const staleMemo = await expectConflict(b, `select public.spokedu_master_save_session_v2($1,$2,1,$3,now(),now()+interval '1 hour','scheduled','memo-b')`, [ownerA, sessionA, classA]);
      const memo = await setup.query(`select memo,memo_version from public.spokedu_master_sessions where id=$1`, [sessionA]);
      record('stale memo conflict', staleMemo && memo.rows[0].memo === 'memo-a' && memo.rows[0].memo_version === '2', memo.rows[0]);

      const versionsBeforeComplete = await setup.query(`select memo_version,attendance_version from public.spokedu_master_sessions where id=$1`, [sessionA]);
      const completionRace = await Promise.allSettled([
        a.query(`select public.spokedu_master_complete_session_v2($1,$2,$3,$4,$5,now(),now()+interval '1 hour','complete-memo',$6::jsonb)`, [ownerA, sessionA, versionsBeforeComplete.rows[0].memo_version, versionsBeforeComplete.rows[0].attendance_version, classA, JSON.stringify([{ studentId: studentA, status: 'present' }, { studentId: studentB, status: 'absent' }])]),
        b.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,$3,$4::jsonb)`, [ownerA, sessionA, versionsBeforeComplete.rows[0].attendance_version, JSON.stringify([{ studentId: studentB, status: 'present' }])]),
      ]);
      record('completion versus attendance', completionRace.filter((item) => item.status === 'fulfilled').length === 1 && completionRace.some((item) => item.status === 'rejected' && item.reason?.code === 'PT409'), completionRace.map((item) => item.status));

      const retryVersion = await setup.query(`select attendance_version from public.spokedu_master_sessions where id=$1`, [sessionA]);
      await a.query(`select public.spokedu_master_update_session_attendance_v2($1,$2,$3,$4::jsonb)`, [ownerA, sessionA, retryVersion.rows[0].attendance_version, JSON.stringify([{ studentId: studentA, status: 'present' }])]);
      const retryRejected = await expectConflict(a, `select public.spokedu_master_update_session_attendance_v2($1,$2,$3,$4::jsonb)`, [ownerA, sessionA, retryVersion.rows[0].attendance_version, JSON.stringify([{ studentId: studentA, status: 'present' }])]);
      const retryRows = await setup.query(`select count(*)::int count from public.spokedu_master_session_attendance where session_id=$1 and student_id=$2`, [sessionA, studentA]);
      record('network retry has no duplicate side effect', retryRejected && retryRows.rows[0].count === 1, retryRows.rows[0]);

      await setup.query(`update public.spokedu_master_students set name='Renamed Student',deleted_at=now() where id=$1 and owner_id=$2`, [studentA, ownerA]);
      const snapshot = await setup.query(`select student_name_snapshot from public.spokedu_master_session_attendance where session_id=$1 and student_id=$2`, [sessionA, studentA]);
      record('historical attendance snapshot preserved', snapshot.rows[0]?.student_name_snapshot === 'Student A', snapshot.rows[0]);

      const crossOwner = await expectConflict(a, `select public.spokedu_master_save_session_v2($1,$2,2,$3,now(),now()+interval '1 hour','scheduled','intrude')`, [ownerB, sessionA, classA]);
      record('cross-owner denied', !crossOwner && await a.query(`select count(*)::int count from public.spokedu_master_sessions where id=$1 and owner_id=$2 and memo='intrude'`, [sessionA, ownerA]).then((r) => r.rows[0].count === 0), 'owner-scoped row not found');

      await setup.query(contract);
      const privilege = await setup.query(`
        select
          has_function_privilege('service_role','public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb)','execute') old_attendance,
          has_function_privilege('service_role','public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb)','execute') old_session,
          has_function_privilege('service_role','public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)','execute') old_complete,
          has_function_privilege('service_role','public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb)','execute') new_attendance
      `);
      const p = privilege.rows[0];
      record('legacy RPC bypass blocked', !p.old_attendance && !p.old_session && !p.old_complete && p.new_attendance, p);
    } finally {
      await Promise.all([a.end(), b.end()]);
    }
  } finally {
    await setup.end();
  }

  console.log(JSON.stringify({ database, passed: results.every((item) => item.pass), results }, null, 2));
  if (results.some((item) => !item.pass)) process.exitCode = 1;
} finally {
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()`, [database]);
  await admin.query(`drop database if exists ${database}`);
  await admin.end();
}
