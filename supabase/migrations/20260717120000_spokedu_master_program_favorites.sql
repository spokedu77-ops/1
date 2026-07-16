-- Server-owned program favorites for SPOKEDU MASTER library.

CREATE TABLE IF NOT EXISTS public.spokedu_master_program_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spokedu_master_program_favorites_owner_program_unique UNIQUE (owner_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_spokedu_master_program_favorites_owner_created
  ON public.spokedu_master_program_favorites (owner_id, created_at DESC);

ALTER TABLE public.spokedu_master_program_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY spokedu_master_program_favorites_select_own
  ON public.spokedu_master_program_favorites
  FOR SELECT
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY spokedu_master_program_favorites_insert_own
  ON public.spokedu_master_program_favorites
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY spokedu_master_program_favorites_delete_own
  ON public.spokedu_master_program_favorites
  FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

-- Extend privacy delete RPC to include favorites.
CREATE OR REPLACE FUNCTION public.spokedu_master_delete_operational_data(
  p_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_record_students_deleted integer := 0;
  v_records_deleted integer := 0;
  v_explanations_deleted integer := 0;
  v_students_deleted integer := 0;
  v_favorites_deleted integer := 0;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'owner id is required';
  END IF;

  DELETE FROM public.spokedu_master_class_record_students
   WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_record_students_deleted = ROW_COUNT;

  DELETE FROM public.spokedu_master_class_records
   WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_records_deleted = ROW_COUNT;

  DELETE FROM public.spokedu_master_explanations
   WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_explanations_deleted = ROW_COUNT;

  DELETE FROM public.spokedu_master_students
   WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_students_deleted = ROW_COUNT;

  DELETE FROM public.spokedu_master_program_favorites
   WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_favorites_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'recordStudents', v_record_students_deleted,
    'classRecords', v_records_deleted,
    'explanations', v_explanations_deleted,
    'students', v_students_deleted,
    'programFavorites', v_favorites_deleted,
    'total',
      v_record_students_deleted
      + v_records_deleted
      + v_explanations_deleted
      + v_students_deleted
      + v_favorites_deleted
  );
END;
$$;
