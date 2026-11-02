-- Stage legacy holdings without inventing warehouse totals or historic loans.
-- Actual rental/ledger import is atomic with an administrator's physical count.
create table if not exists private.equipment_legacy_import_rows (
  inventory_id bigint primary key,
  catalog_id bigint references public.catalog(id) on delete restrict,
  owner_id uuid not null,
  source_name text not null,
  source_quantity integer not null,
  source_hash text not null,
  resolution text not null check (resolution in ('mapped','pending')),
  reason text,
  snapshot_at timestamptz not null default now(),
  imported_rental_id uuid unique references public.equipment_rentals(rental_id),
  imported_at timestamptz
);
revoke all on private.equipment_legacy_import_rows from public,anon,authenticated;
grant select,insert,update on private.equipment_legacy_import_rows to service_role;

-- A zero physical count is valid; transactional event quantities stay positive.
alter table public.equipment_ledger drop constraint equipment_ledger_qty_check;
alter table public.equipment_ledger add constraint equipment_ledger_qty_check
  check (qty > 0 or (qty = 0 and event_type = 'OPENING_BALANCE_MIGRATION'));

-- current_user inside a SECURITY DEFINER trigger is its owner, not its caller.
create or replace function private.equipment_allow_legacy_service_mutation()
returns boolean language sql stable set search_path=pg_catalog,auth,public as $$
  select auth.role() = 'service_role'
    or (auth.role() is null and auth.uid() is null and session_user in ('postgres','supabase_admin'));
$$;

alter function public.admin_equipment_opening_balance(bigint,integer,integer,text,text,uuid,jsonb) set schema private;
alter function private.admin_equipment_opening_balance(bigint,integer,integer,text,text,uuid,jsonb)
  rename to equipment_opening_balance_core;

create function public.admin_equipment_opening_balance(
  p_catalog_id bigint,p_qty_on_hand_total integer,p_qty_quarantine integer,
  p_request_key text,p_note text default null,p_created_by uuid default null,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare
  c public.catalog%rowtype;
  stage_row private.equipment_legacy_import_rows%rowtype;
  required_qty bigint;
  rental uuid;
  v_result jsonb;
begin
  select * into c from public.catalog where id=p_catalog_id for update;
  if not found then raise exception 'EQUIPMENT_CATALOG_NOT_FOUND'; end if;
  -- Serialize against existing snapshot writes while verifying this count.
  lock table public.inventory in share mode;
  if exists(select 1 from private.equipment_legacy_import_rows s
      where s.imported_rental_id is null and s.resolution='pending'
      and (s.catalog_id=p_catalog_id or btrim(s.source_name)=btrim(c.name))) then
    raise exception 'EQUIPMENT_LEGACY_MAPPING_PENDING';
  end if;
  if exists(select 1 from private.equipment_legacy_import_rows s
      left join public.inventory i on i.id=s.inventory_id
      where s.catalog_id=p_catalog_id and s.imported_rental_id is null
      and (i.id is null or md5(to_jsonb(i)::text)<>s.source_hash))
    or exists(select 1 from public.inventory i where btrim(i.name)=btrim(c.name)
      and not exists(select 1 from private.equipment_legacy_import_rows s where s.inventory_id=i.id)) then
    raise exception 'EQUIPMENT_LEGACY_SNAPSHOT_CHANGED';
  end if;
  select coalesce(sum(source_quantity),0) into required_qty
    from private.equipment_legacy_import_rows
    where catalog_id=p_catalog_id and resolution='mapped' and imported_rental_id is null;
  if p_qty_on_hand_total is not null and p_qty_quarantine is not null
     and p_qty_on_hand_total < required_qty+p_qty_quarantine then
    raise exception 'EQUIPMENT_OPENING_BELOW_LEGACY_HOLDINGS';
  end if;
  v_result := private.equipment_opening_balance_core(p_catalog_id,p_qty_on_hand_total,p_qty_quarantine,
    p_request_key,p_note,p_created_by,p_metadata);
  if coalesce((v_result->>'replayed')::boolean,false) then return v_result; end if;
  -- Freeze old inventory writes only when an actual counted opening is committed.
  perform public.equipment_ops_set_legacy_writes_blocked(true);
  for stage_row in select * from private.equipment_legacy_import_rows
      where catalog_id=p_catalog_id and resolution='mapped' and imported_rental_id is null
      order by inventory_id for update loop
    insert into public.equipment_rentals(catalog_id,teacher_id,qty_lent,qty_returned,qty_outstanding,opened_at)
      values(p_catalog_id,stage_row.owner_id,stage_row.source_quantity,0,stage_row.source_quantity,now()) returning rental_id into rental;
    insert into public.equipment_ledger(event_type,catalog_id,teacher_id,rental_id,qty,note,metadata,created_by)
      values('RENT',p_catalog_id,stage_row.owner_id,rental,stage_row.source_quantity,'기존 보유 스냅샷 이관',
        jsonb_build_object('source','LEGACY_INVENTORY_SNAPSHOT','inventory_id',stage_row.inventory_id,
          'snapshot_at',stage_row.snapshot_at,'historical_loan_date_known',false),p_created_by);
    update private.equipment_legacy_import_rows set imported_rental_id=rental,imported_at=now()
      where inventory_id=stage_row.inventory_id;
  end loop;
  v_result := v_result || private.equipment_catalog_snapshot(p_catalog_id)
    || jsonb_build_object('legacy_imported_quantity',required_qty);
  update private.equipment_request_results r set result=v_result
    where r.request_key=p_request_key;
  return v_result;
end;
$$;
revoke all on function public.admin_equipment_opening_balance(bigint,integer,integer,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_equipment_opening_balance(bigint,integer,integer,text,text,uuid,jsonb) to service_role;

create function public.equipment_legacy_import_status(p_teacher_id uuid default null)
returns jsonb language sql stable security definer set search_path=pg_catalog,public,private as $$
 select jsonb_build_object(
   'staged_rows',(select count(*) from private.equipment_legacy_import_rows),
   'pending_rows',(select count(*) from private.equipment_legacy_import_rows where resolution='pending'),
   'imported_rows',(select count(*) from private.equipment_legacy_import_rows where imported_rental_id is not null),
   'pending_items',coalesce((select jsonb_agg(jsonb_build_object('inventory_id',inventory_id,
      'name',source_name,'quantity',source_quantity,'reason',reason) order by inventory_id)
      from private.equipment_legacy_import_rows where resolution='pending'),'[]'::jsonb),
   'catalogs',coalesce((select jsonb_agg(jsonb_build_object('catalog_id',c.id,
      'legacy_qty_held',coalesce((select sum(source_quantity) from private.equipment_legacy_import_rows
        where catalog_id=c.id and resolution='mapped' and imported_rental_id is null),0),
      'legacy_mapping_pending',exists(select 1 from private.equipment_legacy_import_rows
        where resolution='pending' and (catalog_id=c.id or btrim(source_name)=btrim(c.name))))) from public.catalog c),'[]'::jsonb),
   'unmigrated_items',coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.inventory i
     where (p_teacher_id is null or i.user_id=p_teacher_id)
     and not exists(select 1 from private.equipment_legacy_import_rows s
       where s.inventory_id=i.id and s.imported_rental_id is not null)),'[]'::jsonb)
 );
$$;
revoke all on function public.equipment_legacy_import_status(uuid) from public,anon,authenticated;
grant execute on function public.equipment_legacy_import_status(uuid) to service_role;

-- Stock adjustments cannot create an implicit opening or overwrite drift.
do $$
declare signature text; definition text;
begin
  foreach signature in array array[
    'public.admin_equipment_adjust_on_hand(bigint,integer,text,text,uuid)',
    'public.admin_equipment_quarantine_adjust(bigint,integer,text,text,uuid)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    definition := regexp_replace(definition, E'\nbegin\n', E'\nbegin\n'
      || '  if not private.equipment_opening_confirmed(p_catalog_id) then raise exception ''EQUIPMENT_OPENING_NOT_CONFIRMED''; end if;'
      || E'\n  if private.equipment_catalog_cache_drifted(p_catalog_id) then raise exception ''EQUIPMENT_CACHE_DRIFT''; end if;\n', 'i');
    execute definition;
  end loop;
end $$;
notify pgrst,'reload schema';
