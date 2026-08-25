-- Allow cancelled → scheduled restore (UI/policy already promise this).
-- Completed remains one-way; cancelled content stays locked except status restore.

create or replace function public.spokedu_master_guard_session_edit_policy()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare v_class_name text;
begin
  if old.status <> new.status and not (
    (old.status='scheduled' and new.status in ('completed','cancelled'))
    or (old.status='cancelled' and new.status='scheduled')
  ) then
    raise exception using errcode='22023', message='illegal session transition';
  end if;
  if old.status <> 'scheduled' and new.status = old.status and (
    new.class_id,new.start_at,new.end_at,new.class_name_snapshot,new.completed_at
  ) is distinct from (
    old.class_id,old.start_at,old.end_at,old.class_name_snapshot,old.completed_at
  ) then raise exception using errcode='22023', message='historical session fields are locked'; end if;
  if old.status='cancelled' and new.status='cancelled' and new.memo is distinct from old.memo then
    raise exception using errcode='22023', message='cancelled session is locked';
  end if;
  if old.status='scheduled' and old.class_id is distinct from new.class_id then
    select name into v_class_name from public.spokedu_master_classes
     where id=new.class_id and owner_id=new.owner_id and deleted_at is null;
    if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;
    new.class_name_snapshot := v_class_name;
    delete from public.spokedu_master_session_attendance
     where owner_id=old.owner_id and session_id=old.id;
  end if;
  if old.status='scheduled' then
    if v_class_name is null then
      select name into v_class_name from public.spokedu_master_classes
       where id=new.class_id and owner_id=new.owner_id and deleted_at is null;
    end if;
    new.class_name_snapshot := v_class_name;
    new.completed_at := case when new.status='completed' then now() else null end;
  end if;
  if old.status='cancelled' and new.status='scheduled' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create or replace function public.spokedu_master_save_session(
  p_owner_id uuid, p_session_id uuid, p_class_id uuid, p_start_at timestamptz,
  p_end_at timestamptz, p_status text, p_memo text, p_programs jsonb, p_attendance jsonb
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_id uuid; v_old public.spokedu_master_sessions%rowtype;
  v_class_name text; v_completed_at timestamptz;
begin
  if p_status not in ('scheduled','completed','cancelled') or p_end_at <= p_start_at then
    raise exception using errcode='22023', message='invalid session';
  end if;
  select name into v_class_name from public.spokedu_master_classes
   where id=p_class_id and owner_id=p_owner_id and deleted_at is null;
  if v_class_name is null then raise exception using errcode='22023', message='class unavailable'; end if;

  if p_session_id is null then
    if p_status <> 'scheduled' then raise exception using errcode='22023', message='new session must be scheduled'; end if;
    insert into public.spokedu_master_sessions(
      owner_id,class_id,class_name_snapshot,start_at,end_at,status,memo,completed_at
    ) values (
      p_owner_id,p_class_id,v_class_name,p_start_at,p_end_at,'scheduled',nullif(btrim(p_memo),''),null
    ) returning id into v_id;
    return v_id;
  end if;

  select * into v_old from public.spokedu_master_sessions
   where id=p_session_id and owner_id=p_owner_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='session not found'; end if;
  if v_old.status <> p_status and not (
    (v_old.status='scheduled' and p_status in ('completed','cancelled'))
    or (v_old.status='cancelled' and p_status='scheduled')
  ) then
    raise exception using errcode='22023', message='illegal session transition';
  end if;
  if v_old.status <> 'scheduled' and v_old.status = p_status and (
    v_old.class_id is distinct from p_class_id or v_old.start_at is distinct from p_start_at
    or v_old.end_at is distinct from p_end_at
  ) then raise exception using errcode='22023', message='historical session fields are locked'; end if;
  if v_old.status='cancelled' and p_status='scheduled' and (
    v_old.class_id is distinct from p_class_id or v_old.start_at is distinct from p_start_at
    or v_old.end_at is distinct from p_end_at
  ) then raise exception using errcode='22023', message='historical session fields are locked'; end if;

  if v_old.status='scheduled' and v_old.class_id is distinct from p_class_id then
    delete from public.spokedu_master_session_attendance
     where owner_id=p_owner_id and session_id=p_session_id;
  end if;
  v_completed_at := case
    when v_old.status='completed' then v_old.completed_at
    when p_status='completed' then now()
    else null
  end;
  update public.spokedu_master_sessions set
    class_id=p_class_id,
    class_name_snapshot=case when v_old.status='scheduled' then v_class_name else v_old.class_name_snapshot end,
    start_at=p_start_at,end_at=p_end_at,status=p_status,memo=nullif(btrim(p_memo),''),completed_at=v_completed_at
  where id=p_session_id returning id into v_id;
  return v_id;
end $$;
