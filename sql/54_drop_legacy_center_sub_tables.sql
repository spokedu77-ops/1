-- =============================================================
-- 54_drop_legacy_center_sub_tables.sql
-- 목적: 센터 관리 압축 리뉴얼 후 더 이상 사용하지 않는
--       하위 테이블 및 관련 정책·인덱스를 하드 제거합니다.
--
-- 대상 테이블:
--   - programs           (센터 프로그램 — 코드에서 완전 제거)
--   - center_finance_terms (재무 조건 — 코드에서 완전 제거)
--   - center_logs        (운영 로그 — 코드에서 완전 제거)
--   - center_files       (첨부 파일 — 코드에서 완전 제거)
--
-- 주의: CASCADE를 사용하므로 의존 뷰·함수·정책이 있으면 함께 제거됩니다.
--       실행 전 반드시 백업 또는 스냅샷을 확인하세요.
-- =============================================================

-- ① programs 테이블 RLS 정책 제거 후 DROP
DROP POLICY IF EXISTS "Admin can manage programs"       ON public.programs;
DROP POLICY IF EXISTS "admin_manage_programs"           ON public.programs;
DROP POLICY IF EXISTS "Service role can manage programs" ON public.programs;
-- 인덱스
DROP INDEX IF EXISTS programs_center_id_idx;
DROP INDEX IF EXISTS programs_status_idx;
-- 테이블 (CASCADE: 모든 의존 객체 함께 제거)
DROP TABLE IF EXISTS public.programs CASCADE;

-- ② center_finance_terms 테이블 RLS 정책 제거 후 DROP
DROP POLICY IF EXISTS "Admin can manage center_finance_terms"       ON public.center_finance_terms;
DROP POLICY IF EXISTS "admin_manage_center_finance_terms"           ON public.center_finance_terms;
DROP POLICY IF EXISTS "Service role can manage center_finance_terms" ON public.center_finance_terms;
-- 인덱스
DROP INDEX IF EXISTS center_finance_terms_center_id_idx;
-- 테이블
DROP TABLE IF EXISTS public.center_finance_terms CASCADE;

-- ③ center_logs 테이블 RLS 정책 제거 후 DROP
DROP POLICY IF EXISTS "Admin can manage center_logs"       ON public.center_logs;
DROP POLICY IF EXISTS "admin_manage_center_logs"           ON public.center_logs;
DROP POLICY IF EXISTS "Service role can manage center_logs" ON public.center_logs;
-- 인덱스
DROP INDEX IF EXISTS center_logs_center_id_idx;
DROP INDEX IF EXISTS center_logs_log_date_idx;
-- 테이블
DROP TABLE IF EXISTS public.center_logs CASCADE;

-- ④ center_files 테이블 RLS 정책 제거 후 DROP
DROP POLICY IF EXISTS "Admin can manage center_files"       ON public.center_files;
DROP POLICY IF EXISTS "admin_manage_center_files"           ON public.center_files;
DROP POLICY IF EXISTS "Service role can manage center_files" ON public.center_files;
-- 인덱스
DROP INDEX IF EXISTS center_files_center_id_idx;
-- 테이블
DROP TABLE IF EXISTS public.center_files CASCADE;

-- =============================================================
-- 검증: 제거된 테이블이 information_schema 에 존재하지 않는지 확인
-- =============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('programs', 'center_finance_terms', 'center_logs', 'center_files');
-- 결과가 0행이면 정상 제거됨
