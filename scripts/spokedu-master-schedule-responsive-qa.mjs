import nextEnv from '@next/env';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.SPOKEDU_MASTER_QA_ID;
const PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error('SPOKEDU_MASTER_QA_ID and SPOKEDU_MASTER_QA_PASSWORD are required.');

const LONG_CLASS = '서울특별시 중구 발달장애학생 통합체육교실 A반';
const day = '2026-09-30';
const iso = (hour) => `${day}T${String(hour - 9).padStart(2, '0')}:00:00.000Z`;
const programs = (count, sourceType) => Array.from({ length: count }, (_, index) => ({
  id: `${sourceType}-${index}`,
  sourceType,
  programId: sourceType === 'program' ? index + 1 : null,
  spomovePresetId: sourceType === 'spomove' ? `preset-${index}` : null,
  programTitle: `${sourceType} ${index + 1}`,
  sortOrder: index,
  isCompleted: false,
}));
const fixtureSession = (id, className, hour, status = 'scheduled', extraPrograms = []) => ({
  id,
  classId: 'class-f3',
  className,
  startAt: iso(hour),
  startedAt: null,
  endAt: iso(hour + 1),
  status,
  memo: null,
  completedAt: status === 'completed' ? iso(hour + 1) : null,
  programs: extraPrograms,
  attendance: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});
const sessions = [
  fixtureSession('f3-1', LONG_CLASS, 9, 'scheduled', [...programs(2, 'program'), ...programs(1, 'spomove')]),
  fixtureSession('f3-2', '초등 A반', 11, 'completed'),
  fixtureSession('f3-3', '중등 움직임 교실', 13, 'cancelled'),
  fixtureSession('f3-4', '방과후 체육반', 15),
  fixtureSession('f3-5', '주말 통합반', 17),
  { ...fixtureSession('f3-other-1', '1개 일정반', 10), startAt: '2026-09-29T01:00:00.000Z', endAt: '2026-09-29T02:00:00.000Z' },
  { ...fixtureSession('f3-other-2', '2개 일정반', 10), startAt: '2026-09-28T01:00:00.000Z', endAt: '2026-09-28T02:00:00.000Z' },
  { ...fixtureSession('f3-other-3', '2개 일정반', 12), startAt: '2026-09-28T03:00:00.000Z', endAt: '2026-09-28T04:00:00.000Z' },
];
const viewports = [
  [360, 800], [390, 844], [430, 932], [768, 1024], [834, 1194], [942, 909], [950, 800],
  [1023, 800], [1024, 800], [1025, 800], [1199, 800], [1200, 800], [1440, 900],
];
const evidence = new Set(['390x844', '768x1024', '942x909', '1199x800', '1200x800', '1440x900']);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error' && !/favicon/i.test(message.text())) errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));

async function login() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await service.auth.admin.generateLink({ type: 'magiclink', email: EMAIL, options: { redirectTo: `${BASE}/` } });
  if (error || !data?.properties?.action_link) throw error ?? new Error('QA login link unavailable');
  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  const cookies = [];
  const ssr = createServerClient(url, anonKey, { cookies: { getAll: () => cookies, setAll: (next) => cookies.splice(0, cookies.length, ...next) } });
  const { error: verifyError } = await ssr.auth.verifyOtp({ token_hash: tokenHash, type: verificationType });
  if (verifyError) throw verifyError;
  await context.addCookies(cookies.map((cookie) => ({ name: cookie.name, value: cookie.value, url: BASE, httpOnly: cookie.options?.httpOnly, secure: cookie.options?.secure, sameSite: cookie.options?.sameSite === 'strict' ? 'Strict' : cookie.options?.sameSite === 'none' ? 'None' : 'Lax' })));
}

await login();
await context.route('**/api/spokedu-master/sessions', (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { classes: [{ id: 'class-f3', name: LONG_CLASS, studentIds: [], createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }], sessions } }) });
});
await context.route('**/api/spokedu-master/students', (route) => route.request().method() === 'GET'
  ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
  : route.continue());
await mkdir('.tmp/f3-schedule', { recursive: true });

const results = [];
for (const [width, height] of viewports) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}/spokedu-master/manage?date=${day}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-manage-calendar]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('[data-manage-agenda][data-agenda-count="5"]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(250);
  const metrics = await page.evaluate(() => {
    const visible = (element) => element instanceof HTMLElement && element.getClientRects().length > 0;
    const grid = document.querySelector('[data-manage-cal-grid]');
    const calendar = document.querySelector('[data-manage-calendar]');
    const cells = [...document.querySelectorAll('[data-manage-cal-grid] > button')];
    const lines = [...document.querySelectorAll('[data-calendar-event-line]')].filter(visible);
    const texts = [...document.querySelectorAll('[data-calendar-event-text]')].filter(visible);
    const lineCounts = texts.map((line) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      const tops = [...range.getClientRects()].map((rect) => Math.round(rect.top));
      return new Set(tops).size;
    });
    const perCellVisibleEvents = cells.map((cell) => [...cell.querySelectorAll('[data-calendar-event-line]')].filter(visible).length);
    const eventLinesInsideCells = cells.every((cell) => [...cell.querySelectorAll('[data-calendar-event-line]')].filter(visible).every((line) => line.getBoundingClientRect().bottom <= cell.getBoundingClientRect().bottom + 0.5));
    const selectedCell = cells.find((cell) => cell.getAttribute('aria-pressed') === 'true');
    return {
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      cellMin: Math.min(...cells.map((cell) => cell.getBoundingClientRect().height)),
      calendarHeight: calendar?.getBoundingClientRect().height ?? 0,
      visibleEventLabels: lines.length,
      maxEventLineCount: Math.max(0, ...lineCounts),
      maxEventsPerCell: Math.max(0, ...perCellVisibleEvents),
      eventLinesInsideCells,
      selectedHasOverflowCount: Boolean(selectedCell && [...selectedCell.querySelectorAll('span')].some((span) => span.textContent === '+3')),
      agendaCount: document.querySelectorAll('[data-manage-agenda] > button').length,
      longAgendaTitleVisible: [...document.querySelectorAll('[data-manage-agenda] button p')].some((node) => node.textContent === '서울특별시 중구 발달장애학생 통합체육교실 A반'),
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')),
    };
  });
  const mobile = width <= 767;
  const pass = metrics.columns === 7
    && metrics.cellMin >= 44
    && metrics.horizontalOverflow <= 0
    && metrics.agendaCount === 5
    && metrics.longAgendaTitleVisible
    && !metrics.errorOverlay
    && (mobile ? metrics.visibleEventLabels === 0 && metrics.calendarHeight <= 450 : metrics.maxEventLineCount <= 1 && metrics.maxEventsPerCell <= 2 && metrics.eventLinesInsideCells)
    && (mobile || metrics.selectedHasOverflowCount);
  results.push({ viewport: `${width}x${height}`, ...metrics, pass });
  const key = `${width}x${height}`;
  if (evidence.has(key)) await page.screenshot({ path: `.tmp/f3-schedule/${key}.png`, fullPage: false });
  if (key === '390x844' || key === '942x909') await page.screenshot({ path: `.tmp/f3-schedule/${key}-full.png`, fullPage: true });
  if (key === '390x844') {
    await page.getByRole('button', { name: '9월 27일, 수업 0개' }).click();
    await page.locator('[data-manage-agenda][data-agenda-count="0"]').waitFor();
    const emptyText = await page.locator('[data-manage-agenda]').innerText();
    await page.screenshot({ path: '.tmp/f3-schedule/390x844-zero-session.png', fullPage: false });
    await page.getByRole('button', { name: '9월 29일, 수업 1개' }).click();
    await page.locator('[data-manage-agenda][data-agenda-count="1"]').waitFor();
    const oneCount = await page.locator('[data-manage-agenda] > button').count();
    await page.getByRole('button', { name: '9월 30일, 수업 5개' }).click();
    results.push({ viewport: '390-agenda-states', empty: emptyText.includes('예정된 수업이 없습니다.'), oneCount, fiveCount: metrics.agendaCount, pass: emptyText.includes('예정된 수업이 없습니다.') && oneCount === 1 && metrics.agendaCount === 5 });
  }
  if (key === '1200x800') {
    await page.locator('[data-manage-agenda] > button').first().click();
    await page.locator('[data-session-detail]').waitFor({ state: 'visible', timeout: 15_000 });
    await page.screenshot({ path: '.tmp/f3-schedule/1200x800-detail-open.png', fullPage: false });
    const detailOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    results.push({ viewport: '1200x800-detail-open', horizontalOverflow: detailOverflow, detailOpen: true, pass: detailOverflow <= 0 });
  }
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/spokedu-master/activity?date=2026-08-31`, { waitUntil: 'domcontentloaded' });
await page.locator('[data-manage-calendar]').waitFor({ state: 'visible', timeout: 30_000 });
const compatibility = await page.evaluate(() => ({
  path: location.pathname,
  dayCount: document.querySelectorAll('[data-manage-cal-grid] > button').length,
  selected: document.querySelector('[data-manage-cal-grid] > button[aria-pressed="true"]')?.getAttribute('aria-label') ?? '',
}));
results.push({ viewport: 'activity-compatibility-six-week', ...compatibility, pass: compatibility.path === '/spokedu-master/activity' && compatibility.dayCount === 42 && compatibility.selected.startsWith('8월 31일') });

await browser.close();
console.log(JSON.stringify({ results, consoleErrors: errors }, null, 2));
if (errors.length || results.some((result) => !result.pass)) process.exitCode = 1;
