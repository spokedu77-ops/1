-- Deploy after all center and center_history calls use authenticated admin-only
-- server paths. Anonymous and regular authenticated users lose direct access.
-- A narrowly-scoped authenticated admin policy remains for old deployments and
-- browser tabs whose Server Actions still query with the user's JWT.

do $$
begin
  if to_regclass('public.centers') is null or to_regclass('public.center_history') is null then
    raise exception 'centers and center_history must exist before applying access hardening';
  end if;
end;
$$;

alter table public.centers enable row level security;
alter table public.center_history enable row level security;

revoke all on table public.centers from public, anon, authenticated;
revoke all on table public.center_history from public, anon, authenticated;
grant select, insert, update, delete on table public.centers to authenticated;
grant select, insert, update, delete on table public.center_history to authenticated;
grant select, insert, update, delete on table public.centers to service_role;
grant select, insert, update, delete on table public.center_history to service_role;

drop policy if exists authenticated_all_centers on public.centers;
drop policy if exists centers_authenticated_admin_all on public.centers;
create policy centers_authenticated_admin_all
on public.centers
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists center_history_select_admin on public.center_history;
create policy center_history_select_admin
on public.center_history for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists center_history_insert_admin on public.center_history;
create policy center_history_insert_admin
on public.center_history for insert to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists center_history_update_admin on public.center_history;
create policy center_history_update_admin
on public.center_history for update to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists center_history_delete_admin on public.center_history;
create policy center_history_delete_admin
on public.center_history for delete to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists centers_service_role_all on public.centers;
create policy centers_service_role_all
on public.centers
for all
to service_role
using (true)
with check (true);

drop policy if exists center_history_service_role_all on public.center_history;
create policy center_history_service_role_all
on public.center_history
for all
to service_role
using (true)
with check (true);
