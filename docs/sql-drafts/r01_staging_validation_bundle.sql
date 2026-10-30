-- R01 staging-only validation bundle (APPROVED project ref: stanouvgklynytjtlnif).
-- DO NOT run against production ref mwgvserdyflsqyhcqecp.
-- Requires: R01_STAGING_APPROVED_PROJECT_REF env gate (see §0).

-- §0 Environment gate (fail closed)
do $$
declare
  v_ref text;
  v_allowed text := coalesce(
    nullif(current_setting('app.r01_staging_project_ref', true), ''),
    'stanouvgklynytjtlnif'
  );
  v_blocked text := 'mwgvserdyflsqyhcqecp';
begin
  select split_part(replace(current_setting('app.supabase_url', true), 'https://', ''), '.', 1)
  into v_ref;
  if v_ref is null or v_ref = '' then
    raise exception 'R01 gate: set app.supabase_url to staging URL before run';
  end if;
  if v_ref = v_blocked then
    raise exception 'R01 gate: production ref % blocked', v_blocked;
  end if;
  if v_ref <> v_allowed then
    raise exception 'R01 gate: ref % not approved (expected %)', v_ref, v_allowed;
  end if;
end $$;

-- §1 Snapshot before (10 policies)
create table if not exists public.r01_snapshot_before (
  captured_at timestamptz not null default now(),
  tablename text not null,
  policyname text not null,
  cmd text not null,
  roles text[] not null,
  qual text,
  with_check text,
  primary key (tablename, policyname)
);

truncate public.r01_snapshot_before;

insert into public.r01_snapshot_before (tablename, policyname, cmd, roles, qual, with_check)
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    (tablename = 'dashboard_memos' and policyname = 'dashboard_memos_admin_only') or
    (tablename = 'memos' and policyname = 'memos_admin_only') or
    (tablename = 'mileage_logs' and policyname = 'mileage_select_one') or
    (tablename = 'session_count_logs' and policyname in (
      'count_logs_delete_one','count_logs_insert_one','count_logs_select_one','count_logs_update_one')) or
    (tablename = 'weekly_best' and policyname in (
      'weekly_best_delete_one','weekly_best_insert_one','weekly_best_update_one'))
  );

do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.r01_snapshot_before;
  if v_cnt <> 10 then
    raise exception 'R01 snapshot: expected 10 policies, found %', v_cnt;
  end if;
end $$;

-- §2 Apply R01 migration (staging only)
begin;

drop policy if exists dashboard_memos_admin_only on public.dashboard_memos;
create policy dashboard_memos_admin_only on public.dashboard_memos
  for all to authenticated
  using ((select private.rls_is_admin()))
  with check ((select private.rls_is_admin()));

drop policy if exists memos_admin_only on public.memos;
create policy memos_admin_only on public.memos
  for all to authenticated
  using ((select private.rls_is_admin()))
  with check ((select private.rls_is_admin()));

drop policy if exists mileage_select_one on public.mileage_logs;
create policy mileage_select_one on public.mileage_logs
  for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or (select private.rls_is_admin())
  );

drop policy if exists count_logs_select_one on public.session_count_logs;
create policy count_logs_select_one on public.session_count_logs
  for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or (select private.rls_is_admin())
  );

drop policy if exists count_logs_insert_one on public.session_count_logs;
create policy count_logs_insert_one on public.session_count_logs
  for insert to authenticated
  with check ((select private.rls_is_admin()));

drop policy if exists count_logs_update_one on public.session_count_logs;
create policy count_logs_update_one on public.session_count_logs
  for update to authenticated
  using ((select private.rls_is_admin()))
  with check ((select private.rls_is_admin()));

drop policy if exists count_logs_delete_one on public.session_count_logs;
create policy count_logs_delete_one on public.session_count_logs
  for delete to authenticated
  using ((select private.rls_is_admin()));

drop policy if exists weekly_best_insert_one on public.weekly_best;
create policy weekly_best_insert_one on public.weekly_best
  for insert to authenticated
  with check ((select private.rls_is_admin()));

drop policy if exists weekly_best_update_one on public.weekly_best;
create policy weekly_best_update_one on public.weekly_best
  for update to authenticated
  using ((select private.rls_is_admin()))
  with check ((select private.rls_is_admin()));

drop policy if exists weekly_best_delete_one on public.weekly_best;
create policy weekly_best_delete_one on public.weekly_best
  for delete to authenticated
  using ((select private.rls_is_admin()));

commit;

-- §3 Postflight: semantic verifier (not string-normalization diff)
create or replace function private.r01_policy_semantics_ok(
  p_tablename text,
  p_policyname text,
  p_cmd text,
  p_qual text,
  p_with_check text
) returns boolean
language plpgsql
immutable
as $$
declare
  q text := coalesce(p_qual, '');
  w text := coalesce(p_with_check, '');
  e text := lower(q || ' ' || w);
begin
  if e ~ 'users\.name|김구민|김윤기|최지훈' then
    return false;
  end if;

  case
    when p_tablename in ('dashboard_memos', 'memos') and p_cmd = 'ALL' then
      return e ~ 'rls_is_admin' and e !~ 'teacher_id';

    when p_tablename = 'mileage_logs' and p_cmd = 'SELECT' then
      return e ~ 'teacher_id' and e ~ 'auth\.uid' and e ~ 'rls_is_admin' and e ~ '\yor\y';

    when p_tablename = 'session_count_logs' and p_policyname = 'count_logs_select_one' then
      return e ~ 'teacher_id' and e ~ 'auth\.uid' and e ~ 'rls_is_admin' and e ~ '\yor\y';

    when p_tablename = 'session_count_logs' and p_policyname = 'count_logs_insert_one' then
      return w ~* 'rls_is_admin' and w !~* 'teacher_id';

    when p_tablename = 'session_count_logs' and p_policyname in ('count_logs_update_one', 'count_logs_delete_one') then
      return e ~ 'rls_is_admin' and e !~ 'teacher_id';

    when p_tablename = 'weekly_best' and p_policyname = 'weekly_best_insert_one' then
      return w ~* 'rls_is_admin' and w !~* 'teacher_id';

    when p_tablename = 'weekly_best' and p_policyname in ('weekly_best_update_one', 'weekly_best_delete_one') then
      return e ~ 'rls_is_admin' and e !~ 'teacher_id';

    else
      return false;
  end case;
end;
$$;

-- Expected catalog: cmd + roles + semantics (not exact qual text)
create temp table r01_expected (
  tablename text not null,
  policyname text not null,
  expect_cmd text not null,
  expect_roles text not null,
  primary key (tablename, policyname)
);

insert into r01_expected values
  ('dashboard_memos', 'dashboard_memos_admin_only', 'ALL', '{authenticated}'),
  ('memos', 'memos_admin_only', 'ALL', '{authenticated}'),
  ('mileage_logs', 'mileage_select_one', 'SELECT', '{authenticated}'),
  ('session_count_logs', 'count_logs_select_one', 'SELECT', '{authenticated}'),
  ('session_count_logs', 'count_logs_insert_one', 'INSERT', '{authenticated}'),
  ('session_count_logs', 'count_logs_update_one', 'UPDATE', '{authenticated}'),
  ('session_count_logs', 'count_logs_delete_one', 'DELETE', '{authenticated}'),
  ('weekly_best', 'weekly_best_insert_one', 'INSERT', '{authenticated}'),
  ('weekly_best', 'weekly_best_update_one', 'UPDATE', '{authenticated}'),
  ('weekly_best', 'weekly_best_delete_one', 'DELETE', '{authenticated}');

do $$
declare
  r record;
  v_cmd text;
  v_roles text;
  v_qual text;
  v_wchk text;
  v_missing int;
begin
  select count(*) into v_missing
  from r01_expected e
  left join pg_policies p
    on p.schemaname = 'public' and p.tablename = e.tablename and p.policyname = e.policyname
  where p.policyname is null;
  if v_missing > 0 then
    raise exception 'R01 postflight: % expected policies missing', v_missing;
  end if;

  for r in select * from r01_expected loop
    select p.cmd, p.roles::text, p.qual, p.with_check
      into v_cmd, v_roles, v_qual, v_wchk
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = r.tablename
      and p.policyname = r.policyname;

    if v_cmd <> r.expect_cmd then
      raise exception 'cmd mismatch %.% (got %)', r.tablename, r.policyname, v_cmd;
    end if;
    if v_roles <> r.expect_roles then
      raise exception 'roles mismatch %.% (got %)', r.tablename, r.policyname, v_roles;
    end if;

    if not private.r01_policy_semantics_ok(r.tablename, r.policyname, v_cmd, v_qual, v_wchk) then
      raise exception 'semantics mismatch %.% qual=% with_check=%',
        r.tablename, r.policyname, coalesce(v_qual, ''), coalesce(v_wchk, '');
    end if;
  end loop;
end $$;

-- §4 P-01~P-07: run via Supabase JWT / PostgREST or set_config auth.uid in staging only.
-- P-06 intentional: name-spoof N allowed BEFORE migration on name-gated policies, DENY AFTER.
