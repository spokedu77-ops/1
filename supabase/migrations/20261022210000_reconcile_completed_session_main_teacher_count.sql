-- Keep the automatic session count aligned when a completed session's main
-- teacher changes. Manual/correction rows and assistant counts are never
-- rewritten; ambiguous historical rows abort the parent sessions update.

-- Status changes and postponement may remove an automatic count, but linked
-- manual/correction rows are historical records and must survive unchanged.
CREATE OR REPLACE FUNCTION public.clear_session_count_logs_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.session_count_logs
  WHERE session_id = p_session_id
    AND reason = '트리거: sessions.status sync';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_session_count_logs_for_session(uuid) FROM authenticated;

-- Completion must not succeed unless every intended main/assistant count is
-- represented by exactly one valid automatic row. Unexpected conflicts are
-- raised so the parent sessions INSERT/UPDATE rolls back atomically.
CREATE OR REPLACE FUNCTION public.sync_session_count_logs_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_session public.sessions%rowtype;
  v_extra_json_text text;
  v_extra_teachers jsonb := '[]'::jsonb;
  v_teacher_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id;

  IF NOT FOUND OR coalesce(v_session.status, '') NOT IN ('finished', 'verified') THEN
    RETURN;
  END IF;

  IF v_session.created_by IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23502',
      MESSAGE = 'SESSION_COUNT_MAIN_TEACHER_REQUIRED';
  END IF;

  IF position('EXTRA_TEACHERS:' in coalesce(v_session.memo, '')) > 0 THEN
    v_extra_json_text := substring(
      split_part(v_session.memo, 'EXTRA_TEACHERS:', 2)
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
    SELECT v_session.created_by AS teacher_id
    UNION
    SELECT nullif(item->>'id', '')::uuid
    FROM jsonb_array_elements(v_extra_teachers) item
  ) intended;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_teacher_ids) intended(teacher_id)
    LEFT JOIN public.users u ON u.id = intended.teacher_id
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'SESSION_COUNT_TEACHER_NOT_FOUND';
  END IF;

  PERFORM 1
  FROM public.session_count_logs
  WHERE session_id = p_session_id
    AND teacher_id = ANY(v_teacher_ids)
  ORDER BY teacher_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.session_count_logs
    WHERE session_id = p_session_id
      AND teacher_id = ANY(v_teacher_ids)
      AND (
        reason IS DISTINCT FROM '트리거: sessions.status sync'
        OR count_change IS DISTINCT FROM 1
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23000',
      MESSAGE = 'SESSION_COUNT_EXISTING_LOG_CONFLICT';
  END IF;

  INSERT INTO public.session_count_logs (
    teacher_id,
    session_id,
    session_title,
    count_change,
    reason
  )
  SELECT
    intended.teacher_id,
    p_session_id,
    v_session.title,
    1,
    '트리거: sessions.status sync'
  FROM unnest(v_teacher_ids) intended(teacher_id)
  ON CONFLICT (session_id, teacher_id) WHERE session_id IS NOT NULL DO NOTHING;

  -- Re-read after ON CONFLICT so a concurrent non-automatic row cannot be
  -- mistaken for a successfully synchronized count.
  IF EXISTS (
    SELECT 1
    FROM unnest(v_teacher_ids) intended(teacher_id)
    LEFT JOIN public.session_count_logs log
      ON log.session_id = p_session_id
      AND log.teacher_id = intended.teacher_id
      AND log.reason = '트리거: sessions.status sync'
      AND log.count_change = 1
    WHERE log.id IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23000',
      MESSAGE = 'SESSION_COUNT_SYNC_INCOMPLETE';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_session_count_logs_for_session(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.trg_session_count_logs_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_extra_json_text text;
  v_extra_teachers jsonb := '[]'::jsonb;
  v_old_teacher_is_assistant boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.clear_session_count_logs_for_session(OLD.id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status IN ('finished', 'verified')
    AND NEW.status IN ('finished', 'verified')
    AND NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    IF OLD.created_by IS NULL OR NEW.created_by IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23000',
        MESSAGE = 'SESSION_COUNT_MAIN_TEACHER_REQUIRED';
    END IF;

    IF position('EXTRA_TEACHERS:' in coalesce(NEW.memo, '')) > 0 THEN
      v_extra_json_text := substring(
        split_part(NEW.memo, 'EXTRA_TEACHERS:', 2)
        from '(\[[^\r\n]*\])'
      );

      IF v_extra_json_text IS NULL THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'SESSION_COUNT_EXTRA_TEACHERS_INVALID';
      END IF;

      BEGIN
        v_extra_teachers := v_extra_json_text::jsonb;
        IF jsonb_typeof(v_extra_teachers) <> 'array' THEN
          RAISE EXCEPTION 'assistant metadata is not an array' USING ERRCODE = '22023';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_extra_teachers) item
          WHERE jsonb_typeof(item) <> 'object'
            OR nullif(item->>'id', '') IS NULL
        ) THEN
          RAISE EXCEPTION 'assistant metadata has no id' USING ERRCODE = '22023';
        END IF;

        -- Validate every assistant id before deciding whether the old main
        -- teacher still has a legitimate role in this session.
        PERFORM nullif(item->>'id', '')::uuid
        FROM jsonb_array_elements(v_extra_teachers) item;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION USING
          ERRCODE = '22023',
          MESSAGE = 'SESSION_COUNT_EXTRA_TEACHERS_INVALID';
      END;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_extra_teachers) item
      WHERE nullif(item->>'id', '')::uuid = OLD.created_by
    )
    INTO v_old_teacher_is_assistant;

    -- Serialize competing reassignment attempts and validate only the two
    -- affected teachers. Rows for all other assistants remain untouched.
    PERFORM 1
    FROM public.session_count_logs
    WHERE session_id = NEW.id
      AND teacher_id IN (OLD.created_by, NEW.created_by)
    ORDER BY teacher_id
    FOR UPDATE;

    IF NOT EXISTS (
      SELECT 1
      FROM public.session_count_logs
      WHERE session_id = NEW.id
        AND teacher_id = OLD.created_by
        AND reason = '트리거: sessions.status sync'
        AND count_change = 1
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23000',
        MESSAGE = 'SESSION_COUNT_SOURCE_AUTO_LOG_AMBIGUOUS';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.session_count_logs
      WHERE session_id = NEW.id
        AND teacher_id = NEW.created_by
        AND (reason IS DISTINCT FROM '트리거: sessions.status sync' OR count_change IS DISTINCT FROM 1)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23000',
        MESSAGE = 'SESSION_COUNT_TARGET_LOG_AMBIGUOUS';
    END IF;

    IF NOT v_old_teacher_is_assistant THEN
      DELETE FROM public.session_count_logs
      WHERE session_id = NEW.id
        AND teacher_id = OLD.created_by
        AND reason = '트리거: sessions.status sync'
        AND count_change = 1;
    END IF;

    INSERT INTO public.session_count_logs (
    intended.teacher_id,
      session_id,
      session_title,
      count_change,
      reason
    )
    VALUES (
      NEW.created_by,
      NEW.id,
      NEW.title,
      1,
      '트리거: sessions.status sync'
    )
    ON CONFLICT (session_id, teacher_id) WHERE session_id IS NOT NULL DO NOTHING;

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
DROP TRIGGER IF EXISTS trg_session_count_logs_sync_delete ON public.sessions;

CREATE TRIGGER trg_session_count_logs_sync
AFTER INSERT OR UPDATE OF status, created_by ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_session_count_logs_sync();

CREATE TRIGGER trg_session_count_logs_sync_delete
BEFORE DELETE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.trg_session_count_logs_sync();
