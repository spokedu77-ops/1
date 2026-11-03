-- SPOKEDU SIMPLE V1. Intentional new boundary: never import or mutate legacy inventory, equipment_ledger, equipment_rentals.
-- Prepared for review only. Do not run against production without an explicit schema approval.
create table if not exists public.equipment_simple_stock (
  catalog_id bigint primary key references public.catalog(id) on delete restrict,
  qty_total integer not null check (qty_total >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_simple_moves (
  id uuid primary key default gen_random_uuid(),
  catalog_id bigint not null references public.catalog(id) on delete restrict,
  teacher_id uuid not null references public.users(id) on delete restrict,
  kind text not null check (kind in ('RENT', 'RETURN')),
  qty integer not null check (qty > 0),
  rent_id uuid references public.equipment_simple_moves(id) on delete restrict,
  move_date date not null default current_date,
  request_key uuid not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint equipment_simple_move_shape check (
    (kind = 'RENT' and rent_id is null) or (kind = 'RETURN' and rent_id is not null)
  )
);
create index if not exists equipment_simple_moves_catalog_idx on public.equipment_simple_moves(catalog_id);
create index if not exists equipment_simple_moves_teacher_idx on public.equipment_simple_moves(teacher_id);
create index if not exists equipment_simple_moves_rent_idx on public.equipment_simple_moves(rent_id) where rent_id is not null;

alter table public.equipment_simple_stock enable row level security;
alter table public.equipment_simple_moves enable row level security;
revoke all on public.equipment_simple_stock from public, anon, authenticated;
revoke all on public.equipment_simple_moves from public, anon, authenticated;
grant select, insert, update on public.equipment_simple_stock to service_role;
grant select, insert on public.equipment_simple_moves to service_role;

-- One atomic save for catalog metadata and manually entered NEW total.
create or replace function public.admin_equipment_simple_save(
  p_catalog_id bigint, p_name text, p_qty_total integer, p_image text, p_category text
) returns bigint
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id bigint; v_lent bigint;
begin
  if nullif(btrim(p_name), '') is null or length(btrim(p_name)) > 150
     or p_qty_total is null or p_qty_total < 0 or p_qty_total > 1000000 then
    raise exception 'SIMPLE_INVALID_ITEM';
  end if;
  if p_catalog_id is null then
    insert into public.catalog(name, image, category)
    values (btrim(p_name), nullif(btrim(p_image), ''), nullif(btrim(p_category), ''))
    returning id into v_id;
  else
    select id into v_id from public.catalog where id = p_catalog_id for update;
    if not found then raise exception 'SIMPLE_ITEM_NOT_FOUND'; end if;
  end if;
  select coalesce(sum(case when kind = 'RENT' then qty else -qty end), 0)
    into v_lent from public.equipment_simple_moves where catalog_id = v_id;
  if p_qty_total < v_lent then raise exception 'SIMPLE_TOTAL_BELOW_LENT'; end if;
  if p_catalog_id is not null then
    update public.catalog
       set name = btrim(p_name), image = nullif(btrim(p_image), ''),
           category = nullif(btrim(p_category), '')
     where id = v_id;
  end if;
  insert into public.equipment_simple_stock(catalog_id,qty_total)
  values(v_id,p_qty_total)
  on conflict(catalog_id) do update
    set qty_total = excluded.qty_total, updated_at = now();
  return v_id;
end; $$;

-- Serialize lending and stock corrections on the same catalog row.
create or replace function public.admin_equipment_simple_rent(
  p_catalog_id bigint, p_teacher_id uuid, p_qty integer,
  p_move_date date, p_request_key uuid, p_created_by uuid
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_total integer; v_lent bigint; v_id uuid; v_existing public.equipment_simple_moves%rowtype;
begin
  if p_catalog_id is null or p_teacher_id is null or p_qty is null or p_qty <= 0
    or p_move_date is null or p_request_key is null then raise exception 'SIMPLE_INVALID_RENT'; end if;
  select * into v_existing from public.equipment_simple_moves where request_key = p_request_key;
  if found then
    if v_existing.kind <> 'RENT' or v_existing.catalog_id <> p_catalog_id
      or v_existing.teacher_id <> p_teacher_id or v_existing.qty <> p_qty
      or v_existing.move_date <> p_move_date then raise exception 'SIMPLE_IDEMPOTENCY_CONFLICT'; end if;
    return v_existing.id;
  end if;
  perform 1 from public.catalog where id = p_catalog_id for update;
  if not found then raise exception 'SIMPLE_ITEM_NOT_FOUND'; end if;
  select qty_total into v_total from public.equipment_simple_stock where catalog_id=p_catalog_id;
  if not found then raise exception 'SIMPLE_STOCK_NOT_ENTERED'; end if;
  if not exists(select 1 from public.users where id = p_teacher_id and role='teacher'
                and is_active is true and is_admin is false) then
    raise exception 'SIMPLE_TEACHER_NOT_ACTIVE';
  end if;
  select coalesce(sum(case when kind='RENT' then qty else -qty end),0)
    into v_lent from public.equipment_simple_moves where catalog_id=p_catalog_id;
  if v_lent + p_qty > v_total then raise exception 'SIMPLE_INSUFFICIENT_STOCK'; end if;
  insert into public.equipment_simple_moves(catalog_id,teacher_id,kind,qty,move_date,request_key,created_by)
  values(p_catalog_id,p_teacher_id,'RENT',p_qty,p_move_date,p_request_key,p_created_by)
  returning id into v_id;
  return v_id;
end; $$;

-- A return references one specific RENT, including partial returns.
create or replace function public.admin_equipment_simple_return(
  p_rent_id uuid, p_qty integer, p_move_date date,
  p_request_key uuid, p_created_by uuid
) returns uuid language plpgsql security definer set search_path=pg_catalog, public as $$
declare v_rent public.equipment_simple_moves%rowtype; v_existing public.equipment_simple_moves%rowtype;
        v_returned bigint; v_id uuid;
begin
  if p_rent_id is null or p_qty is null or p_qty <= 0 or p_move_date is null
    or p_request_key is null then raise exception 'SIMPLE_INVALID_RETURN'; end if;
  select * into v_existing from public.equipment_simple_moves where request_key=p_request_key;
  if found then
    if v_existing.kind <> 'RETURN' or v_existing.rent_id <> p_rent_id
      or v_existing.qty <> p_qty or v_existing.move_date <> p_move_date then
      raise exception 'SIMPLE_IDEMPOTENCY_CONFLICT'; end if;
    return v_existing.id;
  end if;
  select * into v_rent from public.equipment_simple_moves where id=p_rent_id and kind='RENT';
  if not found then raise exception 'SIMPLE_RENT_NOT_FOUND'; end if;
  perform 1 from public.catalog where id=v_rent.catalog_id for update;
  select coalesce(sum(qty),0) into v_returned from public.equipment_simple_moves
    where rent_id=p_rent_id and kind='RETURN';
  if v_returned + p_qty > v_rent.qty then raise exception 'SIMPLE_RETURN_OVER_LIMIT'; end if;
  insert into public.equipment_simple_moves(catalog_id,teacher_id,kind,qty,rent_id,move_date,request_key,created_by)
  values(v_rent.catalog_id,v_rent.teacher_id,'RETURN',p_qty,p_rent_id,p_move_date,p_request_key,p_created_by)
  returning id into v_id;
  return v_id;
end; $$;

revoke all on function public.admin_equipment_simple_save(bigint,text,integer,text,text) from public,anon,authenticated;
revoke all on function public.admin_equipment_simple_rent(bigint,uuid,integer,date,uuid,uuid) from public,anon,authenticated;
revoke all on function public.admin_equipment_simple_return(uuid,integer,date,uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_equipment_simple_save(bigint,text,integer,text,text) to service_role;
grant execute on function public.admin_equipment_simple_rent(bigint,uuid,integer,date,uuid,uuid) to service_role;
grant execute on function public.admin_equipment_simple_return(uuid,integer,date,uuid,uuid) to service_role;
notify pgrst, 'reload schema';
