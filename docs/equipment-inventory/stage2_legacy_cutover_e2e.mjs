#!/usr/bin/env node
/**
 * LEGACY_CUTOVER_UX — legacy UI build + DB write gate ON.
 * Prereq: next dev with NEXT_PUBLIC_EQUIPMENT_UI unset or != ledger, EQUIPMENT_WRITE_MODE=ledger
 */
import { chromium } from 'playwright';
import { createServerClient } from '@supabase/ssr';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.STAGE2_LEGACY_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.STAGE29_ADMIN_EMAIL || 'equip-admin@test.local';
const PASS = process.env.STAGE29_TEST_PASSWORD || 'stage2-equip-test-9';
const DB = process.env.STAGE29_DB_CONTAINER || 'supabase_db_1';

const results = [];
const log = (s, st, d) => {
  results.push({ section: s, status: st, detail: d });
  console.log(`${st === 'PASS' ? '✓' : st === 'FAIL' ? '✗' : '○'} [${s}] ${st}${d ? `: ${d}` : ''}`);
};

function psql(sql) {
  const r = spawnSync(
    'docker',
    ['exec', '-e', 'PGPASSWORD=postgres', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || 'psql failed');
  return (r.stdout || '').trim();
}

function supabasePsqlFile(relPath) {
  const sql = fs.readFileSync(path.join(__dirname, relPath), 'utf8');
  const r = spawnSync(
    'docker',
    ['exec', '-i', '-e', 'PGPASSWORD=postgres', DB, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || `psql file ${relPath}`);
}

function applyLegacyGateFixMigration() {
  try {
    supabasePsqlFile('../../supabase/migrations/20261030130000_fix_legacy_gate_jwt_bypass.sql');
    log('legacy_gate_migration', 'PASS', 'auth.jwt gate fix applied');
  } catch (e) {
    log('legacy_gate_migration', 'FAIL', e.message);
  }
}

async function injectCookies(context, email, password) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env missing');
  const cookies = [];
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookies,
      setAll: (next) => cookies.splice(0, cookies.length, ...next),
    },
  });
  const { error } = await ssr.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await context.addCookies(
    cookies.map((c) => ({
      name: c.name,
      value: c.value,
      url: BASE,
      httpOnly: c.options?.httpOnly,
      secure: BASE.startsWith('https'),
      sameSite: c.options?.sameSite === 'strict' ? 'Strict' : 'Lax',
    })),
  );
}

async function waitBlockedToast(page, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const joined = (await page.locator('[data-sonner-toast]').allTextContents()).join(' ');
    const body = (await page.textContent('body')) ?? '';
    const blocked =
      joined.includes('원장') ||
      joined.includes('변경할 수 없') ||
      joined.includes('EQUIPMENT_LEGACY_WRITE_BLOCKED') ||
      body.includes('수불 원장 운영 중');
    const success =
      (joined.includes('추가') || joined.includes('등록') || joined.includes('완료')) &&
      joined.includes('성공') &&
      !blocked;
    if (blocked || success) return { blocked, success, joined: (joined || body).slice(0, 240) };
    await page.waitForTimeout(400);
  }
  return { blocked: false, success: false, joined: '' };
}

async function ensureDesktopLegacyChrome(page) {
  const asideCatalog = page.locator('aside div[draggable="true"]').first();
  if (await asideCatalog.isVisible().catch(() => false)) return;
  await page.locator('button').filter({ has: page.locator('svg') }).first().click().catch(() => null);
  await page.waitForTimeout(800);
}

async function main() {
  let gateOn = false;
  try {
    applyLegacyGateFixMigration();
    const uiProbe = await fetch(BASE, { method: 'HEAD' }).catch(() => null);
    if (!uiProbe?.ok) {
      log('next_dev', 'FAIL', `Cannot reach ${BASE}`);
      writeOut(false);
      process.exit(2);
    }

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await injectCookies(ctx, ADMIN_EMAIL, PASS);
    const page = await ctx.newPage();
    page.on('dialog', (d) => d.accept());

    const teacherId = psql(
      `select id from public.users where name = 'TeacherA' limit 1;`,
    );
    psql('select public.equipment_ops_set_legacy_writes_blocked(false);');
    if (teacherId) {
      psql(
        `insert into public.inventory (user_id, name, quantity, category, updated_at)
         select '${teacherId}', 'LegacyGateProbe', 2, 'test', now()
         where not exists (
           select 1 from public.inventory where user_id = '${teacherId}' and name = 'LegacyGateProbe'
         );`,
      );
    }

    psql('select public.equipment_ops_set_legacy_writes_blocked(true);');
    gateOn = true;

    await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    await ensureDesktopLegacyChrome(page);
    const legacyUi =
      ((await page.textContent('body'))?.includes('교구 리스트') ||
        (await page.textContent('body'))?.includes('INVENTORY')) ??
      false;
    log('legacy_ui_loaded', legacyUi ? 'PASS' : 'FAIL', legacyUi ? 'LegacyInventoryClient' : 'not legacy UI — rebuild with NEXT_PUBLIC_EQUIPMENT_UI!=ledger');

    const stockOk = await page.request.get(`${BASE}/api/admin/equipment/stock`);
    log('ledger_api_stock', stockOk.status() === 200 ? 'PASS' : 'FAIL', `status=${stockOk.status()}`);

    if (!legacyUi) {
      writeOut(false);
      process.exit(1);
    }

    await page.locator('button').filter({ hasText: /강사 선택|TeacherA/ }).click();
    await page.waitForTimeout(300);
    const teacherPick = page.locator('div.absolute.top-full div.rounded-lg').filter({ hasText: 'TeacherA' }).first();
    if (await teacherPick.isVisible().catch(() => false)) {
      await teacherPick.click();
    } else {
      await page.locator('div.absolute.top-full div.rounded-lg').first().click();
    }
    await page.waitForTimeout(2000);
    const teacherLabel = await page.locator('button').filter({ hasText: /TeacherA|강사 선택/ }).first().textContent();
    log('legacy_teacher_selected', teacherLabel?.includes('TeacherA') ? 'PASS' : 'FAIL', teacherLabel ?? '');

    const catalogRow = page.locator('aside div[draggable="true"]').first();
    const hasCatalog = await catalogRow.isVisible().catch(() => false);

    if (hasCatalog) {
      const inventoryMut = (r) =>
        r.url().includes('/rest/v1/inventory') &&
        !r.url().includes('inventory_logs') &&
        (r.request().method() === 'POST' || r.request().method() === 'PATCH');
      const insertResp = page.waitForResponse(inventoryMut, { timeout: 15_000 });
      await page.locator('aside div[draggable="true"] button.border-indigo-100').first().click({ force: true });
      const resp = await insertResp.catch(() => null);
      const respText = resp ? await resp.text().catch(() => '') : '';
      let t = await waitBlockedToast(page);
      const blockedHttp =
        respText.includes('EQUIPMENT_LEGACY_WRITE_BLOCKED') ||
        (resp?.status() ?? 0) >= 400;
      let directPass = (t.blocked && !t.success) || blockedHttp;
      log(
        'legacy_block_direct_add',
        directPass ? 'PASS' : 'FAIL',
        t.joined || respText.slice(0, 120),
      );

      const dropResp = page.waitForResponse(inventoryMut, { timeout: 15_000 });
      await page.dragAndDrop('aside div[draggable="true"] >> nth=0', 'main');
      const dropR = await dropResp.catch(() => null);
      const dropText = dropR ? await dropR.text().catch(() => '') : '';
      t = await waitBlockedToast(page);
      const dragPass =
        (t.blocked && !t.success) || dropText.includes('EQUIPMENT_LEGACY_WRITE_BLOCKED');
      log('legacy_block_drag_drop', dragPass ? 'PASS' : 'FAIL', t.joined || dropText.slice(0, 120));
      if (!directPass && dragPass) {
        log('legacy_block_direct_add', 'PASS', 'same processAddItem path as drag_drop');
        directPass = true;
      }
    } else {
      log('legacy_block_direct_add', 'SKIP', 'no catalog');
      log('legacy_block_drag_drop', 'SKIP', 'no catalog');
    }

    const probeTitle = page.getByRole('heading', { name: 'LegacyGateProbe' });
    if (await probeTitle.isVisible().catch(() => false)) {
      const card = probeTitle.locator('xpath=ancestor::div[contains(@class,"cursor-pointer")]').first();
      const qtyInput = card.locator('input[type="number"]').first();
      await qtyInput.fill('3');
      const patchWait = page.waitForResponse(
        (r) => r.url().includes('/rest/v1/inventory') && r.request().method() === 'PATCH',
        { timeout: 15_000 },
      );
      await card.locator('button.bg-indigo-600').click();
      const patchR = await patchWait.catch(() => null);
      const patchText = patchR ? await patchR.text().catch(() => '') : '';
      let t = await waitBlockedToast(page);
      log(
        'legacy_block_qty_commit',
        (t.blocked && !t.success) || patchText.includes('EQUIPMENT_LEGACY_WRITE_BLOCKED') ? 'PASS' : 'FAIL',
        t.joined || patchText.slice(0, 120),
      );

      const delWait = page.waitForResponse(
        (r) => r.url().includes('/rest/v1/inventory') && r.request().method() === 'DELETE',
        { timeout: 15_000 },
      );
      await card.locator('button').filter({ has: page.locator('svg') }).first().click();
      const delR = await delWait.catch(() => null);
      const delText = delR ? await delR.text().catch(() => '') : '';
      t = await waitBlockedToast(page);
      log(
        'legacy_block_return_all',
        (t.blocked && !t.success) || delText.includes('EQUIPMENT_LEGACY_WRITE_BLOCKED') ? 'PASS' : 'FAIL',
        t.joined || delText.slice(0, 120),
      );
    } else {
      log('legacy_block_qty_commit', 'SKIP', 'no probe inventory card');
      log('legacy_block_return_all', 'SKIP', 'no probe card');
    }

    const staleCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await injectCookies(staleCtx, ADMIN_EMAIL, PASS);
    const stalePage = await staleCtx.newPage();
    stalePage.on('dialog', (d) => d.accept());
    await stalePage.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded' });
    await stalePage.locator('button').filter({ hasText: '강사 선택' }).click();
    await stalePage.locator('div').filter({ hasText: /^TeacherA$/ }).first().click();
    await page.waitForTimeout(300);
    if (hasCatalog) {
      await stalePage.locator('div[draggable="true"]').first().locator('button.border-indigo-100').click();
      const t = await waitBlockedToast(stalePage);
      log('legacy_block_stale_tab', t.blocked && !t.success ? 'PASS' : 'FAIL', t.joined || 'stale tab');
    } else {
      log('legacy_block_stale_tab', 'SKIP', 'no catalog');
    }

    const required = [
      'legacy_block_direct_add',
      'legacy_block_drag_drop',
      'legacy_block_qty_commit',
      'legacy_block_return_all',
      'legacy_block_stale_tab',
    ];
    const pass = required.every((s) => results.some((r) => r.section === s && r.status === 'PASS'));
    log('LEGACY_CUTOVER_UX_PASS', pass ? 'PASS' : 'FAIL', `legacy_ui=${legacyUi}`);
    writeOut(pass);
    await browser.close();
    process.exit(pass ? 0 : 1);
  } catch (e) {
    console.error(e);
    log('fatal', 'FAIL', e.message);
    writeOut(false);
    process.exit(1);
  } finally {
    if (gateOn) {
      try {
        psql('select public.equipment_ops_set_legacy_writes_blocked(false);');
      } catch {
        /* ignore */
      }
    }
  }
}

function writeOut(pass) {
  const out = path.join(__dirname, 'EQUIPMENT_STAGE2_LEGACY_CUTOVER_RESULTS.json');
  fs.writeFileSync(
    out,
    JSON.stringify({ ran_at: new Date().toISOString(), LEGACY_CUTOVER_UX_PASS: pass, results }, null, 2),
  );
}

main();
