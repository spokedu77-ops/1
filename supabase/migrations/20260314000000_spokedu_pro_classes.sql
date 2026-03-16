-- ============================================================
-- SPOKEDU PRO — 동적 반 관리 + AI 리포트 사용량 원자적 증가 RPC
-- 생성일: 2026-03-14
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. 구독 테이블에 max_classes 컬럼 추가
-- ────────────────────────────────────────────────────────────
ALTER TABLE spokedu_pro_subscriptions
  ADD COLUMN IF NOT EXISTS max_classes INT DEFAULT 1;

-- 기존 구독 데이터 플랜별 max_classes 초기화
UPDATE spokedu_pro_subscriptions SET max_classes = NULL  WHERE plan = 'pro';
UPDATE spokedu_pro_subscriptions SET max_classes = 3     WHERE plan = 'basic';
UPDATE spokedu_pro_subscriptions SET max_classes = 1     WHERE plan = 'free';

-- ────────────────────────────────────────────────────────────
-- 2. AI 리포트 사용량 원자적 증가 RPC
--    spokedu_pro_tenant_content 에서 owner_id, key='ai_report_usage' 행을
--    JSONB 경로 months->p_month_key 를 원자적으로 +1.
--    동시 요청 시 race condition 없음.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_ai_report_usage(
  p_owner_id  UUID,
  p_month_key TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count INT;
BEGIN
  INSERT INTO spokedu_pro_tenant_content (
    owner_id, key, draft_value, published_value, version, draft_updated_at, published_at
  )
  VALUES (
    p_owner_id,
    'ai_report_usage',
    jsonb_build_object('months', jsonb_build_object(p_month_key, 1)),
    jsonb_build_object('months', jsonb_build_object(p_month_key, 1)),
    1,
    now(),
    now()
  )
  ON CONFLICT (owner_id, key) DO UPDATE SET
    draft_value = jsonb_set(
      COALESCE(spokedu_pro_tenant_content.draft_value, '{"months":{}}'),
      ARRAY['months', p_month_key],
      to_jsonb(
        COALESCE(
          (spokedu_pro_tenant_content.draft_value -> 'months' -> p_month_key)::text::int,
          0
        ) + 1
      )
    ),
    published_value = jsonb_set(
      COALESCE(spokedu_pro_tenant_content.published_value, '{"months":{}}'),
      ARRAY['months', p_month_key],
      to_jsonb(
        COALESCE(
          (spokedu_pro_tenant_content.published_value -> 'months' -> p_month_key)::text::int,
          0
        ) + 1
      )
    ),
    version         = spokedu_pro_tenant_content.version + 1,
    draft_updated_at = now(),
    published_at    = now();

  SELECT (draft_value -> 'months' -> p_month_key)::text::int
  INTO v_new_count
  FROM spokedu_pro_tenant_content
  WHERE owner_id = p_owner_id AND key = 'ai_report_usage';

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 3. 기존 bootstrapped 구독에 trial_end 없으면 유지 (신규만 설정)
-- ────────────────────────────────────────────────────────────
SELECT 'spokedu_pro_classes migration applied.' AS status;
