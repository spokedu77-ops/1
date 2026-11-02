#!/usr/bin/env node
/**
 * Read-only remote DB prep audit — not product code. No writes.
 * Usage: node --env-file=.env.local docs/equipment-inventory/_readonly_remote_db_prep_audit.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function loadEnv() {
  const envText = readFileSync(resolve(root, '.env.local'), 'utf8');
  const env = {};
  for (const line of envText.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i)] = v;
  }
  return env;
}

function projectRefFromUrl(url) {
  try {
    const h = new URL(url).hostname;
    const m = h.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return m ? m[1] : '[non-standard-host]';
  } catch {
    return '[invalid-url]';
  }
}

async function probeTable(sb, table, select = 'id') {
  const { error } = await sb.from(table).select(select).limit(0);
  if (!error) return { exists: true };
  const msg = error.message ?? '';
  const missing =
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('Could not find') ||
    msg.includes('missing relation');
  return { exists: false, missing_schema: missing, error: msg.slice(0, 200) };
}

async function pgQuery(dbUrl, sql) {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const dbUrl = env.DATABASE_URL || env.SUPABASE_DB_URL || env.STAGE2C_DATABASE_URL;

  const repoMigrations = readdirSync(resolve(root, 'supabase/migrations'))
    .filter((f) => f.includes('equipment') || /^20261030/.test(f))
    .sort();

  const out = {
    audited_at: new Date().toISOString(),
    supabase_project_ref: projectRefFromUrl(url),
    local_env: {
      EQUIPMENT_WRITE_MODE: env.EQUIPMENT_WRITE_MODE ?? '(unset)',
      NEXT_PUBLIC_EQUIPMENT_UI: env.NEXT_PUBLIC_EQUIPMENT_UI ?? '(unset)',
    },
    legacy_tables: {},
    ledger_objects: {},
    catalog_ledger_columns: {},
    counts: {},
    repo_equipment_migrations_ordered: repoMigrations,
    applied_migrations: null,
    migration_function_risk: [],
    mapping_summary: {},
    expand_feasibility: {},
    cutover_plan_refs: [
      'docs/equipment-inventory/EQUIPMENT_DATA_MIGRATION_PLAN.md',
      'docs/equipment-inventory/EQUIPMENT_RELEASE_GATE.md',
    ],
  };

  for (const tbl of ['catalog', 'inventory', 'inventory_logs', 'teacher_inventory']) {
    out.legacy_tables[tbl] = await probeTable(sb, tbl, tbl === 'catalog' ? 'id,name' : '*');
  }
  for (const tbl of ['equipment_rentals', 'equipment_ledger']) {
    out.ledger_objects[tbl] = await probeTable(sb, tbl, tbl === 'equipment_rentals' ? 'rental_id' : 'ledger_id');
  }

  const catCols = ['mgmt_code', 'qty_on_hand_total', 'qty_quarantine', 'opening_confirmed'];
  for (const col of catCols) {
    const { error } = await sb.from('catalog').select(col).limit(0);
    out.catalog_ledger_columns[col] = error
      ? { present: false, error: (error.message ?? '').slice(0, 160) }
      : { present: true };
  }

  const { count: catalogCount } = await sb.from('catalog').select('id', { count: 'exact', head: true });
  const { count: inventoryCount } = await sb.from('inventory').select('id', { count: 'exact', head: true });
  const { count: logsCount } = await sb.from('inventory_logs').select('id', { count: 'exact', head: true });
  out.counts = { catalog: catalogCount, inventory: inventoryCount, inventory_logs: logsCount };

  if (out.legacy_tables.teacher_inventory?.exists) {
    const { count: tiCount } = await sb.from('teacher_inventory').select('*', { count: 'exact', head: true });
    out.counts.teacher_inventory = tiCount;
  }

  const { data: invSample } = await sb.from('inventory').select('id,user_id,name,quantity').limit(5000);
  const { data: catRows } = await sb.from('catalog').select('id,name');
  const catByName = new Map();
  for (const c of catRows ?? []) {
    if (!catByName.has(c.name)) catByName.set(c.name, []);
    catByName.get(c.name).push(c.id);
  }
  let exactOne = 0;
  let zero = 0;
  let ambiguous = 0;
  for (const row of invSample ?? []) {
    const n = catByName.get(row.name ?? '')?.length ?? 0;
    if (n === 1) exactOne++;
    else if (n === 0) zero++;
    else ambiguous++;
  }
  out.mapping_summary = {
    inventory_rows_sampled: invSample?.length ?? 0,
    name_to_catalog_exactly_one: exactOne,
    unmapped_name: zero,
    ambiguous_name: ambiguous,
  };

  out.expand_feasibility = {
    legacy_tables_intact: ['catalog', 'inventory', 'inventory_logs'].every((t) => out.legacy_tables[t]?.exists),
    ledger_tables_present: out.ledger_objects.equipment_rentals?.exists && out.ledger_objects.equipment_ledger?.exists,
    catalog_qty_columns_present: catCols.every((c) => out.catalog_ledger_columns[c]?.present),
    expand_without_drop: true,
    note: 'Expand-only migrations in repo; no DROP of legacy tables in 20261030* chain.',
  };

  if (dbUrl) {
    try {
      const applied = await pgQuery(
        dbUrl,
        `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`,
      );
      const appliedNames = applied.rows.map((r) => r.version ?? r.name).filter(Boolean);
      out.applied_migrations = {
        total: applied.rows.length,
        equipment_related: appliedNames.filter((v) => String(v).includes('equipment') || String(v).startsWith('20261030')),
      };
      const pending = repoMigrations.filter((f) => {
        const ver = f.replace(/\.sql$/, '');
        return !appliedNames.some((a) => String(a).includes(ver) || String(a) === ver);
      });
      out.pending_equipment_migrations = pending;

      for (const f of repoMigrations) {
        const sql = readFileSync(resolve(root, 'supabase/migrations', f), 'utf8');
        const replaces = (sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION/gi) ?? []).length;
        if (replaces > 0) {
          out.migration_function_risk.push({ file: f, create_or_replace_function_count: replaces });
        }
      }

      out.cutover_plan_refs.push('Apply pending migrations in filename order; freeze legacy writes via EQUIPMENT_WRITE_MODE=legacy until opening confirmed');
    } catch (e) {
      out.applied_migrations = { error: String(e.message ?? e).slice(0, 300) };
    }
  } else {
    out.applied_migrations = { skipped: true, reason: 'no DATABASE_URL / SUPABASE_DB_URL in .env.local' };
    out.pending_equipment_migrations = repoMigrations;
    for (const f of repoMigrations) {
      const sql = readFileSync(resolve(root, 'supabase/migrations', f), 'utf8');
      const replaces = (sql.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION/gi) ?? []).length;
      if (replaces > 0) out.migration_function_risk.push({ file: f, create_or_replace_function_count: replaces });
    }
  }

  out.ledger_schema_ready_probe =
    out.ledger_objects.equipment_rentals?.exists &&
    out.ledger_objects.equipment_ledger?.exists &&
    catCols.every((c) => out.catalog_ledger_columns[c]?.present);

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
