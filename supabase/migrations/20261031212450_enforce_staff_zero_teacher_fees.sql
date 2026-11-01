-- Staff teaching is non-payable. No historical sessions or locked settlement
-- snapshots are rewritten: this migration guards subsequent writes only.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.staff_fee_identity(p_user jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(lower(trim(p_user->>'role')) IN ('admin','master'), false)
    OR coalesce(p_user->>'is_admin' = 'true', false)
    OR coalesce(trim(p_user->>'name') IN ('최지훈','김구민','김윤기'), false)
    OR coalesce(lower(trim(p_user->>'email')) IN
      ('choijihoon@spokedu.com','kimkoomin@spokedu.com','kimyoonki@spokedu.com','spomove@spokedu.com'), false);
$$;

CREATE OR REPLACE FUNCTION private.staff_fee_teacher(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce((SELECT private.staff_fee_identity(to_jsonb(u)) FROM public.users u WHERE u.id = p_id), false);
$$;

CREATE OR REPLACE FUNCTION private.staff_fee_metadata(p_text text)
RETURNS text LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_json text;
  v_rows jsonb;
  v_new jsonb;
BEGIN
  IF p_text IS NULL OR position('EXTRA_TEACHERS:' IN p_text) = 0 THEN RETURN p_text; END IF;
  v_json := substring(p_text FROM 'EXTRA_TEACHERS:\s*(\[[^\r\n]*\])');
  IF v_json IS NULL THEN RAISE EXCEPTION 'SESSION_METADATA_INVALID'; END IF;
  v_rows := v_json::jsonb;
  IF jsonb_typeof(v_rows) <> 'array' THEN RAISE EXCEPTION 'SESSION_METADATA_INVALID'; END IF;
  SELECT coalesce(jsonb_agg(CASE WHEN private.staff_fee_teacher((item->>'id')::uuid)
    THEN item || '{"price":0}'::jsonb ELSE item END ORDER BY ord), '[]'::jsonb)
    INTO v_new FROM jsonb_array_elements(v_rows) WITH ORDINALITY AS extras(item, ord);
  IF v_new = v_rows THEN RETURN p_text; END IF;
  RETURN overlay(p_text PLACING v_new::text FROM position(v_json IN p_text) FOR length(v_json));
END;
$$;

CREATE OR REPLACE FUNCTION private.enforce_staff_zero_teacher_fees()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_patch jsonb := '{}'::jsonb;
  v_fees jsonb;
BEGIN
  IF TG_TABLE_NAME = 'users' THEN
    IF private.staff_fee_identity(v_row) THEN
      v_patch := '{"fee_private":0,"fee_group":0,"fee_center_main":0,"fee_center_assist":0}'::jsonb;
    END IF;
  ELSIF TG_TABLE_NAME = 'sessions' THEN
    IF private.staff_fee_teacher((v_row->>'created_by')::uuid) THEN v_patch := '{"price":0}'::jsonb; END IF;
    v_patch := v_patch || jsonb_build_object(
      'memo', private.staff_fee_metadata(v_row->>'memo'),
      'students_text', private.staff_fee_metadata(v_row->>'students_text'));
  ELSIF TG_TABLE_NAME = 'centers' THEN
    IF jsonb_typeof(v_row->'instructors_default'->'fees') = 'array' THEN
      SELECT coalesce(jsonb_agg(CASE WHEN private.staff_fee_teacher((item->>'teacher_id')::uuid)
        THEN item || '{"amount":0}'::jsonb ELSE item END ORDER BY ord), '[]'::jsonb)
        INTO v_fees FROM jsonb_array_elements(v_row->'instructors_default'->'fees') WITH ORDINALITY AS fees(item, ord);
      v_patch := jsonb_build_object('instructors_default', (v_row->'instructors_default') || jsonb_build_object('fees', v_fees));
    END IF;
  END IF;
  NEW := jsonb_populate_record(NEW, v_patch);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.staff_fee_identity(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.staff_fee_teacher(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.staff_fee_metadata(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enforce_staff_zero_teacher_fees() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER staff_zero_teacher_fees
BEFORE INSERT OR UPDATE OF created_by, price, memo, students_text ON public.sessions
FOR EACH ROW EXECUTE FUNCTION private.enforce_staff_zero_teacher_fees();
CREATE TRIGGER staff_zero_default_fees
BEFORE INSERT OR UPDATE OF role, is_admin, name, email, fee_private, fee_group, fee_center_main, fee_center_assist ON public.users
FOR EACH ROW EXECUTE FUNCTION private.enforce_staff_zero_teacher_fees();
CREATE TRIGGER staff_zero_center_fees
BEFORE INSERT OR UPDATE OF instructors_default ON public.centers
FOR EACH ROW EXECUTE FUNCTION private.enforce_staff_zero_teacher_fees();
