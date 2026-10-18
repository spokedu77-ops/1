-- Emergency compatibility bridge for rolling application code back after the
-- hardened RLS migration. This is not the default rollback.
--
-- It permits direct authenticated access only when public.users identifies the
-- current user as admin/master or is_admin=true. Email-only and profiles-only
-- administrators intentionally fail closed and must use the new server actions.

begin;

alter table public.centers enable row level security;
alter table public.center_history enable row level security;

revoke all on table public.centers from public, anon, authenticated;
revoke all on table public.center_history from public, anon, authenticated;

grant select, insert, update, delete on table public.centers to authenticated;
grant select, insert, update, delete on table public.center_history to authenticated;
grant select, insert, update, delete on table public.centers to service_role;
grant select, insert, update, delete on table public.center_history to service_role;

drop policy if exists authenticated_all_centers on public.centers;
drop policy if exists centers_admin_legacy_compat_all on public.centers;
create policy centers_admin_legacy_compat_all
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

drop policy if exists center_history_legacy_compat_select on public.center_history;
create policy center_history_legacy_compat_select
on public.center_history for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists center_history_legacy_compat_insert on public.center_history;
create policy center_history_legacy_compat_insert
on public.center_history for insert to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

drop policy if exists center_history_legacy_compat_update on public.center_history;
create policy center_history_legacy_compat_update
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

drop policy if exists center_history_legacy_compat_delete on public.center_history;
create policy center_history_legacy_compat_delete
on public.center_history for delete to authenticated
using (
  exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role in ('admin', 'master') or u.is_admin is true)
  )
);

commit;
