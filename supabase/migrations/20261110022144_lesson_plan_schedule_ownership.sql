-- A session ID survives postponement; a lesson plan must not change author/day
-- merely because that session moves. Preserve full original rows before detaching.
create table private.lesson_plan_schedule_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  teacher_id uuid,
  session_start_at timestamptz not null,
  session_end_at timestamptz,
  session_snapshot jsonb not null,
  lesson_plan_snapshot jsonb not null,
  reason text not null,
  archived_at timestamptz not null default clock_timestamp(),
  restored_at timestamptz
);
create index lesson_plan_schedule_history_context_idx
  on private.lesson_plan_schedule_history(session_id, teacher_id, session_start_at, archived_at desc);
alter table private.lesson_plan_schedule_history enable row level security;
revoke all on private.lesson_plan_schedule_history from public, anon, authenticated;
grant select on private.lesson_plan_schedule_history to service_role;

-- These date guards were installed remotely before this migration. Include their
-- definitions so a fresh checkout has the same executable validation.
create or replace function public.lesson_plan_header_day(p_content text)
returns date language plpgsql immutable set search_path = pg_catalog as $$
declare v_parts text[];
begin
  v_parts := regexp_match(ltrim(coalesce(p_content, ''), E' \t\r\n'), '^([0-9]{4})[./-]([0-9]{1,2})[./-]([0-9]{1,2})(?![0-9])');
  if v_parts is null or v_parts[1]::integer < 2000 then return null; end if;
  return make_date(v_parts[1]::integer, v_parts[2]::integer, v_parts[3]::integer);
exception when datetime_field_overflow then return null;
end; $$;

create or replace function public.guard_lesson_plan_session_day()
returns trigger language plpgsql set search_path = pg_catalog as $$
declare v_start timestamptz; v_day date;
begin
  select start_at into v_start from public.sessions where id = new.session_id for update;
  if not found then raise exception using errcode = '23503', message = 'LESSON_PLAN_SESSION_NOT_FOUND'; end if;
  if btrim(coalesce(new.content, '')) = '' then return new; end if;
  v_day := public.lesson_plan_header_day(new.content);
  if v_day is null then raise exception using errcode = '23514', message = 'LESSON_PLAN_DATE_REQUIRED'; end if;
  if v_day is distinct from (v_start at time zone 'Asia/Seoul')::date then
    raise exception using errcode = '23514', message = 'LESSON_PLAN_DATE_MISMATCH';
  end if;
  return new;
end; $$;
drop trigger if exists trg_lesson_plan_session_day on public.lesson_plans;
create trigger trg_lesson_plan_session_day before insert or update of content, session_id
  on public.lesson_plans for each row execute function public.guard_lesson_plan_session_day();

-- Trigger-only definer: callers already require permission to UPDATE sessions.
-- Private archive writes must succeed equally for authorized RLS and server paths.
create function private.preserve_lesson_plan_schedule_context()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not distinct from old.created_by
    and (new.start_at at time zone 'Asia/Seoul')::date = (old.start_at at time zone 'Asia/Seoul')::date then
    return new;
  end if;
  insert into private.lesson_plan_schedule_history
    (session_id, teacher_id, session_start_at, session_end_at, session_snapshot, lesson_plan_snapshot, reason)
  select old.id, old.created_by, old.start_at, old.end_at, to_jsonb(old), to_jsonb(lp), 'schedule_context_changed'
  from public.lesson_plans lp where lp.session_id = old.id;
  delete from public.lesson_plans where session_id = old.id;
  return new;
end; $$;

create function private.restore_lesson_plan_schedule_context()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_history private.lesson_plan_schedule_history%rowtype;
begin
  if new.created_by is not distinct from old.created_by
    and (new.start_at at time zone 'Asia/Seoul')::date = (old.start_at at time zone 'Asia/Seoul')::date then
    return new;
  end if;
  select * into v_history from private.lesson_plan_schedule_history h
  where h.session_id = new.id and h.teacher_id is not distinct from new.created_by
    and h.session_start_at = new.start_at and h.session_end_at is not distinct from new.end_at
    and h.restored_at is null
    and public.lesson_plan_header_day(h.lesson_plan_snapshot->>'content') = (new.start_at at time zone 'Asia/Seoul')::date
  order by h.archived_at desc, h.id desc limit 1 for update;
  if found then
    insert into public.lesson_plans select (jsonb_populate_record(null::public.lesson_plans, v_history.lesson_plan_snapshot)).*;
    update private.lesson_plan_schedule_history set restored_at = clock_timestamp() where id = v_history.id;
  end if;
  return new;
end; $$;

-- Replace the blanket move prohibition with atomic preservation. Other schedule,
-- feedback, completion, count, settlement and teacher-conflict guards stay intact.
drop trigger if exists trg_session_day_with_lesson_plan on public.sessions;
create trigger trg_session_lesson_plan_preserve before update of start_at, created_by on public.sessions
  for each row execute function private.preserve_lesson_plan_schedule_context();
create trigger trg_session_lesson_plan_restore after update of start_at, created_by on public.sessions
  for each row execute function private.restore_lesson_plan_schedule_context();

-- Service-only entry point: ownership check, plan identity and write share the
-- same session lock as postpone/undo, preventing check-then-write assignment races.
create function public.teacher_write_lesson_plan(
  p_session_id uuid, p_teacher_id uuid, p_lesson_plan_id uuid, p_content text, p_action text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_session public.sessions%rowtype; v_plan public.lesson_plans%rowtype; v_id uuid;
begin
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then raise exception 'LESSON_PLAN_SESSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_session.created_by is distinct from p_teacher_id or p_teacher_id is null then
    raise exception 'LESSON_PLAN_FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_plan from public.lesson_plans where session_id = p_session_id for update;
  if p_lesson_plan_id is not null and (v_plan.id is null or v_plan.id <> p_lesson_plan_id) then
    raise exception 'LESSON_PLAN_STALE' using errcode = '40001';
  end if;
  if p_action = 'delete' then
    if p_lesson_plan_id is null then raise exception 'LESSON_PLAN_STALE' using errcode = '40001'; end if;
    delete from public.lesson_plans where id = p_lesson_plan_id and session_id = p_session_id;
    return jsonb_build_object('ok', true);
  end if;
  if p_action is distinct from 'save' or btrim(coalesce(p_content, '')) = '' then
    raise exception 'LESSON_PLAN_CONTENT_REQUIRED' using errcode = '22023';
  end if;
  if p_lesson_plan_id is null then
    if v_plan.id is not null then raise exception 'LESSON_PLAN_STALE' using errcode = '40001'; end if;
    insert into public.lesson_plans(session_id, content) values(p_session_id, p_content) returning id into v_id;
  else
    update public.lesson_plans set content = p_content, updated_at = now()
      where id = p_lesson_plan_id and session_id = p_session_id returning id into v_id;
  end if;
  return jsonb_build_object('ok', true, 'lessonPlanId', v_id);
end; $$;

revoke all on function public.lesson_plan_header_day(text) from public, anon;
grant execute on function public.lesson_plan_header_day(text) to authenticated, service_role;
revoke all on function public.guard_lesson_plan_session_day() from public, anon, authenticated;
revoke all on function private.preserve_lesson_plan_schedule_context() from public, anon, authenticated;
revoke all on function private.restore_lesson_plan_schedule_context() from public, anon, authenticated;
revoke all on function public.teacher_write_lesson_plan(uuid,uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.teacher_write_lesson_plan(uuid,uuid,uuid,text,text) to service_role;

-- Preserve access to one's own original work without exposing another teacher's
-- archive through the session's new assignment or through the public Data API.
create function public.teacher_read_lesson_plan_history(p_session_id uuid, p_teacher_id uuid)
returns table(id uuid, session_id uuid, start_at timestamptz, content text)
language plpgsql set search_path = '' as $$
declare v_session public.sessions%rowtype;
begin
  select * into v_session from public.sessions where sessions.id = p_session_id;
  if not found or v_session.created_by is distinct from p_teacher_id or p_teacher_id is null then
    raise exception 'LESSON_PLAN_FORBIDDEN' using errcode = '42501';
  end if;
  return query select h.id, h.session_id, h.session_start_at, h.lesson_plan_snapshot->>'content'
  from private.lesson_plan_schedule_history h
  where h.teacher_id = p_teacher_id and h.restored_at is null
    and (h.session_id = p_session_id or (v_session.group_id is not null
      and h.session_snapshot->>'group_id' = v_session.group_id::text))
  order by h.archived_at desc limit 200;
end; $$;
revoke all on function public.teacher_read_lesson_plan_history(uuid,uuid) from public, anon, authenticated;
grant execute on function public.teacher_read_lesson_plan_history(uuid,uuid) to service_role;
