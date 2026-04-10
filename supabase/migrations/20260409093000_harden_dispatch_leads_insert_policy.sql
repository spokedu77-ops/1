drop policy if exists dispatch_leads_public_insert on public.dispatch_leads;

create policy dispatch_leads_public_insert
  on public.dispatch_leads
  for insert
  to anon, authenticated
  with check (
    nullif(btrim(organization_name), '') is not null
    and nullif(btrim(manager_name), '') is not null
    and (
      nullif(btrim(coalesce(phone, '')), '') is not null
      or nullif(btrim(coalesce(email, '')), '') is not null
    )
  );
