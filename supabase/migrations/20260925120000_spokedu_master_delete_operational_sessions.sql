-- Replace the owner operational-data wipe so Session graph rows are removed
-- before students/classes. Attendance restricts student deletes; sessions
-- restrict class deletes; class records restrict session deletes.
-- Auth, profile, subscription, payment, and global catalog tables stay.

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
  v_favorites_deleted integer := 0;
  v_session_attendance_deleted integer := 0;
  v_session_programs_deleted integer := 0;
  v_sessions_deleted integer := 0;
  v_class_students_deleted integer := 0;
  v_schedule_rules_deleted integer := 0;
  v_students_deleted integer := 0;
  v_classes_deleted integer := 0;
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

  delete from public.spokedu_master_program_favorites
   where owner_id = p_owner_id;
  get diagnostics v_favorites_deleted = row_count;

  delete from public.spokedu_master_session_attendance
   where owner_id = p_owner_id;
  get diagnostics v_session_attendance_deleted = row_count;

  delete from public.spokedu_master_session_programs
   where owner_id = p_owner_id;
  get diagnostics v_session_programs_deleted = row_count;

  delete from public.spokedu_master_sessions
   where owner_id = p_owner_id;
  get diagnostics v_sessions_deleted = row_count;

  delete from public.spokedu_master_class_students
   where owner_id = p_owner_id;
  get diagnostics v_class_students_deleted = row_count;

  delete from public.spokedu_master_class_schedule_rules
   where owner_id = p_owner_id;
  get diagnostics v_schedule_rules_deleted = row_count;

  delete from public.spokedu_master_students
   where owner_id = p_owner_id;
  get diagnostics v_students_deleted = row_count;

  delete from public.spokedu_master_classes
   where owner_id = p_owner_id;
  get diagnostics v_classes_deleted = row_count;

  return jsonb_build_object(
    'classRecordStudents', v_record_students_deleted,
    'classRecords', v_records_deleted,
    'explanations', v_explanations_deleted,
    'programFavorites', v_favorites_deleted,
    'sessionAttendance', v_session_attendance_deleted,
    'sessionPrograms', v_session_programs_deleted,
    'sessions', v_sessions_deleted,
    'classStudents', v_class_students_deleted,
    'scheduleRules', v_schedule_rules_deleted,
    'students', v_students_deleted,
    'classes', v_classes_deleted,
    'total',
      v_record_students_deleted
      + v_records_deleted
      + v_explanations_deleted
      + v_favorites_deleted
      + v_session_attendance_deleted
      + v_session_programs_deleted
      + v_sessions_deleted
      + v_class_students_deleted
      + v_schedule_rules_deleted
      + v_students_deleted
      + v_classes_deleted
  );
end;
$$;

revoke all on function public.spokedu_master_delete_operational_data(uuid)
  from public, anon, authenticated;

grant execute on function public.spokedu_master_delete_operational_data(uuid)
  to service_role;
