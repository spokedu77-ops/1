-- SPOKEDU MASTER billing renew Supabase Cron secrets (vault)
-- Safe to rerun: create_secret names are unique; delete old secrets in dashboard if needed.

SELECT vault.create_secret(
  'https://spokedu.com/api/spokedu-master/payment/billing/renew',
  'spokedu_master_billing_renew_url',
  'SPOKEDU MASTER billing renew API URL'
);

SELECT vault.create_secret(
  '7bc3df586f783e2d8f2e2ded2a0e84431164f692ef0669c0096d1790361eda4b',
  'spokedu_master_billing_cron_secret',
  'Bearer secret for billing renew cron HTTP call'
);
