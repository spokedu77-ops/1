-- FOUNDATION RESET v2.1 ERRATA, Favorites migration STEP 2-4.
-- Run only after 20260902070028 added the nullable checked content_type.
-- Verified lineage: repository figure-8 -> figure-8-agility rename, and exactly
-- one current eligible catalog row titled `8자 agility drill`.

do $$
declare
  before_favorites bigint;
  before_owners bigint;
  target_program_id text;
  target_count integer;
  owner_collisions bigint;
  unknown_count bigint;
  duplicate_count bigint;
begin
  select count(*), count(distinct owner_id)
    into before_favorites, before_owners
  from public.spokedu_master_program_favorites;

  select count(*), min(c.id)::text into target_count, target_program_id
  from public.curriculum c
  join public.spokedu_pro_programs p
    on p.source_center_curriculum_id = c.id and p.is_published is true
  join public.spokedu_master_program_meta m on m.curriculum_id = c.id
  where c.is_sub is false and c.title = '8자 agility drill';
  if target_count <> 1 then
    raise exception 'Verified figure-8 target drifted: expected 1 row, found %', target_count;
  end if;

  select count(*) into owner_collisions
  from public.spokedu_master_program_favorites legacy
  where legacy.program_id = 'figure-8'
    and exists (
      select 1 from public.spokedu_master_program_favorites canonical
      where canonical.owner_id = legacy.owner_id
        and canonical.program_id = target_program_id
    );
  if owner_collisions <> 0 then
    raise exception 'Verified figure-8 remap has % owner collisions', owner_collisions;
  end if;

  update public.spokedu_master_program_favorites
  set program_id = target_program_id
  where program_id = 'figure-8';

  update public.spokedu_master_program_favorites f
  set content_type = 'program'
  where content_type is null
    and exists (
      select 1
      from public.curriculum c
      join public.spokedu_pro_programs p
        on p.source_center_curriculum_id = c.id and p.is_published is true
      join public.spokedu_master_program_meta m on m.curriculum_id = c.id
      where c.is_sub is false and c.id::text = f.program_id
    );

  update public.spokedu_master_program_favorites
  set content_type = 'spomove'
  where content_type is null and program_id = any (array[
    'dive-random', 'dive-standard', 'flanker-random-43',
    'reaction-cognition-full-animal-18', 'reaction-cognition-full-color-03',
    'reaction-cognition-l5-food-exp', 'reaction-cognition-l6-food-exp',
    'reaction-cognition-mq3-34', 'reaction-cognition-space-direction-01',
    'reaction-cognition-split-color-04', 'sequential-memory-5color-51',
    'simon-pole-shape-06', 'stroop-word-reverse-48',
    'visual-reaction-blackout-37', 'visual-reaction-flow-2x-31',
    'visual-reaction-goalkeeper-42'
  ]::text[]);

  select count(*) into unknown_count
  from public.spokedu_master_program_favorites where content_type is null;
  if unknown_count <> 0 then
    raise exception 'Typed favorites backfill left % unknown rows', unknown_count;
  end if;
  if (select count(*) from public.spokedu_master_program_favorites) <> before_favorites then
    raise exception 'Favorite count parity failed';
  end if;
  if (select count(distinct owner_id) from public.spokedu_master_program_favorites) <> before_owners then
    raise exception 'Favorite owner count parity failed';
  end if;

  select count(*) into duplicate_count from (
    select owner_id, content_type, program_id
    from public.spokedu_master_program_favorites
    group by owner_id, content_type, program_id
    having count(*) > 1
  ) duplicates;
  if duplicate_count <> 0 then
    raise exception 'Typed favorite duplicate parity failed: % keys', duplicate_count;
  end if;
end $$;
