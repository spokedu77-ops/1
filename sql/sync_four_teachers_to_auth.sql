-- ================================================================
-- 강사 4명: public.users id → Auth UID 로 일괄 연동
-- 김사라, 김태형, 김호준, 방소윤
-- Supabase SQL Editor에서 전체 선택 후 Run
-- ================================================================

DO $$
DECLARE
  public_id_val UUID;
  auth_id_val   UUID;
  uq_name TEXT;
  backup_cnt INT;
  pairs UUID[] := ARRAY[
    'ae1de166-1a35-434c-b960-4f78601a44a6'::UUID, '16fc5580-a176-49d9-97f1-caa5d16424f2'::UUID,  -- 김사라
    'e8ff3078-f368-4172-b5d1-5f2ad2c76607'::UUID, '0cad2a2a-f050-4ac6-b3a9-e09716e42215'::UUID,  -- 김태형
    '7e2c05f2-89ae-4f83-955f-bd457651d4d8'::UUID, 'bc99d480-f834-44f4-bc1d-c667ca3de77c'::UUID,  -- 김호준
    '0bf36e0a-2c20-48a9-b76e-fd8ca23086ef'::UUID, '0b7190a9-4c1e-46dc-b266-1ca0271885af'::UUID   -- 방소윤
  ];
  i INT := 1;
BEGIN
  -- email unique 제약 한 번만 해제 (4명 처리 동안 유지)
  SELECT c.conname INTO uq_name FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'users' AND c.contype = 'u' AND pg_get_constraintdef(c.oid) LIKE '%email%' LIMIT 1;
  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', uq_name);
  END IF;

  WHILE i <= array_length(pairs, 1) LOOP
    public_id_val := pairs[i];
    auth_id_val   := pairs[i + 1];
    i := i + 2;

    CREATE TEMP TABLE _sync_user_backup (LIKE public.users);
    INSERT INTO _sync_user_backup SELECT * FROM public.users WHERE id = public_id_val;
    GET DIAGNOSTICS backup_cnt = ROW_COUNT;

    IF backup_cnt > 0 THEN
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
      RAISE NOTICE '연동 완료: % → %', public_id_val, auth_id_val;
    ELSE
      RAISE NOTICE '건너뜀 (users에 없음): %', public_id_val;
    END IF;

    DROP TABLE _sync_user_backup;
  END LOOP;

  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users ADD CONSTRAINT %I UNIQUE (email)', uq_name);
  END IF;

  RAISE NOTICE '4명 처리 끝. 해당 강사는 로그아웃 후 재로그인 하세요.';
END $$;
