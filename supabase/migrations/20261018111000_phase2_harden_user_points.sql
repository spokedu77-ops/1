-- Deploy only after every legitimate points mutation uses the admin server RPC.
-- Preserve authenticated profile updates by replacing table-level UPDATE with
-- explicit column grants that exclude points and existing authz columns.

revoke update on table public.users from authenticated;
grant update (
  organization_id,
  name,
  email,
  phone,
  status,
  updated_at,
  phone_number,
  documents,
  is_active,
  organization,
  schedule,
  session_count,
  departure_location,
  ending_soon,
  fee_private,
  fee_group,
  fee_center_main,
  fee_center_assist,
  fee_auto_from_tier
) on table public.users to authenticated;

grant update on table public.users to service_role;

-- The admin UI still uses authenticated browser writes for operational fields.
-- Keep those workflows available to admin/master while preventing a user from
-- changing the same fields on their own row through the Data API.
create or replace function private.guard_user_managed_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_role text := (select auth.role());
begin
  if v_request_role = 'service_role'
    or (v_request_role is null and session_user in ('postgres', 'supabase_admin'))
    or private.rls_is_admin() then
    return new;
  end if;

  raise exception 'USER_MANAGED_COLUMNS_ADMIN_ONLY'
    using errcode = '42501';
end;
$$;

revoke all on function private.guard_user_managed_columns() from public, anon, authenticated;

drop trigger if exists guard_users_managed_columns on public.users;
create trigger guard_users_managed_columns
before update of
  organization_id,
  status,
  documents,
  is_active,
  organization,
  schedule,
  session_count,
  departure_location,
  ending_soon,
  fee_private,
  fee_group,
  fee_center_main,
  fee_center_assist,
  fee_auto_from_tier
on public.users
for each row execute function private.guard_user_managed_columns();
