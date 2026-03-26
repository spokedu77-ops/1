-- ==========================================
-- session_count_logs 자동 동기화 트리거
-- - sessions.status 가 finished/verified 로
--   바뀌는 순간마다 session_count_logs 적재
-- - 주강사: sessions.created_by
-- - 보조강사: sessions.memo 의 EXTRA_TEACHERS:[{id,...}, ...]
-- - 중복 방지: UNIQUE(session_id, teacher_id) + ON CONFLICT DO NOTHING
--
-- 실행 시점: SQL Editor에서 배포
-- ==========================================

-- 중복 배포 방지
DROP TRIGGER IF EXISTS trg_session_count_logs_sync ON public.sessions;

-- UUID 형식 판별(잘못된 값은 캐스팅 전에 제거)
-- (Postgres regex는 lazy quantifier가 보장되지 않아서 JSON 배열은 greedy로 매칭)

CREATE OR REPLACE FUNCTION public.sync_session_count_logs_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title text;
  v_memo text;
  v_created_by_text text;
  v_extra_json jsonb;
  uuid_regex text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  SELECT
    s.title,
    s.memo,
    COALESCE(s.created_by::text, '')
  INTO
    v_title,
    v_memo,
    v_created_by_text
  FROM public.sessions s
  WHERE s.id = p_session_id
  LIMIT 1;

  -- 세션이 없거나 finished/verified가 아니면 종료
  IF v_title IS NULL AND v_memo IS NULL AND v_created_by_text = '' THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.id = p_session_id
      AND s.status IN ('finished', 'verified')
  ) THEN
    RETURN;
  END IF;

  -- EXTRA_TEACHERS JSON 추출 (실패하면 NULL)
  v_extra_json := NULL;
  IF v_memo IS NOT NULL AND v_memo ILIKE '%EXTRA_TEACHERS:%' THEN
    BEGIN
      v_extra_json :=
        (regexp_match(v_memo, 'EXTRA_TEACHERS:\s*(\[[\s\S]*\])'))[1]::jsonb;
    EXCEPTION WHEN others THEN
      v_extra_json := NULL;
    END;
  END IF;

  BEGIN
    INSERT INTO public.session_count_logs (teacher_id, session_id, session_title, count_change, reason)
    SELECT
      teachers.teacher_id,
      p_session_id,
      v_title,
      1,
      '트리거: sessions.status sync'
    FROM (
      -- 주강사
      SELECT
        CASE
          WHEN v_created_by_text ~ uuid_regex THEN v_created_by_text::uuid
          ELSE NULL
        END AS teacher_id

      UNION ALL

      -- 보조강사 (memo JSON 배열 순회)
      SELECT
        CASE
          WHEN elem->>'id' ~ uuid_regex THEN (elem->>'id')::uuid
          ELSE NULL
        END AS teacher_id
      FROM jsonb_array_elements(COALESCE(v_extra_json, '[]'::jsonb)) elem
    ) AS teachers
    JOIN public.users u
      ON u.id = teachers.teacher_id
    WHERE teachers.teacher_id IS NOT NULL
    -- 부분 유니크 인덱스(WHERE session_id IS NOT NULL)와 WHERE 조건을 정확히 일치시켜야 함
    ON CONFLICT (session_id, teacher_id) WHERE session_id IS NOT NULL DO NOTHING;
  EXCEPTION WHEN others THEN
    -- 트리거 내부 오류가 부모 sessions.update 트랜잭션을 롤백하지 않도록 방어
    NULL;
  END;

END;
$$;

-- rows inserted/updated 후 동기화 트리거 함수
CREATE OR REPLACE FUNCTION public.trg_session_count_logs_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- status가 finished/verified가 될 때만 동기화
  IF NEW.status IN ('finished', 'verified') THEN
    PERFORM public.sync_session_count_logs_for_session(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_session_count_logs_sync
AFTER INSERT OR UPDATE OF status ON public.sessions
FOR EACH ROW
WHEN (NEW.status IN ('finished', 'verified'))
EXECUTE FUNCTION public.trg_session_count_logs_sync();

