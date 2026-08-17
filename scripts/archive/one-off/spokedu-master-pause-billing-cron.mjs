import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { Client } = pg;

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
  console.error(`[billing-cron-pause] FAIL: ${message}`);
  process.exit(1);
}

const PAUSE_SQL = `
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
`;

const RESUME_SQL = `
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
`;

async function main() {
  loadEnvFile(join(ROOT, '.env.local'));

  const mode = process.argv[2] === 'resume' ? 'resume' : 'pause';
  const databaseUrl = process.env.SPOKEDU_MASTER_DATABASE_URL?.trim() ?? '';
  if (!databaseUrl) fail('SPOKEDU_MASTER_DATABASE_URL is missing from .env.local');

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const before = await client.query(
      `SELECT jobid, jobname, schedule, active
         FROM cron.job
        WHERE jobname = 'spokedu-master-billing-renew-hourly'`,
    );

    await client.query(mode === 'resume' ? RESUME_SQL : PAUSE_SQL);

    const after = await client.query(
      `SELECT jobid, jobname, schedule, active
         FROM cron.job
        WHERE jobname = 'spokedu-master-billing-renew-hourly'`,
    );

    console.log(JSON.stringify({
      ok: true,
      mode,
      before: before.rows,
      after: after.rows,
      message: mode === 'resume'
        ? 'Billing cron resumed (hourly at minute 0 UTC).'
        : 'Billing cron paused. Vercel renew API will not be called by pg_cron.',
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
