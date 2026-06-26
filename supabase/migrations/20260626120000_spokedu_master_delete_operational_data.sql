-- Atomically delete one owner's SPOKEDU MASTER operational data.
--
-- Scope:
--   - saved explanations
--   - class records
--   - class record student rows
--   - students
--
-- This function intentionally does not delete auth users, subscriptions,
-- payment orders, webhook evidence, or public program content.

create or replace function public.spokedu_master_delete_operational_data(
  p_owner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_record_students_deleted integer := 0;
  v_records_deleted integer := 0;
  v_explanations_deleted integer := 0;
  v_students_deleted integer := 0;
begin
  if p_owner_id is null then
    raise exception using errcode = '22023', message = 'owner id is required';
  end if;

  delete from public.spokedu_master_class_record_students
   where owner_id = p_owner_id;
  get diagnostics v_record_students_deleted = row_count;

  delete from public.spokedu_master_class_records
   where owner_id = p_owner_id;
  get diagnostics v_records_deleted = row_count;

  delete from public.spokedu_master_explanations
   where owner_id = p_owner_id;
  get diagnostics v_explanations_deleted = row_count;

  delete from public.spokedu_master_students
   where owner_id = p_owner_id;
  get diagnostics v_students_deleted = row_count;

  return jsonb_build_object(
    'recordStudents', v_record_students_deleted,
    'classRecords', v_records_deleted,
    'explanations', v_explanations_deleted,
    'students', v_students_deleted,
    'total',
      v_record_students_deleted
      + v_records_deleted
      + v_explanations_deleted
      + v_students_deleted
  );
end;
$$;

revoke all on function public.spokedu_master_delete_operational_data(uuid)
  from public, anon, authenticated;

grant execute on function public.spokedu_master_delete_operational_data(uuid)
  to service_role;
