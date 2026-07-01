-- Add covering indexes for foreign keys flagged by Supabase performance advisor.
-- Indexes do not change query results or application behavior.

CREATE INDEX IF NOT EXISTS idx_center_history_created_by
  ON public.center_history (created_by);

CREATE INDEX IF NOT EXISTS idx_center_tbd_classes_extra_teacher_id
  ON public.center_tbd_classes (extra_teacher_id);

CREATE INDEX IF NOT EXISTS idx_center_tbd_classes_main_teacher_id
  ON public.center_tbd_classes (main_teacher_id);

CREATE INDEX IF NOT EXISTS idx_center_tbd_classes_updated_by
  ON public.center_tbd_classes (updated_by);

CREATE INDEX IF NOT EXISTS idx_center_tbd_month_notes_updated_by
  ON public.center_tbd_month_notes (updated_by);

CREATE INDEX IF NOT EXISTS idx_centers_main_teacher_2_id
  ON public.centers (main_teacher_2_id);

CREATE INDEX IF NOT EXISTS idx_centers_main_teacher_3_id
  ON public.centers (main_teacher_3_id);

CREATE INDEX IF NOT EXISTS idx_mbt_leads_user_id
  ON public.mbt_leads (user_id);

CREATE INDEX IF NOT EXISTS idx_spm_class_record_students_owner_id
  ON public.spokedu_master_class_record_students (owner_id);

CREATE INDEX IF NOT EXISTS idx_spm_class_record_students_student_id
  ON public.spokedu_master_class_record_students (student_id);
