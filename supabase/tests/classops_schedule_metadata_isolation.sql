-- Run against a disposable migrated database as its migration owner.
-- No production session rows are inserted or modified; everything rolls back.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  v_main uuid := '70000000-0000-4000-8000-000000000001';
  v_assist uuid := '70000000-0000-4000-8000-000000000002';
  v_ids uuid[];
  v_memo text;
BEGIN
  v_ids := public.session_schedule_teacher_ids(v_main, 'EXTRA_TEACHERS:[{"id":"","price":0}]');
  IF v_ids IS DISTINCT FROM ARRAY[v_main] THEN RAISE EXCEPTION 'blank placeholder blocked main'; END IF;

  v_memo := 'EXTRA_TEACHERS:[{"id":"","price":0},{"id":"' || v_assist || '","price":35000}]';
  v_ids := public.session_schedule_teacher_ids(v_main, v_memo);
  IF NOT (v_main = ANY(v_ids) AND v_assist = ANY(v_ids)) OR cardinality(v_ids) <> 2 THEN
    RAISE EXCEPTION 'real main/assistant lost during legacy read';
  END IF;
  -- Reading compatibility must not loosen completed-count or write parsing.
  BEGIN
    PERFORM public.session_count_teacher_ids(v_main, v_memo);
    RAISE EXCEPTION 'strict count parser accepted blank assignment';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;

  FOREACH v_memo IN ARRAY ARRAY[
    'EXTRA_TEACHERS:[{"id":"","price":100}]',
    'EXTRA_TEACHERS:[{"id":"","price":0,"name":"unknown"}]',
    'EXTRA_TEACHERS:[{"id":"not-a-uuid","price":0}]',
    'EXTRA_TEACHERS:[{"price":0}]',
    'EXTRA_TEACHERS:[null]',
    'EXTRA_TEACHERS:[broken'
  ] LOOP
    BEGIN
      PERFORM public.session_schedule_teacher_ids(v_main, v_memo);
      RAISE EXCEPTION 'unsafe legacy metadata accepted: %', v_memo;
    EXCEPTION WHEN SQLSTATE '22023' THEN
      IF SQLERRM <> 'SESSION_SCHEDULE_METADATA_INVALID' THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;

-- Exercise the actual BEFORE-trigger function without touching live sessions.
CREATE TEMP TABLE assignment_metadata_fixture (id integer, created_by uuid, memo text);
INSERT INTO assignment_metadata_fixture VALUES
  (1, '70000000-0000-4000-8000-000000000001', 'EXTRA_TEACHERS:[{"id":"","price":0}]');
CREATE TRIGGER assignment_metadata_fixture_guard
BEFORE INSERT OR UPDATE OF created_by, memo ON assignment_metadata_fixture
FOR EACH ROW EXECUTE FUNCTION public.trg_session_assignment_metadata_guard();

DO $$
BEGIN
  BEGIN
    INSERT INTO assignment_metadata_fixture VALUES
      (2, '70000000-0000-4000-8000-000000000001', 'EXTRA_TEACHERS:[{"id":"","price":0}]');
    RAISE EXCEPTION 'incomplete insertion accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  BEGIN
    UPDATE assignment_metadata_fixture SET created_by = '70000000-0000-4000-8000-000000000002' WHERE id = 1;
    RAISE EXCEPTION 'incomplete assignment update accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  -- No-op updates retain historical data; explicit repair is allowed.
  UPDATE assignment_metadata_fixture SET memo = memo WHERE id = 1;
  UPDATE assignment_metadata_fixture SET memo = 'EXTRA_TEACHERS:[]' WHERE id = 1;
  INSERT INTO assignment_metadata_fixture VALUES (3, NULL, NULL);
END;
$$;

ROLLBACK;
