-- =====================================================
-- users RLS: 정책 내부에서 users 테이블 조회 제거 (무한 재귀 방지)
-- =====================================================
-- 이슈: users_update_admin_or_self 정책이 EXISTS (SELECT 1 FROM users ...) 로
--       users를 조회하면서, 해당 조회 시 다시 RLS가 걸려 무한 재귀 발생.
-- 해결: 정책에서는 users를 조회하지 않고, SECURITY DEFINER 함수 is_admin() 만 호출.
--       is_admin() 내부의 SELECT는 함수 소유자 권한으로 실행되어 RLS 재귀를 일으키지 않음.
--
-- Supabase SQL Editor에서 실행하세요.
-- 전제: is_admin() 함수가 이미 존재해야 함. 없으면 STORAGE_POLICIES.sql 또는
--       15_setup_complete_warmup_system.sql 의 is_admin() 생성 부분을 먼저 실행.
-- =====================================================

-- 1) is_admin() 이 LOWER(role) + is_admin 컬럼 반영하도록 통일 (선택 사항이지만 권장)
--    기존에 role = 'ADMIN' 만 보는 버전이 있으면 아래로 통일.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (LOWER(u.role) IN ('admin','master') OR u.is_admin = true)
  );
END;
$$;

-- 2) users UPDATE 정책: users 테이블 직접 조회 제거 → is_admin() 만 사용
DROP POLICY IF EXISTS "users_update_admin_or_self" ON public.users;
CREATE POLICY "users_update_admin_or_self" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

-- SELECT 정책은 그대로 두거나, 이미 auth.uid() 만 쓰고 있으면 변경 없음
-- (users_select_all 은 users 를 조회하지 않으므로 재귀 없음)

SELECT 'users RLS no-recursion fix applied.' AS status;
