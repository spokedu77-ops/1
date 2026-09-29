import nextEnv from '@next/env';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

nextEnv.loadEnvConfig(process.cwd());
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SPOKEDU_MASTER_QA_ID;
const password = process.env.SPOKEDU_MASTER_QA_PASSWORD;
if (!email || !password) throw new Error('QA credentials are required.');

const longClass = '서울특별시 중구 발달장애학생 통합체육교실 고학년 A반';
const students = Array.from({ length: 50 }, (_, index) => ({
  id: `f5-student-${index + 1}`, legacyId: null,
  name: index ? `테스트 학생 ${String(index + 1).padStart(2, '0')}` : '김대한민국초등학교긴이름학생',
  meta: '초등 5학년', guidanceNote: index ? null : '수업 전 시각 자료를 먼저 보여 주세요.\n동작은 짧게 나누어 안내합니다.',
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
}));
const classes = Array.from({ length: 20 }, (_, index) => ({
  id: `f5-class-${index + 1}`, name: index ? `운영 수업반 ${index + 1}` : longClass,
  studentIds: index === 0 ? students.slice(0, 24).map((student) => student.id) : students.slice(0, index % 5).map((student) => student.id),
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
}));
const sessions = Array.from({ length: 12 }, (_, index) => ({
  id: `f5-session-${index + 1}`, classId: classes[0].id, className: longClass,
  startAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`, endAt: `2026-09-${String(index + 1).padStart(2, '0')}T01:00:00.000Z`,
  startedAt: null, status: index < 8 ? 'completed' : 'scheduled', memo: index === 0 ? '긴 관찰 메모가 여러 줄이어도 화면 밖으로 밀리지 않아야 합니다.' : null, completedAt: index < 8 ? '2026-09-30T00:00:00.000Z' : null,
  programs: [], attendance: students.slice(0, 24).map((student, studentIndex) => ({ id: `a-${index}-${studentIndex}`, studentId: student.id, studentName: student.name, status: studentIndex % 3 === 0 ? 'absent' : 'present' })),
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
}));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => { if (message.type() === 'error' && !/favicon/i.test(message.text())) errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('input[autocomplete="username"]').fill(email);
await page.locator('input[autocomplete="current-password"]').fill(password);
await page.locator('button[type="submit"]').click();
await page.waitForURL((url) => url.pathname !== '/login', { timeout: 60_000 });
await context.route('**/api/spokedu-master/students', (route) => route.request().method() === 'GET' ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: students }) }) : route.continue());
await context.route('**/api/spokedu-master/sessions', (route) => route.request().method() === 'GET' ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { classes, sessions } }) }) : route.continue());
await mkdir('.tmp/f5-operations', { recursive: true });

const results = [];
async function audit(state) {
  await page.waitForTimeout(120);
  const metric = await page.evaluate(() => {
    const visible = (element) => element instanceof HTMLElement && element.getClientRects().length > 0;
    const smallTargets = [...document.querySelectorAll('button, a[href], summary, label:has(input)')].filter(visible).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 24), width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) }));
    return { overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), smallTargets, dialogs: document.querySelectorAll('[role="dialog"]').length, overlay: Boolean(document.querySelector('[data-nextjs-dialog], #webpack-dev-server-client-overlay')) };
  });
  results.push({ state, ...metric, pass: metric.overflow === 0 && !metric.overlay && metric.smallTargets.length === 0 });
}
async function open(path, width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(200);
}

for (const [width, height] of [[360,800],[390,844],[640,900],[767,900],[768,1024],[942,909],[1199,800],[1200,800],[1440,900],[844,390]]) {
  for (const path of ['/spokedu-master/classes', '/spokedu-master/students', '/spokedu-master/manage?tab=attendance']) {
    await open(path, width, height);
    if (path.includes('/manage')) await page.getByRole('tab', { name: '출석부' }).click();
    await audit(`${width}x${height}-${path.split('/').pop()}`);
  }
}

await open('/spokedu-master/classes/f5-class-1', 390, 844);
await audit('390-class-detail-attendance');
await page.screenshot({ path: '.tmp/f5-operations/390-class-detail.png', fullPage: false });
await page.getByRole('button', { name: '학생 관리' }).click();
await audit('390-roster-sheet');
await page.locator('button.text-rose-600').first().click();
await audit('390-nested-remove');
results.at(-1).pass &&= results.at(-1).dialogs === 2;
await page.screenshot({ path: '.tmp/f5-operations/390-nested-remove.png', fullPage: false });

await open('/spokedu-master/students', 390, 844);
await page.getByRole('button', { name: '학생 추가' }).click();
await audit('390-student-add-sheet');
await page.screenshot({ path: '.tmp/f5-operations/390-student-add.png', fullPage: false });
await open('/spokedu-master/students/f5-student-1', 390, 844);
await audit('390-student-detail-history');
await page.screenshot({ path: '.tmp/f5-operations/390-student-detail.png', fullPage: false });
await open('/spokedu-master/manage?tab=attendance', 942, 909);
await page.getByRole('tab', { name: '출석부' }).click();
const attendanceScroll = await page.locator('[data-attendance-scrollport]').evaluate((element) => element.scrollWidth > element.clientWidth);
await audit('942-attendance-matrix');
results.at(-1).attendanceInternalScroll = attendanceScroll;
await page.screenshot({ path: '.tmp/f5-operations/942-attendance.png', fullPage: false });

// F5C coverage closeout: nine distinct viewport/state combinations.
await open('/spokedu-master/classes', 360, 800);
await page.locator('main').last().evaluate((element) => { element.scrollTop = element.scrollHeight; });
await audit('F5C-A-360-classes-20-last-row');
results.at(-1).criticalActionReachable = await page.locator('a[href^="/spokedu-master/classes/f5-class-"]').last().isVisible();
results.at(-1).pass &&= results.at(-1).criticalActionReachable;

await open('/spokedu-master/classes', 430, 932);
await page.getByRole('button', { name: '수업반 만들기' }).click();
await page.locator('[data-class-create-name]').fill(longClass);
await audit('F5C-B-430-class-create-long-name');
results.at(-1).criticalActionReachable = await page.getByRole('button', { name: '수업반 만들기' }).last().isVisible();
results.at(-1).pass &&= results.at(-1).criticalActionReachable;

await open('/spokedu-master/students', 640, 900);
await page.getByRole('button', { name: '학생 추가' }).click();
await page.getByRole('dialog').locator('input').first().fill('긴 이름 학생 등록 상태');
await audit('F5C-C-640-student-add-20-memberships');
results.at(-1).membershipCount = await page.getByRole('dialog').locator('label:has(input[type="checkbox"])').count();
results.at(-1).pass &&= results.at(-1).membershipCount >= 12;

await open('/spokedu-master/classes/f5-class-1', 767, 900);
await audit('F5C-D-767-class-attendance-mobile');
results.at(-1).mobileAttendance = await page.locator('[data-attendance-session-selector]').isVisible();
results.at(-1).bottomTabBar = await page.locator('[data-spm-tabbar]').isVisible();
results.at(-1).pass &&= results.at(-1).mobileAttendance && results.at(-1).bottomTabBar;

await open('/spokedu-master/classes/f5-class-1', 834, 1194);
await page.getByRole('button', { name: '학생 관리' }).click();
await page.getByRole('button', { name: /여러 명.*등록/ }).click();
await page.getByRole('dialog').locator('textarea').fill(`${students[0].name}\n신규 학생 01\n신규 학생 02\n${students[0].name}`);
await page.getByRole('button', { name: '명단 확인' }).click();
await audit('F5C-E-834-roster-bulk-preview-duplicate');
results.at(-1).duplicateChoices = await page.getByRole('dialog').locator('input[type="radio"]').count();
results.at(-1).pass &&= results.at(-1).duplicateChoices >= 2;

await open('/spokedu-master/students', 1023, 800);
await page.locator('main').last().evaluate((element) => { element.scrollTop = element.scrollHeight; });
await audit('F5C-F-1023-students-50');
results.at(-1).studentRows = await page.locator('a[href^="/spokedu-master/students/f5-student-"]').count();
results.at(-1).bottomPadding = await page.locator('main').last().evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
results.at(-1).pass &&= results.at(-1).studentRows === 50 && results.at(-1).bottomPadding <= 32;

await open('/spokedu-master/manage', 1024, 800);
await page.getByRole('tab', { name: '출석부' }).click();
await audit('F5C-G-1024-attendance-12x24');
results.at(-1).matrixVisible = await page.locator('[data-attendance-scrollport]').isVisible();
results.at(-1).sessionColumns = await page.locator('[data-attendance-table] thead th').count() - 1;
results.at(-1).studentRows = await page.locator('[data-attendance-table] tbody tr').count();
results.at(-1).pass &&= results.at(-1).matrixVisible && results.at(-1).sessionColumns === 12 && results.at(-1).studentRows === 24;

await open('/spokedu-master/classes/f5-class-1', 1025, 800);
await audit('F5C-H-1025-class-detail-long-title');
results.at(-1).matrixVisible = await page.locator('[data-attendance-scrollport]').isVisible();
results.at(-1).studentManagement = await page.getByRole('button', { name: '학생 관리' }).isVisible();
results.at(-1).pass &&= results.at(-1).matrixVisible && results.at(-1).studentManagement;

await open('/spokedu-master/classes/f5-class-1', 1440, 900);
await audit('F5C-I-1440-class-attendance-sticky');
results.at(-1).matrixInternalScroll = await page.locator('[data-attendance-scrollport]').evaluate((element) => element.scrollWidth > element.clientWidth);
results.at(-1).stickyFirstColumn = await page.locator('[data-attendance-student-column]').evaluate((element) => getComputedStyle(element).position === 'sticky');
results.at(-1).pass &&= results.at(-1).matrixInternalScroll && results.at(-1).stickyFirstColumn;

await open('/spokedu-master/classes/f5-class-1', 390, 844);
await page.getByRole('button', { name: '학생 관리' }).click();
const rosterSearchValue = '테스트';
await page.getByRole('dialog').locator('input[placeholder="이름 검색"]').fill(rosterSearchValue);
await page.locator('button.text-rose-600').first().click();
await page.waitForTimeout(100);
const nestedFocus = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') === [...document.querySelectorAll('[role="dialog"]')].at(-1));
const parentInert = await page.getByRole('dialog').first().evaluate((element) => Boolean(element.closest('[inert]')));
await page.keyboard.press('Escape');
const parentPreserved = await page.getByRole('dialog').count() === 1 && await page.getByRole('dialog').locator('input[placeholder="이름 검색"]').inputValue() === rosterSearchValue;
results.push({ state: 'F5C-nested-dialog-quick-smoke', nestedFocus, parentInert, parentPreserved, pass: nestedFocus && parentInert && parentPreserved });

await browser.close();
const productErrors = errors.filter((message) => !message.includes('MyClassesContent.useCallback[getMySchedule]') && !message.includes('Failed to load resource: the server responded with a status of 500'));
console.log(JSON.stringify({ deepStates: results.length, results, consoleErrors: productErrors, qaNetworkNoise: errors.length - productErrors.length }, null, 2));
if (productErrors.length || results.some((result) => !result.pass)) process.exitCode = 1;
