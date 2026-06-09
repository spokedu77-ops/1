import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = 'http://localhost:3000';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error('Required Supabase env is missing.');

const emails = [
  'choijihoon@spokedu.com',
  'kimkoomin@spokedu.com',
  'kimyoonki@spokedu.com',
  'spm.qa.admin@spokedu.test',
  'spm.qa.pro@spokedu.test',
  'spm.qa.expired@spokedu.test',
];
const artifactDir = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-admin-access');
await fs.mkdir(artifactDir, { recursive: true });

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (usersError) throw usersError;

const usersByEmail = new Map(
  (usersData.users ?? [])
    .filter((user) => user.email)
    .map((user) => [user.email.toLowerCase(), user]),
);

const browser = await chromium.launch({ headless: true });
const access = {};
let adminQa = null;

async function createAuthenticatedPage(email) {
  const user = usersByEmail.get(email);
  if (!user) return null;
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${base}/` },
  });
  if (error || !data?.properties?.action_link) {
    throw new Error(`Could not generate login link for ${email}.`);
  }
  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) throw new Error(`Could not resolve login token for ${email}.`);

  const cookies = [];
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll(nextCookies) {
        cookies.splice(0, cookies.length, ...nextCookies);
      },
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType,
  });
  if (verifyError) throw new Error(`Could not verify login token for ${email}.`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies(
    cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      url: base,
      httpOnly: cookie.options?.httpOnly,
      secure: cookie.options?.secure,
      sameSite:
        cookie.options?.sameSite === 'strict'
          ? 'Strict'
          : cookie.options?.sameSite === 'none'
            ? 'None'
            : 'Lax',
    })),
  );
  const page = await context.newPage();
  return { context, page };
}

for (const email of emails) {
  const session = await createAuthenticatedPage(email);
  if (!session) {
    access[email] = { authUser: false, admin: false, dashboard: false };
    continue;
  }
  const { context, page } = session;
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${base}/admin/spokedu-master/programs`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const adminPath = new URL(page.url()).pathname;

  await page.goto(`${base}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const dashboardPath = new URL(page.url()).pathname;
  const paymentRedirect = dashboardPath === '/spokedu-master/payment';

  access[email] = {
    authUser: true,
    admin: adminPath === '/admin/spokedu-master/programs',
    adminPath,
    dashboard: dashboardPath === '/spokedu-master/dashboard',
    dashboardPath,
    paymentRedirect,
    consoleErrors,
  };

  if (email === 'spm.qa.admin@spokedu.test' && access[email].admin) {
    adminQa = { context, page };
  } else if (!adminQa && email === 'choijihoon@spokedu.com' && access[email].admin) {
    adminQa = { context, page };
  } else {
    await context.close();
  }
}

let lagQa = null;
if (adminQa) {
  const { context, page } = adminQa;
  let programGets = 0;
  let savePatches = 0;
  let syncPosts = 0;
  let latestProgramsPayload = { data: [], total: 0 };
  const consoleErrors = [];
  await page.route('**/api/admin/spokedu-master/programs**', async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (
      request.method() === 'PATCH' &&
      requestUrl.pathname === '/api/admin/spokedu-master/programs'
    ) {
      savePatches += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(latestProgramsPayload),
      });
      return;
    }
    await route.continue();
  });
  await page.route('**/api/admin/spokedu-master/programs/sync-center', async (route) => {
    if (route.request().method() === 'POST') {
      syncPosts += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: { toInsert: 0, toUpdate: 0 },
          changes: [],
          message: 'QA no-op',
        }),
      });
      return;
    }
    await route.continue();
  });
  page.on('request', (request) => {
    const requestUrl = new URL(request.url());
    if (
      request.method() === 'GET' &&
      requestUrl.pathname === '/api/admin/spokedu-master/programs'
    ) {
      programGets += 1;
    }
  });
  page.on('response', async (response) => {
    const responseUrl = new URL(response.url());
    if (
      response.request().method() === 'GET' &&
      responseUrl.pathname === '/api/admin/spokedu-master/programs' &&
      response.ok()
    ) {
      latestProgramsPayload = await response.json().catch(() => latestProgramsPayload);
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(`${base}/admin/spokedu-master/programs`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const buttons = page.locator('aside button').filter({ hasText: 'curriculumId' });
  const buttonCount = await buttons.count();
  const initialGets = programGets;
  let selectedIdBefore = null;
  let selectedIdAfter = null;
  let selectionGetDelta = null;
  let spinnerVisible = null;
  let formUpdated = null;

  if (buttonCount > 1) {
    selectedIdBefore = await page.locator('section h2').first().textContent();
    const beforeSelectionGets = programGets;
    await buttons.nth(1).click();
    await page.waitForTimeout(300);
    selectedIdAfter = await page.locator('section h2').first().textContent();
    selectionGetDelta = programGets - beforeSelectionGets;
    spinnerVisible = await page.locator('aside .animate-spin').isVisible().catch(() => false);
    formUpdated =
      Boolean(selectedIdBefore?.trim()) &&
      Boolean(selectedIdAfter?.trim()) &&
      selectedIdBefore?.trim() !== selectedIdAfter?.trim();
  }

  const refreshButton = page.getByRole('button', { name: '새로고침' });
  const beforeRefreshGets = programGets;
  await refreshButton.click();
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const refreshGetDelta = programGets - beforeRefreshGets;

  const beforeSavePatches = savePatches;
  await page.getByRole('button', { name: '저장' }).click();
  await page.waitForTimeout(300);
  const savePatchDelta = savePatches - beforeSavePatches;

  const beforeSyncPosts = syncPosts;
  await page.getByRole('button', { name: '커리큘럼 동기화' }).click();
  await page.waitForTimeout(300);
  const syncPostDelta = syncPosts - beforeSyncPosts;

  await page.screenshot({
    path: path.join(artifactDir, 'admin-programs-selection.png'),
    fullPage: true,
  });

  lagQa = {
    account: access['spm.qa.admin@spokedu.test']?.admin ? 'qa-admin' : 'platform-admin',
    initialGets,
    buttonCount,
    selectionGetDelta,
    spinnerVisible,
    formUpdated,
    refreshGetDelta,
    savePatchDelta,
    syncPostDelta,
    consoleErrors,
  };
  await context.close();
}

const report = {
  access,
  lagQa,
  artifacts: lagQa
    ? ['qa-artifacts/spokedu-master-admin-access/admin-programs-selection.png']
    : [],
};
await fs.writeFile(
  path.join(artifactDir, 'qa-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);
console.log(JSON.stringify(report, null, 2));
await browser.close();
