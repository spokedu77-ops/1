drop policy if exists "admin_all" on public.postpone_notices;

create policy "admin_all" on public.postpone_notices
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
