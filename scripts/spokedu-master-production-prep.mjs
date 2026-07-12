import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const PRODUCTION = process.argv.includes('--production');

function valueOf(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
}

function isTestTossKey(value) {
  return /^test_/i.test(value);
}

const checks = [];

function record(name, ok, severity, detail = '') {
  checks.push({ name, ok, severity, detail });
  const label = ok ? 'OK' : severity === 'blocker' ? 'BLOCKER' : 'WARN';
  console.log(`${label} ${name}${detail ? ` — ${detail}` : ''}`);
}

function main() {
  const cronSecret = valueOf('CRON_SECRET');
  const monitoringUrl = valueOf('SPOKEDU_MONITORING_WEBHOOK_URL');
  const databaseUrl = valueOf('SPOKEDU_MASTER_DATABASE_URL', 'SUPABASE_DB_URL', 'DATABASE_URL');
  const tossClient = valueOf('NEXT_PUBLIC_TOSS_CLIENT_KEY');
  const tossSecret = valueOf('TOSS_SECRET_KEY');
  const siteUrl = valueOf('NEXT_PUBLIC_SITE_URL');
  const supabaseUrl = valueOf('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRole = valueOf('SUPABASE_SERVICE_ROLE_KEY');

  console.log(`[production-prep] mode=${PRODUCTION ? 'production' : 'local-advisory'}`);

  record('supabase_url_loaded', Boolean(supabaseUrl), 'blocker');
  record('service_role_loaded', Boolean(serviceRole), 'blocker');
  record('site_url_loaded', Boolean(siteUrl), PRODUCTION ? 'blocker' : 'warning', siteUrl ? 'loaded' : 'set before production deploy');
  record(
    'cron_secret_loaded',
    Boolean(cronSecret),
    PRODUCTION ? 'blocker' : 'warning',
    cronSecret ? 'loaded' : 'required for billing renew cron',
  );
  record(
    'monitoring_webhook_configured',
    Boolean(monitoringUrl),
    PRODUCTION ? 'blocker' : 'warning',
    monitoringUrl ? 'configured' : 'recommended for operator alerts',
  );
  record(
    'database_url_for_integrity',
    Boolean(databaseUrl),
    'warning',
    databaseUrl ? 'loaded' : 'optional until restore rehearsal',
  );

  if (tossClient) {
    record(
      'toss_client_key_mode',
      PRODUCTION ? !isTestTossKey(tossClient) : true,
      PRODUCTION ? 'blocker' : 'warning',
      isTestTossKey(tossClient) ? 'test key loaded' : 'live key loaded',
    );
  } else {
    record('toss_client_key_mode', false, PRODUCTION ? 'blocker' : 'warning', 'missing');
  }

  if (tossSecret) {
    record(
      'toss_secret_key_mode',
      PRODUCTION ? !isTestTossKey(tossSecret) : true,
      PRODUCTION ? 'blocker' : 'warning',
      isTestTossKey(tossSecret) ? 'test key loaded' : 'live key loaded',
    );
  } else {
    record('toss_secret_key_mode', false, PRODUCTION ? 'blocker' : 'warning', 'missing');
  }

  const blockers = checks.filter((item) => !item.ok && item.severity === 'blocker');
  const warnings = checks.filter((item) => !item.ok && item.severity === 'warning');
  const report = {
    ok: blockers.length === 0,
    phase: 'production-prep',
    mode: PRODUCTION ? 'production' : 'local-advisory',
    paymentDeferred: true,
    blockers: blockers.map((item) => item.name),
    warnings: warnings.map((item) => ({ name: item.name, detail: item.detail })),
    checks,
    next: blockers.length
      ? 'Configure blocker env vars before production paid launch'
      : warnings.length
        ? 'Advisory gaps remain; complete before production paid launch'
        : 'Production env prep looks complete; defer only Toss sandbox verification',
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
