-- Production Vault on this project exposes create_secret/update_secret but not
-- vault.delete_secret(uuid). Pending billing-key semantics already exist in
-- 20260822190000. This append-only replacement keeps store/read/delete on the
-- pending slot and deletes Vault rows through vault.secrets.

CREATE OR REPLACE FUNCTION public.spokedu_master_delete_vault_secret(p_secret_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = vault
AS $$
  DELETE FROM vault.secrets WHERE id = p_secret_id;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_delete_vault_secret(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_delete_vault_secret(uuid) TO service_role, postgres;


CREATE OR REPLACE FUNCTION public.spokedu_master_store_billing_key(
  p_user_id uuid,
  p_billing_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_old_pending_secret_id uuid;
  v_new_secret_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_billing_key IS NULL OR length(p_billing_key) = 0 THEN
    RAISE EXCEPTION 'missing_billing_key_input';
  END IF;

  INSERT INTO public.spokedu_master_subscriptions (user_id, plan, status, pg_provider)
  VALUES (p_user_id, 'lite', 'pending', 'tosspayments')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT pending_billing_key_secret_id
    INTO v_old_pending_secret_id
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  v_new_secret_id := vault.create_secret(
    p_billing_key,
    'spokedu-master-pending-billing-key-' || p_user_id::text || '-' || gen_random_uuid()::text,
    'SPOKEDU MASTER pending recurring billing key'
  );

  UPDATE public.spokedu_master_subscriptions
     SET pending_billing_key_secret_id = v_new_secret_id,
         provider_billing_key = NULL,
         updated_at = now()
   WHERE user_id = p_user_id;

  IF v_old_pending_secret_id IS NOT NULL AND v_old_pending_secret_id <> v_new_secret_id THEN
    PERFORM public.spokedu_master_delete_vault_secret(v_old_pending_secret_id);
  END IF;

  RETURN v_new_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.spokedu_master_read_billing_key(
  p_user_id uuid,
  p_secret_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_billing_key text;
BEGIN
  IF p_user_id IS NULL OR p_secret_id IS NULL THEN
    RAISE EXCEPTION 'missing_billing_key_secret_input';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.spokedu_master_subscriptions
     WHERE user_id = p_user_id
       AND (
         provider_billing_key_secret_id = p_secret_id
         OR pending_billing_key_secret_id = p_secret_id
       )
  ) THEN
    RAISE EXCEPTION 'billing_key_secret_owner_mismatch';
  END IF;

  SELECT decrypted_secret INTO v_billing_key
    FROM vault.decrypted_secrets
   WHERE id = p_secret_id;

  IF v_billing_key IS NULL OR length(v_billing_key) = 0 THEN
    RAISE EXCEPTION 'billing_key_secret_not_found';
  END IF;

  RETURN v_billing_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.spokedu_master_delete_billing_key(
  p_user_id uuid,
  p_secret_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_current_secret_id uuid;
  v_pending_secret_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_secret_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT provider_billing_key_secret_id, pending_billing_key_secret_id
    INTO v_current_secret_id, v_pending_secret_id
    FROM public.spokedu_master_subscriptions
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND OR (v_current_secret_id IS DISTINCT FROM p_secret_id AND v_pending_secret_id IS DISTINCT FROM p_secret_id) THEN
    RAISE EXCEPTION 'billing_key_secret_owner_mismatch';
  END IF;

  UPDATE public.spokedu_master_subscriptions
     SET provider_billing_key_secret_id = CASE
           WHEN provider_billing_key_secret_id = p_secret_id THEN NULL
           ELSE provider_billing_key_secret_id
         END,
         pending_billing_key_secret_id = CASE
           WHEN pending_billing_key_secret_id = p_secret_id THEN NULL
           ELSE pending_billing_key_secret_id
         END,
         provider_billing_key = NULL,
         updated_at = now()
   WHERE user_id = p_user_id;

  PERFORM public.spokedu_master_delete_vault_secret(p_secret_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_store_billing_key(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spokedu_master_read_billing_key(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.spokedu_master_delete_billing_key(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_store_billing_key(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.spokedu_master_read_billing_key(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.spokedu_master_delete_billing_key(uuid, uuid) TO service_role;
