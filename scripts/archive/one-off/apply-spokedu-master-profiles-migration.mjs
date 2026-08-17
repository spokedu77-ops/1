import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = join(ROOT, 'supabase/migrations/20260711120000_spokedu_master_profiles.sql');

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
    // optional local env
  }
}

function fail(message) {
  console.error(`[profiles-migration] ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`[profiles-migration] ${message}`);
}

async function tableReady(supabase) {
  const { error } = await supabase.from('spokedu_master_profiles').select('user_id').limit(1);
  if (!error) return true;
  const code = error.code ?? '';
  const message = error.message ?? '';
  if (code === 'PGRST205' || /does not exist|Could not find the table/i.test(message)) return false;
  fail(`unexpected profiles table probe failed: ${message}`);
}

function applyWithPsql(databaseUrl) {
  const result = spawnSync(
    'psql',
    [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', MIGRATION],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (result.status === 0) {
    ok('applied via psql');
    return true;
  }
  console.error(result.stdout || result.stderr || 'psql failed');
  return false;
}

function applyWithSupabaseCli(databaseUrl) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['--yes', 'supabase@latest', 'db', 'push', '--db-url', databaseUrl, '--yes'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    },
  );
  if (result.status === 0) {
    ok('applied via supabase db push');
    return true;
  }
  console.error(result.stdout || result.stderr || 'supabase db push failed');
  return false;
}

loadEnvFile(join(ROOT, '.env.local'));
loadEnvFile(join(ROOT, '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl =
  process.env.SPOKEDU_MASTER_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL;

if (!supabaseUrl || !serviceKey) {
  fail('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

if (await tableReady(supabase)) {
  ok('spokedu_master_profiles already exists — nothing to do');
  process.exit(0);
}

if (!databaseUrl) {
  fail(
    'profiles table is missing and no database URL is configured. Set SPOKEDU_MASTER_DATABASE_URL, SUPABASE_DB_URL, or DATABASE_URL, then rerun.',
  );
}

if (applyWithPsql(databaseUrl) || applyWithSupabaseCli(databaseUrl)) {
  if (await tableReady(supabase)) {
    ok('verified spokedu_master_profiles is reachable');
    process.exit(0);
  }
  fail('migration command succeeded but profiles table is still missing');
}

fail('could not apply migration — install psql or configure a direct database URL');
