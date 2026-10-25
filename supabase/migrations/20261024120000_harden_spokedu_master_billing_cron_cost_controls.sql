-- Transition the existing single hourly Cron wrapper after the additive schema
-- and compatible application code are deployed. This creates no second job.

CREATE OR REPLACE FUNCTION public.spokedu_master_run_billing_renewal_cron()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, net, extensions AS $$
DECLARE
  v_run_id uuid;
  v_request_id bigint;
  v_renew_url text;
  v_cron_secret text;
  v_has_due_work boolean := false;
  v_has_recovery_work boolean := false;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('spokedu-master-billing-renew-hourly', 0)) THEN
    RETURN;
  END IF;

  UPDATE public.spokedu_master_billing_runs AS run
     SET status = 'failed', completed_at = COALESCE(run.completed_at, now()),
         error_code = CASE WHEN response.error_msg IS NOT NULL THEN 'cron_http_transport_failed'
                           WHEN response.status_code < 200 OR response.status_code >= 300 THEN 'cron_http_status_failed'
                           ELSE 'cron_result_not_recorded' END,
         error_detail = left(COALESCE(response.error_msg, 'HTTP ' || response.status_code::text), 500)
    FROM net._http_response AS response
   WHERE run.status = 'dispatched' AND run.request_id = response.id
     AND (response.error_msg IS NOT NULL OR response.status_code < 200 OR response.status_code >= 300 OR run.started_at < now() - interval '15 minutes');

  IF EXISTS (
    SELECT 1 FROM public.spokedu_master_billing_runs
     WHERE status = 'dispatched' AND started_at >= now() - interval '15 minutes'
  ) THEN
    RETURN;
  END IF;

  -- Keep this predicate aligned with the Vercel route's new-charge query.
  -- Recovery orders are checked separately below so subscription state or
  -- retry metadata cannot hide an already approved transaction.
  SELECT EXISTS (
    SELECT 1
      FROM public.spokedu_master_subscriptions AS subscription
     WHERE subscription.status = 'active'
       AND subscription.cancel_at_period_end = false
       AND subscription.pg_provider = 'tosspayments'
       AND COALESCE(subscription.plan_id, subscription.plan) IN ('lite', 'premium')
       AND subscription.next_billing_at <= now()
       AND (
         subscription.next_retry_at IS NULL
         OR subscription.next_retry_at <= now()
       )
       AND subscription.renewal_retry_count < 5
       AND subscription.billing_anchor_day IS NOT NULL
     LIMIT 1
  ) INTO v_has_due_work;

  -- Recovery is intentionally independent of current subscription status,
  -- retry count, and billing dates. The provider is queried before apply, and
  -- cancelled/partial-refund orders are excluded from automatic recovery.
  SELECT EXISTS (
    SELECT 1
      FROM public.spokedu_master_payment_orders AS payment_order
     WHERE payment_order.billing_cycle_key
             ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[0-9]{8}$'
       AND payment_order.operator_review_required = false
       AND payment_order.last_error_code IS DISTINCT FROM 'partial_cancel_review_required'
       AND (
         payment_order.charge_state IN ('approved_unapplied', 'request_started', 'outcome_unknown')
         AND payment_order.status IN ('pending', 'recoverable_failed', 'failed')
         OR (
           payment_order.status = 'processing'
           AND payment_order.charge_state IN ('approved_unapplied', 'request_started', 'outcome_unknown')
           AND payment_order.updated_at < now() - interval '15 minutes'
         )
         OR (
           payment_order.status = 'active'
           AND payment_order.charge_state = 'approved_unapplied'
           AND payment_order.payment_key IS NOT NULL
           AND payment_order.applied_at IS NULL
         )
       )
     LIMIT 1
  ) INTO v_has_recovery_work;

  IF NOT v_has_due_work AND NOT v_has_recovery_work THEN
    RETURN;
  END IF;

  -- Provider configuration is deployment-wide, not a customer retry. Once a
  -- deployment reports a configuration error, suppress all repeated billing
  -- HTTP calls. An operator clears this only through the non-charging provider
  -- health endpoint after fixing and redeploying the environment.
  IF EXISTS (
    SELECT 1
      FROM public.spokedu_master_billing_provider_state
     WHERE singleton_key = true
       AND status = 'misconfigured'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.spokedu_master_billing_runs (status) VALUES ('dispatched') RETURNING id INTO v_run_id;
  SELECT decrypted_secret INTO v_renew_url FROM vault.decrypted_secrets WHERE name = 'spokedu_master_billing_renew_url' LIMIT 1;
  SELECT decrypted_secret INTO v_cron_secret FROM vault.decrypted_secrets WHERE name = 'spokedu_master_billing_cron_secret' LIMIT 1;

  IF v_renew_url IS NULL OR length(trim(v_renew_url)) = 0 THEN
    UPDATE public.spokedu_master_billing_runs SET status='failed', completed_at=now(), error_code='renew_url_missing' WHERE id=v_run_id;
    RAISE WARNING 'spokedu_master_billing_renew_url is missing from Vault';
    RETURN;
  END IF;
  IF v_cron_secret IS NULL OR length(trim(v_cron_secret)) = 0 THEN
    UPDATE public.spokedu_master_billing_runs SET status='failed', completed_at=now(), error_code='cron_secret_missing' WHERE id=v_run_id;
    RAISE WARNING 'spokedu_master_billing_cron_secret is missing from Vault';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := trim(v_renew_url),
    headers := jsonb_build_object('Authorization','Bearer ' || trim(v_cron_secret),'Content-Type','application/json','X-Spokedu-Billing-Run-Id',v_run_id::text),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) INTO v_request_id;
  UPDATE public.spokedu_master_billing_runs SET request_id=v_request_id WHERE id=v_run_id;
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE public.spokedu_master_billing_runs SET status='failed', completed_at=now(), error_code='cron_wrapper_exception', error_detail=left(SQLSTATE || ':' || SQLERRM,500) WHERE id=v_run_id;
  END IF;
  RAISE WARNING 'MASTER billing cron dispatch failed: % %', SQLSTATE, SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.spokedu_master_run_billing_renewal_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spokedu_master_run_billing_renewal_cron() TO postgres;

DO $cron$
DECLARE v_job record;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname = 'spokedu-master-billing-renew-hourly' LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
  PERFORM cron.schedule('spokedu-master-billing-renew-hourly','0 * * * *',$$SELECT public.spokedu_master_run_billing_renewal_cron();$$);
END;
$cron$;
