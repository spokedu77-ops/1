-- P0-only hardening for user privacy, sensitive Storage writes, and mileage settlement.
-- Existing rows and public read behavior of legacy Storage buckets are unchanged.

-- 1. users: no anonymous access; authenticated users see only self unless admin/master.
drop policy if exists users_select_all on public.users;
drop policy if exists users_select_anon_verified_creator on public.users;
drop policy if exists users_select_admin_or_self on public.users;
create policy users_select_admin_or_self
on public.users for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.rls_is_admin())
);

revoke all on table public.users from anon;

-- 2. Mileage settlement choice may change only through server-authorized paths/RPCs.
create or replace function private.guard_session_settlement_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.mileage_option is distinct from old.mileage_option
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'SESSION_SETTLEMENT_FIELDS_SERVER_ONLY';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_session_settlement_columns() from public, anon, authenticated;

drop trigger if exists guard_session_settlement_columns on public.sessions;
create trigger guard_session_settlement_columns
before update of mileage_option on public.sessions
for each row execute function private.guard_session_settlement_columns();

-- 3. Storage writes: session files/photos use signed server uploads; instructor
-- documents retain direct browser writes only for authenticated admin/master users.
drop policy if exists "Allow All for Session Files 1egybuo_1" on storage.objects;
drop policy if exists "Allow All for Session Files 1egybuo_2" on storage.objects;
drop policy if exists "Allow All for Session Files 1egybuo_3" on storage.objects;
drop policy if exists "Enable upload for all" on storage.objects;
drop policy if exists "Allow All for instructors 4zivli_1" on storage.objects;
drop policy if exists "Allow All for instructors 4zivli_2" on storage.objects;
drop policy if exists "Allow All for instructors 4zivli_3" on storage.objects;
drop policy if exists "Allow admins to upload to instructors" on storage.objects;

drop policy if exists instructors_admin_insert on storage.objects;
drop policy if exists instructors_admin_update on storage.objects;
drop policy if exists instructors_admin_delete on storage.objects;
create policy instructors_admin_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'instructors' and (select private.rls_is_admin()));
create policy instructors_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'instructors' and (select private.rls_is_admin()))
with check (bucket_id = 'instructors' and (select private.rls_is_admin()));
create policy instructors_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'instructors' and (select private.rls_is_admin()));
