CREATE TABLE public.spokedu_master_entitlement_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('lite', 'premium')),
  source text NOT NULL CHECK (source IN ('promo', 'partner', 'event', 'support', 'admin')),
  campaign_id text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT spm_entitlement_grant_window CHECK (ends_at > starts_at)
);

CREATE INDEX spm_entitlement_grants_user_window_idx
  ON public.spokedu_master_entitlement_grants (user_id, ends_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE public.spokedu_master_promotion_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  token_hash text NOT NULL UNIQUE,
  campaign_id text,
  plan text NOT NULL CHECK (plan IN ('lite', 'premium')),
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days BETWEEN 1 AND 366),
  expires_at timestamptz NOT NULL,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX spm_promotion_invites_email_idx
  ON public.spokedu_master_promotion_invites (lower(email))
  WHERE email IS NOT NULL AND redeemed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.spokedu_master_entitlement_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spokedu_master_promotion_invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.spokedu_master_entitlement_grants FROM anon, authenticated;
REVOKE ALL ON TABLE public.spokedu_master_promotion_invites FROM anon, authenticated;
GRANT ALL ON TABLE public.spokedu_master_entitlement_grants TO service_role;
GRANT ALL ON TABLE public.spokedu_master_promotion_invites TO service_role;

CREATE OR REPLACE FUNCTION public.spokedu_master_redeem_promotion_invite(
  p_user_id uuid,
  p_token_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.spokedu_master_promotion_invites%ROWTYPE;
  v_user_email text;
  v_grant_id uuid;
  v_activated_at timestamptz := pg_catalog.now();
BEGIN
  SELECT * INTO v_invite
  FROM public.spokedu_master_promotion_invites
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND
    OR v_invite.revoked_at IS NOT NULL
    OR v_invite.redeemed_at IS NOT NULL
    OR v_invite.expires_at <= v_activated_at THEN
    RAISE EXCEPTION 'PROMOTION_INVITE_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.lower(email) INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id AND email_confirmed_at IS NOT NULL;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'VERIFIED_USER_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF v_invite.email IS NOT NULL AND pg_catalog.lower(v_invite.email) <> v_user_email THEN
    RAISE EXCEPTION 'PROMOTION_INVITE_EMAIL_MISMATCH' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.spokedu_master_entitlement_grants (
    user_id, plan, source, campaign_id, starts_at, ends_at, activated_at, granted_by,
    metadata
  ) VALUES (
    p_user_id,
    v_invite.plan,
    'event',
    v_invite.campaign_id,
    v_activated_at,
    v_activated_at + pg_catalog.make_interval(days => v_invite.duration_days),
    v_activated_at,
    v_invite.created_by,
    pg_catalog.jsonb_build_object('promotion_invite_id', v_invite.id)
  )
  RETURNING id INTO v_grant_id;

  UPDATE public.spokedu_master_promotion_invites
  SET redeemed_by = p_user_id, redeemed_at = v_activated_at
  WHERE id = v_invite.id;

  RETURN v_grant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_redeem_promotion_invite(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_redeem_promotion_invite(uuid, text) TO service_role;
