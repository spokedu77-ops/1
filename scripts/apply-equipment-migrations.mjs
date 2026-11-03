#!/usr/bin/env node
/**
 * Apply equipment ledger migrations only (ordered), with schema_migrations bookkeeping.
 * Requires direct Postgres URL (Supabase Dashboard → Database → Connection string URI).
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-equipment-migrations.mjs --confirm-project-ref mwgvserdyflsqyhcqecp --dry-run
 *   node --env-file=.env.local scripts/apply-equipment-migrations.mjs --confirm-project-ref mwgvserdyflsqyhcqecp --allow-production
 *
 * Env (one of): SUPABASE_DB_URL | DATABASE_URL | SPOKEDU_MASTER_DATABASE_URL
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTION_REF = 'mwgvserdyflsqyhcqecp';

const EQUIPMENT_MIGRATION_PREFIXES = [
  '20261030110000_',
  '20261030120000_',
  '20261030130000_',
  '20261030200000_',
  '20261030210000_',
  '20261102120000_',
];

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    dryRun: args.has('--dry-run'),
    allowProduction: args.has('--allow-production'),
    confirmRef: argv[argv.indexOf('--confirm-project-ref') + 1] ?? '',
  };
}

function projectRefFromUrl(url) {
  try {
    const m = new URL(url).hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m?.[1] ?? '';
  } catch {
    return '';
  }
}

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
    /* optional */
  }
}

function equipmentMigrationFiles() {
  const all = readdirSync(resolve(repoRoot, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
  return all
    .filter((f) => EQUIPMENT_MIGRATION_PREFIXES.some((p) => f.startsWith(p)))
    .sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text,
      created_by text,
      idempotency_key text,
      rollback text[]
    );
  `);
}

async function appliedVersions(client) {
  await ensureMigrationsTable(client);
  const { rows } = await client.query('select version from supabase_migrations.schema_migrations order by version');
  return new Set(rows.map((r) => String(r.version)));
}

async function probeLedgerReady(client) {
  const checks = [
    "select to_regclass('public.equipment_rentals') is not null as ok",
    "select to_regclass('public.equipment_ledger') is not null as ok",
  ];
  for (const sql of checks) {
    const { rows } = await client.query(sql);
    if (!rows[0]?.ok) return false;
  }
  const { rows: cols } = await client.query(`
    select count(*)::int as n from information_schema.columns
    where table_schema='public' and table_name='catalog'
      and column_name in ('mgmt_code','qty_on_hand_total','qty_quarantine','opening_confirmed')
  `);
  return (cols[0]?.n ?? 0) >= 4;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  loadEnvFile(resolve(repoRoot, '.env.local'));
  loadEnvFile(resolve(repoRoot, '.env.db.local'));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const dbUrl =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.SPOKEDU_MASTER_DATABASE_URL?.trim() ||
    '';

  if (!dbUrl) {
    console.error('[equipment-migrate] Missing SUPABASE_DB_URL / DATABASE_URL in .env.local or .env.db.local');
    console.error('[equipment-migrate] Supabase → Project Settings → Database → URI (session or pooler).');
    process.exit(2);
  }

  const ref = projectRefFromUrl(supabaseUrl) || opts.confirmRef;
  if (opts.confirmRef !== ref) {
    console.error(`[equipment-migrate] --confirm-project-ref must match NEXT_PUBLIC_SUPABASE_URL (${ref})`);
    process.exit(2);
  }
  if (ref === PRODUCTION_REF && !opts.allowProduction && !opts.dryRun) {
    console.error('[equipment-migrate] Production apply requires --allow-production');
    process.exit(2);
  }

  const files = equipmentMigrationFiles();
  if (files.length === 0) {
    console.error('[equipment-migrate] No equipment migration files found');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    const applied = await appliedVersions(client);
    const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, '')));

    console.log('[equipment-migrate] project:', ref);
    console.log('[equipment-migrate] equipment files:', files.length, 'pending:', pending.length);
    if (await probeLedgerReady(client)) {
      console.log('[equipment-migrate] Ledger schema already present (probe PASS).');
      if (pending.length === 0) return;
      console.log('[equipment-migrate] Will apply remaining schema_migrations entries only:', pending);
    }

    if (opts.dryRun) {
      console.log('[equipment-migrate] dry-run pending:', pending);
      return;
    }

    for (const file of pending) {
      const version = file.replace(/\.sql$/, '');
      const sql = readFileSync(resolve(repoRoot, 'supabase/migrations', file), 'utf8');
      console.log('[equipment-migrate] applying', file, '…');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query(
          `insert into supabase_migrations.schema_migrations(version, name, statements)
           values ($1, $2, $3::text[])
           on conflict (version) do nothing`,
          [version, file, [file]],
        );
        await client.query('commit');
        console.log('[equipment-migrate] OK', version);
      } catch (e) {
        await client.query('rollback');
        throw e;
      }
    }

    const ready = await probeLedgerReady(client);
    console.log('[equipment-migrate] ledger_schema_ready_probe:', ready ? 'PASS' : 'FAIL');
    if (!ready) process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('[equipment-migrate] FAILED:', e.message ?? e);
  process.exit(1);
});
