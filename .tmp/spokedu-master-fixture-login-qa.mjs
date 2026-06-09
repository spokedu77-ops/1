import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = 'http://localhost:3000';
const email = process.env.SPOKEDU_MASTER_QA_ID ?? '';
const password = process.env.SPOKEDU_MASTER_QA_PASSWORD ?? '';
const artifactDir = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-fixture-login');

if (!email || !password) {
  throw new Error('Required QA login env is missing.');
}

await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const consoleErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.goto(`${base}/login?next=${encodeURIComponent('/spokedu-master/dashboard')}`, {
  waitUntil: 'domcontentloaded',
});
await page.locator('input[type="text"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.locator('button[type="submit"]').click();
await page.waitForURL(/\/spokedu-master\/dashboard/, { timeout: 90_000 });
await page.waitForLoadState('networkidle').catch(() => undefined);

const expectedSections = [
  '오늘 필요한 체육수업을 바로 고르세요',
  '이번주 추천 프로그램',
  'SPOMOVE',
  '교실에서 할 수 있는 프로그램',
  '미취학 아동이 할 수 있는 프로그램',
];
const bodyText = await page.locator('body').innerText();
const sections = Object.fromEntries(
  expectedSections.map((label) => [label, bodyText.includes(label)]),
);

await page.screenshot({
  path: path.join(artifactDir, 'dashboard-desktop.png'),
  fullPage: true,
});

await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: path.join(artifactDir, 'dashboard-390.png'),
  fullPage: true,
});

let admin = {
  accessible: false,
  currentPath: '',
  initialProgramsFetches: 0,
  selectionProgramsFetches: null,
  selectionSpinnerVisible: null,
};

let programsFetches = 0;
page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.pathname === '/api/admin/spokedu-master/programs' && request.method() === 'GET') {
    programsFetches += 1;
  }
});

await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(`${base}/admin/spokedu-master/programs`, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => undefined);

admin.currentPath = new URL(page.url()).pathname;
admin.accessible = admin.currentPath === '/admin/spokedu-master/programs';
admin.initialProgramsFetches = programsFetches;

if (admin.accessible) {
  const programButtons = page.locator('aside button').filter({ hasText: 'curriculumId' });
  if (await programButtons.count() > 1) {
    const beforeSelection = programsFetches;
    await programButtons.nth(1).click();
    await page.waitForTimeout(1_000);
    admin.selectionProgramsFetches = programsFetches - beforeSelection;
    admin.selectionSpinnerVisible = await page
      .locator('aside .animate-spin')
      .isVisible()
      .catch(() => false);
  }
  await page.screenshot({
    path: path.join(artifactDir, 'admin-programs.png'),
    fullPage: true,
  });
}

const report = {
  login: true,
  dashboardPath: '/spokedu-master/dashboard',
  sections,
  consoleErrors,
  admin,
  artifacts: [
    'qa-artifacts/spokedu-master-fixture-login/dashboard-desktop.png',
    'qa-artifacts/spokedu-master-fixture-login/dashboard-390.png',
    ...(admin.accessible
      ? ['qa-artifacts/spokedu-master-fixture-login/admin-programs.png']
      : []),
  ],
};

await fs.writeFile(
  path.join(artifactDir, 'qa-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);
console.log(JSON.stringify(report, null, 2));

await browser.close();
