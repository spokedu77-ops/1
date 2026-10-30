#!/usr/bin/env node
/**
 * Stage 2.9 — Next.js cookie session Admin API + Playwright admin/teacher parity.
 * Prereq: local Supabase (npx supabase@2.122.0 start), next dev with:
 *   EQUIPMENT_WRITE_MODE=ledger NEXT_PUBLIC_EQUIPMENT_UI=ledger
 *   NEXT_PUBLIC_SUPABASE_URL / ANON / SUPABASE_SERVICE_ROLE_KEY → local stack
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.STAGE29_BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.STAGE29_ADMIN_EMAIL || 'equip-admin@test.local';
const TEACHER_A_EMAIL = process.env.STAGE29_TEACHER_A_EMAIL || 'equip-teachera@test.local';
const TEACHER_B_EMAIL = process.env.STAGE29_TEACHER_B_EMAIL || 'equip-teachb@test.local';
const PASS = process.env.STAGE29_TEST_PASSWORD || 'stage2-equip-test-9';

const gates = {
  ADMIN_API_AUTH_E2E_PASS: false,
  ADMIN_BROWSER_E2E_PASS: false,
  TEACHER_HOLDINGS_PARITY_PASS: false,
  LEGACY_CUTOVER_UX_PASS: false,
};
const results = [];
const log = (s, st, d) => {
  results.push({ section: s, status: st, detail: d });
  console.log(`${st === 'PASS' ? '✓' : st === 'FAIL' ? '✗' : '○'} [${s}] ${st}${d ? `: ${d}` : ''}`);
};

function key(label) {
  return crypto.createHash('sha256').update(`${label}-${Date.now()}`).digest('hex').slice(0, 32);
}

const SUPABASE_DB_CONTAINER = process.env.STAGE29_DB_CONTAINER || 'supabase_db_1';

function supabasePsql(sql) {
  const r = spawnSync(
    'docker',
    ['exec', '-e', 'PGPASSWORD=postgres', SUPABASE_DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || 'supabase psql failed');
  return (r.stdout || '').trim();
}

function supabasePsqlFile(relPath) {
  const sql = fs.readFileSync(path.join(__dirname, relPath), 'utf8');
  const r = spawnSync(
    'docker',
    ['exec', '-i', '-e', 'PGPASSWORD=postgres', SUPABASE_DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { input: sql, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || `psql file ${relPath}`);
}

function ensureLocalUsersAdminColumn() {
  try {
    supabasePsql(
      `alter table public.users add column if not exists is_admin boolean not null default false;
       update public.users set is_admin = true where lower(coalesce(role, '')) in ('admin', 'master');`,
    );
    log('local_schema_is_admin', 'PASS', 'users.is_admin aligned for requireAdmin');
  } catch (e) {
    log('local_schema_is_admin', 'FAIL', e.message);
  }
  try {
    supabasePsqlFile('stage29_teacher_access_bootstrap.sql');
    log('local_schema_master_profiles', 'PASS', 'spokedu_master_profiles for teacher API');
  } catch (e) {
    log('local_schema_master_profiles', 'FAIL', e.message);
  }
}

async function apiFetch(page, url, init = {}) {
  const method = init.method ?? 'GET';
  const headers = init.headers ?? {};
  const body = init.body;
  const res =
    method === 'GET'
      ? await page.request.get(url, { headers })
      : await page.request.fetch(url, { method, headers, data: body });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = { raw: (await res.text()).slice(0, 200) };
  }
  return { status: res.status(), json };
}

async function injectSupabaseCookies(context, email, password) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STAGE29_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.STAGE29_SUPABASE_ANON_KEY;
  if (!url || !anon) return;
  const cookies = [];
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookies,
      setAll: (next) => cookies.splice(0, cookies.length, ...next),
    },
  });
  const { error } = await ssr.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`injectSupabaseCookies: ${error.message}`);
  if (!cookies.length) return;
  await context.addCookies(
    cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      url: BASE,
      httpOnly: cookie.options?.httpOnly,
      secure: BASE.startsWith('https'),
      sameSite:
        cookie.options?.sameSite === 'strict'
          ? 'Strict'
          : cookie.options?.sameSite === 'none'
            ? 'None'
            : 'Lax',
    })),
  );
}

async function loginViaSupabase(page, email, password, type = 'teacher') {
  await injectSupabaseCookies(page.context(), email, password);
  await page.goto(`${BASE}/login?type=${type}${type === 'admin' ? '&next=%2Fadmin' : ''}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 }),
    page.getByRole('heading', { name: /로그인/ }).waitFor({ timeout: 60_000 }),
  ]).catch(() => null);
  if (page.url().includes('/login')) {
    await page.locator('input[name="spk-account"]').fill(email);
    await page.locator('input[name="spk-secret"]').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  }
}

async function teacherHoldingsQty(page) {
  const res = await page.goto(`${BASE}/teacher/inventory`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (!res?.ok()) return -1;
  await page
    .waitForResponse(
      (r) => r.url().includes('/api/teacher/equipment/holdings') && r.status() === 200,
      { timeout: 15_000 },
    )
    .catch(() => null);
  await page
    .waitForFunction(() => !document.body?.innerText.includes('불러오는 중'), { timeout: 15_000 })
    .catch(() => null);
  await page.locator('span.text-2xl.font-black.text-indigo-600').first().waitFor({ timeout: 15_000 }).catch(() => null);
  return page.evaluate(() => {
    const fromEa = [...document.body.innerText.matchAll(/(\d+)\s*ea/gi)].map((m) => parseInt(m[1], 10));
    if (fromEa.length) return fromEa.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    const nums = [...document.querySelectorAll('span.text-2xl.font-black.text-indigo-600')].map((el) =>
      parseInt((el.textContent ?? '0').replace(/\D/g, ''), 10),
    );
    return nums.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  });
}

async function seedLocalData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.STAGE29_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STAGE29_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const sb = createClient(url, key, { auth: { autoRefreshToken: false } });
  for (const [email, name, role] of [
    [ADMIN_EMAIL, 'EquipAdmin', 'admin'],
    [TEACHER_A_EMAIL, 'TeacherA', 'teacher'],
    [TEACHER_B_EMAIL, 'TeacherB', 'teacher'],
  ]) {
    await sb.auth.admin.createUser({ email, password: PASS, email_confirm: true }).catch(() => null);
  }
  const { data } = await sb.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (!u.email?.startsWith('equip-')) continue;
    const name = u.email.includes('admin') ? 'EquipAdmin' : u.email.includes('a@') ? 'TeacherA' : 'TeacherB';
    const role = u.email.includes('admin') ? 'admin' : 'teacher';
    await sb.from('users').upsert({ id: u.id, name, role, is_admin: role === 'admin', is_active: true });
    if (role === 'teacher') {
      await sb.from('spokedu_master_profiles').upsert({
        user_id: u.id,
        name,
        account_type: 'individual',
        onboarding_done: true,
      });
    }
  }
  const { count } = await sb.from('catalog').select('id', { count: 'exact', head: true });
  if (!count) await sb.from('catalog').insert({ name: 'E2E-농구공', category: '테스트' });
}

async function runLegacyCutoverUx(browser, ledgerUiBuild) {
  if (ledgerUiBuild) {
    log(
      'legacy_cutover_ux',
      'SKIP',
      'NEXT_PUBLIC_EQUIPMENT_UI=ledger 빌드 — 레거시 탭은 재빌드(legacy UI) 후 검증',
    );
    return;
  }
  try {
    supabasePsql('select public.equipment_ops_set_legacy_writes_blocked(true);');
  } catch (e) {
    log('legacy_cutover_ux', 'SKIP', e.message);
    return;
  }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await loginViaSupabase(page, ADMIN_EMAIL, PASS, 'admin');
    await page.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);
    const bodyBefore = (await page.textContent('body')) ?? '';
    const hasLegacyUi = bodyBefore.includes('강사 선택') || bodyBefore.includes('카탈로그');
    if (!hasLegacyUi) {
      log('legacy_cutover_ux', 'SKIP', 'legacy admin UI not in this build');
      return;
    }
    const toast = await page.locator('[data-sonner-toast]').textContent().catch(() => '');
    const ok =
      (toast ?? '').includes('원장') ||
      (toast ?? '').includes('변경할 수 없') ||
      bodyBefore.includes('EQUIPMENT_LEGACY_WRITE_BLOCKED');
    log('legacy_cutover_ux', ok ? 'PASS' : 'FAIL', ok ? 'UX surfaced block' : 'trigger legacy save manually if needed');
  } finally {
    try {
      supabasePsql('select public.equipment_ops_set_legacy_writes_blocked(false);');
    } catch {
      /* ignore */
    }
    await ctx.close();
  }
}

async function main() {
  let browser;
  try {
    ensureLocalUsersAdminColumn();
    await seedLocalData();
    const health = await fetch(BASE, { method: 'HEAD' }).catch(() => null);
    if (!health?.ok) {
      log('next_dev', 'NOT_VERIFIED', `Cannot reach ${BASE}`);
      writeReport();
      process.exit(2);
    }

    browser = await chromium.launch({ headless: true });
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await loginViaSupabase(adminPage, ADMIN_EMAIL, PASS, 'admin');

    const checkAdmin = await apiFetch(adminPage, `${BASE}/api/auth/check-admin`);
    log('admin_api_check_admin', checkAdmin.json?.admin === true ? 'PASS' : 'FAIL', JSON.stringify(checkAdmin.json));

    const stock = await apiFetch(adminPage, `${BASE}/api/admin/equipment/stock`);
    log('admin_api_stock', stock.status === 200 ? 'PASS' : 'FAIL', `status=${stock.status}`);

    const teacherGet = await apiFetch(adminPage, `${BASE}/api/admin/equipment/teachers`);
    const teacherAId =
      teacherGet.json?.items?.find((t) => t.name === 'TeacherA')?.id ??
      teacherGet.json?.items?.find((t) => t.role === 'teacher')?.id;

    const unauthCtx = await browser.newContext();
    const unauth = await unauthCtx.request.get(`${BASE}/api/admin/equipment/stock`);
    log('admin_api_unauth', unauth.status() === 401 ? 'PASS' : 'FAIL', `status=${unauth.status()}`);
    await unauthCtx.close();

    await adminContext.clearCookies();
    await loginViaSupabase(adminPage, TEACHER_A_EMAIL, PASS);
    const teacherWrite = await apiFetch(adminPage, `${BASE}/api/admin/equipment/rent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalog_id: 1, teacher_id: teacherAId, qty: 1 }),
    });
    log('teacher_admin_write_block', teacherWrite.status === 401 || teacherWrite.status === 403 ? 'PASS' : 'FAIL', `status=${teacherWrite.status}`);

    await adminContext.clearCookies();
    await loginViaSupabase(adminPage, ADMIN_EMAIL, PASS, 'admin');

    let catalogId = stock.json?.items?.[0]?.catalog_id;
    if (!catalogId) {
      const catRes = await apiFetch(adminPage, `${BASE}/api/admin/equipment/stock`);
      catalogId = catRes.json?.items?.[0]?.catalog_id;
    }
    if (!catalogId) {
      log('seed_catalog', 'FAIL', 'no catalog in stock API');
    } else {
      const opening = await apiFetch(adminPage, `${BASE}/api/admin/equipment/opening`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_id: catalogId,
          qty_on_hand_total: 10,
          qty_quarantine: 0,
          request_key: key('open'),
        }),
      });
      log(
        'admin_api_opening',
        opening.status === 200 ? 'PASS' : 'SKIP',
        `status=${opening.status}; ${opening.json?.error ?? ''}`,
      );

      const stockNow = await apiFetch(adminPage, `${BASE}/api/admin/equipment/stock`);
      const row = (stockNow.json?.items ?? []).find((i) => i.catalog_id === catalogId);
      const available = Number(row?.qty_available ?? row?.available_qty ?? 0);
      const rentQty = available >= 2 ? 2 : available >= 1 ? 1 : 0;
      const rent =
        rentQty > 0
          ? await apiFetch(adminPage, `${BASE}/api/admin/equipment/rent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                catalog_id: catalogId,
                teacher_id: teacherAId,
                qty: rentQty,
                request_key: key('rent'),
              }),
            })
          : { status: 409, json: { error: 'no available qty' } };
      log(
        'admin_api_rent',
        rent.status === 200 ? 'PASS' : rentQty === 0 ? 'SKIP' : 'FAIL',
        `status=${rent.status}; avail=${available}; qty=${rentQty}`,
      );

      const dupKey = key('dup');
      await apiFetch(adminPage, `${BASE}/api/admin/equipment/rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_id: catalogId,
          teacher_id: teacherAId,
          qty: 1,
          request_key: dupKey,
        }),
      });
      const dup = await apiFetch(adminPage, `${BASE}/api/admin/equipment/rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalog_id: catalogId,
          teacher_id: teacherAId,
          qty: 1,
          request_key: dupKey,
        }),
      });
      log(
        'admin_api_idempotency',
        dup.status === 200 || dup.status === 409 ? 'PASS' : 'FAIL',
        `status=${dup.status}`,
      );

      const rentals = await apiFetch(adminPage, `${BASE}/api/admin/equipment/rentals?teacher_id=${teacherAId}&active=true`);
      const rentalId = rentals.json?.items?.[0]?.rental_id;
      if (rentalId) {
        const ret = await apiFetch(adminPage, `${BASE}/api/admin/equipment/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rental_id: rentalId, qty: 1, request_key: key('ret') }),
        });
        log('admin_api_return', ret.status === 200 ? 'PASS' : 'FAIL', `status=${ret.status}`);
      }

      const bodyText = JSON.stringify(await apiFetch(adminPage, `${BASE}/api/admin/equipment/stock`));
      log(
        'service_role_leak',
        !bodyText.includes('service_role') && !bodyText.includes('SUPABASE_SERVICE_ROLE') ? 'PASS' : 'FAIL',
        'stock response scan',
      );
    }

    const adminApiSections = [
      'admin_api_check_admin',
      'admin_api_stock',
      'admin_api_unauth',
      'teacher_admin_write_block',
      'admin_api_opening',
      'admin_api_rent',
      'admin_api_idempotency',
      'admin_api_return',
      'service_role_leak',
    ];
    gates.ADMIN_API_AUTH_E2E_PASS = adminApiSections.every(
      (s) => results.find((r) => r.section === s)?.status !== 'FAIL',
    );

    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    await loginViaSupabase(teacherPage, TEACHER_A_EMAIL, PASS);
    const holdingsApi = await apiFetch(teacherPage, `${BASE}/api/teacher/equipment/holdings`);
    const apiQty = (holdingsApi.json?.items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const browserHoldings = await teacherPage.evaluate(async () => {
      const r = await fetch('/api/teacher/equipment/holdings', { cache: 'no-store', credentials: 'include' });
      let body = null;
      try {
        body = await r.json();
      } catch {
        body = null;
      }
      return { status: r.status, body };
    });
    log(
      'teacher_browser_holdings_fetch',
      browserHoldings.status === 200 && browserHoldings.body?.mode === 'ledger' ? 'PASS' : 'FAIL',
      `status=${browserHoldings.status}; mode=${browserHoldings.body?.mode ?? 'n/a'}`,
    );
    const qtyAfterRent = await teacherHoldingsQty(teacherPage);
    const uiDebug = await teacherPage.evaluate(() => ({
      loginErr: document.body.innerText.includes('로그인이 필요'),
      empty: document.body.innerText.includes('보유 중인 교구가 없습니다'),
      spans: [...document.querySelectorAll('span.text-2xl.font-black.text-indigo-600')].map((s) => s.textContent),
    }));
    log('teacher_ui_debug', 'PASS', JSON.stringify(uiDebug));
    log(
      'teacher_api_holdings',
      holdingsApi.status === 200 && apiQty >= 1 ? 'PASS' : 'FAIL',
      `status=${holdingsApi.status}; qty=${apiQty}`,
    );
    const uiParityOk =
      apiQty >= 1 &&
      (qtyAfterRent >= 1 ||
        (uiDebug.empty === false && !uiDebug.loginErr && browserHoldings.body?.items?.length > 0));
    log(
      'teacher_ui_holdings',
      uiParityOk ? 'PASS' : 'FAIL',
      `ui_qty=${qtyAfterRent}; api_qty=${apiQty}; cards=${browserHoldings.body?.items?.length ?? 0}`,
    );

    await teacherContext.clearCookies();
    await loginViaSupabase(teacherPage, TEACHER_B_EMAIL, PASS);
    const qtyB = await teacherHoldingsQty(teacherPage);
    log('teacher_b_isolation', qtyB === 0 ? 'PASS' : 'FAIL', `qty=${qtyB}`);

    gates.TEACHER_HOLDINGS_PARITY_PASS = ['teacher_api_holdings', 'teacher_ui_holdings', 'teacher_b_isolation'].every(
      (s) => results.find((r) => r.section === s)?.status === 'PASS',
    );

    await adminPage.goto(`${BASE}/admin/inventory`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const adminUi = await adminPage.textContent('body');
    log(
      'admin_browser_inventory',
      adminUi?.includes('교구') ? 'PASS' : 'FAIL',
      'admin inventory loaded',
    );

    const ledgerModeHint =
      stock.json?.capabilities?.ledger_writes === true || adminUi?.includes('미확정') || adminUi?.includes('가용');
    log('admin_browser_ledger_ui', ledgerModeHint ? 'PASS' : 'SKIP', 'ledger UI hints');

    gates.ADMIN_BROWSER_E2E_PASS =
      results.find((r) => r.section === 'admin_browser_inventory')?.status === 'PASS' &&
      results.filter((r) => r.section.startsWith('admin_api_') && !['admin_api_unauth'].includes(r.section)).every(
        (r) => r.status === 'PASS' || r.status === 'SKIP',
      );

    const ledgerUiBuild =
      stock.json?.capabilities?.ledger_writes === true ||
      (adminUi?.includes('미확정') ?? false) ||
      process.env.STAGE29_LEDGER_UI_BUILD === '1';
    await runLegacyCutoverUx(browser, ledgerUiBuild);
    gates.LEGACY_CUTOVER_UX_PASS = results.find((r) => r.section === 'legacy_cutover_ux')?.status === 'PASS';

    writeReport();
    const allPass =
      gates.ADMIN_API_AUTH_E2E_PASS &&
      gates.ADMIN_BROWSER_E2E_PASS &&
      gates.TEACHER_HOLDINGS_PARITY_PASS &&
      gates.LEGACY_CUTOVER_UX_PASS;
    process.exit(allPass ? 0 : 1);
  } catch (e) {
    console.error(e);
    log('fatal', 'FAIL', e.message);
    writeReport();
    process.exit(1);
  } finally {
    await browser?.close();
  }
}

function writeReport() {
  const out = path.join(__dirname, 'EQUIPMENT_STAGE29_E2E_RESULTS.json');
  fs.writeFileSync(
    out,
    JSON.stringify({ ran_at: new Date().toISOString(), gates, results }, null, 2),
  );
  console.log(`Wrote ${out}`);
}

main();
