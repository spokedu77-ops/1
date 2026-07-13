-- Temporarily pause SPOKEDU MASTER billing renewal cron (Vercel CPU relief).
-- Vault secrets and spokedu_master_run_billing_renewal_cron() are kept intact.
-- To resume: run 20260630124000_spokedu_master_billing_supabase_cron.sql schedule block
-- or apply a new migration that re-schedules 'spokedu-master-billing-renew-hourly'.

DO $cron$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM cron.job
     WHERE jobname = 'spokedu-master-billing-renew-hourly'
  ) THEN
    PERFORM cron.unschedule('spokedu-master-billing-renew-hourly');
  END IF;
END;
$cron$;
