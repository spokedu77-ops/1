import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = (process.argv.find((arg) => arg.startsWith('http')) ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const OUTPUT = 'artifacts/spokedu-lab-onboarding-p0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function accessSnapshot(onboardingDone) {
  return {
    ok: true,
    allowed: true,
    authenticated: true,
    onboardingDone,
    isAdmin: false,
    effectivePlan: 'free',
    canBrowseLibrary: true,
    canUseLibrary: false,
    canUseClassTools: true,
    canUseRecords: false,
    canUseSpomove: false,
  };
}

async function installMockApi(page, state) {
  await page.route('**/spokedu-lab/dashboard', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<main data-dashboard-root="true"><h1>SPOKEDU LAB dashboard fixture</h1></main>',
  }));
  await page.route('**/spokedu-lab/library?source=p0-e2e', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<main data-library-root="true"><h1>SPOKEDU LAB library fixture</h1></main>',
  }));
  await page.route('**/api/spokedu-master/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/spokedu-master/access') {
      state.accessCalls += 1;
      if (state.completed && state.staleAccessReads > 0) {
        state.staleAccessReads -= 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(accessSnapshot(false)) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(accessSnapshot(state.completed)) });
    }
    if (pathname === '/api/spokedu-master/profile' && request.method() === 'PATCH') {
      state.patchCalls += 1;
      if (state.patchDelayMs) await new Promise((resolve) => setTimeout(resolve, state.patchDelayMs));
      if (state.patchFailureStatuses.length > 0) {
        const status = state.patchFailureStatuses.shift();
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: 'test failure' }) });
      }
      const input = request.postDataJSON();
      state.completed = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...input, onboardingDone: true } }) });
    }
    if (pathname === '/api/spokedu-master/profile') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

async function reachFinalStep(page, next) {
  await page.goto(`${BASE}/spokedu-lab/onboarding?next=${encodeURIComponent(next)}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: 'LAB 시작하기' }).waitFor();
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const state = { completed: false, patchCalls: 0, accessCalls: 0, patchFailureStatuses: [], patchDelayMs: 500, staleAccessReads: 0 };
  await installMockApi(page, state);
  await reachFinalStep(page, '/spokedu-lab/onboarding///?legacy=1');
  await page.screenshot({ path: `${OUTPUT}/${label}-onboarding.png`, fullPage: true });

  const start = page.getByRole('button', { name: 'LAB 시작하기' });
  await start.dblclick({ delay: 20 });
  await page.waitForURL('**/spokedu-lab/dashboard', { timeout: 20_000 });
  assert(state.patchCalls === 1, `${label}: double click sent ${state.patchCalls} profile writes`);
  await page.locator('[data-dashboard-root="true"]').waitFor({ timeout: 20_000 });
  await page.screenshot({ path: `${OUTPUT}/${label}-dashboard.png`, fullPage: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-dashboard-root="true"]').waitFor({ timeout: 20_000 });
  assert(!page.url().includes('/onboarding'), `${label}: refresh returned to onboarding`);
  await context.close();
}

async function runSaveFailureRetry(browser, failureStatus) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const state = { completed: false, patchCalls: 0, accessCalls: 0, patchFailureStatuses: [failureStatus], patchDelayMs: 0, staleAccessReads: 0 };
  await installMockApi(page, state);
  await reachFinalStep(page, '/spokedu-lab/library?source=p0-e2e');
  await page.getByRole('button', { name: 'LAB 시작하기' }).click();
  await page.getByText('시작 정보를 저장하지 못했습니다.').waitFor();
  await page.getByRole('button', { name: 'LAB 시작하기' }).click();
  await page.waitForURL('**/spokedu-lab/library?source=p0-e2e', { timeout: 20_000 });
  assert(state.patchCalls === 2, `${failureStatus} retry: expected two profile writes, received ${state.patchCalls}`);
  await context.close();
}

async function runAccessSnapshotRetry(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const state = { completed: false, patchCalls: 0, accessCalls: 0, patchFailureStatuses: [], patchDelayMs: 0, staleAccessReads: 1 };
  await installMockApi(page, state);
  await reachFinalStep(page, '/spokedu-lab/dashboard');
  await page.getByRole('button', { name: 'LAB 시작하기' }).click();
  await page.getByText('가입 정보는 저장되었습니다.').waitFor();
  await page.getByRole('button', { name: '대시보드 이동 다시 시도' }).click();
  await page.waitForURL('**/spokedu-lab/dashboard', { timeout: 20_000 });
  assert(state.patchCalls === 1, `access retry repeated profile save ${state.patchCalls} times`);
  await context.close();
}

async function main() {
  await mkdir(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await runViewport(browser, { width: 390, height: 844 }, 'mobile-390');
    await runViewport(browser, { width: 1440, height: 1000 }, 'desktop-1440');
    await runSaveFailureRetry(browser, 401);
    await runSaveFailureRetry(browser, 500);
    await runAccessSnapshotRetry(browser);
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ ok: true, verified: ['self-return', 'server-access-recheck', 'stale-access-retry-without-resave', 'double-click', '401-retry', '500-retry', 'deep-link', 'refresh', '390', '1440'] }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
