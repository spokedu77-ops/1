-- Observable hourly renewal scheduler. Every dispatch attempt is persisted;
-- configuration, HTTP, and wrapper failures are no longer silent.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE TABLE IF NOT EXISTS public.spokedu_master_billing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL,
  attempted integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  error_code text,
  error_detail text,
  request_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spm_billing_runs_status_check CHECK (
    status IN ('dispatched', 'succeeded', 'completed_with_errors', 'failed')
  )
);

ALTER TABLE public.spokedu_master_billing_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.spokedu_master_billing_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.spokedu_master_billing_runs TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.spokedu_master_billing_runs TO postgres;

CREATE INDEX IF NOT EXISTS idx_spm_billing_runs_started_at
  ON public.spokedu_master_billing_runs (started_at DESC);

CREATE OR REPLACE FUNCTION public.spokedu_master_run_billing_renewal_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  v_run_id uuid;
  v_request_id bigint;
  v_renew_url text;
  v_cron_secret text;
BEGIN
  INSERT INTO public.spokedu_master_billing_runs (status)
  VALUES ('dispatched')
  RETURNING id INTO v_run_id;

  BEGIN
  -- Reconcile requests that never reached the API. Successful API calls update
  -- the same row using the X-Spokedu-Billing-Run-Id header.
  UPDATE public.spokedu_master_billing_runs AS run
     SET status = 'failed',
         completed_at = COALESCE(run.completed_at, now()),
         error_code = CASE
           WHEN response.error_msg IS NOT NULL THEN 'cron_http_transport_failed'
           WHEN response.status_code < 200 OR response.status_code >= 300 THEN 'cron_http_status_failed'
           ELSE 'cron_result_not_recorded'
         END,
         error_detail = left(COALESCE(response.error_msg, 'HTTP ' || response.status_code::text), 500)
    FROM net._http_response AS response
   WHERE run.status = 'dispatched'
     AND run.request_id = response.id
     AND (
       response.error_msg IS NOT NULL
       OR response.status_code < 200
       OR response.status_code >= 300
       OR run.started_at < now() - interval '15 minutes'
     );

  SELECT decrypted_secret INTO v_renew_url
    FROM vault.decrypted_secrets
   WHERE name = 'spokedu_master_billing_renew_url'
   LIMIT 1;

  SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets
   WHERE name = 'spokedu_master_billing_cron_secret'
   LIMIT 1;

  IF v_renew_url IS NULL OR length(trim(v_renew_url)) = 0 THEN
    UPDATE public.spokedu_master_billing_runs
       SET status = 'failed', completed_at = now(), error_code = 'renew_url_missing'
     WHERE id = v_run_id;
    RETURN;
  END IF;

  IF v_cron_secret IS NULL OR length(trim(v_cron_secret)) = 0 THEN
    UPDATE public.spokedu_master_billing_runs
       SET status = 'failed', completed_at = now(), error_code = 'cron_secret_missing'
     WHERE id = v_run_id;
    RETURN;
  END IF;

  SELECT net.http_post(
    url := trim(v_renew_url),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || trim(v_cron_secret),
      'Content-Type', 'application/json',
      'X-Spokedu-Billing-Run-Id', v_run_id::text
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO v_request_id;

  UPDATE public.spokedu_master_billing_runs
     SET request_id = v_request_id
   WHERE id = v_run_id;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.spokedu_master_billing_runs
       SET status = 'failed',
           completed_at = now(),
           error_code = 'cron_wrapper_exception',
           error_detail = left(SQLSTATE || ':' || SQLERRM, 500)
     WHERE id = v_run_id;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_run_billing_renewal_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_run_billing_renewal_cron() TO postgres;

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'spokedu-master-billing-renew-hourly') THEN
    PERFORM cron.unschedule('spokedu-master-billing-renew-hourly');
  END IF;

  PERFORM cron.schedule(
    'spokedu-master-billing-renew-hourly',
    '0 * * * *',
    $$SELECT public.spokedu_master_run_billing_renewal_cron();$$
  );
END;
$cron$;
