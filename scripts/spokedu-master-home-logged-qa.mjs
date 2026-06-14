import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

/**
 * SPOKEDU MASTER logged-in route smoke test.
 *
 * Usage:
 *   SPOKEDU_MASTER_QA_ID=spm.qa.pro@spokedu.test SPM_QA_PASSWORD=... node scripts/spokedu-master-home-logged-qa.mjs http://localhost:3000
 *
 * Optional:
 *   SPOKEDU_MASTER_QA_PLAN=free|pro|team
 *   SPOKEDU_MASTER_QA_EXPIRED=1
 */
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const QA_ID = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPOKEDU_MASTER_QA_EMAIL || '';
const QA_PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD || process.env.SPM_QA_PASSWORD || '';
const QA_PLAN = process.env.SPOKEDU_MASTER_QA_PLAN || 'pro';
const QA_EXPIRED = process.env.SPOKEDU_MASTER_QA_EXPIRED === '1';

const ROUTES = [
  '/spokedu-master/dashboard',
  '/spokedu-master/library',
  '/spokedu-master/spomove',
  '/spokedu-master/report',
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

function bootstrapStore(email) {
  const now = Date.now();
  const trialEndsAt = QA_EXPIRED ? new Date(now - 24 * 60 * 60 * 1000).toISOString() : new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const plan = QA_EXPIRED ? 'free' : QA_PLAN === 'team' ? 'team' : QA_PLAN === 'free' ? 'free' : 'pro';

  return JSON.stringify({
    state: {
      profile: {
        id: 'qa',
        name: 'QA',
        email,
        school: 'QA',
        avatarColor: '#312e81',
        plan,
        role: plan === 'team' ? 'director' : 'teacher',
        centerId: null,
        centerName: null,
        ageGroups: [],
        programTypes: [],
        onboardingDone: true,
        trialEndsAt: QA_EXPIRED ? null : trialEndsAt,
        createdAt: new Date(now).toISOString(),
      },
    },
    version: 9,
  });
}

async function login(context) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login?next=${encodeURIComponent('/spokedu-master/dashboard')}`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="text"]').first().fill(QA_ID);
  await page.locator('input[type="password"]').first().fill(QA_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/spokedu-master\//, { timeout: 90000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(1000);
  await page.close();
}

async function routeSnapshot(context, route, expectedProgramTitle = '') {
  const page = await context.newPage();
  const consoleErrors = [];
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
  const result = {
    route,
    currentPath: new URL(currentUrl).pathname + new URL(currentUrl).search,
    statusText: text.slice(0, 500).replace(/\s+/g, ' ').trim(),
    hasDashboard: text.includes('오늘 수업 준비') || text.includes('SPOKEDU 운영 대시보드'),
    hasLibrary: text.includes('라이브러리') || text.includes('수업 자료'),
    hasSpomove: text.includes('SPOMOVE'),
    hasReport: text.includes('수업 설명') || text.includes('오늘 수업 정리'),
    selectedProgram: expectedProgramTitle ? text.includes(expectedProgramTitle) : false,
    hasExpiredCopy: text.includes('체험 기간') || text.includes('구독 플랜') || text.includes('이용 만료'),
    hasKnownFallbackContent: text.includes('스위치 러닝') || text.includes('따라 무브'),
    consoleErrors,
  };
  await page.close();
  return result;
}

async function main() {
  if (!QA_ID || !QA_PASSWORD) {
    console.log('SKIP: SPOKEDU_MASTER_QA_ID and SPM_QA_PASSWORD are required.');
    process.exit(0);
  }

  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((storeValue) => {
    window.localStorage.setItem('spokedu-master-store', storeValue);
  }, bootstrapStore(QA_ID));

  let failed = 0;
  try {
    await login(context);

    const programsResponse = await context.request.get(`${BASE}/api/spokedu-master/programs`);
    const programsPayload = programsResponse.ok() ? await programsResponse.json() : { data: [] };
    const reportProgram = programsPayload.data?.[0];
    const routes = reportProgram
      ? [...ROUTES, `/spokedu-master/report?program=${reportProgram.id}`]
      : ROUTES;

    for (const route of routes) {
      const expectedProgramTitle = route.includes('?program=')
        ? reportProgram?.title ?? ''
        : '';
      const snapshot = await routeSnapshot(context, route, expectedProgramTitle);
      const expectedPath = route;
      const stayedOnRoute = snapshot.currentPath === expectedPath;
      const routeOk = stayedOnRoute;
      const consoleOk = snapshot.consoleErrors.length === 0;
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
