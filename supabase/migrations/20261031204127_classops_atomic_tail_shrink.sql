-- Atomic tail deletion and round updates; existing admin authorization remains at the API.
create or replace function public.admin_apply_session_tail_shrink(
 p_group_id uuid, p_expected jsonb, p_remove_ids uuid[], p_round_updates jsonb
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_item jsonb; v_row public.sessions%rowtype; v_baseline public.sessions%rowtype; v_count integer; v_deleted integer;
begin
 if jsonb_typeof(p_expected) is distinct from 'array' or jsonb_typeof(p_round_updates) is distinct from 'array'
 or jsonb_array_length(p_expected) not between 1 and 1000 or coalesce(cardinality(p_remove_ids),0)<1
 or cardinality(p_remove_ids)<>(select count(distinct x) from unnest(p_remove_ids) x)
 or jsonb_array_length(p_expected)<>(select count(distinct x->>'id') from jsonb_array_elements(p_expected) x)
 or jsonb_array_length(p_round_updates)<>(select count(distinct x->>'id') from jsonb_array_elements(p_round_updates) x) then
  raise exception using errcode='22023',message='SESSION_SHRINK_INVALID';
 end if;
 -- Same group requests serialize even when one leaves no session rows.
 perform pg_advisory_xact_lock(742022, pg_catalog.hashtext(p_group_id::text));
 perform 1 from public.sessions where group_id=p_group_id order by id for update;
 get diagnostics v_count = row_count;
 if v_count<>jsonb_array_length(p_expected) then raise exception using errcode='40001',message='SESSION_SHRINK_STALE'; end if;
 for v_item in select value from jsonb_array_elements(p_expected) loop
  if not (v_item ?& array['id','start_at','end_at','created_by','memo','price','status','round_index','round_total']) then
   raise exception using errcode='22023',message='SESSION_SHRINK_INVALID';
  end if;
  select * into v_baseline from jsonb_populate_record(null::public.sessions,v_item);
  select * into v_row from public.sessions where id=v_baseline.id and group_id=p_group_id;
  if not found or row(v_row.start_at,v_row.end_at,v_row.created_by,v_row.memo,v_row.price,v_row.status,v_row.round_index,v_row.round_total)
   is distinct from row(v_baseline.start_at,v_baseline.end_at,v_baseline.created_by,v_baseline.memo,v_baseline.price,v_baseline.status,v_baseline.round_index,v_baseline.round_total) then
   raise exception using errcode='40001',message='SESSION_SHRINK_STALE';
  end if;
 end loop;
 if cardinality(p_remove_ids)<>(select count(*) from public.sessions where group_id=p_group_id and id=any(p_remove_ids)) then
  raise exception using errcode='40001',message='SESSION_SHRINK_STALE';
 end if;
 if exists(select 1 from jsonb_array_elements(p_round_updates) item
  where exists(select 1 from jsonb_object_keys(item) k where k not in ('id','round_index','round_total','sequence_number','round_display'))
   or not (item ?& array['id','round_total'])
   or (item->>'round_total')::integer<1
   or not exists(select 1 from public.sessions where id=(item->>'id')::uuid and group_id=p_group_id and not(id=any(p_remove_ids)) and coalesce(status,'')<>'deleted')) then
  raise exception using errcode='22023',message='SESSION_SHRINK_INVALID';
 end if;
 if jsonb_array_length(p_round_updates)<>(select count(*) from public.sessions where group_id=p_group_id and not(id=any(p_remove_ids)) and coalesce(status,'')<>'deleted') then
  raise exception using errcode='22023',message='SESSION_SHRINK_INVALID';
 end if;
 delete from public.sessions where group_id=p_group_id and id=any(p_remove_ids);
 get diagnostics v_deleted = row_count;
 for v_item in select value from jsonb_array_elements(p_round_updates) loop
  update public.sessions set
   round_total=(v_item->>'round_total')::integer,
   round_index=case when v_item?'round_index' then (v_item->>'round_index')::integer else round_index end,
   sequence_number=case when v_item?'sequence_number' then (v_item->>'sequence_number')::integer else sequence_number end,
   round_display=case when v_item?'round_display' then v_item->>'round_display' else round_display end
  where id=(v_item->>'id')::uuid and group_id=p_group_id;
 end loop;
 return v_deleted;
end $$;
revoke all on function public.admin_apply_session_tail_shrink(uuid,jsonb,uuid[],jsonb) from public,anon,authenticated;
grant execute on function public.admin_apply_session_tail_shrink(uuid,jsonb,uuid[],jsonb) to service_role;
