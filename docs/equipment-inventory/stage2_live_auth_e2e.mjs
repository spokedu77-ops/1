#!/usr/bin/env node
/**
 * Live Supabase GoTrue + PostgREST E2E (local stack only).
 * Prereq: npx supabase@2.122.0 start
 *         stage2_supabase_minimal_apply.sql + equipment migrations applied on supabase_db_1
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL = process.env.STAGE2_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON = process.env.STAGE2_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SERVICE =
  process.env.STAGE2_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'equip-admin@test.local';
const TEACHER_A_EMAIL = 'equip-teachera@test.local';
const TEACHER_B_EMAIL = 'equip-teachb@test.local';
const PASS = 'stage2-equip-test-9';

const results = [];
const log = (s, st, d) => {
  results.push({ section: s, status: st, detail: d });
  console.log(`${st === 'PASS' ? '✓' : st === 'FAIL' ? '✗' : '○'} [${s}] ${st}${d ? `: ${d}` : ''}`);
};

function requestKey(label) {
  return crypto.createHash('sha256').update(label + Date.now()).digest('hex').slice(0, 32);
}

async function main() {
  if (!ANON || !SERVICE) {
    log('live_auth_prereq', 'NOT_VERIFIED', 'ANON/SERVICE keys missing — run supabase status -o env');
    writeOut();
    process.exit(2);
  }

  const adminClient = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

  for (const email of [ADMIN_EMAIL, TEACHER_A_EMAIL, TEACHER_B_EMAIL]) {
    await adminClient.auth.admin.createUser({ email, password: PASS, email_confirm: true }).catch(() => null);
  }

  const { data: adminUser } = await adminClient.auth.admin.listUsers();
  const byEmail = (e) => adminUser?.users?.find((u) => u.email === e)?.id;
  const adminId = byEmail(ADMIN_EMAIL);
  const teacherAId = byEmail(TEACHER_A_EMAIL);
  const teacherBId = byEmail(TEACHER_B_EMAIL);
  if (!adminId || !teacherAId || !teacherBId) {
    log('live_auth_users', 'FAIL', 'createUser/listUsers');
    writeOut();
    process.exit(1);
  }

  await adminClient.from('users').upsert([
    { id: adminId, name: 'EquipAdmin', role: 'admin', is_active: true },
    { id: teacherAId, name: 'TeacherA', role: 'teacher', is_active: true },
    { id: teacherBId, name: 'TeacherB', role: 'teacher', is_active: true },
  ]);

  const { data: catRow, error: catErr } = await adminClient
    .from('catalog')
    .insert({ name: 'LiveE2E-농구공' })
    .select('id')
    .single();
  if (catErr) {
    log('seed_catalog', 'FAIL', catErr.message);
    writeOut();
    process.exit(1);
  }
  const catalogId = catRow.id;

  await adminClient.rpc('admin_equipment_opening_balance', {
    p_catalog_id: catalogId,
    p_qty_on_hand_total: 10,
    p_qty_quarantine: 0,
    p_request_key: requestKey('open'),
    p_note: 'live e2e',
    p_metadata: {},
  });

  await adminClient.rpc('admin_equipment_rent', {
    p_catalog_id: catalogId,
    p_teacher_id: teacherAId,
    p_qty: 2,
    p_request_key: requestKey('rent'),
    p_note: null,
  });

  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: anonInv } = await anon.from('inventory').select('id').limit(1);
  const { data: anonLed } = await anon.from('equipment_ledger').select('ledger_id').limit(1);
  log(
    'anon_unauthenticated',
    (anonInv?.length ?? 0) === 0 && (anonLed?.length ?? 0) === 0 ? 'PASS' : 'FAIL',
    `inventory_rows=${anonInv?.length ?? 0}; ledger_rows=${anonLed?.length ?? 0}`,
  );

  const clientAdmin = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: adminSignErr } = await clientAdmin.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: PASS,
  });
  if (adminSignErr) {
    log('admin_signin_rentals', 'FAIL', adminSignErr.message);
  } else {
    const { data: adminRentals, error: arErr } = await clientAdmin.from('equipment_rentals').select('rental_id');
    log(
      'admin_signin_rentals',
      !arErr && (adminRentals?.length ?? 0) > 0 ? 'PASS' : 'FAIL',
      arErr?.message ?? `rows=${adminRentals?.length ?? 0}`,
    );
  }

  const clientA = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: signAErr } = await clientA.auth.signInWithPassword({ email: TEACHER_A_EMAIL, password: PASS });
  if (signAErr) {
    log('teacher_a_signin', 'FAIL', signAErr.message);
  } else {
    const { data: holdA } = await clientA.from('teacher_equipment_holdings_v').select('qty_held');
    const sumA = (holdA ?? []).reduce((n, r) => n + Number(r.qty_held), 0);
    log('teacher_a_holdings', sumA >= 2 ? 'PASS' : 'FAIL', `held=${sumA}`);

    const { data: invB } = await clientA.from('inventory').select('id').eq('user_id', teacherBId).limit(1);
    log('teacher_a_cross_inventory', (invB ?? []).length === 0 ? 'PASS' : 'FAIL', `rows=${invB?.length}`);
  }

  const clientB = createClient(URL, ANON, { auth: { persistSession: false } });
  await clientB.auth.signInWithPassword({ email: TEACHER_B_EMAIL, password: PASS });
  const { data: holdB } = await clientB.from('teacher_equipment_holdings_v').select('qty_held');
  const sumB = (holdB ?? []).reduce((n, r) => n + Number(r.qty_held), 0);
  log('teacher_b_holdings', sumB === 0 ? 'PASS' : 'FAIL', `held=${sumB}`);

  const { error: ledgerIns } = await clientA.from('equipment_ledger').insert({
    event_type: 'RENT',
    catalog_id: catalogId,
    qty: 1,
  });
  log('ledger_dml_jwt', ledgerIns ? 'PASS' : 'FAIL', ledgerIns?.message ?? 'insert ok');

  const { error: rentalUpd } = await clientA
    .from('equipment_rentals')
    .update({ qty_outstanding: 0 })
    .eq('catalog_id', catalogId);
  log('rentals_dml_jwt', rentalUpd ? 'PASS' : 'FAIL', rentalUpd?.message ?? 'update ok');

  const { error: rpcErr } = await clientA.rpc('admin_equipment_rent', {
    p_catalog_id: catalogId,
    p_teacher_id: teacherAId,
    p_qty: 1,
    p_request_key: requestKey('bad'),
  });
  log('rpc_authenticated', rpcErr ? 'PASS' : 'FAIL', rpcErr?.message ?? 'rpc ok');

  const adminRpc = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const { error: adminRentErr } = await adminRpc.rpc('admin_equipment_return', {
    p_rental_id: (
      await adminRpc.from('equipment_rentals').select('rental_id').eq('teacher_id', teacherAId).limit(1).single()
    ).data?.rental_id,
    p_qty: 1,
    p_request_key: requestKey('ret'),
  });
  log('service_role_return', adminRentErr ? 'FAIL' : 'PASS', adminRentErr?.message ?? 'ok');

  const browserBundle = fs.readFileSync(
    path.join(__dirname, '../../app/lib/supabase/browser.ts'),
    'utf8',
  );
  log(
    'service_role_browser_exposure',
    browserBundle.includes('SERVICE_ROLE') ? 'FAIL' : 'PASS',
    'app/lib/supabase/browser.ts',
  );

  writeOut();
  process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
}

function writeOut() {
  const out = path.join(__dirname, 'EQUIPMENT_STAGE2_LIVE_AUTH_RESULTS.json');
  fs.writeFileSync(out, JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2));
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  log('fatal', 'FAIL', e.message);
  writeOut();
  process.exit(1);
});
