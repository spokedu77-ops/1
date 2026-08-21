-- SPOKEDU MASTER: Session is the source of truth for one real class occurrence.
-- This is additive. Legacy class-record tables remain readable and are backfilled idempotently.

create table if not exists public.spokedu_master_classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint spokedu_master_classes_name_not_blank check (btrim(name) <> '')
);

create unique index if not exists spokedu_master_classes_owner_name_unique
  on public.spokedu_master_classes(owner_id, lower(btrim(name))) where deleted_at is null;

create table if not exists public.spokedu_master_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.spokedu_master_classes(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  memo text null,
  completed_at timestamptz null,
  legacy_record_id uuid null references public.spokedu_master_class_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint spokedu_master_sessions_time_order check (end_at > start_at),
  constraint spokedu_master_sessions_completed_at check (
    (status = 'completed' and completed_at is not null) or
    (status <> 'completed' and completed_at is null)
  )
);

create unique index if not exists spokedu_master_sessions_legacy_record_unique
  on public.spokedu_master_sessions(legacy_record_id) where legacy_record_id is not null;
create index if not exists spokedu_master_sessions_owner_start_idx
  on public.spokedu_master_sessions(owner_id, start_at) where deleted_at is null;
create index if not exists spokedu_master_sessions_class_idx on public.spokedu_master_sessions(class_id);

create table if not exists public.spokedu_master_session_programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.spokedu_master_sessions(id) on delete cascade,
  program_id bigint not null,
  program_title_snapshot text null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, program_id),
  unique(session_id, sort_order)
);

create index if not exists spokedu_master_session_programs_owner_idx on public.spokedu_master_session_programs(owner_id);

create table if not exists public.spokedu_master_session_attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.spokedu_master_sessions(id) on delete cascade,
  student_id uuid not null references public.spokedu_master_students(id) on delete restrict,
  status text not null check (status in ('present', 'absent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, student_id)
);

create index if not exists spokedu_master_session_attendance_owner_idx on public.spokedu_master_session_attendance(owner_id);
create index if not exists spokedu_master_session_attendance_student_idx on public.spokedu_master_session_attendance(student_id);

create or replace function public.spokedu_master_guard_session_owner()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_table_name = 'spokedu_master_sessions' then
    if not exists (select 1 from public.spokedu_master_classes c where c.id = new.class_id and c.owner_id = new.owner_id) then
      raise exception using errcode = '23514', message = 'session class owner mismatch';
    end if;
  elsif not exists (select 1 from public.spokedu_master_sessions s where s.id = new.session_id and s.owner_id = new.owner_id) then
    raise exception using errcode = '23514', message = 'session aggregate owner mismatch';
  end if;
  if tg_table_name = 'spokedu_master_session_attendance' then
    if not exists (
      select 1
      from public.spokedu_master_students s
      where s.id = new.student_id
        and s.owner_id = new.owner_id
    ) then
      raise exception using errcode = '23514', message = 'attendance student owner mismatch';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists spokedu_master_sessions_owner_guard on public.spokedu_master_sessions;
create trigger spokedu_master_sessions_owner_guard before insert or update on public.spokedu_master_sessions
for each row execute function public.spokedu_master_guard_session_owner();
drop trigger if exists spokedu_master_session_programs_owner_guard on public.spokedu_master_session_programs;
create trigger spokedu_master_session_programs_owner_guard before insert or update on public.spokedu_master_session_programs
for each row execute function public.spokedu_master_guard_session_owner();
drop trigger if exists spokedu_master_session_attendance_owner_guard on public.spokedu_master_session_attendance;
create trigger spokedu_master_session_attendance_owner_guard before insert or update on public.spokedu_master_session_attendance
for each row execute function public.spokedu_master_guard_session_owner();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'spokedu_master_classes', 'spokedu_master_sessions',
    'spokedu_master_session_programs', 'spokedu_master_session_attendance'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_own_all', table_name);
    execute format(
      'create policy %I on public.%I for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      table_name || '_own_all', table_name
    );
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'spokedu_master_classes', 'spokedu_master_sessions',
    'spokedu_master_session_programs', 'spokedu_master_session_attendance'
  ] loop
    if not exists (select 1 from pg_trigger where tgname = table_name || '_updated_at') then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.spokedu_master_set_updated_at()',
        table_name || '_updated_at', table_name
      );
    end if;
  end loop;
end $$;

-- Promote the existing roster group/class strings without changing student rows.
insert into public.spokedu_master_classes(owner_id, name)
select source.owner_id, source.name
from (
  select owner_id, btrim(group_name) as name from public.spokedu_master_students
   where deleted_at is null and nullif(btrim(group_name), '') is not null
  union
  select owner_id, btrim(class_id) as name from public.spokedu_master_class_records
   where deleted_at is null and nullif(btrim(class_id), '') is not null
  union
  select distinct owner_id, '미분류 수업' as name from public.spokedu_master_class_records
   where deleted_at is null and nullif(btrim(class_id), '') is null
) source
where not exists (
  select 1 from public.spokedu_master_classes target
   where target.owner_id = source.owner_id and lower(btrim(target.name)) = lower(source.name)
     and target.deleted_at is null
);

-- Each legacy record remains intact and gains a stable Session counterpart.
insert into public.spokedu_master_sessions(
  owner_id, class_id, start_at, end_at, status, memo, completed_at, legacy_record_id, created_at, updated_at
)
select record.owner_id, class_row.id,
       (record.class_date::timestamp + time '09:00') at time zone 'Asia/Seoul',
       (record.class_date::timestamp + time '10:00') at time zone 'Asia/Seoul',
       'completed', record.memo, record.updated_at, record.id, record.created_at, record.updated_at
from public.spokedu_master_class_records record
join public.spokedu_master_classes class_row
  on class_row.owner_id = record.owner_id
 and lower(btrim(class_row.name)) = lower(btrim(coalesce(nullif(btrim(record.class_id), ''), '미분류 수업')))
where record.deleted_at is null
  and not exists (select 1 from public.spokedu_master_sessions session where session.legacy_record_id = record.id);

insert into public.spokedu_master_session_programs(owner_id, session_id, program_id, program_title_snapshot, sort_order, is_completed)
select record.owner_id, session.id, record.program_id, record.program_title, 0, true
from public.spokedu_master_class_records record
join public.spokedu_master_sessions session on session.legacy_record_id = record.id
where record.program_id is not null
on conflict (session_id, program_id) do nothing;

insert into public.spokedu_master_session_attendance(owner_id, session_id, student_id, status)
select child.owner_id, session.id, child.student_id, child.attendance
from public.spokedu_master_class_record_students child
join public.spokedu_master_sessions session on session.legacy_record_id = child.record_id
where child.student_id is not null and child.attendance in ('present', 'absent')
on conflict (session_id, student_id) do update set status = excluded.status;

-- Service-only transaction RPC. It replaces the small Session aggregate atomically.
create or replace function public.spokedu_master_save_session(
  p_owner_id uuid, p_session_id uuid, p_class_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_status text, p_memo text, p_programs jsonb, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid; v_completed_at timestamptz;
begin
  if p_status not in ('scheduled', 'completed', 'cancelled') or p_end_at <= p_start_at then
    raise exception using errcode = '22023', message = 'invalid session';
  end if;
  if not exists (select 1 from public.spokedu_master_classes where id = p_class_id and owner_id = p_owner_id and deleted_at is null) then
    raise exception using errcode = '22023', message = 'class unavailable';
  end if;
  if jsonb_typeof(p_programs) <> 'array' or jsonb_typeof(p_attendance) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid aggregate';
  end if;
  v_completed_at := case when p_status = 'completed' then coalesce((select completed_at from public.spokedu_master_sessions where id = p_session_id), now()) else null end;
  if p_session_id is null then
    insert into public.spokedu_master_sessions(owner_id,class_id,start_at,end_at,status,memo,completed_at)
    values(p_owner_id,p_class_id,p_start_at,p_end_at,p_status,nullif(btrim(p_memo),''),v_completed_at) returning id into v_id;
  else
    update public.spokedu_master_sessions set class_id=p_class_id,start_at=p_start_at,end_at=p_end_at,
      status=p_status,memo=nullif(btrim(p_memo),''),completed_at=v_completed_at
    where id=p_session_id and owner_id=p_owner_id and deleted_at is null returning id into v_id;
    if v_id is null then raise exception using errcode='P0002', message='session not found'; end if;
    delete from public.spokedu_master_session_programs where session_id=v_id and owner_id=p_owner_id;
    delete from public.spokedu_master_session_attendance where session_id=v_id and owner_id=p_owner_id;
  end if;
  insert into public.spokedu_master_session_programs(owner_id,session_id,program_id,program_title_snapshot,sort_order,is_completed)
  select p_owner_id,v_id,(item->>'programId')::bigint,nullif(item->>'programTitle',''),(item->>'sortOrder')::int,coalesce((item->>'isCompleted')::boolean,false)
  from jsonb_array_elements(p_programs) item;
  insert into public.spokedu_master_session_attendance(owner_id,session_id,student_id,status)
  select p_owner_id,v_id,(item->>'studentId')::uuid,item->>'status' from jsonb_array_elements(p_attendance) item
  where item->>'status' in ('present','absent')
    and exists(select 1 from public.spokedu_master_students s where s.id=(item->>'studentId')::uuid and s.owner_id=p_owner_id and s.deleted_at is null);
  return v_id;
end $$;

revoke all on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.spokedu_master_save_session(uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb) to service_role;
revoke all on function public.spokedu_master_guard_session_owner() from public,anon,authenticated;
