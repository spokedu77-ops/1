-- 배포 전 점검 (읽기 전용)

-- 1) 마이그레이션 중복 방지: 운영에 이미 있는 20261023* 버전
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version LIKE '20261023%' ORDER BY version;
-- 기대: 20261023135717, 20261023135727 만 존재 (150000 은 배포 전 없음)

-- 2) 배포 후에만 존재해야 하는 객체
SELECT to_regclass('public.kr_public_holidays') IS NOT NULL AS has_holiday_table;
SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_cancel_mileage_log'
) AS has_single_cancel;
SELECT EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_cancel_session_linked_settlement'
) AS has_session_cancel;

-- 3) RLS: authenticated 는 holiday 테이블 SELECT 만
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'kr_public_holidays' AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY 1, 2;

-- 4) 공휴일 0P (배포 후)
-- SELECT private.phase2_mileage_total('수업 연기', timestamptz '2026-10-02T15:00:00+00');
