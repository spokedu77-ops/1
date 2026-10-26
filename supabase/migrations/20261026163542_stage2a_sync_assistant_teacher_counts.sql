-- Stage 2A: keep automatic completed-session counts aligned with the complete
-- main/assistant teacher assignment stored on sessions.

CREATE OR REPLACE FUNCTION public.session_count_teacher_ids(
  p_created_by uuid,
  p_memo text
)
RETURNS uuid[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_extra_json_text text;
  v_extra_teachers jsonb := '[]'::jsonb;
  v_teacher_ids uuid[];
BEGIN
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23502',
      MESSAGE = 'SESSION_COUNT_MAIN_TEACHER_REQUIRED';
  END IF;

  IF position('EXTRA_TEACHERS:' in coalesce(p_memo, '')) > 0 THEN
    v_extra_json_text := substring(
      split_part(p_memo, 'EXTRA_TEACHERS:', 2)
      from '(\[[^\r\n]*\])'
    );

    IF v_extra_json_text IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'SESSION_COUNT_EXTRA_TEACHERS_INVALID';
    END IF;

    BEGIN
      v_extra_teachers := v_extra_json_text::jsonb;
      IF jsonb_typeof(v_extra_teachers) <> 'array' OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_extra_teachers) item
        WHERE jsonb_typeof(item) <> 'object'
          OR nullif(item->>'id', '') IS NULL
      ) THEN
        RAISE EXCEPTION 'invalid assistant metadata' USING ERRCODE = '22023';
      END IF;

      PERFORM nullif(item->>'id', '')::uuid
      FROM jsonb_array_elements(v_extra_teachers) item;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'SESSION_COUNT_EXTRA_TEACHERS_INVALID';
    END;
  END IF;

  SELECT array_agg(teacher_id ORDER BY teacher_id)
  INTO v_teacher_ids
  FROM (
    SELECT p_created_by AS teacher_id
    UNION
    SELECT nullif(item->>'id', '')::uuid
    FROM jsonb_array_elements(v_extra_teachers) item
  ) assigned;

  RETURN v_teacher_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.session_count_teacher_ids(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.session_count_teacher_ids(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.session_count_teacher_ids(uuid, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.trg_session_count_logs_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_old_teacher_ids uuid[];
  v_new_teacher_ids uuid[];
  v_removed_teacher_ids uuid[] := ARRAY[]::uuid[];
  v_added_teacher_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.clear_session_count_logs_for_session(OLD.id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status IN ('finished', 'verified')
    AND NEW.status IN ('finished', 'verified')
  THEN
    v_old_teacher_ids := public.session_count_teacher_ids(OLD.created_by, OLD.memo);
    v_new_teacher_ids := public.session_count_teacher_ids(NEW.created_by, NEW.memo);

    -- A plain memo edit must not touch count rows. Role swaps also need no row
    -- rewrite when the distinct assigned-teacher set is unchanged.
    IF v_old_teacher_ids IS DISTINCT FROM v_new_teacher_ids THEN
      SELECT coalesce(array_agg(teacher_id ORDER BY teacher_id), ARRAY[]::uuid[])
      INTO v_removed_teacher_ids
      FROM unnest(v_old_teacher_ids) teacher_id
      WHERE NOT (teacher_id = ANY(v_new_teacher_ids));

      SELECT coalesce(array_agg(teacher_id ORDER BY teacher_id), ARRAY[]::uuid[])
      INTO v_added_teacher_ids
      FROM unnest(v_new_teacher_ids) teacher_id
      WHERE NOT (teacher_id = ANY(v_old_teacher_ids));

      -- Lock and reconcile only the changed assignment edges. The intersection
      -- is deliberately untouched so its log identity and history are stable.
      PERFORM 1
      FROM public.session_count_logs
      WHERE session_id = NEW.id
        AND teacher_id = ANY(v_removed_teacher_ids || v_added_teacher_ids)
      ORDER BY teacher_id
      FOR UPDATE;

      -- A removed assignment must have exactly the automatic row that this
      -- trigger owns. Missing, manual, or historical state is not inferred.
      IF EXISTS (
        SELECT 1
        FROM unnest(v_removed_teacher_ids) removed_teacher_id
        LEFT JOIN public.session_count_logs log
          ON log.session_id = NEW.id
         AND log.teacher_id = removed_teacher_id
         AND log.reason = '트리거: sessions.status sync'
         AND log.count_change = 1
        WHERE log.id IS NULL
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'SESSION_COUNT_SOURCE_AUTO_LOG_AMBIGUOUS';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM unnest(v_added_teacher_ids) added_teacher_id
        LEFT JOIN public.users teacher ON teacher.id = added_teacher_id
        WHERE teacher.id IS NULL
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23503',
          MESSAGE = 'SESSION_COUNT_TEACHER_NOT_FOUND';
      END IF;

      -- Any pre-existing target row is ambiguous, including an old automatic
      -- row. Never repair or delete it as a side effect of this assignment edit.
      IF EXISTS (
        SELECT 1
        FROM unnest(v_added_teacher_ids) added_teacher_id
        JOIN public.session_count_logs log
          ON log.session_id = NEW.id
         AND log.teacher_id = added_teacher_id
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23505',
          MESSAGE = 'SESSION_COUNT_TARGET_LOG_AMBIGUOUS';
      END IF;

      DELETE FROM public.session_count_logs
      WHERE session_id = NEW.id
        AND teacher_id = ANY(v_removed_teacher_ids)
        AND reason = '트리거: sessions.status sync'
        AND count_change = 1;

      INSERT INTO public.session_count_logs (
        teacher_id,
        session_id,
        session_title,
        count_change,
        reason
      )
      SELECT
        added_teacher_id,
        NEW.id,
        NEW.title,
        1,
        '트리거: sessions.status sync'
      FROM unnest(v_added_teacher_ids) added_teacher_id;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.status IN ('finished', 'verified') THEN
    PERFORM public.sync_session_count_logs_for_session(NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.clear_session_count_logs_for_session(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_session_count_logs_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_session_count_logs_sync() FROM anon;
REVOKE ALL ON FUNCTION public.trg_session_count_logs_sync() FROM authenticated;

DROP TRIGGER IF EXISTS trg_session_count_logs_sync ON public.sessions;

CREATE TRIGGER trg_session_count_logs_sync
AFTER INSERT OR UPDATE OF status, created_by, memo ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_session_count_logs_sync();
