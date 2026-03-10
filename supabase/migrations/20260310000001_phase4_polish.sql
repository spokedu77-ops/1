-- Phase 4 Polish Migration
-- 1. RLS 헬퍼 함수 수정: 오너도 접근 허용
CREATE OR REPLACE FUNCTION public.spokedu_pro_is_center_member(p_center_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spokedu_pro_center_members
    WHERE center_id = p_center_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.spokedu_pro_centers
    WHERE id = p_center_id AND owner_id = auth.uid()
  );
$$;

-- 2. stripe_customer_id 인덱스 (웹훅 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_subs_stripe_customer
  ON spokedu_pro_subscriptions(stripe_customer_id);

-- 3. (center_id, name) 복합 인덱스 (마이그레이션 중복 체크 최적화)
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_students_center_name
  ON spokedu_pro_students(center_id, name);
