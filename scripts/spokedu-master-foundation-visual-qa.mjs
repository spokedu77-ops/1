import nextEnv from '@next/env';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const QA_ID = process.env.SPOKEDU_MASTER_QA_ID || '';
const QA_PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD || '';
if (!QA_ID || !QA_PASSWORD) throw new Error('QA credentials are not configured.');

async function login(page) {
  await page.goto(`${BASE}/login?next=${encodeURIComponent('/spokedu-master/programs')}`, { waitUntil: 'domcontentloaded' });
  const masterTab = page.getByRole('tab', { name: 'MASTER' });
  await masterTab.waitFor({ state: 'visible' });
  if ((await masterTab.getAttribute('aria-selected')) !== 'true') await masterTab.click();
  const password = page.locator('input[name="password"]');
  if (!(await password.isVisible().catch(() => false))) await page.getByRole('button', { name: '비밀번호로 로그인' }).click();
  await page.locator('input[name="username"]').fill(QA_ID);
  await password.fill(QA_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/spokedu-master\//, { timeout: 90_000, waitUntil: 'domcontentloaded' });
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 960 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    const guidePackRequests = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !/favicon|devtools/i.test(message.text())) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.url().includes('spokedu_master_official_spomove_guide_videos')) guidePackRequests.push(request.url());
    });
    await login(page);
    await context.route('**/api/spokedu-master/access', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authenticated: true,
        plan: 'premium',
        subscriptionStatus: 'active',
        canUseLibrary: true,
        canUseAttendance: true,
        canUseRecords: true,
        canUseSpomove: true,
        canUseClassTools: true,
      }),
    }));
    await context.route('**/api/spokedu-master/subscription', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'premium', status: 'active' }),
    }));
    const access = await page.evaluate(async () => {
      const response = await fetch('/api/spokedu-master/access', { cache: 'no-store' });
      const body = await response.json().catch(() => null);
      return { status: response.status, plan: body?.plan, canUseLibrary: body?.canUseLibrary, canUseAttendance: body?.canUseAttendance, canUseSpomove: body?.canUseSpomove };
    });
    results.push({ viewport: viewport.width, access });

    for (const [route, heading] of [
      ['/spokedu-master/programs', '프로그램'],
      ['/spokedu-master/favorites', '즐겨찾기'],
      ['/spokedu-master/manage', '수업 일정'],
      ['/spokedu-master/spomove', 'SPOMOVE'],
    ]) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(1000);
      const bodyText = await page.locator('body').innerText();
      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')),
      }));
      const primaryNav = await page.getByRole('navigation', { name: /SPOKEDU MASTER (주요|데스크톱) 메뉴/ }).getByRole('link').allTextContents().catch(() => []);
      const mobileButtons = await page.getByRole('navigation', { name: 'SPOKEDU MASTER 주요 메뉴' }).getByRole('button').allTextContents().catch(() => []);
      results.push({
        viewport: viewport.width,
        route,
        path: new URL(page.url()).pathname,
        heading: bodyText.includes(heading),
        bodyPrefix: bodyText.slice(0, 160).replace(/\s+/g, ' '),
        noHorizontalOverflow: layout.scrollWidth <= layout.innerWidth,
        noErrorOverlay: !layout.overlay,
        normalNetworkSilent: !bodyText.includes('인터넷 연결됨'),
        primaryNavCount: viewport.width >= 1024 ? primaryNav.length : mobileButtons.length,
      });
    }
    const unexpectedErrors = errors.filter((message) => !/status of 403 \(Forbidden\)/i.test(message));
    results.push({
      viewport: viewport.width,
      guidePackBrowserRequests: guidePackRequests.length,
      expectedRealApi403sUnderMockedUi: errors.length - unexpectedErrors.length,
      unexpectedConsoleErrors: unexpectedErrors.length,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
const failed = results.some((result) =>
  result.heading === false
  || result.noHorizontalOverflow === false
  || result.noErrorOverlay === false
  || result.normalNetworkSilent === false
  || (typeof result.primaryNavCount === 'number' && result.primaryNavCount !== 5)
  || result.guidePackBrowserRequests > 0
  || result.unexpectedConsoleErrors > 0
);
if (failed) process.exitCode = 1;
