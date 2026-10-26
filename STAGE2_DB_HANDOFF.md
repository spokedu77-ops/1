# Stage 2 P0 DB Handoff

대상: Supabase DB 적용 담당 ChatGPT / 승인자
기준일: 2026-10-26
현재 상태: SQL 및 로컬 PostgreSQL QA 완료, Production 미적용

## 적용 파일과 SHA-256

| 단계 | 파일 | SHA-256 |
|---|---|---|
| Expand | `supabase/migrations/20261026115102_stage2_session_writes_expand.sql` | `A2F1EE46DDCF283C54F49873DC5DDC3886A0624B40B7AFA5BEC3318B1510E986` |
| Contract 준비본 | `supabase/contract-migrations/20261026115108_stage2_session_writes_contract.sql` | `55C5EC1093EC17394AFC3C6249D7DF8321819EF26B4BC11557FEC8D8CE30CD9D` |

적용 직전에 다시 SHA-256을 계산하고 위 값과 다르면 중단한다.

## 적용 전 확인사항

1. Production migration history에 `20261026123000`, `20261026115102`, `20261026115108`이 모두 없어야 한다. Contract 준비본은 표준 migration 디렉터리 밖에 있어 자동 적용되지 않는다.
2. 현재 배포 SHA와 모든 활성 인스턴스를 기록한다.
3. `20261025152845_harden_spokedu_master_session_capture_concurrency` 적용 여부를 확인한다.
4. 아래 legacy/v2 함수 identity arguments, owner, ACL을 저장한다.
5. `spokedu_master_sessions`의 두 version 컬럼 존재 여부를 확인한다.
6. legacy 네 RPC의 최근 호출자와 외부 service-role 소비자를 확인한다.
7. backup/restore 지점, 쓰기 gate, atomic traffic switch, rollback 담당자를 확정한다.
8. Contract는 신 앱 전환 및 legacy 호출 0 증빙 전에는 실행하지 않는다.

### 적용 전 read-only 쿼리

```sql
select version
from supabase_migrations.schema_migrations
where version in ('20261026123000','20261026115102','20261026115108','20261025152845')
order by version;

select column_name,data_type,column_default,is_nullable
from information_schema.columns
where table_schema='public' and table_name='spokedu_master_sessions'
  and column_name in ('memo_version','attendance_version')
order by column_name;

select p.oid::regprocedure::text signature,
       pg_get_userbyid(p.proowner) owner,
       p.prosecdef security_definer,
       p.proconfig,
       p.proacl
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in (
    'spokedu_master_replace_session_attendance',
    'spokedu_master_save_session',
    'spokedu_master_complete_session',
    'spokedu_master_save_session_capture',
    'spokedu_master_update_session_attendance_v2',
    'spokedu_master_save_session_v2',
    'spokedu_master_complete_session_v2',
    'spokedu_master_save_session_capture_v2'
  )
order by p.proname,p.oid::regprocedure::text;
```

## 기존 운영 DB와의 예상 차이

Expand 전 예상:

- `memo_version`, `attendance_version` 없음
- 세 session v2 RPC 없음
- legacy attendance/save/complete/capture는 `service_role` 실행 가능
- capture v2와 `capture_version`은 선행 migration 적용 시 존재

Expand 후 예상:

- 기존 session 행의 두 version은 1
- 세 session v2 RPC 존재
- v2는 service_role만 실행 가능
- legacy 권한은 그대로 유지

Contract 후 예상:

- 데이터/함수 정의 변화 없음
- legacy 네 RPC가 PUBLIC/anon/authenticated/service_role에서 실행 불가
- v2 네 RPC는 service_role에서 실행 가능

예상과 다르면 SQL을 적용하지 말고 schema drift를 먼저 보고한다.

## SQL 실행 순서

1. 아래 Expand 원문만 실행
2. Expand 검증 쿼리와 구 API/신 API smoke
3. 쓰기 gate 활성화 및 in-flight drain
4. 모든 트래픽을 신 앱으로 atomic switch
5. legacy 호출량 0과 신 앱 smoke 확인
6. 아래 Contract 원문 실행
7. 역할별 실제 실행 검증
8. 쓰기 gate 해제

일반 rolling deployment로 구·신 쓰기를 동시에 허용하지 않는다.

Gate 활성화와 drain은 반드시 아래 한 트랜잭션으로 수행한다. 첫 `select`가 모든 진행 중 관련 DB 쓰기의 transaction 종료까지 대기한다. `lock_timeout` 초과 시 전체 트랜잭션이 rollback되므로 전환을 중단한다.

```sql
begin;
set local lock_timeout='330s';
select pg_advisory_xact_lock(742021,2);
update public.spokedu_master_stage2_write_gate
set blocked=true,reason='stage2 production cutover',updated_at=now()
where singleton;
commit;
```

Gate 상태와 남은 공유 lock 확인:

```sql
select blocked,reason,updated_at
from public.spokedu_master_stage2_write_gate
where singleton;

select mode,granted,count(*)
from pg_locks
where locktype='advisory' and classid=742021 and objid=2
group by mode,granted
order by mode,granted;
```

Contract 검증 완료 후 Gate 해제도 같은 배타 lock을 사용한다.

```sql
begin;
set local lock_timeout='330s';
select pg_advisory_xact_lock(742021,2);
update public.spokedu_master_stage2_write_gate
set blocked=false,reason=null,updated_at=now()
where singleton;
commit;
```

## Expand SQL 원문

```sql
-- Stage 2 P0 EXPAND: add versioned Session write paths without disabling legacy callers.
-- Contract revocations are deliberately isolated in the later contract migration.

create table if not exists public.spokedu_master_stage2_write_gate (
  singleton boolean primary key default true check (singleton),
  blocked boolean not null default false,
  reason text,
  updated_at timestamptz not null default now()
);

insert into public.spokedu_master_stage2_write_gate(singleton,blocked,reason)
values (true,false,null)
on conflict (singleton) do nothing;

alter table public.spokedu_master_stage2_write_gate enable row level security;
revoke all on table public.spokedu_master_stage2_write_gate from public,anon,authenticated,service_role;

create or replace function public.spokedu_master_enforce_stage2_write_gate()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(742021,2);

  if exists (
    select 1 from public.spokedu_master_stage2_write_gate
    where singleton and blocked
  ) then
    raise exception using
      errcode='55P03',
      message='stage2_cutover_write_gate_active',
      hint='Retry after the Stage 2 maintenance window';
  end if;

  return coalesce(new,old);
end;
$$;

revoke all on function public.spokedu_master_enforce_stage2_write_gate() from public,anon,authenticated,service_role;

drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_sessions;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_sessions
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_session_attendance;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_session_attendance
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_session_programs;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_session_programs
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_class_records;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_class_records
for each row execute function public.spokedu_master_enforce_stage2_write_gate();
drop trigger if exists spokedu_master_stage2_write_gate on public.spokedu_master_class_record_students;
create trigger spokedu_master_stage2_write_gate before insert or update or delete on public.spokedu_master_class_record_students
for each row execute function public.spokedu_master_enforce_stage2_write_gate();

alter table public.spokedu_master_sessions
  add column if not exists memo_version bigint not null default 1,
  add column if not exists attendance_version bigint not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.spokedu_master_sessions'::regclass and conname='spokedu_master_sessions_memo_version_check') then
    alter table public.spokedu_master_sessions add constraint spokedu_master_sessions_memo_version_check check (memo_version >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.spokedu_master_sessions'::regclass and conname='spokedu_master_sessions_attendance_version_check') then
    alter table public.spokedu_master_sessions add constraint spokedu_master_sessions_attendance_version_check check (attendance_version >= 1);
  end if;
end $$;

create or replace function public.spokedu_master_update_session_attendance_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_version bigint, p_changes jsonb
) returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.spokedu_master_sessions%rowtype; v_next_version bigint;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'array' then
    raise exception using errcode='22023', message='attendance changes must be an array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_changes) item
    where nullif(item->>'studentId','') is null or not (item ? 'status')
      or (item->'status' <> 'null'::jsonb and item->>'status' not in ('present','absent','pending'))
  ) or (select count(*) from jsonb_array_elements(p_changes)) <>
       (select count(distinct item->>'studentId') from jsonb_array_elements(p_changes) item) then
    raise exception using errcode='22023', message='invalid attendance changes';
  end if;

  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if v_session.status='cancelled' then raise exception using errcode='22023', message='attendance is not editable'; end if;
  if p_expected_version is null or p_expected_version <> v_session.attendance_version then
    raise exception using errcode='40001', message='session attendance version conflict';
  end if;

  perform public.spokedu_master_class_integrity_lock(p_owner_id, v_session.class_id);
  if exists (
    select 1 from jsonb_array_elements(p_changes) item
    where (item->'status' = 'null'::jsonb and v_session.roster_locked_at is not null)
      or (item->>'status'='pending' and (v_session.status <> 'scheduled' or v_session.roster_locked_at is null))
      or not exists (
        select 1 from public.spokedu_master_students student
        where student.id=(item->>'studentId')::uuid and student.owner_id=p_owner_id
      )
      or (
        v_session.roster_locked_at is not null and not exists (
          select 1 from public.spokedu_master_session_attendance old
          where old.owner_id=p_owner_id and old.session_id=p_session_id and old.student_id=(item->>'studentId')::uuid
        )
      )
      or (
        v_session.roster_locked_at is null and not exists (
          select 1 from public.spokedu_master_class_students membership
          where membership.owner_id=p_owner_id and membership.class_id=v_session.class_id and membership.student_id=(item->>'studentId')::uuid
        )
      )
  ) then raise exception using errcode='22023', message='student is not an allowed participant'; end if;

  delete from public.spokedu_master_session_attendance attendance
  using jsonb_array_elements(p_changes) item
  where attendance.owner_id=p_owner_id and attendance.session_id=p_session_id
    and attendance.student_id=(item->>'studentId')::uuid and item->'status'='null'::jsonb;

  insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,student_name_snapshot,status)
  select p_owner_id,p_session_id,student.id,student.name,item->>'status'
  from jsonb_array_elements(p_changes) item
  join public.spokedu_master_students student on student.id=(item->>'studentId')::uuid and student.owner_id=p_owner_id
  where item->'status' <> 'null'::jsonb
  on conflict (session_id,student_id) do update set
    status=excluded.status,
    student_name_snapshot=case when v_session.status='scheduled' and v_session.roster_locked_at is null then excluded.student_name_snapshot else public.spokedu_master_session_attendance.student_name_snapshot end;

  update public.spokedu_master_sessions set attendance_version=attendance_version+1,updated_at=now()
  where id=p_session_id returning attendance_version into v_next_version;
  return v_next_version;
end $$;

create or replace function public.spokedu_master_save_session_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_memo_version bigint, p_class_id uuid,
  p_start_at timestamptz, p_end_at timestamptz, p_status text, p_memo text
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.spokedu_master_sessions%rowtype; v_id uuid;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if p_expected_memo_version is null or p_expected_memo_version <> v_session.memo_version then
    raise exception using errcode='40001', message='session memo version conflict';
  end if;
  v_id := public.spokedu_master_save_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,p_status,p_memo,'[]'::jsonb,'[]'::jsonb);
  update public.spokedu_master_sessions set memo_version=memo_version+1,updated_at=now()
  where id=p_session_id returning id into v_id;
  return v_id;
end $$;

create or replace function public.spokedu_master_complete_session_v2(
  p_owner_id uuid, p_session_id uuid, p_expected_memo_version bigint, p_expected_attendance_version bigint,
  p_class_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_memo text, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_session public.spokedu_master_sessions%rowtype; v_id uuid;
begin
  select * into v_session from public.spokedu_master_sessions
  where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if p_expected_memo_version is null or p_expected_memo_version <> v_session.memo_version
     or p_expected_attendance_version is null or p_expected_attendance_version <> v_session.attendance_version then
    raise exception using errcode='40001', message='session write version conflict';
  end if;
  v_id := public.spokedu_master_complete_session(p_owner_id,p_session_id,p_class_id,p_start_at,p_end_at,p_memo,p_attendance);
  update public.spokedu_master_sessions
  set memo_version=memo_version+1,attendance_version=attendance_version+1,updated_at=now()
  where id=p_session_id;
  return v_id;
end $$;

revoke all on function public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text) from public,anon,authenticated;
revoke all on function public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb) to service_role;
grant execute on function public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text) to service_role;
grant execute on function public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
```

## Contract SQL 원문

```sql
-- Stage 2 P0 CONTRACT.
-- Apply only after every production instance uses the v2 RPCs and legacy-call telemetry is zero.
-- This file is intentionally outside supabase/migrations so a normal db push cannot apply it with EXPAND.

revoke all on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)
  from public,anon,authenticated,service_role;
revoke all on function public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb)
  from public,anon,authenticated,service_role;
```

## Expand 적용 후 검증 쿼리

```sql
select count(*) filter (where memo_version <> 1) non_default_memo_versions,
       count(*) filter (where attendance_version <> 1) non_default_attendance_versions,
       count(*) total_sessions
from public.spokedu_master_sessions;

select singleton,blocked,reason,updated_at,
       has_table_privilege('service_role','public.spokedu_master_stage2_write_gate','select') service_can_read,
       has_table_privilege('service_role','public.spokedu_master_stage2_write_gate','update') service_can_update
from public.spokedu_master_stage2_write_gate;

select c.relname table_name,t.tgname,pg_get_triggerdef(t.oid) definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
where not t.tgisinternal and t.tgname='spokedu_master_stage2_write_gate'
order by c.relname;

select p.oid::regprocedure::text signature,
       pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,
       has_function_privilege('anon',p.oid,'execute') anon_execute,
       has_function_privilege('authenticated',p.oid,'execute') authenticated_execute,
       has_function_privilege('service_role',p.oid,'execute') service_execute,
       exists (
         select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
         where acl.grantee=0 and acl.privilege_type='EXECUTE'
       ) public_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('spokedu_master_update_session_attendance_v2','spokedu_master_save_session_v2','spokedu_master_complete_session_v2')
order by signature;

select
  has_function_privilege('service_role','public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb)','execute') legacy_attendance,
  has_function_privilege('service_role','public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb)','execute') legacy_session,
  has_function_privilege('service_role','public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)','execute') legacy_complete,
  has_function_privilege('service_role','public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb)','execute') legacy_capture;
```

기대값: version 비정상 건수 0, Gate false, service-role control table 접근 false, Gate trigger 5개, v2의 public/anon/authenticated false, service true, owner postgres, security definer true, 고정 search_path. Expand 동안 legacy 네 값은 true여야 한다.

## Contract 적용 후 검증

```sql
select
  has_function_privilege('service_role','public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb)','execute') legacy_attendance,
  has_function_privilege('service_role','public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb)','execute') legacy_session,
  has_function_privilege('service_role','public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb)','execute') legacy_complete,
  has_function_privilege('service_role','public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb)','execute') legacy_capture,
  has_function_privilege('service_role','public.spokedu_master_update_session_attendance_v2(uuid,uuid,bigint,jsonb)','execute') new_attendance,
  has_function_privilege('service_role','public.spokedu_master_save_session_v2(uuid,uuid,bigint,uuid,timestamptz,timestamptz,text,text)','execute') new_session,
  has_function_privilege('service_role','public.spokedu_master_complete_session_v2(uuid,uuid,bigint,bigint,uuid,timestamptz,timestamptz,text,jsonb)','execute') new_complete,
  has_function_privilege('service_role','public.spokedu_master_save_session_capture_v2(uuid,uuid,bigint,text,jsonb)','execute') new_capture;
```

기대값: legacy 네 값 false, new 네 값 true. 별도의 격리 fixture에서 `SET LOCAL ROLE service_role` 후 legacy 실행이 SQLSTATE `42501`인지도 확인한다. Production 실제 데이터에 mutation smoke를 수행하려면 반드시 승인된 테스트 owner/session만 사용한다.

## 실패 시 복구

### Expand 실패

- migration 트랜잭션이 rollback됐는지 migration history와 객체로 확인한다.
- 부분 적용이 의심되면 재실행하지 말고 위 객체/컬럼 조회 결과를 보존해 보고한다.
- additive 객체를 즉시 drop하지 않는다.

### 신 앱 전환 실패, Contract 전

- 쓰기 gate 유지 → 신 트래픽 제거 → 구 앱 원복 → gate 해제.
- Expand 컬럼/함수는 남긴다.

### Contract 후 구 앱 긴급 복귀

구 앱 배포 전에 DB 담당 승인으로 필요한 권한을 복원한다.

```sql
grant execute on function public.spokedu_master_replace_session_attendance(uuid,uuid,jsonb) to service_role;
grant execute on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) to service_role;
grant execute on function public.spokedu_master_complete_session(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb) to service_role;
grant execute on function public.spokedu_master_save_session_capture(uuid,uuid,text,jsonb) to service_role;
```

이 복구는 혼재 덮어쓰기 위험을 다시 여므로 쓰기 gate 상태에서만 수행하고, 구 앱 전환이 끝날 때까지 신·구 동시 쓰기를 허용하지 않는다.

## 실제 데이터 영향

- Expand: 기존 session 행에 두 bigint version 기본값 1 추가. attendance/capture/student/subscription 데이터 삭제 없음.
- Contract: 데이터 변경 없음. 함수 정의 삭제 없음. 네 legacy 함수 실행권한만 회수.
- Production 적용은 이 작업에서 수행하지 않았다.

## 로컬 증빙

- Mixed transition QA: 10/10 진단 PASS. 혼재 overwrite/capture 우회 재현, advisory-lock drain, Gate 차단 및 Contract 차단 확인.
- 기존 concurrency QA: 9/9 PASS.
- 관련 Vitest: 7 files / 32 tests PASS.
- TypeScript typecheck 및 변경 테스트·QA 스크립트 ESLint PASS.
- 문서 내 Expand/Contract SQL 원문이 각 파일과 byte-for-byte 일치함을 확인.
- 자세한 결과: `STAGE2_MIXED_VERSION_QA.md`.
