-- Read-only cache drift detection; blocks mutating RPCs when catalog T/Q diverges from ledger replay.

create or replace function private.equipment_replay_catalog_cache(p_catalog_id bigint)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_t integer := 0;
  v_q integer := 0;
  v_row public.equipment_ledger%rowtype;
  v_delta integer;
begin
  for v_row in
    select *
    from public.equipment_ledger el
    where el.catalog_id = p_catalog_id
    order by el.occurred_at asc, el.created_at asc
  loop
    case v_row.event_type
      when 'OPENING_BALANCE_MIGRATION' then
        v_t := v_row.qty;
        v_q := coalesce((v_row.metadata->>'qty_quarantine')::integer, v_q);
      when 'ADJUST_ON_HAND' then
        v_delta := coalesce((v_row.metadata->>'delta')::integer, 0);
        v_t := v_t + v_delta;
      when 'QUARANTINE_SET' then
        v_delta := coalesce((v_row.metadata->>'delta')::integer, v_row.qty);
        v_q := v_q + v_delta;
      when 'QUARANTINE_RELEASE' then
        v_delta := coalesce((v_row.metadata->>'delta')::integer, -v_row.qty);
        v_q := v_q + v_delta;
      else
        null;
    end case;
  end loop;

  return jsonb_build_object('qty_on_hand_total', v_t, 'qty_quarantine', v_q);
end;
$$;

revoke all on function private.equipment_replay_catalog_cache(bigint) from public, anon, authenticated;
grant execute on function private.equipment_replay_catalog_cache(bigint) to service_role;

create or replace function private.equipment_catalog_cache_drifted(p_catalog_id bigint)
returns boolean
language plpgsql
stable
set search_path = pg_catalog, public, private
as $$
declare
  v_catalog public.catalog%rowtype;
  v_replay jsonb;
  v_t integer;
  v_q integer;
begin
  select * into v_catalog from public.catalog where id = p_catalog_id;
  if not found then
    return false;
  end if;

  if not private.equipment_opening_confirmed(p_catalog_id) then
    return false;
  end if;

  v_replay := private.equipment_replay_catalog_cache(p_catalog_id);
  v_t := coalesce((v_replay->>'qty_on_hand_total')::integer, 0);
  v_q := coalesce((v_replay->>'qty_quarantine')::integer, 0);

  return v_catalog.qty_on_hand_total is distinct from v_t
      or v_catalog.qty_quarantine is distinct from v_q;
end;
$$;

revoke all on function private.equipment_catalog_cache_drifted(bigint) from public, anon, authenticated;
grant execute on function private.equipment_catalog_cache_drifted(bigint) to service_role;

-- Store opening Q in ledger metadata for replay (opening RPC only).
create or replace function public.admin_equipment_opening_balance(
  p_catalog_id bigint,
  p_qty_on_hand_total integer,
  p_qty_quarantine integer,
  p_request_key text,
  p_note text default null,
  p_created_by uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payload_hash text;
  v_saved private.equipment_request_results%rowtype;
  v_catalog public.catalog%rowtype;
  v_ledger_id uuid;
  v_result jsonb;
  v_meta jsonb;
begin
  if p_catalog_id is null or p_qty_on_hand_total is null or p_qty_on_hand_total < 0
    or p_qty_quarantine is null or p_qty_quarantine < 0
    or p_qty_quarantine > p_qty_on_hand_total
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'EQUIPMENT_REQUEST_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_catalog_id::text, p_qty_on_hand_total::text, p_qty_quarantine::text, 'OPENING')
  );

  select * into v_saved
  from private.equipment_request_results
  where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'opening' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'EQUIPMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_catalog
  from public.catalog
  where id = p_catalog_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'EQUIPMENT_CATALOG_NOT_FOUND';
  end if;

  if private.equipment_opening_confirmed(p_catalog_id) then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_OPENING_ALREADY_CONFIRMED';
  end if;

  update public.catalog
  set
    qty_on_hand_total = p_qty_on_hand_total,
    qty_quarantine = p_qty_quarantine
  where id = p_catalog_id;

  v_meta := coalesce(p_metadata, '{}'::jsonb)
    || jsonb_build_object('qty_quarantine', p_qty_quarantine);

  v_ledger_id := gen_random_uuid();
  insert into public.equipment_ledger (
    ledger_id, event_type, catalog_id, qty, note, metadata, created_by
  ) values (
    v_ledger_id,
    'OPENING_BALANCE_MIGRATION',
    p_catalog_id,
    p_qty_on_hand_total,
    p_note,
    v_meta,
    p_created_by
  );

  v_result := private.equipment_catalog_snapshot(p_catalog_id)
    || jsonb_build_object('ledger_id', v_ledger_id, 'event_type', 'OPENING_BALANCE_MIGRATION');

  insert into private.equipment_request_results (request_key, operation, payload_hash, result)
  values (p_request_key, 'opening', v_payload_hash, v_result);

  return v_result;
end;
$$;

-- Append drift guard to mutating RPCs (rent excerpt — full bodies replaced via CREATE OR REPLACE in file).

create or replace function public.admin_equipment_rent(
  p_catalog_id bigint,
  p_teacher_id uuid,
  p_qty integer,
  p_request_key text,
  p_note text default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payload_hash text;
  v_saved private.equipment_request_results%rowtype;
  v_catalog public.catalog%rowtype;
  v_l integer;
  v_a integer;
  v_rental_id uuid;
  v_ledger_id uuid;
  v_result jsonb;
begin
  if private.equipment_catalog_cache_drifted(p_catalog_id) then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_CACHE_DRIFT';
  end if;

  if p_catalog_id is null or p_teacher_id is null or p_qty is null or p_qty <= 0
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'EQUIPMENT_REQUEST_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_catalog_id::text, p_teacher_id::text, p_qty::text, 'RENT')
  );

  select * into v_saved
  from private.equipment_request_results
  where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'rent' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'EQUIPMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_catalog
  from public.catalog
  where id = p_catalog_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'EQUIPMENT_CATALOG_NOT_FOUND';
  end if;

  if not private.equipment_opening_confirmed(p_catalog_id) then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_OPENING_NOT_CONFIRMED';
  end if;

  v_l := private.equipment_lent_total(p_catalog_id);
  v_a := v_catalog.qty_on_hand_total - v_l - v_catalog.qty_quarantine;
  if p_qty > v_a then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_INSUFFICIENT_AVAILABLE';
  end if;

  v_rental_id := gen_random_uuid();
  insert into public.equipment_rentals (
    rental_id, catalog_id, teacher_id, qty_lent, qty_returned, qty_outstanding, status, opened_at
  ) values (
    v_rental_id, p_catalog_id, p_teacher_id, p_qty, 0, p_qty, 'active', now()
  );

  v_ledger_id := gen_random_uuid();
  insert into public.equipment_ledger (
    ledger_id, event_type, catalog_id, teacher_id, rental_id, qty, note, created_by
  ) values (
    v_ledger_id, 'RENT', p_catalog_id, p_teacher_id, v_rental_id, p_qty, p_note, p_created_by
  );

  v_result := private.equipment_catalog_snapshot(p_catalog_id)
    || jsonb_build_object(
      'rental_id', v_rental_id,
      'ledger_id', v_ledger_id,
      'qty_rented', p_qty
    );

  insert into private.equipment_request_results (request_key, operation, payload_hash, result)
  values (p_request_key, 'rent', v_payload_hash, v_result);

  return v_result;
end;
$$;

create or replace function public.equipment_catalog_cache_drifted(p_catalog_id bigint)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select private.equipment_catalog_cache_drifted(p_catalog_id);
$$;

revoke all on function public.equipment_catalog_cache_drifted(bigint) from public, anon, authenticated;
grant execute on function public.equipment_catalog_cache_drifted(bigint) to service_role;
