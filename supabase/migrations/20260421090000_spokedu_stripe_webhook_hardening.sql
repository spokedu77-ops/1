-- Stripe 웹훅 멱등 테이블 하드닝: RLS(일반 클라이언트 차단), 보관 정리 함수, 관측용 컬럼.
-- 아래 CREATE는 20260419120000 이 적용되지 않은 DB에서도 이 파일만 실행해도 동작하도록 둔다.

CREATE TABLE IF NOT EXISTS spokedu_pro_stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_stripe_webhook_events_created
  ON spokedu_pro_stripe_webhook_events (created_at DESC);

COMMENT ON TABLE spokedu_pro_stripe_webhook_events IS 'Stripe webhook event.id — 성공 처리 후 기록. 서비스 롤만 쓰기.';

ALTER TABLE spokedu_pro_stripe_webhook_events
  ADD COLUMN IF NOT EXISTS event_type TEXT;

COMMENT ON COLUMN spokedu_pro_stripe_webhook_events.event_type IS 'Stripe Event.type (예: customer.subscription.updated).';

-- 일반 anon/authenticated 세션에서는 접근 불가. Supabase service_role은 RLS 우회.
ALTER TABLE spokedu_pro_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- 정책을 두지 않음 = JWT 역할로는 SELECT/INSERT 모두 거부.

-- 오래된 idempotency 행 정리(주 1회 cron 등). 기본 90일 보관.
CREATE OR REPLACE FUNCTION spokedu_pro_purge_stripe_webhook_events(p_days int DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  IF p_days < 7 THEN
    RAISE EXCEPTION 'retention must be at least 7 days';
  END IF;
  DELETE FROM spokedu_pro_stripe_webhook_events
  WHERE created_at < now() - make_interval(days => p_days);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION spokedu_pro_purge_stripe_webhook_events IS
  'Stripe webhook 멱등 테이블 TTL 정리. service_role 또는 postgres에서 실행.';

REVOKE ALL ON FUNCTION spokedu_pro_purge_stripe_webhook_events(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION spokedu_pro_purge_stripe_webhook_events(int) TO service_role;
