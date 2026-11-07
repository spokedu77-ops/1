-- Allow retrospective correction to today (KST), preserving all existing records.
-- Future-date feedback and recorded-session reuse remain forbidden. No data backfill.
CREATE OR REPLACE FUNCTION public.trg_session_feedback_date_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_today date := (statement_timestamp() AT TIME ZONE 'Asia/Seoul')::date;
  v_new_day date := (NEW.start_at AT TIME ZONE 'Asia/Seoul')::date;
  v_old_recorded boolean;
  v_new_feedback boolean;
BEGIN
  v_new_feedback := public.session_feedback_json_has_value(NEW.feedback_fields)
    OR public.session_feedback_json_has_value(NEW.photo_url)
    OR public.session_feedback_json_has_value(NEW.file_url)
    OR coalesce(NEW.students_text, '') ~ '✅[[:space:]]*(오늘 수업|강점|개선|다음 수업|특이사항)';

  IF v_new_day > v_today AND
    (v_new_feedback OR coalesce(NEW.status, '') IN ('finished', 'verified')) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'SESSION_FUTURE_FEEDBACK_FORBIDDEN';
  END IF;

  IF TG_OP = 'UPDATE' AND v_new_day > v_today
    AND v_new_day IS DISTINCT FROM (OLD.start_at AT TIME ZONE 'Asia/Seoul')::date THEN
    v_old_recorded := coalesce(OLD.status, '') IN ('finished', 'verified')
      OR public.session_feedback_json_has_value(OLD.feedback_fields)
      OR public.session_feedback_json_has_value(OLD.photo_url)
      OR public.session_feedback_json_has_value(OLD.file_url)
      OR coalesce(OLD.students_text, '') ~ '✅[[:space:]]*(오늘 수업|강점|개선|다음 수업|특이사항)';
    IF v_old_recorded THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'SESSION_RECORDED_SCHEDULE_MOVE_FORBIDDEN';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
