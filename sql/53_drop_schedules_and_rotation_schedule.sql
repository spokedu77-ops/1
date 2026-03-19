-- ============================================================
-- 53_drop_schedules_and_rotation_schedule.sql
-- schedules 테이블 및 rotation_schedule 테이블 제거 마이그레이션
--
-- 실행 전 반드시 스냅샷/백업을 확보하세요.
-- 이 작업은 되돌릴 수 없습니다.
-- ============================================================

-- -------------------------------------------------------
-- 1. RLS 정책 제거 (DROP TABLE CASCADE로 함께 제거되지만 명시)
-- -------------------------------------------------------
DROP POLICY IF EXISTS "schedules_select" ON public.schedules;
DROP POLICY IF EXISTS "schedules_insert" ON public.schedules;
DROP POLICY IF EXISTS "schedules_update" ON public.schedules;
DROP POLICY IF EXISTS "schedules_delete" ON public.schedules;

DROP POLICY IF EXISTS "rotation_schedule_select" ON public.rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_insert" ON public.rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_update" ON public.rotation_schedule;
DROP POLICY IF EXISTS "rotation_schedule_delete" ON public.rotation_schedule;

-- -------------------------------------------------------
-- 2. 관련 RPC 함수 제거
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS public.save_warmup_program(text, jsonb, jsonb, text, boolean) CASCADE;

-- -------------------------------------------------------
-- 3. schedules 테이블 제거
-- -------------------------------------------------------
DROP TABLE IF EXISTS public.schedules CASCADE;

-- -------------------------------------------------------
-- 4. rotation_schedule 테이블 제거
-- (iiwarmup_refactor_schema.sql 기준: rotation_schedule + 연관 인덱스)
-- -------------------------------------------------------
DROP TABLE IF EXISTS public.rotation_schedule CASCADE;

-- -------------------------------------------------------
-- 5. memos 테이블 제거 (대시보드 업무노트 데이터 - hq-memos API 제거로 불필요)
-- 주의: 기존 담당자 메모 데이터가 있다면 먼저 확인 후 실행하세요.
-- -------------------------------------------------------
-- DROP TABLE IF EXISTS public.memos CASCADE;  -- 필요 시 주석 해제

-- -------------------------------------------------------
-- 완료 확인
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules' AND table_schema = 'public') THEN
    RAISE NOTICE 'schedules 테이블이 성공적으로 제거되었습니다.';
  ELSE
    RAISE WARNING 'schedules 테이블이 아직 존재합니다.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rotation_schedule' AND table_schema = 'public') THEN
    RAISE NOTICE 'rotation_schedule 테이블이 성공적으로 제거되었습니다.';
  ELSE
    RAISE WARNING 'rotation_schedule 테이블이 아직 존재합니다.';
  END IF;
END;
$$;
