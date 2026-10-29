import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import nextEnv from '@next/env';
import { createServerClient } from '@supabase/ssr';
import { applyMasterStorageState } from './lib/spokedu-master-auth-state.mjs';

// Render the real local routes. Only API responses are fixtures; no DB writes.
const BASE = process.argv[2] ?? 'http://localhost:3000';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Local QA only');
const OUTPUT = 'artifacts/spokedu-lab-operational-context';
const results = [];
await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
let freshStorage;
let activePage;
try {
  if (process.argv.includes('--qa-login')) {
    nextEnv.loadEnvConfig(process.cwd());
    assert(process.env.SPM_QA_PASSWORD, 'SPM_QA_PASSWORD is required');
    const cookies = new Map();
    const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => [...cookies.values()], setAll: values => values.forEach(c => cookies.set(c.name, c)) },
    });
    const { error } = await auth.auth.signInWithPassword({ email: 'spm.qa.lite@spokedu.test', password: process.env.SPM_QA_PASSWORD });
    assert(!error, `QA login failed (${error?.status ?? 'unknown'})`);
    freshStorage = { origins: [], cookies: [...cookies.values()].filter(c => c.value).map(c => ({
      name: c.name, value: c.value, domain: new URL(BASE).hostname, path: '/', expires: -1,
      httpOnly: false, secure: false, sameSite: 'Lax',
    })) };
  }
  for (const plan of ['free', 'lite', 'premium']) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, ...(freshStorage ? { storageState: freshStorage } : {}) });
      if (!freshStorage) await applyMasterStorageState(context);
      const cookie = (await context.cookies()).filter(c => /^sb-.*-auth-token(?:\.\d+)?$/.test(c.name))
        .sort((a, b) => a.name.localeCompare(b.name)).map(c => c.value).join('');
      assert(cookie, 'No QA auth cookie. Use --qa-login or supply a valid SPOKEDU_MASTER_STORAGE_STATE.');
      const session = JSON.parse(cookie.startsWith('base64-') ? Buffer.from(cookie.slice(7), 'base64url').toString() : cookie);
      const OWNER = session.user.id;
      const page = await context.newPage();
      activePage = page;
      const errors = [];
      page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
      page.on('console', (message) => {
        if (message.type() === 'error' && /useOperationalData|OperationalDataProvider/.test(message.text())) errors.push(message.text());
      });
      const counts = { students: 0, sessions: 0 };
      const paid = plan !== 'free';
      await page.route('**/api/spokedu-master/**', async (route) => {
        const path = new URL(route.request().url()).pathname.split('/').at(-1);
        if (path === 'funnel-events' || path === 'client-errors') return route.fulfill({ json: { ok: true } });
        assert.equal(route.request().method(), 'GET', `Unexpected mutation: ${path}`);
        let body = { data: [] };
        if (path === 'access') body = {
          ok: true, allowed: true, authenticated: true, userId: OWNER,
          onboardingDone: true, plan, subscriptionStatus: paid ? 'active' : 'none',
          currentPeriodEnd: null, cancelAtPeriodEnd: false, isAdmin: false, isCenterOrTeam: false,
          canBrowseLibrary: true, canUseLibrary: paid, freePreviewProgramIds: [],
          canUseClassTools: true, canUseAttendance: paid, canUseRecords: paid, canUseSpomove: plan === 'premium',
        };
        if (path === 'subscription') body = { plan, status: paid ? 'active' : 'none', userId: OWNER };
        if (path === 'profile') body = { data: null };
        if (path === 'programs') body = { data: Array.from({ length: 4 }, (_, i) => ({
          id: String(90001 + i), title: `QA 놀이체육 ${i + 1}`, category: '협동', grade: '초등', space: '체육관',
          description: '로컬 회귀 검증용 수업 자료', steps: ['준비하기', '함께 움직이기'], equipment: ['공'], tags: [],
          colors: ['#fff', '#eee', '#ddd', '#ccc'], isPro: false, isNew: false, isHot: true, homeSortOrder: i + 1,
        })) };
        if (path === 'students') { counts.students++; body = { data: [{ id: 'qa-student', name: 'QA 학생', meta: {}, legacyId: null }] }; }
        if (path === 'sessions') { counts.sessions++; body = { data: {
          classes: [{ id: 'qa-class', name: 'QA 수업반', studentIds: ['qa-student'] }], sessions: [],
        } }; }
        await route.fulfill({ json: body });
      });
      // Asset packs are read by the browser directly; keep this test offline from Supabase.
      await page.route('**/rest/v1/**', (route) => route.fulfill({ json: [] }));
      await page.goto(`${BASE}/spokedu-lab/${paid ? 'programs' : 'dashboard'}`, { waitUntil: 'networkidle' });
      assert.deepEqual(counts, { students: 0, sessions: 0 }, 'No operational prefetch');
      if (paid) {
        const nav = page.locator(width === 390 ? '[data-spm-tabbar]' : '[data-spm-desktop-nav]');
        const role = width === 390 ? 'button' : 'link';
        const manage = nav.getByRole(role, { name: '수업 관리', exact: true }).first();
        const home = page.getByRole('link', { name: 'SPOKEDU LAB 홈', exact: true });
        await manage.click();
        await page.locator('[data-manage-workspace]').waitFor();
        await page.locator('[data-manage-cal-grid]').waitFor();
        assert.deepEqual(counts, { students: 1, sessions: 1 }, 'First manage entry fetches each list once');
        await page.screenshot({ path: `${OUTPUT}/${plan}-${width}-manage.png`, fullPage: true });
        await home.click();
        await page.locator('[data-dashboard-root]').waitFor();
        await page.screenshot({ path: `${OUTPUT}/${plan}-${width}-dashboard.png`, fullPage: true });
        await manage.click();
        await page.locator('[data-manage-workspace]').waitFor();
        assert.deepEqual(counts, { students: 1, sessions: 1 }, 'Re-entry must reuse the 60s cache');
      } else {
        await page.locator('[data-dashboard-root]').waitFor({ timeout: 30_000 });
        await page.screenshot({ path: `${OUTPUT}/${plan}-${width}-dashboard.png`, fullPage: true });
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
        assert.deepEqual(counts, { students: 0, sessions: 0 });
        for (const [path, selector] of [
          ['library', '[data-library-state="ready"]'],
          ['class-tools', '[data-class-tools-content]'],
          ['profile', 'main h1'],
        ]) {
          await page.goto(`${BASE}/spokedu-lab/${path}`, { waitUntil: 'networkidle' });
          await page.locator(selector).waitFor();
          assert.deepEqual(counts, { students: 0, sessions: 0 }, `Free ${path} must not fetch operational data`);
        }
      }
      assert.deepEqual(errors, [], 'Runtime errors');
      results.push({ plan, width, counts, reentryAdditionalGets: { students: 0, sessions: 0 },
        additionalFreeConsumers: paid ? [] : ['library', 'class-tools', 'profile'], errors });
      await context.close();
    }
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: `${OUTPUT}/failure.png`, fullPage: true });
    console.error((await activePage.locator('body').innerText()).slice(0, 3000));
  }
  throw error;
} finally {
  await browser.close();
  await writeFile(`${OUTPUT}/results.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
