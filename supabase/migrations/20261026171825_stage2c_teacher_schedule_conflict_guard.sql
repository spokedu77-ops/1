-- Stage 2C: server-authoritative teacher schedule conflict protection.
-- Existing sessions are deliberately not backfilled into the slot table, so
-- historical conflicts are not rewritten. New or materially changed schedules
-- are checked against both legacy sessions and transactionally reserved slots.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TABLE private.session_teacher_schedule_slots (
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.users(id),
  slot tstzrange NOT NULL,
  PRIMARY KEY (session_id, teacher_id),
  CONSTRAINT session_teacher_schedule_slots_nonempty CHECK (NOT isempty(slot)),
  CONSTRAINT session_teacher_schedule_slots_no_overlap
    EXCLUDE USING gist (teacher_id WITH =, slot WITH &&)
);

REVOKE ALL ON TABLE private.session_teacher_schedule_slots FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_session_teacher_schedule_conflict_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_old_teacher_ids uuid[] := ARRAY[]::uuid[];
  v_new_teacher_ids uuid[] := ARRAY[]::uuid[];
  v_conflicting_session_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM private.session_teacher_schedule_slots WHERE session_id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.start_at IS NOT DISTINCT FROM OLD.start_at
    AND NEW.end_at IS NOT DISTINCT FROM OLD.end_at
    AND NEW.created_by IS NOT DISTINCT FROM OLD.created_by
    AND NEW.memo IS NOT DISTINCT FROM OLD.memo
  THEN
    -- Status-only changes preserve legacy cancel/restore behavior and never
    -- retroactively validate an unchanged historical assignment.
    RETURN NEW;
  END IF;

  IF coalesce(NEW.status, '') IN ('cancelled', 'postponed', 'deleted') THEN
    DELETE FROM private.session_teacher_schedule_slots WHERE session_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.start_at IS NULL OR NEW.end_at IS NULL OR NEW.end_at <= NEW.start_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '22007',
      MESSAGE = 'TEACHER_SCHEDULE_INVALID_RANGE';
  END IF;

  v_new_teacher_ids := public.session_count_teacher_ids(NEW.created_by, NEW.memo);
  IF TG_OP = 'UPDATE' THEN
    v_old_teacher_ids := public.session_count_teacher_ids(OLD.created_by, OLD.memo);
    IF NEW.start_at IS NOT DISTINCT FROM OLD.start_at
      AND NEW.end_at IS NOT DISTINCT FROM OLD.end_at
      AND v_new_teacher_ids IS NOT DISTINCT FROM v_old_teacher_ids
    THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Serialize schedule-changing statements. The exclusion constraint below is
  -- the final race-condition guard for concurrently created reservations.
  PERFORM pg_advisory_xact_lock(742021, 3);

  SELECT existing.id
  INTO v_conflicting_session_id
  FROM public.sessions existing
  WHERE existing.id <> NEW.id
    AND coalesce(existing.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
    AND existing.start_at < NEW.end_at
    AND existing.end_at > NEW.start_at
    AND EXISTS (
      SELECT 1
      FROM unnest(public.session_count_teacher_ids(existing.created_by, existing.memo)) existing_teacher_id
      WHERE existing_teacher_id = ANY(v_new_teacher_ids)
    )
  ORDER BY existing.start_at, existing.id
  LIMIT 1;

  IF v_conflicting_session_id IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23P01',
      MESSAGE = 'TEACHER_SCHEDULE_CONFLICT',
      DETAIL = format('session_id=%s conflicts_with=%s', NEW.id, v_conflicting_session_id);
  END IF;

  DELETE FROM private.session_teacher_schedule_slots WHERE session_id = NEW.id;
  BEGIN
    INSERT INTO private.session_teacher_schedule_slots(session_id, teacher_id, slot)
    SELECT NEW.id, teacher_id, tstzrange(NEW.start_at, NEW.end_at, '[)')
    FROM unnest(v_new_teacher_ids) teacher_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION USING
      ERRCODE = '23P01',
      MESSAGE = 'TEACHER_SCHEDULE_CONFLICT';
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_session_teacher_schedule_conflict_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_session_teacher_schedule_conflict_guard ON public.sessions;
CREATE TRIGGER trg_session_teacher_schedule_conflict_guard
AFTER INSERT OR UPDATE OF start_at, end_at, created_by, memo, status OR DELETE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_session_teacher_schedule_conflict_guard();

CREATE OR REPLACE FUNCTION public.admin_apply_session_schedule_changes(p_changes jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_change jsonb;
  v_count integer;
  v_updated integer := 0;
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array'
    OR jsonb_array_length(p_changes) = 0 OR jsonb_array_length(p_changes) > 500
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SESSION_SCHEDULE_CHANGES_INVALID';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_changes) item
    WHERE nullif(item->>'id', '') IS NULL
      OR EXISTS (
        SELECT 1 FROM jsonb_object_keys(item) key
        WHERE key NOT IN ('id', 'start_at', 'end_at', 'created_by', 'memo', 'price')
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SESSION_SCHEDULE_CHANGE_FIELD_INVALID';
  END IF;

  SELECT count(*), count(DISTINCT item->>'id')
  INTO v_count, v_updated
  FROM jsonb_array_elements(p_changes) item;
  IF v_count <> v_updated THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SESSION_SCHEDULE_CHANGE_DUPLICATE_ID';
  END IF;
  v_updated := 0;

  PERFORM 1
  FROM public.sessions session
  JOIN jsonb_array_elements(p_changes) item ON session.id = (item->>'id')::uuid
  ORDER BY session.id
  FOR UPDATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> jsonb_array_length(p_changes) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'SESSION_SCHEDULE_CHANGE_SESSION_NOT_FOUND';
  END IF;

  FOR v_change IN
    SELECT item FROM jsonb_array_elements(p_changes) item ORDER BY item->>'id'
  LOOP
    UPDATE public.sessions session SET
      start_at = CASE WHEN v_change ? 'start_at' THEN (v_change->>'start_at')::timestamptz ELSE session.start_at END,
      end_at = CASE WHEN v_change ? 'end_at' THEN (v_change->>'end_at')::timestamptz ELSE session.end_at END,
      created_by = CASE WHEN v_change ? 'created_by' THEN (v_change->>'created_by')::uuid ELSE session.created_by END,
      memo = CASE WHEN v_change ? 'memo' THEN v_change->>'memo' ELSE session.memo END,
      price = CASE WHEN v_change ? 'price' THEN (v_change->>'price')::integer ELSE session.price END
    WHERE session.id = (v_change->>'id')::uuid;
    v_updated := v_updated + 1;
  END LOOP;

  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_apply_session_schedule_changes(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_session_schedule_changes(jsonb) TO service_role;
