#!/usr/bin/env node
/** Rollback probe + cache drift (isolated Docker PG). */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const CONTAINER = 'spokedu-equipment-stage2-qa-pg';
const PG_PASS = 'stage2qa';
const PG_DB = 'equipment_stage2_qa';
const results = [];
const log = (s, st, d) => {
  results.push({ section: s, status: st, detail: d });
  console.log(`${st === 'PASS' ? '✓' : '✗'} [${s}] ${st}${d ? `: ${d}` : ''}`);
};

function psql(sql, db = PG_DB) {
  const r = spawnSync(
    'docker',
    ['exec', '-e', `PGPASSWORD=${PG_PASS}`, CONTAINER, 'psql', '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return (r.stdout || '').trim();
}

function psqlFile(filePath) {
  const r = spawnSync(
    'docker',
    ['exec', '-i', '-e', `PGPASSWORD=${PG_PASS}`, CONTAINER, 'psql', '-U', 'postgres', '-d', PG_DB, '-v', 'ON_ERROR_STOP=1'],
    { input: fs.readFileSync(filePath, 'utf8'), encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || filePath);
}

function key(l) {
  return crypto.createHash('sha256').update(l + Date.now()).digest('hex').slice(0, 32);
}

try {
  spawnSync('docker', ['rm', '-f', CONTAINER], { stdio: 'ignore' });
  spawnSync('docker', ['run', '-d', '--name', CONTAINER, '-e', `POSTGRES_PASSWORD=${PG_PASS}`, 'postgres:16-alpine'], { stdio: 'inherit' });
  for (let i = 0; i < 30; i++) {
    try {
      psql('select 1', 'postgres');
      break;
    } catch {
      spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 1'], { stdio: 'ignore' });
    }
  }
  psql(`create database ${PG_DB}`, 'postgres');
  for (const f of [
    path.join(__dirname, 'stage2_rls_bootstrap.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030110000_equipment_legacy_tables_baseline.sql'),
    path.join(__dirname, 'stage2_rls_policies.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030120000_equipment_ledger_expand.sql'),
    path.join(__dirname, 'stage2_rls_post_expand.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030200000_equipment_legacy_write_gate.sql'),
    path.join(repoRoot, 'supabase/migrations/20261030210000_equipment_cache_drift_detect.sql'),
  ]) {
    psqlFile(f);
  }

  psql(
    `insert into auth.users (id,email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','t@test'); insert into public.users (id,name,role) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','T','teacher'); insert into public.catalog (name) values ('RB');`,
  );
  const cid = psql(`select id::text from catalog where name='RB' limit 1`);
  psql(`select admin_equipment_opening_balance(${cid}, 5, 0, '${key('o')}', null, null, '{}');`);

  const beforeL = psql(`select count(*) from equipment_ledger`);
  const beforeR = psql(`select count(*) from equipment_rentals`);
  try {
    psql(
      `select admin_equipment_rent(${cid}, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 99, '${key('fail')}', null, null);`,
    );
    log('rollback_insufficient', 'FAIL', 'should error');
  } catch {
    log(
      'rollback_insufficient',
      psql(`select count(*) from equipment_ledger`) === beforeL &&
        psql(`select count(*) from equipment_rentals`) === beforeR
        ? 'PASS'
        : 'FAIL',
      `ledger/rentals unchanged`,
    );
  }

  psql(`create or replace function test_forced_fail_after_ledger() returns void language plpgsql as $$
  declare v_rid uuid := gen_random_uuid(); v_lid uuid := gen_random_uuid();
  begin
    insert into equipment_rentals (rental_id,catalog_id,teacher_id,qty_lent,qty_returned,qty_outstanding,status)
      values (v_rid, ${cid}, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1,0,1,'active');
    insert into equipment_ledger (ledger_id,event_type,catalog_id,teacher_id,rental_id,qty)
      values (v_lid,'RENT',${cid},'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',v_rid,1);
    raise exception 'FORCED_FAIL';
  end $$;`);
  const bl = psql(`select count(*) from equipment_ledger`);
  try {
    psql(`select test_forced_fail_after_ledger();`);
    log('rollback_forced', 'FAIL', 'no raise');
  } catch {
    log('rollback_forced', psql(`select count(*) from equipment_ledger`) === bl ? 'PASS' : 'FAIL', 'txn rolled back');
  }

  psql(`select admin_equipment_rent(${cid}, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 1, '${key('ok')}', null, null);`);
  psql(`update catalog set qty_on_hand_total = qty_on_hand_total + 1 where id = ${cid};`);
  log('cache_drift_detect', psql(`select equipment_catalog_cache_drifted(${cid});`) === 't' ? 'PASS' : 'FAIL', 'drift true');
  try {
    psql(`select admin_equipment_rent(${cid}, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 1, '${key('d')}', null, null);`);
    log('cache_drift_block_write', 'FAIL', 'rent allowed');
  } catch (e) {
    log('cache_drift_block_write', String(e.message).includes('EQUIPMENT_CACHE_DRIFT') ? 'PASS' : 'FAIL', 'blocked');
  }

  fs.writeFileSync(
    path.join(__dirname, 'EQUIPMENT_STAGE2_ROLLBACK_CACHE_RESULTS.json'),
    JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2),
  );
  process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
