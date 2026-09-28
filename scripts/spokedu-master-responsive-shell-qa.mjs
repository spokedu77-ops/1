import nextEnv from '@next/env';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://127.0.0.1:3100').replace(/\/$/, '');
const EDGE_WIDTHS = [639, 640, 641, 767, 768, 769, 1023, 1024, 1025, 1199, 1200, 1201];
const REPRESENTATIVE_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 834, height: 1194 },
  { width: 950, height: 800 },
  { width: 1024, height: 768 },
  { width: 1199, height: 800 },
  { width: 1200, height: 800 },
  { width: 1440, height: 900 },
  { width: 1194, height: 834 },
];
const ROUTES = [
  '/spokedu-master/dashboard',
  '/spokedu-master/activity',
  '/spokedu-master/classes',
  '/spokedu-master/students',
  '/spokedu-master/spomove',
];
const ownerId = '11111111-1111-4111-8111-111111111111';
const classId = '33333333-3333-4333-8333-333333333333';
const now = new Date().toISOString();
const students = Array.from({ length: 7 }, (_, index) => ({
  id: `22222222-2222-4222-8222-${String(index + 1).padStart(12, '0')}`,
  legacyId: null,
  name: `QA 학생 ${index + 1}`,
  meta: {},
  guidanceNote: null,
  createdAt: now,
  updatedAt: now,
}));
const classItem = { id: classId, name: 'QA 체육교실', studentIds: students.map((student) => student.id), createdAt: now, updatedAt: now };
const access = {
  authenticated: true,
  allowed: true,
  userId: ownerId,
  onboardingDone: true,
  plan: 'premium',
  subscriptionStatus: 'active',
  isAdmin: false,
  isCenterOrTeam: false,
  canBrowseLibrary: true,
  canUseLibrary: true,
  canUseClassTools: true,
  canUseAttendance: true,
  canUseRecords: true,
  canUseSpomove: true,
};
const profile = { id: ownerId, name: 'QA Teacher', email: 'qa@example.test', school: 'QA School', avatarColor: '#312e81', plan: 'premium', role: 'teacher', centerId: null, centerName: null, ageGroups: [], programTypes: [], onboardingDone: true, trialEndsAt: null, createdAt: now, subscriptionStatus: 'active', previousPaidPlan: null, periodEnd: now };
const store = JSON.stringify({ state: { profile, programs: [], programsLoaded: true, programsError: null, lessons: [], operational: { online: true, lastSyncAt: null, retryQueue: [] }, sessions: [], recentProgramActivities: [], favorites: [], cart: [], notifications: [] }, version: 12 });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedFamily(width) {
  if (width <= 767) return 'mobile';
  if (width <= 1199) return 'tablet';
  return 'desktop';
}

async function install(context) {
  await context.addCookies([{ name: 'spm-qa-auth-bypass', value: '1', url: BASE, sameSite: 'Lax' }]);
  await context.addInitScript((value) => localStorage.setItem('spokedu-master-store', value), store);
}

async function mock(page) {
  await page.route('**/api/spokedu-master/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/access', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(access) }));
  await page.route('**/api/spokedu-master/subscription', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: 'premium', status: 'active', userId: ownerId }) }));
  await page.route('**/api/spokedu-master/profile**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: profile }) }));
  await page.route('**/api/spokedu-master/programs**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/students**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: students }) }));
  await page.route('**/api/spokedu-master/sessions**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { classes: [classItem], sessions: [] } }) }));
  await page.route('**/api/spokedu-master/class-records**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/session-captures**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/explanations**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
}

async function readShell(page) {
  return page.evaluate(() => {
    const visible = (element) => Boolean(element && getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().width > 0);
    const details = (selector) => {
      const element = document.querySelector(selector);
      return { visible: visible(element), display: element ? getComputedStyle(element).display : null };
    };
    const navLinks = [...document.querySelectorAll('[data-spm-tablet-nav="true"] a, [data-spm-desktop-nav="true"] a')]
      .filter((element) => visible(element))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { text: element.textContent?.trim(), width: rect.width, height: rect.height, scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight };
      });
    const main = document.querySelector('[data-spm-shell-content="true"]');
    return {
      tab: details('[data-spm-tabbar="true"]'),
      tablet: details('[data-spm-tablet-nav="true"]'),
      desktop: details('[data-spm-desktop-nav="true"]'),
      navLinks,
      bottomPadding: main ? Number.parseFloat(getComputedStyle(main).paddingBottom) : null,
      width: innerWidth,
      scrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      overlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')),
    };
  });
}

function assertFamily(result, width, label) {
  const family = expectedFamily(width);
  assert(result.tab.visible === (family === 'mobile'), `${label}: Bottom TabBar mismatch for ${family}`);
  assert(result.tablet.visible === (family === 'tablet'), `${label}: tablet nav mismatch for ${family}`);
  assert(result.desktop.visible === (family === 'desktop'), `${label}: desktop nav mismatch for ${family}`);
  assert([result.tab.visible, result.tablet.visible, result.desktop.visible].filter(Boolean).length === 1, `${label}: mixed or missing navigation state`);
  assert(result.scrollWidth <= width, `${label}: horizontal overflow ${result.scrollWidth - width}px`);
  assert(!result.overlay, `${label}: framework error overlay`);
  if (family === 'mobile') assert(result.bottomPadding >= 70, `${label}: mobile TabBar clearance missing (${result.bottomPadding}px)`);
  else assert(result.bottomPadding === 0, `${label}: mobile bottom inset remained (${result.bottomPadding}px)`);
  if (family !== 'mobile') {
    assert(result.navLinks.length === 5, `${label}: expected five top-navigation links`);
    assert(result.navLinks.every((link) => link.height >= 44), `${label}: top-navigation target below 44px`);
    assert(result.navLinks.every((link) => link.scrollWidth <= link.width + 1 && link.scrollHeight <= link.height + 1), `${label}: navigation label clipped or wrapped`);
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of EDGE_WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await install(context);
    const page = await context.newPage();
    await mock(page);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${BASE}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-spm-app-shell="true"]');
    await page.waitForTimeout(250);
    const shell = await readShell(page);
    assertFamily(shell, width, `dashboard ${width}`);
    assert(errors.length === 0, `dashboard ${width}: console/page errors: ${errors.join(' | ')}`);
    results.push({ kind: 'edge', width, family: expectedFamily(width), shell });
    await context.close();
  }

  for (const viewport of REPRESENTATIVE_VIEWPORTS) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await install(context);
    const page = await context.newPage();
    await mock(page);
    for (const route of ROUTES) {
      const errors = [];
      const onPageError = (error) => errors.push(error.message);
      const onConsole = (message) => { if (message.type() === 'error') errors.push(message.text()); };
      page.on('pageerror', onPageError);
      page.on('console', onConsole);
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-spm-app-shell="true"]');
      await page.waitForTimeout(250);
      const shell = await readShell(page);
      assertFamily(shell, viewport.width, `${route} ${viewport.width}x${viewport.height}`);
      assert(errors.length === 0, `${route} ${viewport.width}x${viewport.height}: console/page errors: ${errors.join(' | ')}`);
      results.push({ kind: 'representative', route, viewport, family: expectedFamily(viewport.width), shell });
      page.off('pageerror', onPageError);
      page.off('console', onConsole);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ pass: true, edgeAssertions: EDGE_WIDTHS.length, representativeAssertions: REPRESENTATIVE_VIEWPORTS.length * ROUTES.length, results }, null, 2));
