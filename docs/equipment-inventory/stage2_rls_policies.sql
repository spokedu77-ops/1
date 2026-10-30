\set ON_ERROR_STOP on

alter table public.inventory enable row level security;
alter table public.inventory_logs enable row level security;

drop policy if exists inventory_teacher_select_own on public.inventory;
create policy inventory_teacher_select_own
  on public.inventory for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists inventory_admin_all on public.inventory;
create policy inventory_admin_all
  on public.inventory for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists inventory_logs_teacher_select_own on public.inventory_logs;
create policy inventory_logs_teacher_select_own
  on public.inventory_logs for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists inventory_logs_admin_all on public.inventory_logs;
create policy inventory_logs_admin_all
  on public.inventory_logs for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update, delete on public.inventory to authenticated;
grant select, insert, update, delete on public.inventory_logs to authenticated;
grant all on public.inventory to service_role;
grant all on public.inventory_logs to service_role;
