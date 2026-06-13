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
const email = process.env.SPOKEDU_MASTER_QA_ID;
if (!supabaseUrl || !serviceKey || !anonKey || !email) {
  throw new Error('Required QA environment variables are missing.');
}

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});
const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: `${base}/` },
});
if (linkError || !linkData?.properties?.action_link) {
  throw new Error('Could not create a QA login link.');
}

const actionUrl = new URL(linkData.properties.action_link);
const tokenHash = actionUrl.searchParams.get('token');
const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
if (!tokenHash) throw new Error('Could not resolve the QA login token.');

const cookies = [];
const ssr = createServerClient(supabaseUrl, anonKey, {
  cookies: {
    getAll: () => cookies,
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

const artifactDir = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-library');
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
const notFoundUrls = new Set();
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('response', (response) => {
  if (response.status() === 404) notFoundUrls.add(response.url());
});

const viewports = {};
for (const width of [1440, 768, 430, 390, 360]) {
  await page.setViewportSize({ width, height: width >= 768 ? 1100 : 900 });
  await page.goto(`${base}/spokedu-master/library`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  viewports[width] = {
    path: new URL(page.url()).pathname,
    header: await page
      .getByRole('heading', { name: '조건에 맞는 수업 찾기' })
      .isVisible()
      .catch(() => false),
    featuredAbsent: (await page.getByText('오늘의 추천', { exact: true }).count()) === 0,
    searchVisible: await page
      .getByPlaceholder('수업명, 설명, 교구, 태그 검색')
      .isVisible()
      .catch(() => false),
    filterGroups: await page
      .locator('header')
      .getByText(/^(대상|공간|신체 기능|움직임|테마|자료)$/)
      .allTextContents(),
    pageFitsViewport: await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    ),
    cardAspect: await page.locator('article').first().evaluate((article) => {
      const card = article.querySelector(':scope > button');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      return Math.round((rect.width / rect.height) * 100) / 100;
    }),
    noBelowCardBody: await page.locator('article').first().evaluate((article) => {
      const children = Array.from(article.children);
      return children.every(
        (child) =>
          child.tagName === 'BUTTON' &&
          (child.classList.contains('absolute') || child === children[0]),
      );
    }),
  };

  await page.screenshot({
    path: path.join(artifactDir, `library-${width}.png`),
    fullPage: true,
  });
}

await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(`${base}/spokedu-master/library`, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => undefined);

const firstFilter = page
  .locator('header button')
  .filter({ has: page.locator('span') })
  .first();
const filterText = (await firstFilter.textContent())?.trim() ?? '';
const expectedCount = Number(filterText.match(/(\d+)$/)?.[1] ?? NaN);
await firstFilter.click();
await page.waitForTimeout(100);
const filteredCards = await page.locator('article').count();
const firstTitle = (await page.locator('article h3').first().textContent())?.trim() ?? '';

const search = page.getByPlaceholder('수업명, 설명, 교구, 태그 검색');
await search.fill(firstTitle);
await page.waitForTimeout(100);
const combinedCount = await page.locator('article').count();

await page.locator('article').first().locator(':scope > button').first().click();
const previewVisible = await page
  .getByText('빠른 미리보기', { exact: true })
  .first()
  .isVisible()
  .catch(() => false);

console.log(
  JSON.stringify(
    {
      viewports,
      structuredFilter: {
        label: filterText.replace(/\d+$/, '').trim(),
        expectedCount,
        filteredCards,
        exactCountMatch: expectedCount === filteredCards,
      },
      searchAndFilter: {
        query: firstTitle,
        resultCount: combinedCount,
        works: Boolean(firstTitle) && combinedCount >= 1,
      },
      previewVisible,
      favoriteButtons: await page.getByLabel(/즐겨찾기/).count(),
      usedIndicators: await page.locator('[title="사용 이력 있음"]').count(),
      lockIndicators: await page.locator('article svg.lucide-lock').count(),
      spomoveBadges: await page.getByText('SPOMOVE', { exact: true }).count(),
      videoBadges: await page.getByText('참고 영상', { exact: true }).count(),
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 10),
      notFoundUrls: Array.from(notFoundUrls).slice(0, 10),
      artifacts: [1440, 768, 430, 390, 360].map(
        (width) => `qa-artifacts/spokedu-master-library/library-${width}.png`,
      ),
    },
    null,
    2,
  ),
);

await context.close();
await browser.close();
