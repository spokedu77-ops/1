-- FOUNDATION RESET v2.1 ERRATA, Favorites STEP 5 hardening.
-- This follows the audited nullable backfill; it does not recreate the table.

do $$
begin
  if exists (
    select 1 from public.spokedu_master_program_favorites
    where content_type is null
  ) then
    raise exception 'Cannot harden typed favorites while content_type NULL rows exist';
  end if;

  if exists (
    select 1
    from public.spokedu_master_program_favorites
    group by owner_id, content_type, program_id
    having count(*) > 1
  ) then
    raise exception 'Cannot harden typed favorites while duplicate typed keys exist';
  end if;
end $$;

alter table public.spokedu_master_program_favorites
  alter column content_type set not null;

alter table public.spokedu_master_program_favorites
  drop constraint if exists spokedu_master_program_favorites_owner_program_unique;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.spokedu_master_program_favorites'::regclass
      and conname = 'spokedu_master_program_favorites_owner_type_program_unique'
  ) then
    alter table public.spokedu_master_program_favorites
      add constraint spokedu_master_program_favorites_owner_type_program_unique
      unique (owner_id, content_type, program_id);
  end if;
end $$;
