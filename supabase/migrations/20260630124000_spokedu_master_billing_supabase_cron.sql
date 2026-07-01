-- Run SPOKEDU MASTER billing renewal through Supabase Cron.
-- This schedules only an authenticated HTTP call to the existing renew API;
-- payment selection, pricing, Vault billing keys, and idempotency stay in the
-- server route.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE OR REPLACE FUNCTION public.spokedu_master_run_billing_renewal_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  v_renew_url text;
  v_cron_secret text;
BEGIN
  SELECT decrypted_secret
    INTO v_renew_url
    FROM vault.decrypted_secrets
   WHERE name = 'spokedu_master_billing_renew_url'
   LIMIT 1;

  SELECT decrypted_secret
    INTO v_cron_secret
    FROM vault.decrypted_secrets
   WHERE name = 'spokedu_master_billing_cron_secret'
   LIMIT 1;

  IF v_renew_url IS NULL
     OR length(trim(v_renew_url)) = 0
     OR v_cron_secret IS NULL
     OR length(trim(v_cron_secret)) = 0 THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := trim(v_renew_url),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || trim(v_cron_secret),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_run_billing_renewal_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_run_billing_renewal_cron() TO postgres;

DO $cron$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM cron.job
     WHERE jobname = 'spokedu-master-billing-renew-hourly'
  ) THEN
    PERFORM cron.unschedule('spokedu-master-billing-renew-hourly');
  END IF;

  PERFORM cron.schedule(
    'spokedu-master-billing-renew-hourly',
    '0 * * * *',
    $$SELECT public.spokedu_master_run_billing_renewal_cron();$$
  );
END;
$cron$;
