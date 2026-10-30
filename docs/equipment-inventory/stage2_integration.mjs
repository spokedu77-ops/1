#!/usr/bin/env node
/**
 * Stage 2: scale fixture + legacy write gate + JWT/RLS simulation (isolated Docker PG).
 * Optional: --supabase hits local Supabase REST (127.0.0.1:54321) if running.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const CONTAINER = 'spokedu-equipment-stage2-pg';
const PG_PASS = 'stage2test';
const PG_DB = 'equipment_stage2';
const results = [];

const ADMIN = 'a0000001-0001-4001-8001-000000000001';
const TEACHER_A = 'a0000002-0002-4002-8002-000000000002';
const TEACHER_B = 'a0000003-0003-4003-8003-000000000003';

function log(section, status, detail) {
  results.push({ section, status, detail });
  console.log(`${status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○'} [${section}] ${status}${detail ? `: ${detail}` : ''}`);
}

function psql(sql, { db = PG_DB, user = 'postgres' } = {}) {
  const r = spawnSync(
    'docker',
    ['exec', '-e', `PGPASSWORD=${PG_PASS}`, CONTAINER, 'psql', '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || 'psql failed');
  return (r.stdout || '').trim();
}

function psqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const r = spawnSync(
    'docker',
    ['exec', '-i', '-e', `PGPASSWORD=${PG_PASS}`, CONTAINER, 'psql', '-U', 'postgres', '-d', PG_DB, '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || `psql file: ${filePath}`);
}

function psqlAsRole(sub, role, sql) {
  const wrapped = `
    select set_config('request.jwt.claim.sub', '${sub}', true);
    select set_config('request.jwt.claim.role', '${role}', true);
    set role ${role};
    ${sql}
  `;
  const out = psql(wrapped);
  const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? '';
}

function expectFail(fn, label) {
  try {
    fn();
    log(label, 'FAIL', 'expected error');
    return false;
  } catch (e) {
    log(label, 'PASS', String(e.message).split('\n')[0].slice(0, 120));
    return true;
  }
}

function requestKey(label) {
  return crypto.createHash('sha256').update(label + Date.now()).digest('hex').slice(0, 32);
}

function ensureContainer() {
  spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore' });
  const run = spawnSync(
    'docker',
    ['run', '-d', '--name', CONTAINER, '-e', `POSTGRES_PASSWORD=${PG_PASS}`, '-p', '55433:5432', 'postgres:16-alpine'],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) throw new Error(run.stderr || 'docker run failed');
  for (let i = 0; i < 40; i++) {
    try {
      psql('select 1', { db: 'postgres' });
      return;
    } catch {
      spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 1'], { stdio: 'ignore' });
    }
  }
  throw new Error('postgres not ready');
}

function count(table) {
  return Number(psql(`select count(*)::int from ${table};`));
}

async function trySupabaseJwt() {
  const url = process.env.STAGE2_SUPABASE_URL || 'http://127.0.0.1:54321';
  const anon = process.env.STAGE2_SUPABASE_ANON_KEY;
  if (!anon) {
    log('supabase_jwt_live', 'SKIP', 'STAGE2_SUPABASE_ANON_KEY unset (run supabase status)');
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anon);
  const { data, error } = await client.from('inventory').select('id').limit(1);
  if (error) {
    log('supabase_jwt_live', 'SKIP', error.message);
    return;
  }
  log('supabase_jwt_live', 'PASS', `anon inventory probe rows=${data?.length ?? 0}`);
}

try {
  ensureContainer();
  psql(`create database ${PG_DB}`, { db: 'postgres' });
  log('docker', 'PASS', CONTAINER);

  const migrations = [
    path.join(__dirname, 'stage2_rls_bootstrap.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030110000_equipment_legacy_tables_baseline.sql'),
    path.join(__dirname, 'stage2_rls_policies.sql'),
    path.join(__dirname, 'stage2_scale_fixture.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030120000_equipment_ledger_expand.sql'),
    path.join(__dirname, 'stage2_rls_post_expand.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030200000_equipment_legacy_write_gate.sql'),
  ];
  for (const f of migrations) psqlFile(f);

  const cCat = count('public.catalog');
  const cInv = count('public.inventory');
  const cTi = count('public.teacher_inventory');
  const m1 = count(`public.inventory where name = '밸런스핏 '`);
  const u1 = count(`public.inventory i where not exists (select 1 from public.users u where u.id = i.user_id)`);

  if (cCat !== 48 || cInv !== 666 || cTi !== 2 || m1 !== 4 || u1 !== 19) {
    throw new Error(`scale mismatch cat=${cCat} inv=${cInv} ti=${cTi} m1=${m1} u1=${u1}`);
  }
  log('scale_fixture', 'PASS', '48/666/2 + M1=4 U1=19');

  const openBefore = count('equipment_ledger');
  psqlFile(path.join(repoRoot, 'supabase/migrations/20261030120000_equipment_ledger_expand.sql'));
  psqlFile(path.join(repoRoot, 'supabase/migrations/20261030200000_equipment_legacy_write_gate.sql'));
  if (count('public.catalog') !== 48 || count('public.inventory') !== 666 || count('equipment_ledger') !== openBefore) {
    throw new Error('expand reapply changed row counts or ledger');
  }
  log('expand_idempotent', 'PASS', 'no delete/double migration');

  // Legacy gate OFF — admin authenticated update allowed
  psqlAsRole(ADMIN, 'authenticated', `update public.inventory set quantity = quantity where id = (select min(id) from public.inventory);`);
  log('legacy_gate_off', 'PASS', 'inventory update ok');

  // Legacy gate ON — blocked for authenticated
  psql(`select public.equipment_ops_set_legacy_writes_blocked(true);`);
  expectFail(
    () => psqlAsRole(ADMIN, 'authenticated', `update public.inventory set quantity = quantity + 1 where id = (select min(id) from public.inventory);`),
    'legacy_gate_on_admin_jwt',
  );

  // service_role bypass
  psql(`set role service_role; update public.inventory set quantity = quantity where id = (select min(id) from public.inventory);`);
  log('legacy_gate_service_role', 'PASS', 'service_role update ok');

  psql(`select public.equipment_ops_set_legacy_writes_blocked(false);`);

  // Seed ledger rentals for view RLS
  const catalogId = psql(`select id::text from public.catalog where name='품목-01' limit 1;`);
  psql(
    `select public.admin_equipment_opening_balance(${catalogId}, 10, 0, '${requestKey('o')}', null, null, '{}'::jsonb);`,
  );
  psql(
    `select public.admin_equipment_rent(${catalogId}, '${TEACHER_A}'::uuid, 2, '${requestKey('r')}', null, null);`,
  );

  const holdA = psqlAsRole(TEACHER_A, 'authenticated', `select coalesce(sum(qty_held),0)::text from public.teacher_equipment_holdings_v;`);
  const holdB = psqlAsRole(TEACHER_B, 'authenticated', `select coalesce(sum(qty_held),0)::text from public.teacher_equipment_holdings_v;`);
  if (Number(holdA) < 1 || Number(holdB) !== 0) {
    throw new Error(`holdings view A=${holdA} B=${holdB}`);
  }
  log('view_teacher_own', 'PASS', `A=${holdA} B=${holdB}`);

  const adminRentals = psqlAsRole(ADMIN, 'authenticated', `select count(*)::text from public.equipment_rentals;`);
  if (Number(adminRentals) < 1) throw new Error('admin rentals select');
  log('admin_rentals_select', 'PASS', adminRentals);

  expectFail(
    () =>
      psqlAsRole(TEACHER_A, 'authenticated', `insert into public.equipment_ledger (event_type, catalog_id, qty) values ('RENT', ${catalogId}, 1);`),
    'ledger_dml_authenticated',
  );

  expectFail(
    () => psqlAsRole(TEACHER_A, 'authenticated', `select public.admin_equipment_rent(${catalogId}, '${TEACHER_A}'::uuid, 1, '${requestKey('x')}', null, null);`),
    'rpc_authenticated_execute',
  );

  const invCross = psqlAsRole(
    TEACHER_B,
    'authenticated',
    `select count(*)::text from public.inventory where user_id = '${TEACHER_A}'::uuid;`,
  );
  if (Number(invCross) !== 0) throw new Error('teacher B saw A inventory');
  log('inventory_rls_cross_teacher', 'PASS', '0 rows');

  psql(`select public.equipment_ops_set_legacy_writes_blocked(true);`);
  expectFail(
    () => psqlAsRole(TEACHER_A, 'authenticated', `insert into public.inventory (user_id, name, quantity) values ('${TEACHER_A}', 'x', 1);`),
    'legacy_insert_blocked_when_on',
  );
  psql(`select public.equipment_ops_set_legacy_writes_blocked(false);`);

  await trySupabaseJwt();

  const outPath = path.join(__dirname, 'EQUIPMENT_STAGE2_INTEGRATION_RESULTS.json');
  fs.writeFileSync(outPath, JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${outPath}`);
  process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
} catch (e) {
  console.error(e);
  log('fatal', 'FAIL', e.message);
  process.exit(1);
}
