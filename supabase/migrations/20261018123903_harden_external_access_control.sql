-- Harden externally reachable legacy surfaces without changing existing rows.
-- Application server paths continue to use service_role after explicit auth.

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
revoke truncate, trigger, references on table public.users from authenticated;

-- Keep existing self-service profile edits, but prevent a normal user from changing
-- administrative, payroll, document, entitlement, or balance fields on their own row.
create or replace function private.guard_user_sensitive_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.rls_is_admin()) and (
    new.points is distinct from old.points
    or new.role is distinct from old.role
    or new.is_admin is distinct from old.is_admin
    or new.is_active is distinct from old.is_active
    or new.status is distinct from old.status
    or new.documents is distinct from old.documents
    or new.fee_private is distinct from old.fee_private
    or new.fee_group is distinct from old.fee_group
    or new.fee_center_main is distinct from old.fee_center_main
    or new.fee_center_assist is distinct from old.fee_center_assist
    or new.fee_auto_from_tier is distinct from old.fee_auto_from_tier
    or new.session_count is distinct from old.session_count
    or new.ending_soon is distinct from old.ending_soon
  ) then
    raise exception using errcode = '42501', message = 'USER_SENSITIVE_FIELDS_ADMIN_ONLY';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_user_sensitive_columns() from public, anon, authenticated;

drop trigger if exists guard_user_sensitive_columns on public.users;
create trigger guard_user_sensitive_columns
before update on public.users
for each row execute function private.guard_user_sensitive_columns();

-- Minimal non-sensitive directory for authenticated instructor selectors.
create or replace function public.list_active_teacher_directory()
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.name
  from public.users u
  where u.role = 'teacher'
    and u.is_active is not false
    and (select auth.uid()) is not null
  order by u.name, u.id;
$$;
revoke all on function public.list_active_teacher_directory() from public, anon;
grant execute on function public.list_active_teacher_directory() to authenticated, service_role;

-- 2. Mileage settlement choice must only change through server-authorized service paths/RPCs.
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

revoke all on table public.sessions from anon;
revoke truncate, trigger, references on table public.sessions from authenticated;

-- 3. Remove legacy display-name authorization. Roles/flags remain authoritative.
drop policy if exists dashboard_memos_admin_only on public.dashboard_memos;
create policy dashboard_memos_admin_only
on public.dashboard_memos for all to authenticated
using ((select private.rls_is_admin()))
with check ((select private.rls_is_admin()));

drop policy if exists memos_admin_only on public.memos;
create policy memos_admin_only
on public.memos for all to authenticated
using ((select private.rls_is_admin()))
with check ((select private.rls_is_admin()));

drop policy if exists mileage_select_one on public.mileage_logs;
create policy mileage_select_one
on public.mileage_logs for select to authenticated
using (teacher_id = (select auth.uid()) or (select private.rls_is_admin()));

drop policy if exists count_logs_select_one on public.session_count_logs;
drop policy if exists count_logs_insert_one on public.session_count_logs;
drop policy if exists count_logs_update_one on public.session_count_logs;
drop policy if exists count_logs_delete_one on public.session_count_logs;
create policy count_logs_select_one
on public.session_count_logs for select to authenticated
using (teacher_id = (select auth.uid()) or (select private.rls_is_admin()));
create policy count_logs_insert_one
on public.session_count_logs for insert to authenticated
with check ((select private.rls_is_admin()));
create policy count_logs_update_one
on public.session_count_logs for update to authenticated
using ((select private.rls_is_admin()))
with check ((select private.rls_is_admin()));
create policy count_logs_delete_one
on public.session_count_logs for delete to authenticated
using ((select private.rls_is_admin()));

drop policy if exists weekly_best_insert_one on public.weekly_best;
drop policy if exists weekly_best_update_one on public.weekly_best;
drop policy if exists weekly_best_delete_one on public.weekly_best;
create policy weekly_best_insert_one
on public.weekly_best for insert to authenticated
with check ((select private.rls_is_admin()));
create policy weekly_best_update_one
on public.weekly_best for update to authenticated
using ((select private.rls_is_admin()))
with check ((select private.rls_is_admin()));
create policy weekly_best_delete_one
on public.weekly_best for delete to authenticated
using ((select private.rls_is_admin()));

-- 4. Public submissions/events must pass the validated server APIs.
drop policy if exists dispatch_leads_public_insert on public.dispatch_leads;
revoke insert on table public.dispatch_leads from anon, authenticated;

drop policy if exists move_report_events_insert_anon on public.move_report_events;
drop policy if exists move_report_events_select_auth on public.move_report_events;
revoke insert, select on table public.move_report_events from anon, authenticated;

-- 5. Remove unauthenticated/direct destructive Storage writes. Existing signed-upload
-- server flows continue to work and public read behavior is deliberately unchanged here.
drop policy if exists "Allow All for Session Files 1egybuo_1" on storage.objects;
drop policy if exists "Allow All for Session Files 1egybuo_2" on storage.objects;
drop policy if exists "Allow All for Session Files 1egybuo_3" on storage.objects;
drop policy if exists "Enable upload for all" on storage.objects;
drop policy if exists "Allow All for instructors 4zivli_1" on storage.objects;
drop policy if exists "Allow All for instructors 4zivli_2" on storage.objects;
drop policy if exists "Allow All for instructors 4zivli_3" on storage.objects;
drop policy if exists "Allow admins to upload to instructors" on storage.objects;

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

-- Defense in depth: browser roles never need schema-level destructive capabilities.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
