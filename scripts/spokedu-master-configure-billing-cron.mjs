import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function fail(message) {
  console.error(`[billing-cron-config] FAIL: ${message}`);
  process.exit(1);
}

function buildRenewUrl(siteUrl) {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/api/spokedu-master/payment/billing/renew`;
}

function vaultSql(renewUrl, cronSecret) {
  const escapedUrl = renewUrl.replace(/'/g, "''");
  const escapedSecret = cronSecret.replace(/'/g, "''");
  return `
-- SPOKEDU MASTER billing renew Supabase Cron secrets (vault)
-- Safe to rerun: create_secret names are unique; delete old secrets in dashboard if needed.

SELECT vault.create_secret(
  '${escapedUrl}',
  'spokedu_master_billing_renew_url',
  'SPOKEDU MASTER billing renew API URL'
);

SELECT vault.create_secret(
  '${escapedSecret}',
  'spokedu_master_billing_cron_secret',
  'Bearer secret for billing renew cron HTTP call'
);
`.trim();
}

async function probeRenew(baseUrl, cronSecret) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/spokedu-master/payment/billing/renew`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${cronSecret}`,
      'content-type': 'application/json',
    },
    body: '{}',
  }).catch(() => null);
  return response?.status ?? 0;
}

async function main() {
  loadEnvFile(join(ROOT, '.env.local'));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';
  const localBase = process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000';
  const cronSecret = process.env.CRON_SECRET?.trim() ?? '';

  if (!cronSecret) fail('CRON_SECRET is missing from .env.local');

  const renewUrl = buildRenewUrl(siteUrl);
  const sql = vaultSql(renewUrl, cronSecret);
  const sqlPath = join(ROOT, 'commercial-verification', 'billing-cron-vault.sql');
  writeFileSync(sqlPath, `${sql}\n`, 'utf8');

  const report = {
    ok: true,
    phase: 'billing-cron-config',
    renewUrl,
    sqlPath,
    localProbeStatus: await probeRenew(localBase, cronSecret),
    vaultSqlApplied: false,
    next: [],
  };

  if (supabaseUrl && serviceRole) {
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { error } = await supabase.rpc('spokedu_master_run_billing_renewal_cron');
    if (!error) {
      report.vaultCronCallable = true;
    } else {
      report.vaultCronCallable = false;
      report.vaultCronError = error.message;
    }
  }

  if (report.localProbeStatus === 200 || report.localProbeStatus === 503) {
    report.localCronAuth = 'ok';
  } else {
    report.localCronAuth = `unexpected status ${report.localProbeStatus}`;
    report.next.push('Ensure dev server is running for local renew probe');
  }

  report.next.push(`Apply vault SQL in Supabase SQL Editor if cron secrets are not configured: ${sqlPath}`);
  report.next.push(`Production renew URL target: ${renewUrl}`);
  report.next.push('Set the same CRON_SECRET in Vercel/host env');

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
