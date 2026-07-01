import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { POST } from './renew/route';

const issueRoute = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/payment/billing/issue/route.ts'),
  'utf8',
);
const renewRoute = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/payment/billing/renew/route.ts'),
  'utf8',
);
const cancelRoute = readFileSync(
  join(process.cwd(), 'app/api/spokedu-master/payment/billing/cancel/route.ts'),
  'utf8',
);
const provider = readFileSync(
  join(process.cwd(), 'app/lib/server/spokeduMasterBillingProvider.ts'),
  'utf8',
);
const vaultStore = readFileSync(
  join(process.cwd(), 'app/lib/server/spokeduMasterBillingKeyVault.ts'),
  'utf8',
);
const vercelConfig = JSON.parse(readFileSync(
  join(process.cwd(), 'vercel.json'),
  'utf8',
)) as { crons?: Array<{ path?: string; schedule?: string }> };
const supabaseCronSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260630124000_spokedu_master_billing_supabase_cron.sql'),
  'utf8',
);
const envExample = readFileSync(
  join(process.cwd(), '.env.example'),
  'utf8',
);

const originalCronSecret = process.env.CRON_SECRET;

describe('SPOKEDU MASTER billing API contracts', () => {
  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it('requires billing key issue then first server-priced payment before apply', () => {
    const issue = issueRoute.indexOf('billing = await issueSpokeduMasterBillingKey');
    const store = issueRoute.indexOf('billingKeySecretId = await storeSpokeduMasterBillingKey');
    const pay = issueRoute.indexOf('payment = await paySpokeduMasterBillingKey');
    const apply = issueRoute.indexOf('applyResult = await applySpokeduMasterPayment');
    expect(issue).toBeGreaterThan(-1);
    expect(store).toBeGreaterThan(issue);
    expect(pay).toBeGreaterThan(store);
    expect(apply).toBeGreaterThan(pay);
    expect(issueRoute).toContain('SPOKEDU_MASTER_PLAN_CONFIG[plan].amount');
    expect(issueRoute).toContain('body.amount !== amount');
  });

  it('does not expose billing keys in API responses or monitoring tags', () => {
    expect(issueRoute).toContain('providerBillingKeySecretId: billingKeySecretId');
    expect(issueRoute).not.toContain('providerBillingKey: billing.billingKey');
    const responseSection = issueRoute.slice(issueRoute.lastIndexOf('return NextResponse.json'));
    expect(responseSection).not.toContain('billingKey');
    expect(issueRoute).not.toContain('billingHash');
    expect(renewRoute).not.toContain('billingHash');
  });

  it('renews only due active subscriptions that are not cancellation scheduled', () => {
    expect(renewRoute).toContain(".eq('status', 'active')");
    expect(renewRoute).toContain(".eq('cancel_at_period_end', false)");
    expect(renewRoute).toContain(".lte('next_billing_at', now)");
    expect(renewRoute).toContain('.limit(20)');
    expect(renewRoute).toContain('renewal_payment_failed');
  });

  it('cancels at period end without deleting entitlement immediately', () => {
    expect(cancelRoute).toContain('cancel_at_period_end: true');
    expect(cancelRoute).not.toContain("status: 'cancelled'");
    expect(cancelRoute).toContain('periodEnd');
    expect(cancelRoute).toContain('deleteSpokeduMasterBillingKey');
  });

  it('fails closed without valid Toss credentials', () => {
    expect(provider).toContain("startsWith('test_')");
    expect(provider).toContain("startsWith('live_')");
    expect(issueRoute).not.toContain('SPOKEDU_MASTER_BILLING_KEY_STORAGE_MODE');
    expect(issueRoute).not.toContain('plaintext_test_only');
    expect(renewRoute).toContain('CRON_SECRET');
    expect(renewRoute).toContain("request.headers.get('authorization')");
  });

  it('uses Vault RPCs instead of plaintext subscription storage', () => {
    expect(vaultStore).toContain("rpc('spokedu_master_store_billing_key'");
    expect(vaultStore).toContain("rpc('spokedu_master_read_billing_key'");
    expect(vaultStore).toContain("rpc('spokedu_master_delete_billing_key'");
    expect(issueRoute).toContain('storeSpokeduMasterBillingKey');
    expect(issueRoute).toContain('deleteSpokeduMasterBillingKey');
    expect(renewRoute).toContain('readSpokeduMasterBillingKey');
    expect(renewRoute).toContain('provider_billing_key_secret_id');
    expect(renewRoute).not.toContain('provider_billing_key,');
  });

  it('does not configure Vercel Cron for billing renewals', () => {
    expect(vercelConfig.crons ?? []).not.toContainEqual(expect.objectContaining({
      path: '/api/spokedu-master/payment/billing/renew',
    }));
    expect(renewRoute).toContain('export async function POST');
    expect(renewRoute).not.toContain('export async function GET');
    expect(renewRoute).toContain('return runRenewal(request)');
  });

  it('connects Supabase Cron to the renew endpoint through Vault and pg_net', () => {
    expect(supabaseCronSql).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron');
    expect(supabaseCronSql).toContain('CREATE EXTENSION IF NOT EXISTS pg_net');
    expect(supabaseCronSql).toContain('CREATE OR REPLACE FUNCTION public.spokedu_master_run_billing_renewal_cron');
    expect(supabaseCronSql).toContain("WHERE name = 'spokedu_master_billing_renew_url'");
    expect(supabaseCronSql).toContain("WHERE name = 'spokedu_master_billing_cron_secret'");
    expect(supabaseCronSql).toContain('PERFORM net.http_post');
    expect(supabaseCronSql).not.toContain('PERFORM net.http_get');
    expect(supabaseCronSql).toContain("'Authorization', 'Bearer ' || trim(v_cron_secret)");
    expect(supabaseCronSql).toContain("'Content-Type', 'application/json'");
    expect(supabaseCronSql).toContain("'spokedu-master-billing-renew-hourly'");
    expect(supabaseCronSql).toContain("'0 * * * *'");
    expect(supabaseCronSql).toContain("cron.unschedule('spokedu-master-billing-renew-hourly')");
    expect(supabaseCronSql).toContain('REVOKE ALL ON FUNCTION public.spokedu_master_run_billing_renewal_cron() FROM PUBLIC, anon, authenticated');
    expect(supabaseCronSql).not.toContain('https://');
  });

  it('fails closed before the Supabase Cron HTTP request when Vault secrets are missing', () => {
    const missingSecretGuard = supabaseCronSql.indexOf('IF v_renew_url IS NULL');
    const httpRequest = supabaseCronSql.indexOf('PERFORM net.http_post');
    expect(missingSecretGuard).toBeGreaterThan(-1);
    expect(httpRequest).toBeGreaterThan(missingSecretGuard);
    expect(supabaseCronSql).toContain('RETURN;');
  });

  it('returns only sanitized renewal counters', () => {
    const responseSection = renewRoute.slice(renewRoute.lastIndexOf('return NextResponse.json'));
    expect(renewRoute).toContain('checked: due.length');
    expect(renewRoute).toContain('attempted');
    expect(renewRoute).toContain('succeeded');
    expect(renewRoute).toContain('failed');
    expect(renewRoute).toContain('skipped');
    expect(renewRoute).not.toContain('results.push');
    expect(responseSection).not.toContain('paymentKey');
    expect(responseSection).not.toContain('customerKey');
    expect(responseSection).not.toContain('provider_billing_key_secret_id');
  });

  it('documents scheduler runtime environment contract without real secrets', () => {
    expect(envExample).toContain('CRON_SECRET=');
    expect(envExample).not.toContain('SPOKEDU_MASTER_BILLING_CRON_SECRET=');
    expect(envExample).not.toMatch(/test_[A-Za-z0-9]{8,}/);
    expect(envExample).not.toMatch(/live_[A-Za-z0-9]{8,}/);
  });

  it('rejects scheduler requests without the configured bearer secret', async () => {
    delete process.env.CRON_SECRET;
    const noSecret = await POST(new Request('https://example.test/api/spokedu-master/payment/billing/renew', {
      method: 'POST',
    }));
    expect(noSecret.status).toBe(401);

    process.env.CRON_SECRET = 'expected-secret';
    const wrongSecret = await POST(new Request('https://example.test/api/spokedu-master/payment/billing/renew', {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret' },
    }));
    expect(wrongSecret.status).toBe(401);
  });
});
