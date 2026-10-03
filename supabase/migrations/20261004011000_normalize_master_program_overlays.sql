do $$
declare
  v_updated integer;
begin
  if exists (
    with expected(curriculum_id, canonical_id, noncanonical_id) as (
      values
        (40, 23, 1294),
        (43, 28, 1295),
        (92, 1296, 82),
        (119, 1297, 110),
        (124, 114, 1298),
        (155, 1303, 144),
        (191, 948, 1304),
        (193, 808, 1293),
        (204, 1329, 1313)
    )
    select 1
    from expected e
    left join public.spokedu_pro_programs canonical
      on canonical.id = e.canonical_id
     and canonical.source_center_curriculum_id = e.curriculum_id
     and canonical.is_published = true
    left join public.spokedu_pro_programs noncanonical
      on noncanonical.id = e.noncanonical_id
     and noncanonical.source_center_curriculum_id = e.curriculum_id
     and noncanonical.is_published = true
    where canonical.id is null
       or noncanonical.id is null
       or coalesce(canonical.updated_at, '-infinity'::timestamptz) < coalesce(noncanonical.updated_at, '-infinity'::timestamptz)
       or (
         coalesce(canonical.updated_at, '-infinity'::timestamptz) = coalesce(noncanonical.updated_at, '-infinity'::timestamptz)
         and canonical.id <= noncanonical.id
       )
  ) then
    raise exception 'MASTER program overlay normalization precondition failed';
  end if;

  update public.spokedu_pro_programs program
  set is_published = false
  from (
    values
      (40, 1294),
      (43, 1295),
      (92, 82),
      (119, 110),
      (124, 1298),
      (155, 144),
      (191, 1304),
      (193, 1293),
      (204, 1313)
  ) as target(curriculum_id, noncanonical_id)
  where program.id = target.noncanonical_id
    and program.source_center_curriculum_id = target.curriculum_id
    and program.is_published = true;

  get diagnostics v_updated = row_count;
  if v_updated <> 9 then
    raise exception 'MASTER program overlay normalization expected 9 rows, updated %', v_updated;
  end if;
end
$$;
