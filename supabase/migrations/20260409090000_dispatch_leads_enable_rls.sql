alter table public.dispatch_leads enable row level security;

drop policy if exists dispatch_leads_public_insert on public.dispatch_leads;
create policy dispatch_leads_public_insert
  on public.dispatch_leads
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists dispatch_leads_service_role_only on public.dispatch_leads;
create policy dispatch_leads_service_role_only
  on public.dispatch_leads
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
