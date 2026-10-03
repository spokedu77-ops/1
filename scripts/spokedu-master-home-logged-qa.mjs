import nextEnv from '@next/env';
import { applyMasterStorageState, assertMasterQaAccess } from './lib/spokedu-master-auth-state.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

/**
 * SPOKEDU MASTER logged-in route smoke test.
 *
 * Usage:
 * First capture a passwordless MASTER session:
 *   node scripts/spokedu-master-auth-state-capture.mjs http://localhost:3000
 * Then run:
 *   node scripts/spokedu-master-home-logged-qa.mjs http://localhost:3000
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const QA_PLAN = process.env.SPOKEDU_MASTER_QA_PLAN || 'premium';
const QA_EXPIRED = process.env.SPOKEDU_MASTER_QA_EXPIRED === '1';

const ROUTES = [
  '/spokedu-master/dashboard',
  '/spokedu-master/library',
  '/spokedu-master/spomove',
  '/spokedu-master/class-tools',
  '/spokedu-master/classes',
  '/spokedu-master/activity',
  '/spokedu-master/subscription',
];

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    console.warn('SKIP: playwright is not installed.');
    process.exit(0);
  }
}

function isExpectedRoute(route, currentPath) {
  return currentPath === route
    || (route === '/spokedu-master/library' && currentPath === '/spokedu-master/library?view=all');
}

async function routeSnapshot(context, route, expectedProgramTitle = '') {
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|extension|devtools/i.test(text)) return;
    if (QA_EXPIRED && /status of 40[13]/i.test(text)) return;
    consoleErrors.push(text);
  });

  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(1000);

  const text = await page.locator('body').innerText();
  const currentUrl = page.url();
  const currentPath = new URL(currentUrl).pathname + new URL(currentUrl).search;
  const result = {
    route,
    currentPath,
    statusText: text.slice(0, 500).replace(/\s+/g, ' ').trim(),
    hasDashboard: text.includes('오늘 수업') || text.includes('홈') || text.includes('SPOKEDU MASTER'),
    hasLibrary: text.includes('라이브러리') || text.includes('수업 자료'),
    hasSpomove: text.includes('SPOMOVE'),
    hasReport: text.includes('수업 설명') || text.includes('오늘 수업 정리') || text.includes('리포트'),
    selectedProgram: expectedProgramTitle ? text.includes(expectedProgramTitle) : false,
    hasExpiredCopy: text.includes('이용 기간') || text.includes('구독') || text.includes('이용권'),
    hasKnownFallbackContent: text.includes('스위치') || text.includes('플로우'),
    consoleErrors,
    failedResponses,
  };
  await page.close();
  return result;
}

async function main() {
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  let failed = 0;
  try {
    await applyMasterStorageState(context);
    const access = await assertMasterQaAccess(context, BASE);
    const expectedAccess = QA_PLAN === 'lite'
      ? access?.canUseLibrary === true
      : QA_PLAN === 'premium'
        ? access?.canUseLibrary === true
        : true;
    console.log(JSON.stringify({ ok: expectedAccess, capability: 'access', status: access.status, authenticated: access.authenticated, plan: access.plan, canUseLibrary: access.canUseLibrary }));
    if (!expectedAccess) failed += 1;

    const routes = ROUTES;

    for (const route of routes) {
      const expectedProgramTitle = '';
      const snapshot = await routeSnapshot(context, route, expectedProgramTitle);
      const routeOk = isExpectedRoute(route, snapshot.currentPath);
      const expectedLiteBlocks = QA_PLAN === 'lite'
        && snapshot.failedResponses.length > 0
        && snapshot.failedResponses.every((entry) => entry === '403 /api/spokedu-master/explanations');
      const consoleOk = snapshot.consoleErrors.length === 0
        || (expectedLiteBlocks && snapshot.consoleErrors.every((entry) => /status of 403/i.test(entry)));
      const reportProgramOk = QA_EXPIRED || !expectedProgramTitle || snapshot.selectedProgram;

      if (!routeOk || !consoleOk || !reportProgramOk) failed += 1;
      console.log(JSON.stringify({
        ok: routeOk && consoleOk && reportProgramOk,
        route,
        currentPath: snapshot.currentPath,
        hasDashboard: snapshot.hasDashboard,
        hasLibrary: snapshot.hasLibrary,
        hasSpomove: snapshot.hasSpomove,
        hasReport: snapshot.hasReport,
        selectedProgram: snapshot.selectedProgram,
        hasExpiredCopy: snapshot.hasExpiredCopy,
        consoleErrors: snapshot.consoleErrors.slice(0, 3),
        failedResponses: snapshot.failedResponses.slice(0, 5),
      }));
    }
  } catch (error) {
    console.error('FAIL', error instanceof Error ? error.message : error);
    failed += 1;
  } finally {
    await browser.close();
  }

  if (failed > 0) {
    console.error(`\n${failed} route check(s) failed`);
    process.exit(1);
  }
  console.log('\nLogged-in SPOKEDU MASTER route smoke passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
