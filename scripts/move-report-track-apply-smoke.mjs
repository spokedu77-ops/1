/**
 * Apply MOVE TRACK migration + smoke test via direct Postgres connection.
 * Usage: node scripts/move-report-track-apply-smoke.mjs
 * Requires: SPOKEDU_MASTER_DATABASE_URL or DATABASE_URL in .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(root, '.env.local');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const databaseUrl = process.env.SPOKEDU_MASTER_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Missing SPOKEDU_MASTER_DATABASE_URL or DATABASE_URL in .env.local');
  process.exit(1);
}

const migrationPath = path.join(root, 'supabase/migrations/20260829130000_move_report_track_core.sql');
const smokePath = path.join(root, 'supabase/tests/move_report_track_smoke.sql');

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const exists = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mr_programs'`
  );

  if (exists.rowCount === 0) {
    console.log('Applying migration 20260829130000_move_report_track_core.sql ...');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('Migration applied.');
  } else {
    console.log('mr_programs already exists — skipping migration apply.');
  }

  console.log('Running smoke test ...');
  const smoke = fs.readFileSync(smokePath, 'utf8');
  await client.query(smoke);
  console.log('Smoke test passed.');

  await client.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
