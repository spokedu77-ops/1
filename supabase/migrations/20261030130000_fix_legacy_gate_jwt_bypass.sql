-- Fix: gate flag must be readable inside JWT sessions (invoker could not SELECT private.equipment_ops_state).
create or replace function private.equipment_legacy_writes_blocked()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select coalesce(
    (select legacy_direct_writes_blocked from private.equipment_ops_state where id = 1),
    false
  );
$$;

revoke all on function private.equipment_legacy_writes_blocked() from public, anon, authenticated;
grant execute on function private.equipment_legacy_writes_blocked() to service_role;

-- Fix: SECURITY DEFINER triggers run as postgres; end-user JWT must not bypass the gate.
create or replace function private.equipment_allow_legacy_service_mutation()
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, auth, public
as $$
declare
  jwt_role text := lower(coalesce(auth.jwt() ->> 'role', ''));
  jwt_sub uuid := auth.uid();
begin
  if jwt_role = 'service_role' then
    return true;
  end if;
  if jwt_sub is not null then
    return false;
  end if;
  return current_user in ('postgres', 'supabase_admin', 'service_role');
end;
$$;

revoke all on function private.equipment_allow_legacy_service_mutation() from public, anon, authenticated;
grant execute on function private.equipment_allow_legacy_service_mutation() to service_role;
