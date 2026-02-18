-- ================================================================
-- 선생님 여러 명 한 번에: user uuid = auth uuid 맞추기 (일괄)
--
-- 1) 아래 VALUES 에 (public_id, auth_id) 쌍을 추가해서 넣고
-- 2) 전체 실행 (Service Role 권장)
--
-- public_id = 수업/정산 붙어 있는 id (diagnose 7번 목록의 id)
-- auth_id   = 로그인 시 쓰는 id (Supabase → Authentication → Users → UID)
-- ================================================================

CREATE TEMP TABLE _sync_pairs (public_id UUID, auth_id UUID);
INSERT INTO _sync_pairs (public_id, auth_id) VALUES
  ('e3ee1dd4-63a0-4aa2-87f7-2cb2b55efc44', '0a5f1940-fa3a-41b5-ad0c-34864587f2c4'),  -- 허찬녕
  ('68b49c08-6693-4f88-ae07-b7b2e1b8fc27', '70963765-0d24-4b01-8118-cd29ae2d2de2'),  -- 최한빈
  ('666a5116-bc75-475d-bce1-e1690d2b63ba', '1ac899ba-64f5-4cf8-bad2-0f902be936ab'),  -- 정재원
  ('540a3b8a-4802-4981-9022-f73fb44752e2', 'bc21b842-d2eb-44a2-b293-7e6e728dacd5'),  -- 정다혜
  ('35434c07-195a-4f86-8142-2f636826c693', 'f8099803-3bd6-4649-8a87-909dfb8e0511'),  -- 윤도현
  ('0ed34d87-edd9-4ca9-9ee6-40be5bebbc79', 'dc27eb4c-38cb-4a0a-aeeb-95dcbfe3ebe5'),  -- 유창환
  ('9439e8a1-cf20-4513-ad7c-8e0dddbd9de8', '871c513e-439a-40e9-a6c3-0c1cefed2706'),  -- 유수빈
  ('f9e71aad-3891-47b8-86d7-b949d3f684b7', 'ff693efe-8458-4c52-a26e-93c73c5ed535'),  -- 유소망
  ('dc91a8f3-dffa-4ffd-bacb-4e8ecf3b706a', 'f0e60386-f901-4953-8237-39527391109b'),  -- 유대웅
  ('0d803cd4-c8c1-4b9e-90ef-2455d6d38fb4', 'd8a093e7-ccea-486f-8aeb-8953809bac9c'),  -- 성연호
  ('995f706b-864e-4c7b-a94a-e79dfe65e5a9', 'babac063-a848-491c-98c4-8ca79c5d9546'),  -- 박성용
  ('5e541831-6ddb-4caa-8232-06ca659ff728', '6674772e-5f47-44b7-88b6-000ead3c3482'),  -- 김지원
  ('164fda01-2c3c-4f97-858d-3b4b36551d9d', 'a4b51341-45d7-43ac-8a6b-f522097cc013'),  -- 김미조
  ('9d5a4ee6-9437-49a2-850f-55bf08b7afa5', 'bd35df70-9ff9-49e6-8593-57492293b155'),  -- 김강현
  ('27197efd-38c7-44d3-bd8e-f96cc6dde749', '11812c0f-915b-4034-965d-a4eed6314d48')   -- 조승제
;

DO $$
DECLARE
  r RECORD;
  uq_name TEXT;
  backup_cnt INT;
BEGIN
  SELECT c.conname INTO uq_name FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'users' AND c.contype = 'u' AND pg_get_constraintdef(c.oid) LIKE '%email%' LIMIT 1;
  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', uq_name);
  END IF;

  FOR r IN SELECT public_id, auth_id FROM _sync_pairs LOOP
    CREATE TEMP TABLE _sync_user_backup (LIKE public.users);
    INSERT INTO _sync_user_backup SELECT * FROM public.users WHERE id = r.public_id;
    GET DIAGNOSTICS backup_cnt = ROW_COUNT;

    IF backup_cnt = 0 THEN
      DROP TABLE _sync_user_backup;
      RAISE NOTICE '건너뜀 (행 없음): public %', r.public_id;
      CONTINUE;
    END IF;

    INSERT INTO public.users (id, email, name, role, is_active, points, documents, phone, organization, departure_location, schedule, vacation, created_at, updated_at)
    SELECT r.auth_id, email, name, role, COALESCE(is_active, true), COALESCE(points, 0), documents, phone, organization, departure_location, schedule, vacation, created_at, NOW()
    FROM _sync_user_backup LIMIT 1;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_admin') THEN
      UPDATE public.users u SET is_admin = b.is_admin FROM _sync_user_backup b WHERE u.id = r.auth_id;
    END IF;

    UPDATE sessions SET created_by = r.auth_id WHERE created_by = r.public_id;
    UPDATE mileage_logs SET teacher_id = r.auth_id WHERE teacher_id = r.public_id;
    UPDATE session_count_logs SET teacher_id = r.auth_id WHERE teacher_id = r.public_id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settlements') THEN
      UPDATE settlements SET teacher_id = r.auth_id WHERE teacher_id = r.public_id;
    END IF;
    UPDATE inventory SET user_id = r.auth_id WHERE user_id = r.public_id;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_logs') THEN
      UPDATE inventory_logs SET user_id = r.auth_id WHERE user_id = r.public_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_plans' AND column_name = 'teacher_id') THEN
      UPDATE lesson_plans SET teacher_id = r.auth_id WHERE teacher_id = r.public_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_participants') THEN
      UPDATE chat_participants SET user_id = r.auth_id WHERE user_id = r.public_id;
    END IF;

    DELETE FROM public.users WHERE id = r.public_id;
    DROP TABLE _sync_user_backup;

    RAISE NOTICE '완료: % → %', r.public_id, r.auth_id;
  END LOOP;

  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users ADD CONSTRAINT %I UNIQUE (email)', uq_name);
  END IF;
END $$;

DROP TABLE _sync_pairs;
