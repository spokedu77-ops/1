import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { applyMasterAdminSession } from './lib/spokedu-master-admin-auth.mjs';
const base = 'http://localhost:3000';
const out = '.tmp/class-create-qa';
await mkdir(out, { recursive: true });
const teachers = [
  { id: '11111111-1111-4111-8111-111111111111', name: '김선생', session_count: 84, fee_private: null, fee_group: null, fee_center_main: null, fee_center_assist: null },
  { id: '22222222-2222-4222-8222-222222222222', name: '박선생', session_count: 120, fee_private: null, fee_group: null, fee_center_main: null, fee_center_assist: 0 },
];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, serviceWorkers: 'block' });
  await applyMasterAdminSession(context, base, 'spm.qa.admin@spokedu.test');
  let inserts = []; let saveNumber = 0; const unexpectedWrites = [];
  await context.route('**/*', async (route) => {
    const req = route.request(); const url = new URL(req.url());
    const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname.includes('/rest/v1/users')) return json(teachers);
    if (url.pathname.includes('/rest/v1/session_count_logs')) return json([]);
    if (url.pathname.includes('/rest/v1/sessions')) {
      if (req.method() === 'POST') {
        inserts = req.postDataJSON(); saveNumber++;
        return json(saveNumber === 1 ? { code: '23P01', message: 'TEACHER_SCHEDULE_CONFLICT' } : [], saveNumber === 1 ? 409 : 201);
      }
      return json([]);
    }
    if (url.pathname === '/api/admin/teacher-tier-fees') return json({ fees: [] });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !url.pathname.includes('/auth/v1/')) {
      if (!url.pathname.includes('auto-finish') && !url.pathname.includes('__nextjs')) unexpectedWrites.push(url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/admin/classes/list?create=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '수업 개설', exact: true }).waitFor();
  await page.getByRole('button', { name: '센터 수업', exact: true }).click();
  await page.getByLabel('수업명', { exact: true }).fill('요일별 배정 검증');
  await page.getByLabel('첫 수업일', { exact: true }).fill('2026-10-28');
  await page.getByRole('button', { name: '주 2회', exact: true }).click();
  const first = page.locator('section[aria-label="수요일 설정"]');
  const second = page.locator('section[aria-label="토요일 설정"]');
  await first.locator('select').nth(1).selectOption(teachers[0].id);
  await first.getByLabel('시작 시간', { exact: true }).fill('19:00');
  await first.locator('select').nth(0).selectOption('90');
  await first.getByRole('button', { name: '+ 보조강사 추가', exact: true }).click();
  await first.getByLabel('보조 1 강사', { exact: true }).selectOption(teachers[1].id);
  if (await first.getByLabel('보조 1 수업료').inputValue() !== '0') throw new Error('explicit zero assistant fee was lost');
  await page.getByRole('button', { name: '첫 요일 설정을 다른 요일에 복사' }).click();
  if (await second.getByLabel('시작 시간', { exact: true }).inputValue() !== '19:00') throw new Error('copy time failed');
  if (await second.getByLabel('보조 1 강사').inputValue() !== teachers[1].id) throw new Error('copy assistant failed');
  await second.getByLabel('보조 1 제거').click();
  await second.locator('select').nth(1).selectOption(teachers[1].id);
  await second.getByLabel('시작 시간', { exact: true }).fill('10:30');
  await second.locator('select').nth(0).selectOption('60');
  await page.screenshot({ path: out + '/settings-1440.png', fullPage: true });
  await page.getByRole('button', { name: '회차 설정으로', exact: true }).click();
  await page.getByRole('region', { name: '회차별 일정 편집' }).waitFor();
  if (await page.getByRole('article').count() !== 4) throw new Error('expected four generated rounds');
  await page.getByRole('article').first().getByLabel('메인 회당 금액(원)').fill('12345');
  await page.getByRole('button', { name: '기본 설정 수정' }).click();
  if (await second.getByLabel('시작 시간', { exact: true }).inputValue() !== '10:30') throw new Error('draft lost during step navigation');
  for (const width of [1440, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 950 });
    await page.screenshot({ path: out + '/settings-' + width + '.png', fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('page overflow at ' + width);
    const badInput = await page.locator('input:visible,select:visible').evaluateAll(elements => elements.some(element => element.getBoundingClientRect().width < 60));
    if (badInput) throw new Error('collapsed input at ' + width);
  }
  await page.getByRole('button', { name: '회차 설정으로', exact: true }).click();
  if (await page.getByRole('article').first().getByLabel('메인 회당 금액(원)').inputValue() !== '12345') throw new Error('round edits lost during step navigation');
  await page.screenshot({ path: out + '/rounds-375.png', fullPage: true });
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await page.waitForTimeout(400);
  if (saveNumber !== 1 || !await page.getByRole('region', { name: '회차별 일정 편집' }).isVisible()) throw new Error('failed save lost draft');
  if (inserts.length !== 4) throw new Error('wrong insert count');
  if (inserts[0].created_by !== teachers[0].id || inserts[1].created_by !== teachers[1].id) throw new Error('wrong weekday assignment');
  if (!inserts[0].memo?.includes('"price":0') || inserts[1].memo) throw new Error('assistant payload mismatch');
  if (new Date(inserts[0].end_at) - new Date(inserts[0].start_at) !== 90 * 60000) throw new Error('wrong duration');
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await page.getByRole('heading', { name: '수업 개설', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '새 수업 개설', exact: true }).click();
  await page.getByRole('button', { name: '단일 수업', exact: true }).click();
  if (await page.locator('section[aria-label$="요일 설정"]').count() !== 1) throw new Error('single preset failed');
  await page.getByRole('button', { name: '주 3회', exact: true }).click();
  if (await page.locator('section[aria-label$="요일 설정"]').count() !== 3) throw new Error('3-day preset failed');
  await page.getByRole('button', { name: '주 5회', exact: true }).click();
  if (await page.locator('section[aria-label$="요일 설정"]').count() !== 5) throw new Error('5-day preset failed');
  if (unexpectedWrites.length || errors.length) throw new Error(JSON.stringify({ unexpectedWrites, errors }));
  console.log(JSON.stringify({ desktopMobileWidths: [1440, 1024, 768, 390, 375], weekdayAssignment: 'PASS', copy: 'PASS', assistantZero: 'PASS', draftRetention: 'PASS', failedSaveRetention: 'PASS', interceptedSavePayload: 'PASS', successClose: 'PASS', productionWrites: 0, errors }));
} finally { await browser.close(); }
