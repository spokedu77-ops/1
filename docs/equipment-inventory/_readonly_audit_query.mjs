#!/usr/bin/env node
/** One-off read-only audit helper — not product code. */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envText = readFileSync(resolve(root, '.env.local'), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i)] = v;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const dbUrl = env.DATABASE_URL || env.SUPABASE_DB_URL || env.STAGE2C_DATABASE_URL;

async function pgQuery(sql) {
  if (!dbUrl) return { skipped: true, reason: 'no DATABASE_URL in .env.local' };
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query(sql);
    return res.rows;
  } finally {
    await client.end();
  }
}

async function main() {
  const out = {};

  const { data: ti, error: tiErr } = await sb.from('teacher_inventory').select('*');
  out.teacher_inventory = tiErr ? { error: tiErr.message } : { count: ti?.length, rows: ti };

  const { data: inv } = await sb.from('inventory').select('id,user_id,name,quantity');
  const { data: cat } = await sb.from('catalog').select('id,name');
  const { data: users } = await sb.from('users').select('id,name,email,is_active,role');

  const catByName = new Map();
  for (const c of cat ?? []) {
    if (!catByName.has(c.name)) catByName.set(c.name, []);
    catByName.get(c.name).push({ id: c.id, name: c.name });
  }
  const uids = new Set((users ?? []).map((u) => u.id));
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const mappingExceptions = [];
  for (const row of inv ?? []) {
    const matches = catByName.get(row.name ?? '') ?? [];
    if (matches.length !== 1) {
      mappingExceptions.push({
        inventory_id: row.id,
        user_id: row.user_id,
        name: row.name,
        quantity: row.quantity,
        catalog_match_count: matches.length,
        catalog_ids: matches.map((m) => m.id),
      });
    }
  }
  out.mapping_exceptions = { count: mappingExceptions.length, rows: mappingExceptions };

  const orphans = (inv ?? []).filter((r) => !uids.has(r.user_id));
  out.user_orphans = {
    count: orphans.length,
    rows: orphans.map((r) => ({
      inventory_id: r.id,
      user_id: r.user_id,
      name: r.name,
      quantity: r.quantity,
    })),
  };

  out.user_orphans_enriched = orphans.map((r) => ({
    ...r,
    users_row: userById.get(r.user_id) ?? null,
  }));

  const { data: balanceCat } = await sb.from('catalog').select('id,name').ilike('name', '%밸런스%');
  out.catalog_balance_names = balanceCat;

  const orphanUserIds = [...new Set(orphans.map((r) => r.user_id))];
  out.orphan_user_id_summary = orphanUserIds.map((id) => ({
    user_id: id,
    inventory_rows: orphans.filter((r) => r.user_id === id).length,
    total_qty: orphans.filter((r) => r.user_id === id).reduce((s, r) => s + (r.quantity ?? 0), 0),
  }));

  const tiUserId = ti?.[0]?.user_id;
  if (tiUserId) {
    const { data: tiUser } = await sb.from('users').select('id,name,email,role,is_active').eq('id', tiUserId).maybeSingle();
    out.teacher_inventory_user = tiUser;
  }

  out.pg = {};
  out.pg.teacher_inventory_ddl = await pgQuery(`
    SELECT c.column_name, c.data_type, c.is_nullable,
           pg_catalog.col_description(format('%s.%s', c.table_schema, c.table_name)::regclass::oid, c.ordinal_position) AS comment
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'teacher_inventory'
    ORDER BY c.ordinal_position
  `);

  out.pg.teacher_inventory_fk = await pgQuery(`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = 'teacher_inventory' AND tc.constraint_type = 'FOREIGN KEY'
  `);

  out.pg.teacher_inventory_rls = await pgQuery(`
    SELECT c.relrowsecurity AS rls_enabled, p.polname, p.polcmd, pg_get_expr(p.polqual, p.polrelid) AS using_expr, pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' AND c.relname = 'teacher_inventory'
  `);

  for (const tbl of ['catalog', 'inventory', 'inventory_logs']) {
    out.pg[`${tbl}_rls`] = await pgQuery(`
      SELECT c.relrowsecurity AS rls_enabled, p.polname, p.polcmd, pg_get_expr(p.polqual, p.polrelid) AS using_expr
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policy p ON p.polrelid = c.oid
      WHERE n.nspname = 'public' AND c.relname = '${tbl}'
    `);
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
