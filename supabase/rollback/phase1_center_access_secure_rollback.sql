-- Default rollback after the hardened center access migration.
-- This deliberately does not restore authenticated_all_centers or broad grants.
-- It is safe only while the new requireAdmin()+service-role server actions remain deployed.

begin;

alter table public.centers enable row level security;
alter table public.center_history enable row level security;

revoke all on table public.centers from public, anon, authenticated;
revoke all on table public.center_history from public, anon, authenticated;

grant select, insert, update, delete on table public.centers to service_role;
grant select, insert, update, delete on table public.center_history to service_role;

drop policy if exists authenticated_all_centers on public.centers;

commit;
