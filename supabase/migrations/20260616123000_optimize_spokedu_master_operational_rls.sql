-- Optimize SPOKEDU MASTER operational-data RLS policies.
--
-- Supabase performance advisor flags auth.uid() calls in RLS policies when
-- they are evaluated per row. Wrapping the call as (select auth.uid()) lets
-- Postgres initialize the value once per statement.

drop policy if exists spokedu_master_students_select_own
  on public.spokedu_master_students;
drop policy if exists spokedu_master_students_insert_own
  on public.spokedu_master_students;
drop policy if exists spokedu_master_students_update_own
  on public.spokedu_master_students;
drop policy if exists spokedu_master_students_delete_own
  on public.spokedu_master_students;

drop policy if exists spokedu_master_class_records_select_own
  on public.spokedu_master_class_records;
drop policy if exists spokedu_master_class_records_insert_own
  on public.spokedu_master_class_records;
drop policy if exists spokedu_master_class_records_update_own
  on public.spokedu_master_class_records;
drop policy if exists spokedu_master_class_records_delete_own
  on public.spokedu_master_class_records;

drop policy if exists spokedu_master_class_record_students_select_own
  on public.spokedu_master_class_record_students;
drop policy if exists spokedu_master_class_record_students_insert_own
  on public.spokedu_master_class_record_students;
drop policy if exists spokedu_master_class_record_students_update_own
  on public.spokedu_master_class_record_students;
drop policy if exists spokedu_master_class_record_students_delete_own
  on public.spokedu_master_class_record_students;

create policy spokedu_master_students_select_own
  on public.spokedu_master_students
  for select
  using (owner_id = (select auth.uid()));

create policy spokedu_master_students_insert_own
  on public.spokedu_master_students
  for insert
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_students_update_own
  on public.spokedu_master_students
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_students_delete_own
  on public.spokedu_master_students
  for delete
  using (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_select_own
  on public.spokedu_master_class_records
  for select
  using (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_insert_own
  on public.spokedu_master_class_records
  for insert
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_update_own
  on public.spokedu_master_class_records
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy spokedu_master_class_records_delete_own
  on public.spokedu_master_class_records
  for delete
  using (owner_id = (select auth.uid()));

create policy spokedu_master_class_record_students_select_own
  on public.spokedu_master_class_record_students
  for select
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );

create policy spokedu_master_class_record_students_insert_own
  on public.spokedu_master_class_record_students
  for insert
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );

create policy spokedu_master_class_record_students_update_own
  on public.spokedu_master_class_record_students
  for update
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );

create policy spokedu_master_class_record_students_delete_own
  on public.spokedu_master_class_record_students
  for delete
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.spokedu_master_class_records record
      where record.id = record_id
        and record.owner_id = (select auth.uid())
    )
  );
