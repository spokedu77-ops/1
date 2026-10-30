-- Equipment inventory Stage 1: ledger SSOT, rentals, admin RPCs (local / ops apply only).
-- Preserves legacy catalog, inventory, inventory_logs, teacher_inventory.

create type public.equipment_event_type as enum (
  'OPENING_BALANCE_MIGRATION',
  'RENT',
  'RETURN_CONFIRM',
  'ADJUST_ON_HAND',
  'QUARANTINE_SET',
  'QUARANTINE_RELEASE'
);

alter table public.catalog
  add column if not exists mgmt_code text,
  add column if not exists qty_on_hand_total integer not null default 0,
  add column if not exists qty_quarantine integer not null default 0;

alter table public.catalog
  drop constraint if exists catalog_qty_on_hand_total_nonneg;
alter table public.catalog
  add constraint catalog_qty_on_hand_total_nonneg check (qty_on_hand_total >= 0);

alter table public.catalog
  drop constraint if exists catalog_qty_quarantine_nonneg;
alter table public.catalog
  add constraint catalog_qty_quarantine_nonneg check (qty_quarantine >= 0);

create unique index if not exists catalog_mgmt_code_unique
  on public.catalog (mgmt_code)
  where mgmt_code is not null;

create table if not exists public.equipment_rentals (
  rental_id uuid primary key default gen_random_uuid(),
  catalog_id bigint not null references public.catalog (id) on delete restrict,
  teacher_id uuid not null references public.users (id) on delete restrict,
  qty_lent integer not null check (qty_lent > 0),
  qty_returned integer not null default 0 check (qty_returned >= 0),
  qty_outstanding integer not null check (qty_outstanding >= 0),
  status text not null default 'active' check (status in ('active', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint equipment_rentals_returned_lte_lent check (qty_returned <= qty_lent),
  constraint equipment_rentals_outstanding_consistent check (qty_outstanding = qty_lent - qty_returned)
);

create index if not exists idx_equipment_rentals_catalog_active
  on public.equipment_rentals (catalog_id)
  where status = 'active' and qty_outstanding > 0;

create index if not exists idx_equipment_rentals_teacher
  on public.equipment_rentals (teacher_id);

create table if not exists public.equipment_ledger (
  ledger_id uuid primary key default gen_random_uuid(),
  event_type public.equipment_event_type not null,
  catalog_id bigint not null references public.catalog (id) on delete restrict,
  teacher_id uuid references public.users (id) on delete set null,
  rental_id uuid references public.equipment_rentals (rental_id) on delete restrict,
  qty integer not null check (qty > 0),
  metadata jsonb not null default '{}'::jsonb,
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_equipment_ledger_catalog_occurred
  on public.equipment_ledger (catalog_id, occurred_at desc);

create index if not exists idx_equipment_ledger_rental
  on public.equipment_ledger (rental_id)
  where rental_id is not null;

create table if not exists private.equipment_request_results (
  request_key text primary key,
  operation text not null,
  payload_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint equipment_request_key_length check (char_length(request_key) between 16 and 128)
);

revoke all on table private.equipment_request_results from public, anon, authenticated;
grant select, insert on table private.equipment_request_results to service_role;

create or replace function private.equipment_lent_total(p_catalog_id bigint)
returns integer
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(sum(r.qty_outstanding), 0)::integer
  from public.equipment_rentals r
  where r.catalog_id = p_catalog_id
    and r.status = 'active'
    and r.qty_outstanding > 0;
$$;

revoke all on function private.equipment_lent_total(bigint) from public, anon, authenticated;
grant execute on function private.equipment_lent_total(bigint) to service_role;

create or replace function private.equipment_catalog_snapshot(p_catalog_id bigint)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  v_t integer;
  v_q integer;
  v_l integer;
  v_w integer;
  v_a integer;
begin
  select c.qty_on_hand_total, c.qty_quarantine
  into v_t, v_q
  from public.catalog c
  where c.id = p_catalog_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'EQUIPMENT_CATALOG_NOT_FOUND';
  end if;
  v_l := private.equipment_lent_total(p_catalog_id);
  v_w := v_t - v_l;
  v_a := v_t - v_l - v_q;
  return jsonb_build_object(
    'catalog_id', p_catalog_id,
    'qty_on_hand_total', v_t,
    'qty_quarantine', v_q,
    'qty_lent', v_l,
    'qty_warehouse', v_w,
    'qty_available', v_a
  );
end;
$$;

revoke all on function private.equipment_catalog_snapshot(bigint) from public, anon, authenticated;
grant execute on function private.equipment_catalog_snapshot(bigint) to service_role;

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

create or replace function public.admin_equipment_return(
  p_rental_id uuid,
  p_qty integer,
  p_request_key text,
  p_note text default null,
  p_confirmed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_payload_hash text;
  v_saved private.equipment_request_results%rowtype;
  v_rental public.equipment_rentals%rowtype;
  v_new_returned integer;
  v_new_outstanding integer;
  v_ledger_id uuid;
  v_result jsonb;
begin
  if p_rental_id is null or p_qty is null or p_qty <= 0
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'EQUIPMENT_REQUEST_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_rental_id::text, p_qty::text, 'RETURN_CONFIRM')
  );

  select * into v_saved
  from private.equipment_request_results
  where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'return' or v_saved.payload_hash <> v_payload_hash then
      raise exception using errcode = '23505', message = 'EQUIPMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return v_saved.result || jsonb_build_object('replayed', true);
  end if;

  select * into v_rental
  from public.equipment_rentals
  where rental_id = p_rental_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'EQUIPMENT_RENTAL_NOT_FOUND';
  end if;
  if v_rental.status = 'closed' and v_rental.qty_outstanding = 0 then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_RENTAL_ALREADY_CLOSED';
  end if;
  if p_qty > v_rental.qty_outstanding then
    raise exception using errcode = 'P0001', message = 'RETURN_EXCEEDS_OUTSTANDING';
  end if;

  perform 1 from public.catalog where id = v_rental.catalog_id for update;

  v_new_returned := v_rental.qty_returned + p_qty;
  v_new_outstanding := v_rental.qty_lent - v_new_returned;

  update public.equipment_rentals
  set
    qty_returned = v_new_returned,
    qty_outstanding = v_new_outstanding,
    status = case when v_new_outstanding = 0 then 'closed' else 'active' end,
    closed_at = case when v_new_outstanding = 0 then now() else closed_at end
  where rental_id = p_rental_id;

  v_ledger_id := gen_random_uuid();
  insert into public.equipment_ledger (
    ledger_id, event_type, catalog_id, teacher_id, rental_id, qty, note, created_by
  ) values (
    v_ledger_id, 'RETURN_CONFIRM', v_rental.catalog_id, v_rental.teacher_id,
    p_rental_id, p_qty, p_note, p_confirmed_by
  );

  v_result := private.equipment_catalog_snapshot(v_rental.catalog_id)
    || jsonb_build_object(
      'rental_id', p_rental_id,
      'ledger_id', v_ledger_id,
      'qty_returned', p_qty,
      'qty_outstanding_after', v_new_outstanding
    );

  insert into private.equipment_request_results (request_key, operation, payload_hash, result)
  values (p_request_key, 'return', v_payload_hash, v_result);

  return v_result;
end;
$$;

create or replace function public.admin_equipment_adjust_on_hand(
  p_catalog_id bigint,
  p_delta integer,
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
  v_new_t integer;
  v_ledger_id uuid;
  v_result jsonb;
  v_abs_qty integer;
begin
  if p_catalog_id is null or p_delta is null or p_delta = 0
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'EQUIPMENT_REQUEST_INVALID';
  end if;

  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_catalog_id::text, p_delta::text, 'ADJUST_ON_HAND')
  );

  select * into v_saved
  from private.equipment_request_results
  where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'adjust_on_hand' or v_saved.payload_hash <> v_payload_hash then
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

  v_l := private.equipment_lent_total(p_catalog_id);
  v_new_t := v_catalog.qty_on_hand_total + p_delta;
  if v_new_t < v_l + v_catalog.qty_quarantine then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_ADJUST_BELOW_COMMITTED';
  end if;

  update public.catalog
  set qty_on_hand_total = v_new_t
  where id = p_catalog_id;

  v_abs_qty := abs(p_delta);
  v_ledger_id := gen_random_uuid();
  insert into public.equipment_ledger (
    ledger_id, event_type, catalog_id, qty, note, metadata, created_by
  ) values (
    v_ledger_id,
    'ADJUST_ON_HAND',
    p_catalog_id,
    v_abs_qty,
    p_note,
    jsonb_build_object('delta', p_delta),
    p_created_by
  );

  v_result := private.equipment_catalog_snapshot(p_catalog_id)
    || jsonb_build_object('ledger_id', v_ledger_id, 'delta', p_delta);

  insert into private.equipment_request_results (request_key, operation, payload_hash, result)
  values (p_request_key, 'adjust_on_hand', v_payload_hash, v_result);

  return v_result;
end;
$$;

create or replace function public.admin_equipment_quarantine_adjust(
  p_catalog_id bigint,
  p_delta integer,
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
  v_new_q integer;
  v_a integer;
  v_ledger_id uuid;
  v_result jsonb;
  v_event public.equipment_event_type;
  v_abs_qty integer;
begin
  if p_catalog_id is null or p_delta is null or p_delta = 0
    or char_length(coalesce(p_request_key, '')) not between 16 and 128 then
    raise exception using errcode = '22023', message = 'EQUIPMENT_REQUEST_INVALID';
  end if;

  v_event := case when p_delta > 0 then 'QUARANTINE_SET'::public.equipment_event_type
             else 'QUARANTINE_RELEASE'::public.equipment_event_type end;

  v_payload_hash := pg_catalog.md5(
    concat_ws('|', p_catalog_id::text, p_delta::text, v_event::text)
  );

  select * into v_saved
  from private.equipment_request_results
  where request_key = p_request_key;
  if found then
    if v_saved.operation <> 'quarantine' or v_saved.payload_hash <> v_payload_hash then
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

  v_l := private.equipment_lent_total(p_catalog_id);
  v_new_q := v_catalog.qty_quarantine + p_delta;
  if v_new_q < 0 then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_QUARANTINE_NEGATIVE';
  end if;
  v_a := v_catalog.qty_on_hand_total - v_l - v_new_q;
  if v_a < 0 then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_QUARANTINE_EXCEEDS_WAREHOUSE';
  end if;

  update public.catalog
  set qty_quarantine = v_new_q
  where id = p_catalog_id;

  v_abs_qty := abs(p_delta);
  v_ledger_id := gen_random_uuid();
  insert into public.equipment_ledger (
    ledger_id, event_type, catalog_id, qty, note, metadata, created_by
  ) values (
    v_ledger_id, v_event, p_catalog_id, v_abs_qty,
    p_note, jsonb_build_object('delta', p_delta), p_created_by
  );

  v_result := private.equipment_catalog_snapshot(p_catalog_id)
    || jsonb_build_object('ledger_id', v_ledger_id, 'delta', p_delta);

  insert into private.equipment_request_results (request_key, operation, payload_hash, result)
  values (p_request_key, 'quarantine', v_payload_hash, v_result);

  return v_result;
end;
$$;

revoke all on function public.admin_equipment_rent(bigint, uuid, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_equipment_return(uuid, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_equipment_adjust_on_hand(bigint, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_equipment_quarantine_adjust(bigint, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_equipment_rent(bigint, uuid, integer, text, text, uuid) to service_role;
grant execute on function public.admin_equipment_return(uuid, integer, text, text, uuid) to service_role;
grant execute on function public.admin_equipment_adjust_on_hand(bigint, integer, text, text, uuid) to service_role;
grant execute on function public.admin_equipment_quarantine_adjust(bigint, integer, text, text, uuid) to service_role;

create or replace view public.teacher_equipment_holdings_v
with (security_invoker = true)
as
select
  r.teacher_id,
  r.catalog_id,
  c.name,
  c.mgmt_code,
  c.image,
  c.category,
  sum(r.qty_outstanding)::integer as qty_held,
  min(r.opened_at) filter (where r.status = 'active' and r.qty_outstanding > 0) as earliest_opened_at,
  count(*) filter (where r.status = 'active' and r.qty_outstanding > 0)::integer as active_rental_lines
from public.equipment_rentals r
join public.catalog c on c.id = r.catalog_id
where r.qty_outstanding > 0
group by r.teacher_id, r.catalog_id, c.name, c.mgmt_code, c.image, c.category;

revoke all on public.teacher_equipment_holdings_v from public, anon;
grant select on public.teacher_equipment_holdings_v to authenticated, service_role;

alter table public.equipment_rentals enable row level security;
alter table public.equipment_ledger enable row level security;

drop policy if exists equipment_rentals_teacher_select_own on public.equipment_rentals;
create policy equipment_rentals_teacher_select_own
  on public.equipment_rentals
  for select
  to authenticated
  using (teacher_id = (select auth.uid()));

drop policy if exists equipment_rentals_admin_select on public.equipment_rentals;
create policy equipment_rentals_admin_select
  on public.equipment_rentals
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists equipment_ledger_admin_select on public.equipment_ledger;
create policy equipment_ledger_admin_select
  on public.equipment_ledger
  for select
  to authenticated
  using ((select public.is_admin()));

revoke insert, update, delete on public.equipment_rentals from anon, authenticated;
revoke insert, update, delete on public.equipment_ledger from anon, authenticated;
grant select on public.equipment_rentals to authenticated;
grant select on public.equipment_ledger to authenticated;
grant all on public.equipment_rentals to service_role;
grant all on public.equipment_ledger to service_role;
