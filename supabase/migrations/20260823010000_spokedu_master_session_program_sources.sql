-- SessionProgram remains the single ordered activity item for a Session.
-- It may reference either a curriculum Program or an official SPOMOVE preset.

alter table public.spokedu_master_session_programs
  add column if not exists source_type text not null default 'program',
  add column if not exists spomove_preset_id text null;

alter table public.spokedu_master_session_programs
  alter column program_id drop not null;

update public.spokedu_master_session_programs
set source_type = 'program'
where source_type is distinct from 'program' and program_id is not null;

alter table public.spokedu_master_session_programs
  drop constraint if exists spokedu_master_session_programs_source_check;
alter table public.spokedu_master_session_programs
  add constraint spokedu_master_session_programs_source_check check (
    (source_type = 'program' and program_id is not null and spomove_preset_id is null)
    or
    (source_type = 'spomove' and program_id is null and nullif(btrim(spomove_preset_id), '') is not null)
  );

create unique index if not exists spokedu_master_session_programs_spomove_unique
  on public.spokedu_master_session_programs(session_id, spomove_preset_id)
  where source_type = 'spomove';

create or replace function public.spokedu_master_add_session_spomove(
  p_owner_id uuid, p_session_id uuid, p_preset_id text, p_title text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  if nullif(btrim(p_preset_id), '') is null or nullif(btrim(p_title), '') is null then
    raise exception using errcode='22023', message='invalid spomove preset';
  end if;
  if not exists (
    select 1 from public.spokedu_master_sessions
    where id=p_session_id and owner_id=p_owner_id and status='scheduled' and deleted_at is null
    for update
  ) then
    raise exception using errcode='22023', message='activities can only be added to scheduled sessions';
  end if;
  insert into public.spokedu_master_session_programs(
    owner_id,session_id,source_type,program_id,spomove_preset_id,
    program_title_snapshot,sort_order,is_completed
  )
  select p_owner_id,p_session_id,'spomove',null,btrim(p_preset_id),btrim(p_title),
    coalesce(max(sort_order)+1,0),false
  from public.spokedu_master_session_programs where session_id=p_session_id
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.spokedu_master_add_session_spomove(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.spokedu_master_add_session_spomove(uuid,uuid,text,text) to service_role;
