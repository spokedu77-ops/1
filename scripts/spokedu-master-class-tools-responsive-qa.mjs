import nextEnv from '@next/env';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.SPOKEDU_MASTER_QA_ID;
const PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('SPOKEDU_MASTER_QA_ID and SPOKEDU_MASTER_QA_PASSWORD are required.');

const LONG_CLASS = '서울특별시 중구 발달장애학생 통합체육교실 고학년 A반';
const students = Array.from({ length: 24 }, (_, index) => ({
  id: `student-f4-${index + 1}`,
  legacyId: null,
  name: index === 0 ? '서울특별시교육청부설학교긴이름학생' : `테스트 학생 ${String(index + 1).padStart(2, '0')}`,
  meta: '', guidanceNote: null, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
}));
const classes = [
  { id: 'class-f4-full', name: LONG_CLASS, studentIds: students.map((student) => student.id), createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
  { id: 'class-f4-empty', name: '학생 없는 수업반', studentIds: [], createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' },
];
const session = (id, count) => ({
  id, classId: 'class-f4-full', className: LONG_CLASS,
  startAt: '2026-09-30T00:00:00.000Z', startedAt: null, endAt: '2026-09-30T01:00:00.000Z',
  status: 'scheduled', memo: null, completedAt: null, programs: [],
  attendance: students.map((student, index) => ({ id: `attendance-${id}-${index}`, studentId: student.id, studentName: student.name, status: index < count ? 'present' : 'absent' })),
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
});
const sessions = [session('session-f4-12', 12), session('session-f4-16', 16)];
let fixtureMode = 'full';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error' && !/favicon/i.test(message.text())) errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('input[autocomplete="username"]').waitFor({ state: 'visible', timeout: 30_000 });
await page.locator('input[autocomplete="username"]').fill(EMAIL);
await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL((url) => url.pathname !== '/login', { timeout: 90_000 });
await context.route('**/api/spokedu-master/students', (route) => route.request().method() === 'GET'
  ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: fixtureMode === 'zero' ? [] : students }) })
  : route.continue());
await context.route('**/api/spokedu-master/sessions', (route) => route.request().method() === 'GET'
  ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { classes: fixtureMode === 'zero' ? [] : classes, sessions: fixtureMode === 'zero' ? [] : sessions } }) })
  : route.continue());
await mkdir('.tmp/f4-class-tools', { recursive: true });

const results = [];
const add = async (state, extra = {}) => {
  const metrics = await page.evaluate(() => {
    const visible = (element) => element instanceof HTMLElement && element.getClientRects().length > 0;
    const tabBar = document.querySelector('nav[aria-label="SPOKEDU MASTER 주요 메뉴"]');
    const smallTargets = [...document.querySelectorAll('button, a[href]')].filter(visible).filter((element) => !element.closest('.pointer-events-none.fixed')).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map((element) => ({ text: element.textContent?.trim().slice(0, 30), aria: element.getAttribute('aria-label'), width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) }));
    const content = document.querySelector('[data-class-tools-content]');
    return {
      documentOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      tabs: document.querySelectorAll('[data-class-tools-tabs] button').length,
      overlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')),
      smallTargets,
      tabBarCollision: Boolean(innerWidth <= 767 && tabBar && content && getComputedStyle(tabBar).position === 'fixed' && content.getBoundingClientRect().bottom > tabBar.getBoundingClientRect().top + 1),
    };
  });
  const pass = metrics.documentOverflow === 0 && metrics.tabs === 8 && !metrics.overlay && !metrics.tabBarCollision;
  results.push({ state, ...metrics, ...extra, pass });
};
const gotoTool = async (tool, width = 390, height = 844, sessionId = '') => {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams();
  if (tool !== 'stopwatch') params.set('tool', tool);
  if (sessionId) { params.set('session', sessionId); params.set('returnTo', `/spokedu-master/manage?session=${sessionId}`); }
  await page.goto(`${BASE}/spokedu-master/class-tools${params.size ? `?${params}` : ''}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-class-tools-tabs]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(150);
};
const shot = (name) => page.screenshot({ path: `.tmp/f4-class-tools/${name}.png`, fullPage: false });

await gotoTool('stopwatch');
await add('390-stopwatch-idle');
await page.getByRole('button', { name: '시작', exact: true }).click();
await page.waitForTimeout(180);
await page.getByRole('button', { name: '랩타임', exact: true }).click();
await page.getByRole('button', { name: '일시정지', exact: true }).click();
await shot('390-stopwatch-running-lap');
await add('390-stopwatch-running-paused-lap');

await gotoTool('timer');
await add('390-timer-idle');
await page.getByRole('button', { name: '시작', exact: true }).click();
await page.waitForTimeout(150);
await shot('390-timer-running');
await add('390-timer-running');
await page.getByRole('button', { name: '일시정지', exact: true }).click();
await add('390-timer-paused');
await page.getByRole('button', { name: '초기화', exact: true }).click();
const numberInputs = page.locator('input[type="number"]');
await numberInputs.nth(0).fill('0');
await numberInputs.nth(1).fill('1');
await page.getByRole('button', { name: '시작', exact: true }).click();
await page.waitForTimeout(1300);
await shot('390-timer-expired');
await add('390-timer-expired');

await gotoTool('scoreboard');
await page.getByRole('button', { name: '6팀', exact: true }).click();
await page.getByRole('button', { name: /1점 더하기/ }).first().click();
await shot('390-scoreboard-6');
await add('390-scoreboard-6');

await gotoTool('picker');
await page.getByRole('button', { name: '무작위 선택', exact: true }).click();
await page.waitForTimeout(1700);
await shot('390-picker-result');
await add('390-picker-result');

await gotoTool('teams');
await page.getByRole('button', { name: '4팀', exact: true }).click();
await page.getByRole('button', { name: /인원 균등 배정/ }).click();
await shot('390-teams-4');
await add('390-teams-4');

await gotoTool('order');
await shot('390-order-24');
await add('390-order-24');

await gotoTool('tournament', 390, 844, 'session-f4-16');
await page.getByRole('button', { name: /대진 시작/ }).click();
await shot('390-tournament-16');
await add('390-tournament-16', { internalScroll: await page.locator('[data-tournament-scroll]').evaluate((element) => element.scrollWidth > element.clientWidth) });

await gotoTool('ladder', 390, 844, 'session-f4-12');
await page.getByRole('button', { name: /사다리 만들기/ }).click();
await page.getByRole('button', { name: '전체 결과 공개', exact: true }).click();
await shot('390-ladder-12');
await add('390-ladder-12', { internalScroll: await page.locator('[data-ladder-scroll]').evaluate((element) => element.scrollWidth > element.clientWidth) });
await page.getByRole('button', { name: '결과 보기', exact: true }).click();
await shot('390-ladder-result-modal');
await add('390-ladder-modal', { dialog: await page.getByRole('dialog').count(), modalScrollable: await page.getByRole('dialog').evaluate((element) => element.scrollHeight <= element.clientHeight || getComputedStyle(element.querySelector('.overflow-y-auto')).overflowY === 'auto') });
await page.getByRole('button', { name: '결과 요약 닫기' }).click();

for (const [width, height] of [[768, 1024], [942, 909], [1199, 800], [1200, 800], [1440, 900]]) {
  for (const tool of ['timer', 'scoreboard', 'tournament', 'ladder']) {
    const sessionId = tool === 'tournament' ? 'session-f4-16' : tool === 'ladder' ? 'session-f4-12' : '';
    await gotoTool(tool, width, height, sessionId);
    if (tool === 'scoreboard') await page.getByRole('button', { name: '6팀', exact: true }).click();
    if (tool === 'tournament') await page.getByRole('button', { name: /대진 시작/ }).click();
    if (tool === 'ladder') await page.getByRole('button', { name: /사다리 만들기/ }).click();
    if ((width === 768 && tool === 'scoreboard') || (width === 942 && ['tournament', 'ladder'].includes(tool)) || (width >= 1199 && tool === 'ladder')) await shot(`${width}x${height}-${tool}`);
    await add(`${width}x${height}-${tool}`);
  }
}

await gotoTool('timer', 844, 390);
await page.getByRole('button', { name: '시작', exact: true }).click({ force: true });
await shot('844x390-timer-running');
await add('844x390-timer-running');
await gotoTool('ladder', 844, 390, 'session-f4-12');
await page.getByRole('button', { name: /사다리 만들기/ }).evaluate((element) => element.click());
await page.getByRole('button', { name: '전체 결과 공개', exact: true }).evaluate((element) => element.click());
await page.getByRole('button', { name: '결과 보기', exact: true }).evaluate((element) => element.click());
await shot('844x390-ladder-modal');
await add('844x390-ladder-modal', { dialog: await page.getByRole('dialog').count() });

for (const width of [360, 390, 430, 640, 767, 768, 834, 942, 1023, 1024, 1025, 1199, 1200, 1440]) {
  await gotoTool('stopwatch', width, 800);
  const selector = await page.locator('[data-class-tools-tabs]').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      display: style.display,
      columns: style.gridTemplateColumns === 'none' ? 0 : style.gridTemplateColumns.split(' ').length,
      overflowX: style.overflowX,
    };
  });
  const expected = width <= 767
    ? selector.display === 'grid' && selector.columns === 4
    : selector.display === 'flex';
  const metrics = await page.evaluate(() => ({
    documentOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    tabs: document.querySelectorAll('[data-class-tools-tabs] button').length,
  }));
  results.push({ state: `${width}-selector-boundary`, ...metrics, selector, pass: expected && metrics.documentOverflow === 0 && metrics.tabs === 8 });
}

await gotoTool('scoreboard', 1199, 800);
await page.getByRole('button', { name: '6팀', exact: true }).click();
await page.getByRole('button', { name: /1점 더하기/ }).first().click();
const scoreBeforeResize = await page.locator('[data-class-tools-content]').innerText();
await page.setViewportSize({ width: 1200, height: 800 });
const scoreAfterResize = await page.locator('[data-class-tools-content]').innerText();
results.push({ state: '1199-to-1200-scoreboard-state', pass: scoreBeforeResize === scoreAfterResize && scoreAfterResize.includes('1') });

await gotoTool('tournament', 1199, 800, 'session-f4-16');
await page.getByRole('button', { name: /대진 시작/ }).click();
const bracketBeforeResize = await page.locator('[data-tournament-scroll]').innerText();
await page.setViewportSize({ width: 1200, height: 800 });
const bracketAfterResize = await page.locator('[data-tournament-scroll]').innerText();
results.push({ state: '1199-to-1200-tournament-state', pass: bracketBeforeResize === bracketAfterResize && bracketAfterResize.length > 0 });

await gotoTool('invalid-tool', 390, 844);
results.push({ state: 'invalid-tool-fallback', pass: await page.locator('[data-class-tools-tabs] button[aria-pressed="true"]').textContent().then((label) => label?.includes('스톱워치')) });
await page.goto(`${BASE}/spokedu-master/class-tools?tool=picker&session=missing-session`, { waitUntil: 'domcontentloaded' });
await page.getByText('수업을 찾을 수 없습니다.').waitFor();
results.push({ state: 'invalid-session', pass: true });

fixtureMode = 'zero';
await gotoTool('picker', 390, 844);
const zeroText = await page.locator('[data-class-tools-content]').innerText();
results.push({ state: 'zero-students', pass: zeroText.includes('등록된 학생이 없습니다.') });

await browser.close();
console.log(JSON.stringify({ deepStates: results.length, results, consoleErrors: errors }, null, 2));
if (errors.length || results.length < 25 || results.some((result) => !result.pass)) process.exitCode = 1;
