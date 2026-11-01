-- Targeted assistant removal / malformed legacy draft repair. No cron, status or fee changes.
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
    AND coalesce(NEW.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
    AND coalesce(OLD.status, '') NOT IN ('cancelled', 'postponed', 'deleted')
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
    BEGIN
      v_old_teacher_ids := public.session_count_teacher_ids(OLD.created_by, OLD.memo);
    EXCEPTION WHEN SQLSTATE '22023' THEN
      -- A valid replacement must be able to repair malformed legacy drafts.
      -- Completed records still require their original count-ledger identity.
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
      -- Removing reservations cannot introduce a new scheduling conflict.
      -- Keep retained slots; delete only removed assignment edges.
      DELETE FROM private.session_teacher_schedule_slots
      WHERE session_id = NEW.id AND NOT (teacher_id = ANY(v_new_teacher_ids));
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
