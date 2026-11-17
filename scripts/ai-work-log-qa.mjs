import nextEnv from '@next/env';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
nextEnv.loadEnvConfig(process.cwd());
const base = 'http://127.0.0.1:3000';
const project = `QA-update-log-${randomUUID()}`;
const workKey = `qa-update-log-${randomUUID()}`;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, 'mwgvserdyflsqyhcqecp.supabase.co');
const report = { project, workKey, checks: [], pageErrors: [], screenshots: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const check = (name, condition) => { assert(condition, name); report.checks.push({ name, result: 'PASS' }); };
await mkdir('artifacts/update-log', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on('pageerror', e => report.pageErrors.push(e.message));
  await page.goto(`${base}/login?next=%2Fadmin`);
  await page.locator('[name=spk-account]').fill('spm.qa.admin@spokedu.test');
  await page.locator('[name=spk-secret]').fill(process.env.SPM_QA_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url => url.pathname === '/admin', { timeout: 60000 });
  const access = await (await context.request.get(`${base}/api/spokedu-master/access`)).json();
  check('admin access and capability', access.isAdmin && access.canUseLibrary);
  await page.getByRole('link', { name: '업데이트 로그', exact: true }).click();
  await page.getByRole('heading', { name: '업데이트 로그', exact: true }).waitFor();
  await page.getByText('작업 기록을 불러오는 중입니다.', { exact: true }).waitFor({ state: 'hidden' });
  const api = `${base}/api/admin/update-log`;
  const payload = { workKey, project, summary: 'QA 한 문장 작업 기록', status: 'reported', sourceType: 'codex' };
  let response = await context.request.post(api, { data: payload });
  check('admin API insert', response.status() === 201);
  const first = await response.json();
  check('work key and source preserved', first.event.workKey === workKey && first.event.sourceType === 'codex');
  const duplicates = await Promise.all(Array.from({ length: 3 }, () => context.request.post(api, { data: payload })));
  for (const duplicate of duplicates) { check('duplicate suppressed', duplicate.status() === 200 && (await duplicate.json()).duplicate); }
  response = await context.request.post(api, { data: { ...payload, status: 'verified' } });
  check('verified requires evidence', response.status() === 400);
  response = await context.request.post(api, { data: { ...payload, project: project + '-other' } });
  check('existing key project conflict', response.status() === 409);
  response = await context.request.post(api, { headers: { origin: 'https://example.org' }, data: payload });
  check('foreign origin rejected', response.status() === 403);
  response = await context.request.post(api, { data: { ...payload, status: 'verified', summary: 'QA 검증 근거를 등록함', verificationNote: 'QA: 관리자 API 등록 및 중복 차단 확인' } });
  check('API evidence save preserved', response.status() === 201);
  await page.getByRole('button', { name: '새로고침', exact: true }).click();
  await page.getByText('작업 기록을 불러오는 중입니다.', { exact: true }).waitFor({ state: 'hidden' });
  check('manual form absent', await page.locator('main').last().locator('form').count() === 0);
  response = await context.request.get(`${api}/context?project=${encodeURIComponent(project)}`);
  const state = await response.json();
  check('linked history and latest', response.ok() && state.works.length === 1 && state.works[0].history.length === 2 && state.works[0].latest.status === 'verified');
  response = await context.request.get(`${api}?project=${encodeURIComponent(project)}&status=reported`);
  const filtered = await response.json();
  check('filter does not falsify latest context', filtered.events.length === 1 && filtered.context.works[0].latest.status === 'verified');
  await page.getByLabel('프로젝트', { exact: true }).selectOption(project);
  await page.getByLabel('상태', { exact: true }).selectOption('verified');
  const task = page.locator('button[aria-controls^="history-"]');
  check('one latest task shown', await task.count() === 1);
  await task.click();
  check('linked UI history', await page.locator('[id^="history-"] ol > li').count() === 2);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.waitForTimeout(500); // Existing shell drawer and responsive margin transition.
    if (width === 390) {
      const close = page.getByRole('button', { name: '사이드바 닫기', exact: true });
      if (await close.isVisible()) { await close.click(); await page.waitForTimeout(350); }
      check('mobile content width', (await page.locator('main').last().boundingBox()).width >= 350);
    }
    check(`populated UI ${width}`, (await page.locator('main').last().innerText()).includes('QA 검증 근거를 등록함'));
    check(`no overflow ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const path = `artifacts/update-log/${width}.png`;
    await page.screenshot({ path, fullPage: true });
    report.screenshots.push(path);
  }
  await page.route('**/api/admin/update-log?view=timeline', route => route.abort());
  await page.getByRole('button', { name: '새로고침', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '작업 기록을 불러오지 못했습니다' }).waitFor();
  check('load network error shown', true);
  await page.unroute('**/api/admin/update-log?view=timeline');
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${base}/admin`);
  await page.getByRole('link', { name: '업데이트 로그', exact: true }).waitFor();
  check('existing admin home', true);
  check('existing admin auth', (await (await context.request.get(`${base}/api/auth/check-admin`)).json()).admin === true);
  for (const endpoint of ['/api/admin/dashboard/sessions', '/api/admin/consult/summary', '/api/admin/postpone-notices?limit=10&offset=0']) {
    check(`existing admin read ${endpoint}`, (await context.request.get(`${base}${endpoint}`)).status() === 200);
  }
  const anonymous = await browser.newContext();
  check('anonymous API blocked', (await anonymous.request.get(api)).status() === 401);
  // Real existing customer login, without roles/grants/fixtures being changed.
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: 'spm.qa.lite@spokedu.test', password: process.env.SPM_QA_PASSWORD });
  assert(!error && data.session, 'customer login');
  const customer = await browser.newContext();
  const cookieValue = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64url');
  const cookieName = 'sb-mwgvserdyflsqyhcqecp-auth-token';
  await customer.addCookies(Array.from({ length: Math.ceil(cookieValue.length / 3000) }, (_, i) => ({ name: cookieValue.length > 3000 ? `${cookieName}.${i}` : cookieName, value: cookieValue.slice(i * 3000, (i + 1) * 3000), url: base })));
  const customerAccess = await (await customer.request.get(`${base}/api/spokedu-master/access`)).json();
  check('customer session confirmed', customerAccess.isAdmin === false);
  check('nonadmin GET blocked', (await customer.request.get(api)).status() === 403);
  check('nonadmin POST blocked', (await customer.request.post(api, { data: payload })).status() === 403);
  check('nonadmin context blocked', (await customer.request.get(`${api}/context?project=${encodeURIComponent(project)}`)).status() === 403);
  const cli = args => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/ai-work-log.ts', ...args], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true, timeout: 30000 });
    assert.equal(result.status, 0, 'local CLI successful exit');
    return JSON.parse(result.stdout);
  };
  check('CLI context reads existing key', cli(['context', '--project', project]).works[0].workKey === workKey);
  const inputFile = `artifacts/update-log/cli-input.json`;
  for (const status of ['blocked', 'reported', 'verified']) {
    await writeFile(inputFile, JSON.stringify({ workKey, project, status, summary: `QA CLI ${status}`, verificationNote: status === 'verified' ? 'QA CLI 실제 등록·조회 확인' : '' }));
    const recorded = cli(['record', '--input', inputFile]);
    check(`CLI ${status} append`, recorded.ok && recorded.event.status === status && recorded.event.sourceType === 'codex');
  }
  check('CLI repeated record is duplicate', cli(['record', '--input', inputFile]).duplicate === true);
  check('no browser exceptions', report.pageErrors.length === 0);
} catch (error) {
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  // Only this run's exact random project AND key. Never delete operational history.
  const cleanup = await db.from('ai_work_logs').delete().eq('project', project).eq('work_key', workKey);
  const remaining = await db.from('ai_work_logs').select('id', { count: 'exact', head: true }).eq('project', project).eq('work_key', workKey);
  report.cleanup = !cleanup.error && !remaining.error && remaining.count === 0 ? 'PASS' : 'FAIL';
  if (report.cleanup !== 'PASS') process.exitCode = 1;
  await browser.close();
  await writeFile('artifacts/update-log/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
