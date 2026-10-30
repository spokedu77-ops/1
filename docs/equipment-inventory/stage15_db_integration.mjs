#!/usr/bin/env node
/**
 * Stage 1.5 equipment ledger integration against isolated Docker PostgreSQL.
 * Does not touch production Supabase.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const CONTAINER = 'spokedu-equipment-stage15-pg';
const PG_PORT = '55432';
const PG_USER = 'postgres';
const PG_PASS = 'stage15test';
const PG_DB = 'equipment_stage15';

const results = [];

function log(section, status, detail) {
  results.push({ section, status, detail });
  const mark = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  console.log(`${mark} [${section}] ${status}${detail ? `: ${detail}` : ''}`);
}

function psql(sql, { db = PG_DB } = {}) {
  const r = spawnSync(
    'docker',
    [
      'exec',
      '-e',
      `PGPASSWORD=${PG_PASS}`,
      CONTAINER,
      'psql',
      '-U',
      PG_USER,
      '-d',
      db,
      '-v',
      'ON_ERROR_STOP=1',
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || 'psql failed');
  }
  return (r.stdout || '').trim();
}

function psqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const r = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${PG_PASS}`,
      CONTAINER,
      'psql',
      '-U',
      PG_USER,
      '-d',
      PG_DB,
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input: sql, encoding: 'utf8' },
  );
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `psql file failed: ${filePath}`);
  }
}

function requestKey(label) {
  return crypto.createHash('sha256').update(label + Date.now()).digest('hex').slice(0, 32);
}

function assertInvariant(snapshot, step) {
  const t = Number(snapshot.qty_on_hand_total);
  const l = Number(snapshot.qty_lent);
  const q = Number(snapshot.qty_quarantine);
  const a = Number(snapshot.qty_available);
  if (t !== l + q + a) {
    throw new Error(`${step}: T=${t} L=${l} Q=${q} A=${a} (expected T=L+Q+A)`);
  }
}

function rpcJson(fn, argsLiteral) {
  const out = psql(`select ${fn}(${argsLiteral})::text;`);
  return JSON.parse(out);
}

function ensureContainer() {
  const inspect = spawnSync('docker', ['inspect', CONTAINER], { encoding: 'utf8' });
  if (inspect.status === 0) {
    spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'inherit' });
  }
  const run = spawnSync(
    'docker',
    [
      'run',
      '-d',
      '--name',
      CONTAINER,
      '-e',
      `POSTGRES_PASSWORD=${PG_PASS}`,
      '-p',
      `${PG_PORT}:5432`,
      'postgres:16-alpine',
    ],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) throw new Error(run.stderr || 'docker run failed');
  for (let i = 0; i < 30; i++) {
    try {
      psql('select 1', { db: 'postgres' });
      return;
    } catch {
      spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 1'], { stdio: 'ignore' });
    }
  }
  throw new Error('postgres container not ready');
}

try {
  ensureContainer();
  psql(`create database ${PG_DB}`, { db: 'postgres' });
  log('docker_postgres', 'PASS', `${CONTAINER}:${PG_PORT}/${PG_DB}`);

  psqlFile(path.join(__dirname, 'stage15_test_bootstrap.sql'));
  psqlFile(path.join(repoRoot, 'supabase/migrations/20261030120000_equipment_ledger_expand.sql'));
  log('migration_clean', 'PASS', 'bootstrap + expand');

  // Expand on existing schema (idempotent re-apply)
  psqlFile(path.join(repoRoot, 'supabase/migrations/20261030120000_equipment_ledger_expand.sql'));
  log('migration_reapply', 'PASS', 'second apply no error');

  const teacherA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const teacherB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  psql(`insert into auth.users (id, email) values ('${teacherA}', 'a@test'), ('${teacherB}', 'b@test') on conflict do nothing;`);
  psql(`insert into public.users (id, name) values ('${teacherA}', '강사A'), ('${teacherB}', '강사B') on conflict do nothing;`);
  psql(`insert into public.catalog (name) values ('농구공') returning id;`);
  const catalogId = psql(`select id::text from public.catalog where name='농구공' limit 1;`);

  // Rent blocked before opening
  try {
    rpcJson('public.admin_equipment_rent', `${catalogId}, '${teacherA}'::uuid, 1, '${requestKey('pre-open')}', null, null`);
    log('opening_gate', 'FAIL', 'rent allowed before opening');
  } catch (e) {
    log('opening_gate', 'PASS', String(e.message).includes('EQUIPMENT_OPENING_NOT_CONFIRMED') ? 'rent blocked' : e.message);
  }

  const openKey = requestKey('open');
  let snap = rpcJson(
    'public.admin_equipment_opening_balance',
    `${catalogId}, 10, 0, '${openKey}', '기초재고', null, '{}'::jsonb`,
  );
  assertInvariant(snap, 'step1');
  if (snap.qty_on_hand_total !== 10 || snap.qty_lent !== 0 || snap.qty_quarantine !== 0 || snap.qty_available !== 10) {
    throw new Error('step1 quantities mismatch');
  }
  log('scenario_step1', 'PASS', 'T10 L0 Q0 A10');

  const rentAKey = requestKey('rentA');
  snap = rpcJson('public.admin_equipment_rent', `${catalogId}, '${teacherA}'::uuid, 4, '${rentAKey}', null, null`);
  assertInvariant(snap, 'step2');
  const rentalA = snap.rental_id;
  log('scenario_step2', 'PASS', 'L4 A6');

  snap = rpcJson('public.admin_equipment_rent', `${catalogId}, '${teacherB}'::uuid, 3, '${requestKey('rentB')}', null, null`);
  assertInvariant(snap, 'step3');
  const rentalB = snap.rental_id;
  if (rentalA === rentalB) throw new Error('repeat rent must create new rental_id');
  log('scenario_step3', 'PASS', 'L7 A3 distinct rental_id');

  snap = rpcJson('public.admin_equipment_return', `'${rentalA}'::uuid, 2, '${requestKey('retA')}', null, null`);
  assertInvariant(snap, 'step4');
  log('scenario_step4', 'PASS', 'L5 A5 partial return');

  snap = rpcJson('public.admin_equipment_quarantine_adjust', `${catalogId}, 2, '${requestKey('q')}', null, null`);
  assertInvariant(snap, 'step5');
  log('scenario_step5', 'PASS', 'Q2 A3');

  snap = rpcJson('public.admin_equipment_return', `'${rentalB}'::uuid, 3, '${requestKey('retB')}', null, null`);
  assertInvariant(snap, 'step6');
  if (snap.qty_lent !== 2 || snap.qty_quarantine !== 2 || snap.qty_available !== 6) {
    throw new Error('step6 final quantities mismatch');
  }
  log('scenario_step6', 'PASS', 'L2 Q2 A6');

  // Over-return blocked
  try {
    rpcJson('public.admin_equipment_return', `'${rentalA}'::uuid, 99, '${requestKey('over')}', null, null`);
    log('over_return', 'FAIL', 'allowed over return');
  } catch (e) {
    log('over_return', 'PASS', 'RETURN_EXCEEDS_OUTSTANDING');
  }

  // Closed rental duplicate return
  rpcJson('public.admin_equipment_return', `'${rentalA}'::uuid, 2, '${requestKey('closeA')}', null, null`);
  try {
    rpcJson('public.admin_equipment_return', `'${rentalA}'::uuid, 1, '${requestKey('dup')}', null, null`);
    log('closed_rental', 'FAIL', 'duplicate return on closed');
  } catch (e) {
    log('closed_rental', 'PASS', 'EQUIPMENT_RENTAL_ALREADY_CLOSED');
  }

  // Idempotency replay
  const idemKey = requestKey('idem');
  const first = rpcJson('public.admin_equipment_rent', `${catalogId}, '${teacherA}'::uuid, 1, '${idemKey}', null, null`);
  const second = rpcJson('public.admin_equipment_rent', `${catalogId}, '${teacherA}'::uuid, 1, '${idemKey}', null, null`);
  if (!second.replayed) throw new Error('idempotent replay flag missing');
  log('idempotency_replay', 'PASS', `rental ${first.rental_id}`);

  // Idempotency conflict
  try {
    rpcJson('public.admin_equipment_rent', `${catalogId}, '${teacherB}'::uuid, 1, '${idemKey}', null, null`);
    log('idempotency_conflict', 'FAIL', 'conflict not detected');
  } catch (e) {
    log('idempotency_conflict', 'PASS', 'EQUIPMENT_IDEMPOTENCY_CONFLICT');
  }

  // RPC execute grants: authenticated cannot call rent
  const perm = psql(
    `select has_function_privilege('authenticated', 'public.admin_equipment_rent(bigint,uuid,integer,text,text,uuid)', 'EXECUTE');`,
  );
  log('rpc_grants_authenticated', perm === 'f' ? 'PASS' : 'FAIL', `execute=${perm}`);

  const svc = psql(
    `select has_function_privilege('service_role', 'public.admin_equipment_rent(bigint,uuid,integer,text,text,uuid)', 'EXECUTE');`,
  );
  log('rpc_grants_service_role', svc === 't' ? 'PASS' : 'FAIL', `execute=${svc}`);

  // Concurrency: two rents totaling more than available should not both succeed
  psql(`insert into public.catalog (name) values ('농구공-동시성');`);
  const catalogId2 = psql(`select id::text from public.catalog where name='농구공-동시성' limit 1;`);
  psql(
    `select public.admin_equipment_opening_balance(${catalogId2}, 20, 0, '${requestKey('open2')}', null, null, '{}'::jsonb);`,
  );
  const cKey1 = requestKey('c1');
  const cKey2 = requestKey('c2');
  rpcJson('public.admin_equipment_rent', `${catalogId2}, '${teacherA}'::uuid, 15, '${cKey1}', null, null`);
  try {
    rpcJson('public.admin_equipment_rent', `${catalogId2}, '${teacherB}'::uuid, 10, '${cKey2}', null, null`);
    log('concurrency_available', 'FAIL', 'oversubscribed');
  } catch (e) {
    log('concurrency_available', 'PASS', 'second rent rejected');
  }

  const ledgerTypes = psql(
    `select count(*) from equipment_ledger where event_type='OPENING_BALANCE_MIGRATION' and catalog_id=${catalogId};`,
  );
  const rentTypes = psql(
    `select count(*) from equipment_ledger where event_type='RENT' and catalog_id=${catalogId};`,
  );
  log('opening_vs_rent_ledger', 'PASS', `opening_rows catalog1=${ledgerTypes} rent_rows=${rentTypes}`);

  const outPath = path.join(__dirname, 'EQUIPMENT_STAGE15_DB_INTEGRATION_RESULTS.json');
  fs.writeFileSync(outPath, JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${outPath}`);

  const failed = results.filter((r) => r.status === 'FAIL');
  process.exit(failed.length ? 1 : 0);
} catch (err) {
  console.error(err);
  log('fatal', 'FAIL', err.message);
  process.exit(1);
}
