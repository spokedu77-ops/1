/**
 * P3/P4 craft surface capture QA (library meta + landing CTA + ops bar height).
 * Usage: node scripts/spokedu-master-craft-capture-qa.mjs http://localhost:3000
 *
 * Soft-skip 금지: library/dashboard는 mock access로 열어 하드 검증한다.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const OUT = path.join(process.cwd(), 'tmp', 'craft-capture-qa');
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const useMockAuth = process.env.SPOKEDU_MASTER_QA_USE_MOCK_AUTH === '1' || process.env.SPOKEDU_MASTER_QA_BYPASS_AUTH === '1';

const CONTROLLED_REASON_LABELS = [
  '좁은 공간',
  '바로 진행',
  '교구 적음',
  '팀전',
  '개인전',
  '반응 훈련',
  '균형',
  '민첩성',
  'SPOMOVE 연계',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function activeAccessSnapshot() {
  return {
    ok: true,
    authenticated: true,
    allowed: true,
    onboardingDone: true,
    plan: 'premium',
    subscriptionStatus: 'active',
    currentPeriodEnd: new Date(Date.now() + 10_000 * 60_000).toISOString(),
    cancelAtPeriodEnd: false,
    isAdmin: false,
    isCenterOrTeam: false,
    canUseLibrary: true,
    canUseClassTools: true,
    canUseAttendance: true,
    canUseRecords: true,
    canUseSpomove: true,
  };
}

function bootstrapStore() {
  return JSON.stringify({
    state: {
      profile: {
        id: OWNER_ID,
        name: 'QA Teacher',
        email: process.env.SPOKEDU_MASTER_QA_ID || 'qa@example.com',
        school: 'QA School',
        avatarColor: '#312e81',
        plan: 'premium',
        role: 'teacher',
        centerId: null,
        centerName: null,
        ageGroups: [],
        programTypes: [],
        onboardingDone: true,
        trialEndsAt: null,
        createdAt: new Date().toISOString(),
        subscriptionStatus: 'active',
        previousPaidPlan: null,
        periodEnd: new Date(Date.now() + 10_000 * 60_000).toISOString(),
      },
      programs: [],
      programsLoaded: false,
      programsError: null,
      lessons: [],
      operational: { online: true, lastSyncAt: null, retryQueue: [] },
      sessions: [],
      recentProgramActivities: [],
      favorites: [],
      cart: [],
      notifications: [],
      todayLessonByOwner: {},
    },
    version: 12,
  });
}

async function installMocks(page) {
  await page.route('**/api/spokedu-master/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activeAccessSnapshot()),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });
  await page.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: 'premium',
        status: 'active',
        isAdmin: false,
        userId: OWNER_ID,
        periodEnd: activeAccessSnapshot().currentPeriodEnd,
        trialEndsAt: null,
      }),
    });
  });
  await page.route('**/api/spokedu-master/programs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: '52',
          title: 'QA Jump Adventure',
          category: 'QA Movement',
          grade: 'elementary',
          space: '교실',
          description: '수업 전환에 바로 활용할 수 있습니다.',
          steps: [],
          equipment: ['준비물 없음'],
          tags: ['반응', '인원:팀전', 'SPOMOVE'],
          colors: ['#312e81', '#4338ca', '#6366f1', '#a5b4fc'],
          isPro: false,
          isNew: true,
          hasSpomoveConnection: true,
          thumbnailUrl: '/spokedu-master-icon.svg',
        }],
      }),
    });
  });
  await page.route('**/api/spokedu-master/students', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('**/api/spokedu-master/class-records**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('**/api/spokedu-master/explanations**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) });
  });
}

async function loginWithRealCredentials(context) {
  const email = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPM_QA_ID || '';
  const password = process.env.SPOKEDU_MASTER_QA_PASSWORD || process.env.SPM_QA_PASSWORD || '';
  assert(email && password, 'live craft-capture needs SPOKEDU_MASTER_QA_ID and SPOKEDU_MASTER_QA_PASSWORD');
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/login?next=${encodeURIComponent('/spokedu-master/library')}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    const passwordInput = page.locator('input[type="password"]').first();
    if ((await passwordInput.count()) === 0) {
      await page.locator('[role="tab"]').nth(1).waitFor({ state: 'visible', timeout: 10_000 });
      await page.locator('[role="tab"]').nth(1).click();
    }
    await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[type="text"], input[type="email"]').first().fill(email);
    await passwordInput.fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/spokedu-master\//, { timeout: 90_000, waitUntil: 'domcontentloaded' });
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((storeValue) => {
    window.localStorage.setItem('spokedu-master-store', storeValue);
  }, bootstrapStore());
  if (useMockAuth) {
    await context.addCookies([{
      name: 'spm-qa-auth-bypass',
      value: '1',
      url: BASE,
      sameSite: 'Lax',
    }]);
  } else {
    await loginWithRealCredentials(context);
  }
  const page = await context.newPage();
  await installMocks(page);
  const report = { ok: true, checks: [], generatedAt: new Date().toISOString(), mode: useMockAuth ? 'mock' : 'live' };

  try {
    await page.goto(`${BASE}/spokedu-master/landing`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(500);
    const landingPrimary = await page.locator('a.spm-btn-primary, button.spm-btn-primary').count();
    assert(landingPrimary > 0, 'landing missing spm-btn-primary');
    report.checks.push({ id: 'landing_primary', ok: true, count: landingPrimary });
    await page.screenshot({ path: path.join(OUT, '1-landing.png'), fullPage: false });

    await page.goto(`${BASE}/spokedu-master/library`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    assert(!/이용권이 필요합니다|이 기능을 사용하려면/.test(body), 'library unexpectedly gated during craft capture');
    const hit = CONTROLLED_REASON_LABELS.find((label) => body.includes(label));
    assert(Boolean(hit), 'library cards missing controlled selection-reason labels');
    report.checks.push({ id: 'library_selection_reasons', ok: true, sample: hit });
    await page.screenshot({ path: path.join(OUT, '2-library.png'), fullPage: false });

    await page.goto(`${BASE}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(800);
    const bar = page.locator('[data-dashboard-section="compact-ops-bar"]');
    await bar.waitFor({ state: 'visible', timeout: 15_000 });
    const height = await bar.evaluate((el) => el.getBoundingClientRect().height);
    assert(height <= 84, `CompactOpsBar height ${height}px > 84`);
    report.checks.push({ id: 'ops_bar_height', ok: true, height });
    await page.screenshot({ path: path.join(OUT, '3-dashboard-bar.png'), fullPage: false });
  } catch (error) {
    report.ok = false;
    report.error = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close().catch(() => undefined);
  }

  await fs.writeFile(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
