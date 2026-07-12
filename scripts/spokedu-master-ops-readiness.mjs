import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const SEND_MONITORING_PROBE = process.argv.includes('--send-monitoring-probe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
const tossClient = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? '';
const tossSecret = process.env.TOSS_SECRET_KEY?.trim() ?? '';
const cronSecret = process.env.CRON_SECRET?.trim() ?? '';
const monitoringUrl = process.env.SPOKEDU_MONITORING_WEBHOOK_URL?.trim() ?? '';

const OPTIONAL_CHECKS = new Set([
  'monitoring_webhook_configured',
  'cron_secret_loaded',
  'payment_reconcile_read_only',
]);

const checks = [];

function log(message) {
  console.log(`[ops-readiness] ${message}`);
}

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function isTestTossKey(value) {
  return /^test_/i.test(value);
}

async function fetchStatus(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, init).catch(() => null);
  return response?.status ?? 0;
}

async function main() {
  log(`base=${BASE}`);

  record('supabase_url_loaded', Boolean(supabaseUrl));
  record('service_role_loaded', Boolean(serviceRole));
  record('toss_client_test_key', Boolean(tossClient) && isTestTossKey(tossClient), tossClient ? 'loaded' : 'missing');
  record('toss_secret_test_key', Boolean(tossSecret) && isTestTossKey(tossSecret), tossSecret ? 'loaded' : 'missing');
  record('cron_secret_loaded', Boolean(cronSecret), cronSecret ? 'loaded' : 'missing (billing renew cron needs this)');
  record(
    'monitoring_webhook_configured',
    Boolean(monitoringUrl),
    monitoringUrl ? 'configured' : 'optional — dev fallback logging only',
  );

  const loginStatus = await fetchStatus('/login', { method: 'HEAD', redirect: 'manual' });
  record('dev_server_reachable', loginStatus > 0 && loginStatus < 500, `status=${loginStatus || 'unreachable'}`);

  const clientErrorStatus = await fetchStatus('/api/spokedu-master/client-errors', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      digest: 'ops-readiness-probe',
      errorName: 'OpsReadinessProbe',
      pathname: '/spokedu-master/ops-readiness',
    }),
  });
  record('client_error_route', clientErrorStatus === 204, `status=${clientErrorStatus}`);

  const webhookStatus = await fetchStatus('/api/spokedu-master/payment/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  record('webhook_route_fail_closed', webhookStatus === 400 || webhookStatus === 401 || webhookStatus === 403, `status=${webhookStatus}`);

  const renewStatus = await fetchStatus('/api/spokedu-master/payment/billing/renew', { method: 'POST' });
  record('billing_renew_requires_cron_secret', renewStatus === 401 || renewStatus === 403, `status=${renewStatus}`);

  if (supabaseUrl && serviceRole) {
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const profiles = await supabase.from('spokedu_master_profiles').select('user_id').limit(1);
    record('profiles_table_reachable', !profiles.error, profiles.error?.code ?? 'ok');

    const webhookEvents = await supabase
      .from('spokedu_master_payment_webhook_events')
      .select('event_key', { count: 'exact', head: true });
    record('webhook_events_table_reachable', !webhookEvents.error, webhookEvents.error?.code ?? 'ok');

    const orders = await supabase
      .from('spokedu_master_payment_orders')
      .select('order_id', { count: 'exact', head: true });
    record('payment_orders_table_reachable', !orders.error, orders.error?.code ?? 'ok');
  } else {
    record('profiles_table_reachable', false, 'missing supabase env');
    record('webhook_events_table_reachable', false, 'missing supabase env');
    record('payment_orders_table_reachable', false, 'missing supabase env');
  }

  const reconcile = spawnSync(process.execPath, ['scripts/spokedu-master-payment-reconcile.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
  });
  let reconcileOk = reconcile.status === 0;
  let reconcileDetail = reconcile.status === 0 ? 'no issues' : `exit=${reconcile.status}`;
  if (reconcile.status !== 0 && reconcile.stderr?.includes('SyntaxError')) {
    reconcileOk = false;
    reconcileDetail = 'reconcile script failed to run';
  } else {
    try {
      const payload = JSON.parse(reconcile.stdout || '{}');
      if (typeof payload.issueCount === 'number') {
        reconcileDetail = `issueCount=${payload.issueCount}`;
        reconcileOk = payload.issueCount === 0;
      }
    } catch {
      reconcileDetail = reconcile.stderr?.trim().slice(0, 120) || reconcileDetail;
    }
  }
  record('payment_reconcile_read_only', reconcileOk, reconcileDetail);

  if (SEND_MONITORING_PROBE && monitoringUrl) {
    const probe = await fetch(monitoringUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service: 'spokedu-master',
        context: 'ops_readiness_probe',
        environment: process.env.NODE_ENV ?? 'development',
        errorName: 'OpsReadinessProbe',
        errorHash: 'ops-readiness-probe',
        tags: { source: 'ops_readiness' },
        occurredAt: new Date().toISOString(),
      }),
    }).catch(() => null);
    record('monitoring_probe_delivered', Boolean(probe && probe.ok), probe ? `status=${probe.status}` : 'fetch failed');
  } else if (SEND_MONITORING_PROBE) {
    record('monitoring_probe_delivered', false, 'SPOKEDU_MONITORING_WEBHOOK_URL not configured');
  }

  const failed = checks.filter((check) => !check.ok);
  const requiredFailures = failed.filter((check) => !OPTIONAL_CHECKS.has(check.name));
  const warnings = failed.filter((check) => OPTIONAL_CHECKS.has(check.name));

  console.log(JSON.stringify({
    ok: requiredFailures.length === 0,
    phase: 'ops-readiness',
    failed: requiredFailures.map((check) => check.name),
    warnings: warnings.map((check) => ({ name: check.name, detail: check.detail })),
    checks,
    next: [
      'User completes Toss sandbox real payment once',
      'Run payment reconcile again after real payment',
      'Optionally rerun with --send-monitoring-probe when monitoring URL is configured',
    ],
  }, null, 2));

  if (requiredFailures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`[ops-readiness] FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
