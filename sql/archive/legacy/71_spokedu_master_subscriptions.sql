-- SPOKEDU MASTER 구독 테이블
-- 토스페이먼츠 결제 완료 후 confirm API가 이 테이블에 기록합니다.
-- auth.users와 1:1 관계 (user당 하나의 활성 구독)

CREATE TABLE IF NOT EXISTS public.spokedu_master_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan             TEXT NOT NULL CHECK (plan IN ('lite', 'pro', 'team')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'canceled', 'expired', 'pending')),
  pg_provider      TEXT NOT NULL DEFAULT 'tosspayments',
  toss_payment_key TEXT,
  toss_order_id    TEXT,
  toss_billing_key TEXT,
  period_start     TIMESTAMPTZ,
  period_end       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT spm_subscriptions_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.spokedu_master_subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독 정보만 조회 가능
CREATE POLICY "spm_sub_select_own"
  ON public.spokedu_master_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION _spm_sub_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS spm_sub_updated_at ON public.spokedu_master_subscriptions;
CREATE TRIGGER spm_sub_updated_at
  BEFORE UPDATE ON public.spokedu_master_subscriptions
  FOR EACH ROW EXECUTE FUNCTION _spm_sub_set_updated_at();
