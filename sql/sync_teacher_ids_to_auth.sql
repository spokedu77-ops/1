-- ================================================================
-- user uuid = auth_user_id uuid 맞추기 (한 명씩)
--
-- ★ 반드시 아래 두 줄을 실제 UUID로 바꾼 뒤 실행하세요 (지금 00000000 이면 에러 남)
--   • public_id_val: 수업/정산 붙어 있는 id (diagnose 7번 "정산 보유 선생님 목록"의 id 컬럼)
--   • auth_id_val:   로그인 시 쓰는 id (Supabase → Authentication → Users → 해당 사용자 UID)
-- ================================================================

DO $$
DECLARE
  public_id_val UUID := '63c3494b-acc0-4d45-9aee-07ba8415a131'::UUID;  -- 이진표 (수업 붙어 있는 id)
  auth_id_val   UUID := 'c9b4a449-6ab3-4549-9fc2-59c7a80a925d'::UUID;  -- 이진표 (로그인 Auth UID)
  uq_name TEXT;
  backup_cnt INT;
BEGIN
  IF public_id_val = '00000000-0000-0000-0000-000000000000'::UUID OR auth_id_val = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RAISE EXCEPTION 'public_id_val, auth_id_val 를 실제 UUID 두 개로 바꾼 뒤 실행하세요.';
  END IF;

  CREATE TEMP TABLE _sync_user_backup (LIKE public.users);
  INSERT INTO _sync_user_backup SELECT * FROM public.users WHERE id = public_id_val;
  GET DIAGNOSTICS backup_cnt = ROW_COUNT;
  IF backup_cnt = 0 THEN
    DROP TABLE _sync_user_backup;
    RAISE EXCEPTION 'public.users 에 id = % 인 행이 없습니다. public_id 를 확인하세요.', public_id_val;
  END IF;

  SELECT c.conname INTO uq_name FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'users' AND c.contype = 'u' AND pg_get_constraintdef(c.oid) LIKE '%email%' LIMIT 1;
  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', uq_name);
  END IF;

  INSERT INTO public.users (id, email, name, role, is_active, points, documents, phone, organization, departure_location, schedule, vacation, created_at, updated_at)
  SELECT auth_id_val, email, name, role, COALESCE(is_active, true), COALESCE(points, 0), documents, phone, organization, departure_location, schedule, vacation, created_at, NOW()
  FROM _sync_user_backup LIMIT 1;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_admin') THEN
    UPDATE public.users u SET is_admin = b.is_admin FROM _sync_user_backup b WHERE u.id = auth_id_val;
  END IF;

  UPDATE sessions SET created_by = auth_id_val WHERE created_by = public_id_val;
  UPDATE mileage_logs SET teacher_id = auth_id_val WHERE teacher_id = public_id_val;
  UPDATE session_count_logs SET teacher_id = auth_id_val WHERE teacher_id = public_id_val;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settlements') THEN
    UPDATE settlements SET teacher_id = auth_id_val WHERE teacher_id = public_id_val;
  END IF;
  UPDATE inventory SET user_id = auth_id_val WHERE user_id = public_id_val;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_logs') THEN
    UPDATE inventory_logs SET user_id = auth_id_val WHERE user_id = public_id_val;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_plans' AND column_name = 'teacher_id') THEN
    UPDATE lesson_plans SET teacher_id = auth_id_val WHERE teacher_id = public_id_val;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_participants') THEN
    UPDATE chat_participants SET user_id = auth_id_val WHERE user_id = public_id_val;
  END IF;

  DELETE FROM public.users WHERE id = public_id_val;

  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users ADD CONSTRAINT %I UNIQUE (email)', uq_name);
  END IF;
  DROP TABLE _sync_user_backup;

  RAISE NOTICE '완료: public % → auth %. 로그아웃 후 재로그인 하세요.', public_id_val, auth_id_val;
END $$;

-- 실행 후: 이 auth_id 로 보여야 할 데이터가 있는지 확인 (아래 UUID를 방금 쓴 auth_id 로 바꿔서 실행)
-- SELECT (SELECT COUNT(*) FROM public.users WHERE id = '여기에-auth_id-붙여넣기') AS users_행있음, (SELECT COUNT(*) FROM sessions WHERE created_by = '여기에-auth_id-붙여넣기') AS sessions_건수, (SELECT COUNT(*) FROM sessions WHERE created_by = '여기에-auth_id-붙여넣기' AND status IN ('finished','verified')) AS 정산_건수;
