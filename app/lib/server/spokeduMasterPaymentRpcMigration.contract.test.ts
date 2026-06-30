import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const recurringSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260630120000_spokedu_master_recurring_billing.sql'),
  'utf8',
);
const vaultSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260630123000_spokedu_master_billing_key_vault.sql'),
  'utf8',
);
const cronSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260630124000_spokedu_master_billing_supabase_cron.sql'),
  'utf8',
);
const sql = `${recurringSql}\n${vaultSql}\n${cronSql}`;

describe('spokedu_master recurring billing migration contract', () => {
  it('defines recurring subscription state and Vault billing key reference', () => {
    for (const column of [
      'plan_id',
      'current_period_start',
      'current_period_end',
      'next_billing_at',
      'cancel_at_period_end',
      'canceled_at',
      'provider_customer_key',
      'provider_billing_key_secret_id',
      'last_payment_at',
    ]) {
      expect(sql).toContain(column);
    }
  });

  it('allows only Lite and Premium payment plans and server prices', () => {
    expect(sql).toContain("plan IN ('lite', 'premium')");
    expect(sql).toContain("WHEN 'lite' THEN 9900");
    expect(sql).toContain("WHEN 'premium' THEN 28900");
    expect(sql).not.toContain("WHEN 'pro' THEN 39900");
    expect(sql).not.toContain("WHEN 'team' THEN 79000");
  });

  it('keeps atomic idempotent payment application inside the RPC', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_apply_payment');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('ON CONFLICT (event_key) DO NOTHING');
    expect(sql).toContain('payment_key_conflict');
    expect(sql).toContain('billing_cycle_already_processed');
    expect(sql).toContain('spm_payment_orders_cycle_unique');
  });

  it('marks cancellation for period end instead of removing access immediately', () => {
    expect(sql).toContain('cancel_at_period_end = true');
    expect(sql).toContain('canceled_at = COALESCE(canceled_at, v_now)');
  });

  it('revokes public execution and grants service_role only', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.spokedu_master_apply_payment');
    expect(sql).toContain('FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.spokedu_master_apply_payment');
    expect(sql).toContain('TO service_role');
  });

  it('stores billing keys through Supabase Vault service-role RPCs only', () => {
    expect(vaultSql).toContain('CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault');
    expect(vaultSql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_store_billing_key');
    expect(vaultSql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_read_billing_key');
    expect(vaultSql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_delete_billing_key');
    expect(vaultSql).toContain('vault.create_secret');
    expect(vaultSql).toContain('vault.decrypted_secrets');
    expect(vaultSql).toContain('vault.delete_secret');
    expect(vaultSql).toContain('FROM PUBLIC, anon, authenticated');
    expect(vaultSql).toContain('TO service_role');
    expect(vaultSql).toContain('billing_key_secret_owner_mismatch');
  });

  it('removes plaintext billing key writes from the active apply RPC signature', () => {
    expect(vaultSql).toContain('DROP FUNCTION IF EXISTS public.spokedu_master_apply_payment');
    expect(vaultSql).toContain('p_provider_billing_key_secret_id uuid DEFAULT NULL');
    expect(vaultSql).toContain('provider_billing_key_secret_id = COALESCE');
    expect(vaultSql).toContain('provider_billing_key = NULL');
    expect(vaultSql).not.toContain('p_provider_billing_key text DEFAULT NULL');
  });

  it('schedules hourly Supabase Cron renewal through Vault and pg_net', () => {
    expect(cronSql).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron');
    expect(cronSql).toContain('CREATE EXTENSION IF NOT EXISTS pg_net');
    expect(cronSql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_run_billing_renewal_cron');
    expect(cronSql).toContain("WHERE name = 'spokedu_master_billing_renew_url'");
    expect(cronSql).toContain("WHERE name = 'spokedu_master_billing_cron_secret'");
    expect(cronSql).toContain('PERFORM net.http_get');
    expect(cronSql).toContain("'Authorization', 'Bearer ' || trim(v_cron_secret)");
    expect(cronSql).toContain("cron.unschedule('spokedu-master-billing-renew-hourly')");
    expect(cronSql).toContain("'spokedu-master-billing-renew-hourly'");
    expect(cronSql).toContain("'0 * * * *'");
    expect(cronSql).toContain('FROM PUBLIC, anon, authenticated');
    expect(cronSql).not.toContain('https://');
  });
});
