-- Block legacy inventory DML only after explicit ops cutover (default: legacy writes allowed).

create table if not exists private.equipment_ops_state (
  id integer primary key default 1 check (id = 1),
  legacy_direct_writes_blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into private.equipment_ops_state (id, legacy_direct_writes_blocked)
values (1, false)
on conflict (id) do nothing;

revoke all on table private.equipment_ops_state from public, anon, authenticated;
grant select, update on table private.equipment_ops_state to service_role;

create or replace function private.equipment_legacy_writes_blocked()
returns boolean
language sql
stable
set search_path = pg_catalog, private
as $$
  select coalesce(
    (select legacy_direct_writes_blocked from private.equipment_ops_state where id = 1),
    false
  );
$$;

revoke all on function private.equipment_legacy_writes_blocked() from public, anon, authenticated;
grant execute on function private.equipment_legacy_writes_blocked() to service_role;

create or replace function private.equipment_allow_legacy_service_mutation()
returns boolean
language plpgsql
stable
set search_path = pg_catalog, auth, public
as $$
begin
  if current_user = 'service_role' then
    return true;
  end if;
  -- Bare superuser session (migrations / ops SQL), not JWT impersonation via SET ROLE.
  if current_user in ('postgres', 'supabase_admin')
     and nullif(current_setting('request.jwt.claim.sub', true), '') is null then
    return true;
  end if;
  return false;
end;
$$;

revoke all on function private.equipment_allow_legacy_service_mutation() from public, anon, authenticated;
grant execute on function private.equipment_allow_legacy_service_mutation() to service_role;

create or replace function private.equipment_block_legacy_inventory_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth, public, private
as $$
begin
  if not private.equipment_legacy_writes_blocked() then
    return coalesce(new, old);
  end if;
  if private.equipment_allow_legacy_service_mutation() then
    return coalesce(new, old);
  end if;
  raise exception using errcode = 'P0001', message = 'EQUIPMENT_LEGACY_WRITE_BLOCKED';
end;
$$;

create or replace function private.equipment_block_catalog_qty_cache_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth, public, private
as $$
begin
  if not private.equipment_legacy_writes_blocked() then
    return new;
  end if;
  if private.equipment_allow_legacy_service_mutation() then
    return new;
  end if;
  if new.qty_on_hand_total is distinct from old.qty_on_hand_total
     or new.qty_quarantine is distinct from old.qty_quarantine then
    raise exception using errcode = 'P0001', message = 'EQUIPMENT_CATALOG_QTY_CACHE_BLOCKED';
  end if;
  return new;
end;
$$;

create or replace function public.equipment_ops_set_legacy_writes_blocked(p_blocked boolean)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, private, public
as $$
begin
  update private.equipment_ops_state
  set legacy_direct_writes_blocked = coalesce(p_blocked, false),
      updated_at = now()
  where id = 1;
  return jsonb_build_object(
    'legacy_direct_writes_blocked',
    (select legacy_direct_writes_blocked from private.equipment_ops_state where id = 1)
  );
end;
$$;

revoke all on function public.equipment_ops_set_legacy_writes_blocked(boolean) from public, anon, authenticated;
grant execute on function public.equipment_ops_set_legacy_writes_blocked(boolean) to service_role;

do $$
begin
  if to_regclass('public.inventory') is not null then
    execute 'drop trigger if exists equipment_block_legacy_inventory on public.inventory';
    execute $tr$
      create trigger equipment_block_legacy_inventory
      before insert or update or delete on public.inventory
      for each row execute function private.equipment_block_legacy_inventory_mutation()
    $tr$;
  end if;

  if to_regclass('public.inventory_logs') is not null then
    execute 'drop trigger if exists equipment_block_legacy_inventory_logs on public.inventory_logs';
    execute $tr$
      create trigger equipment_block_legacy_inventory_logs
      before insert or update or delete on public.inventory_logs
      for each row execute function private.equipment_block_legacy_inventory_mutation()
    $tr$;
  end if;

  if to_regclass('public.teacher_inventory') is not null then
    execute 'drop trigger if exists equipment_block_legacy_teacher_inventory on public.teacher_inventory';
    execute $tr$
      create trigger equipment_block_legacy_teacher_inventory
      before insert or update or delete on public.teacher_inventory
      for each row execute function private.equipment_block_legacy_inventory_mutation()
    $tr$;
  end if;

  if to_regclass('public.catalog') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'catalog' and column_name = 'qty_on_hand_total'
     ) then
    execute 'drop trigger if exists equipment_block_catalog_qty_cache on public.catalog';
    execute $tr$
      create trigger equipment_block_catalog_qty_cache
      before update on public.catalog
      for each row execute function private.equipment_block_catalog_qty_cache_mutation()
    $tr$;
  end if;
end $$;
