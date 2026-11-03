-- Prevent incomplete assignments through every writer, including legacy clients.
-- The count-ledger parser remains strict and unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.trg_session_assignment_metadata_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS NOT DISTINCT FROM OLD.created_by
      AND NEW.memo IS NOT DISTINCT FROM OLD.memo THEN
      RETURN NEW;
    END IF;
  END IF;
  -- Validate assistants without changing the existing nullable-main policy for
  -- inactive rows. The schedule guard still requires a main on active rows.
  PERFORM public.session_count_teacher_ids(
    coalesce(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid), NEW.memo
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_session_assignment_metadata_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_session_assignment_metadata_guard
BEFORE INSERT OR UPDATE OF created_by, memo ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_session_assignment_metadata_guard();

-- Read-only compatibility for the exact historical empty-selector shape.
-- Never drop a nonempty teacher ID, a paid blank assignment or malformed JSON.
-- This helper must not be used for writes, completed counts or restore snapshots.
CREATE OR REPLACE FUNCTION public.session_schedule_teacher_ids(p_created_by uuid, p_memo text)
RETURNS uuid[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_ids uuid[];
BEGIN
  BEGIN
    RETURN public.session_count_teacher_ids(p_created_by, p_memo);
  EXCEPTION WHEN SQLSTATE '22023' THEN
    -- Only an unassigned zero-fee placeholder may be ignored below.
    NULL;
  END;

  BEGIN
    v_items := substring(split_part(p_memo, 'EXTRA_TEACHERS:', 2) from '(\[[^\r\n]*\])')::jsonb;
    IF v_items IS NULL OR jsonb_typeof(v_items) <> 'array' THEN
      RAISE EXCEPTION 'invalid assistant metadata';
    END IF;
    v_ids := ARRAY[p_created_by];
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
      IF v_item = '{"id":"","price":0}'::jsonb THEN CONTINUE; END IF;
      IF jsonb_typeof(v_item) <> 'object' OR nullif(v_item->>'id', '') IS NULL THEN
        RAISE EXCEPTION 'invalid assistant identity';
      END IF;
      v_ids := array_append(v_ids, (v_item->>'id')::uuid);
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SESSION_SCHEDULE_METADATA_INVALID';
  END;
  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.session_schedule_teacher_ids(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_session_teacher_schedule_conflict_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_old_teacher_ids uuid[] := ARRAY[]::uuid[];
  v_new_teacher_ids uuid[] := ARRAY[]::uuid[];
  v_existing record;
  v_existing_teacher_ids uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM private.session_teacher_schedule_slots WHERE session_id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND coalesce(NEW.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
    AND coalesce(OLD.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
    AND NEW.start_at IS NOT DISTINCT FROM OLD.start_at
    AND NEW.end_at IS NOT DISTINCT FROM OLD.end_at
    AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
    AND NEW.memo IS NOT DISTINCT FROM OLD.memo
  THEN
    RETURN NEW;
  END IF;

  IF coalesce(NEW.status, '') IN ('cancelled', 'postponed', 'deleted') THEN
    DELETE FROM private.session_teacher_schedule_slots WHERE session_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.start_at IS NULL OR NEW.end_at IS NULL OR NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION USING ERRCODE = '22007', MESSAGE = 'TEACHER_SCHEDULE_INVALID_RANGE';
  END IF;

  v_new_teacher_ids := public.session_count_teacher_ids(NEW.created_by, NEW.memo);
  IF TG_OP = 'UPDATE' THEN
    BEGIN
      v_old_teacher_ids := public.session_count_teacher_ids(OLD.created_by, OLD.memo);
    EXCEPTION WHEN SQLSTATE '22023' THEN
      IF coalesce(OLD.status, '') IN ('finished', 'verified') THEN RAISE; END IF;
      v_old_teacher_ids := NULL;
    END;
    IF coalesce(OLD.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
      AND coalesce(NEW.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
      AND NEW.start_at IS NOT DISTINCT FROM OLD.start_at
      AND NEW.end_at IS NOT DISTINCT FROM OLD.end_at
      AND v_old_teacher_ids IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM unnest(v_new_teacher_ids) teacher_id
        WHERE NOT (teacher_id = ANY(v_old_teacher_ids))
      )
    THEN
      DELETE FROM private.session_teacher_schedule_slots
      WHERE session_id = NEW.id AND NOT (teacher_id = ANY(v_new_teacher_ids));
      RETURN NEW;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(742021, 3);

  -- Parse in a procedural loop AFTER filtering. SQL predicate evaluation order
  -- must not let malformed metadata on a non-overlapping row reject this save.
  FOR v_existing IN
    SELECT existing.id, existing.created_by, existing.memo
    FROM public.sessions existing
    WHERE existing.id <> NEW.id
      AND coalesce(existing.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
      AND existing.start_at < NEW.end_at
      AND existing.end_at > NEW.start_at
    ORDER BY existing.start_at, existing.id
  LOOP
    BEGIN
      v_existing_teacher_ids := public.session_schedule_teacher_ids(v_existing.created_by, v_existing.memo);
    EXCEPTION WHEN SQLSTATE '22023' OR SQLSTATE '23502' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SESSION_SCHEDULE_METADATA_INVALID',
        DETAIL = format('session_id=%s invalid_session_id=%s', NEW.id, v_existing.id);
    END;
    IF v_existing_teacher_ids && v_new_teacher_ids THEN
      RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'TEACHER_SCHEDULE_CONFLICT',
        DETAIL = format('session_id=%s conflicts_with=%s', NEW.id, v_existing.id);
    END IF;
  END LOOP;

  DELETE FROM private.session_teacher_schedule_slots WHERE session_id = NEW.id;
  BEGIN
    INSERT INTO private.session_teacher_schedule_slots(session_id, teacher_id, slot)
    SELECT NEW.id, teacher_id, tstzrange(NEW.start_at, NEW.end_at, '[)')
    FROM unnest(v_new_teacher_ids) teacher_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'TEACHER_SCHEDULE_CONFLICT';
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_session_teacher_schedule_conflict_guard() FROM PUBLIC, anon, authenticated;
COMMIT;
