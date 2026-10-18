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
