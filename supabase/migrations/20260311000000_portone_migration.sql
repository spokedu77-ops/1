-- ============================================================
-- SPOKEDU PRO — 포트원(PortOne) V2 전환 마이그레이션
-- 생성일: 2026-03-11
-- 목적: Stripe 컬럼을 포트원 전용 컬럼으로 rename
-- ※ 멱등성: 컬럼이 이미 rename된 경우 안전하게 재실행 가능
-- ============================================================

DO $$
BEGIN
  -- stripe_subscription_id → portone_billing_key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spokedu_pro_subscriptions'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE spokedu_pro_subscriptions
      RENAME COLUMN stripe_subscription_id TO portone_billing_key;
  END IF;

  -- stripe_customer_id → portone_customer_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'spokedu_pro_subscriptions'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE spokedu_pro_subscriptions
      RENAME COLUMN stripe_customer_id TO portone_customer_id;
  END IF;
END;
$$;

-- 기존 stripe 인덱스 제거 후 portone 인덱스 재생성
DROP INDEX IF EXISTS idx_spokedu_pro_subscriptions_stripe;
CREATE INDEX IF NOT EXISTS idx_spokedu_pro_subscriptions_portone
  ON spokedu_pro_subscriptions(portone_billing_key);
