-- Stripe 웹훅 멱등: 동일 event.id 재전송 시 핸들러 중복 부작용 방지(과금 오픈 시 권장).
CREATE TABLE IF NOT EXISTS spokedu_pro_stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spokedu_stripe_webhook_events_created
  ON spokedu_pro_stripe_webhook_events (created_at DESC);

COMMENT ON TABLE spokedu_pro_stripe_webhook_events IS 'Stripe webhook event.id — 성공 처리 후 기록. 서비스 롤만 쓰기.';
