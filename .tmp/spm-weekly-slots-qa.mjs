import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !serviceKey || !anonKey) {
  throw new Error('Required Supabase QA environment variables are missing.');
}

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});
const candidates = [
  'spm.qa.admin@spokedu.test',
  'choijihoon@spokedu.com',
  'kimkoomin@spokedu.com',
  'kimyoonki@spokedu.com',
];
const { data: usersData, error: usersError } = await service.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (usersError) throw usersError;
const users = new Set(
  (usersData.users ?? []).flatMap((user) => (user.email ? [user.email.toLowerCase()] : [])),
);
const email = candidates.find((candidate) => users.has(candidate));
if (!email) throw new Error('No admin QA auth user is available.');

const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: `${base}/` },
});
if (linkError || !linkData?.properties?.action_link) {
  throw new Error('Could not generate an admin QA login link.');
}

const actionUrl = new URL(linkData.properties.action_link);
const tokenHash = actionUrl.searchParams.get('token');
const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
if (!tokenHash) throw new Error('Could not resolve the admin QA login token.');

const cookies = [];
const ssr = createServerClient(supabaseUrl, anonKey, {
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
if (verifyError) throw verifyError;

const artifactDir = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-weekly-slots');
await fs.mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
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
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.goto(`${base}/admin/spokedu-master/programs`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForLoadState('networkidle').catch(() => undefined);

const slotSection = page.locator('section').filter({
  has: page.getByRole('heading', { name: '이번주 추천 프로그램 관리' }),
});
const selects = slotSection.locator('select');
const searchInputs = slotSection.getByPlaceholder('프로그램 검색');
const slotApi = await page.evaluate(async () => {
  const response = await fetch('/api/admin/spokedu-master/programs/home-featured');
  const body = await response.json();
  const selected = Array.isArray(body.slots) ? body.slots.filter((value) => value != null) : [];
  return {
    ok: response.ok,
    slotCount: Array.isArray(body.slots) ? body.slots.length : 0,
    selectedCount: selected.length,
  };
});

let duplicateDisabled = null;
if ((await selects.count()) === 4) {
  const firstOption = selects.nth(0).locator('option:not([value=""]):not([disabled])').first();
  const firstValue = await firstOption.getAttribute('value');
  if (firstValue) {
    await selects.nth(0).selectOption(firstValue);
    duplicateDisabled = await selects
      .nth(1)
      .locator(`option[value="${firstValue}"]`)
      .isDisabled()
      .catch(() => false);
  }
}

const adminResult = {
  path: new URL(page.url()).pathname,
  managerVisible: await slotSection.isVisible().catch(() => false),
  slotCount: await selects.count(),
  searchCount: await searchInputs.count(),
  emptySlotsAllowed:
    (await selects.count()) === 4 &&
    (await selects.nth(0).locator('option[value=""]').count()) === 1,
  duplicateDisabled,
  api: slotApi,
};

await page.screenshot({
  path: path.join(artifactDir, 'admin-weekly-slots.png'),
  fullPage: true,
});

await page.goto(`${base}/spokedu-master/dashboard`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForLoadState('networkidle').catch(() => undefined);

const viewportResults = {};
for (const width of [1440, 768, 430, 390, 360]) {
  await page.setViewportSize({ width, height: width >= 768 ? 1100 : 900 });
  await page.goto(`${base}/spokedu-master/dashboard`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const weeklySection = page.locator('#weekly-programs');
  const visibleCards = weeklySection.locator('button:visible');
  const cardSizes = await visibleCards.evaluateAll((buttons) =>
    buttons.map((button) => {
      const card = button.firstElementChild;
      const rect = card?.getBoundingClientRect();
      return rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null;
    }),
  );
  viewportResults[width] = {
    heroVisible: await weeklySection.isVisible().catch(() => false),
    headline: await page
      .getByRole('heading', { name: '이번 주 추천 수업' })
      .isVisible()
      .catch(() => false),
    visibleCardCount: await visibleCards.count(),
    slotLabels: await visibleCards.locator('span').filter({ hasText: /^추천 0[1-4]$/ }).allTextContents(),
    cardSizes,
    equalCardSizes:
      cardSizes.length > 0 &&
      cardSizes.every(
        (size) =>
          size?.width === cardSizes[0]?.width && size?.height === cardSizes[0]?.height,
      ),
    videoCardAspect:
      cardSizes.length > 0 &&
      cardSizes.every(
        (size) => size != null && Math.abs(size.width / size.height - 6 / 5) < 0.03,
      ),
    pageFitsViewport: await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    ),
    legacyHeadlineAbsent:
      (await page.getByText('이번 주 체육수업을 빠르게 준비하세요', { exact: true }).count()) === 0,
    duplicateWeeklyRowAbsent:
      (await page.getByRole('heading', { name: '이번주 추천 프로그램' }).count()) === 0,
    spomoveVisible: await page.locator('#spomove').isVisible().catch(() => false),
    classroomPresent: (await page.locator('#classroom-programs').count()) === 1,
    preschoolPresent: (await page.locator('#preschool-programs').count()) === 1,
  };

  await page.screenshot({
    path: path.join(artifactDir, `dashboard-weekly-hero-${width}.png`),
    fullPage: true,
  });
}

const dashboardResult = {
  path: new URL(page.url()).pathname,
  viewports: viewportResults,
};

console.log(
  JSON.stringify(
    {
      accountType: email === 'spm.qa.admin@spokedu.test' ? 'qa-admin' : 'platform-admin',
      admin: adminResult,
      dashboard: dashboardResult,
      consoleErrorCount: consoleErrors.length,
      artifacts: [
        'qa-artifacts/spokedu-master-weekly-slots/admin-weekly-slots.png',
        ...[1440, 768, 430, 390, 360].map(
          (width) =>
            `qa-artifacts/spokedu-master-weekly-slots/dashboard-weekly-hero-${width}.png`,
        ),
      ],
    },
    null,
    2,
  ),
);

await context.close();
await browser.close();
