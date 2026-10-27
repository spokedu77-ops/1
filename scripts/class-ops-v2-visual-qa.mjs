import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { applyMasterAdminSession } from './lib/spokedu-master-admin-auth.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';
const out = path.resolve('docs/design/class-ops-v2');
await mkdir(out, { recursive: true });
const teachers = [
  { id: '11111111-1111-4111-8111-111111111111', name: '김서윤', is_active: true, session_count: 103, log_count: 25, fee_private: null, fee_group: 42000, fee_center_main: null, fee_center_assist: null },
  { id: '22222222-2222-4222-8222-222222222222', name: '박하늘', is_active: true, session_count: 70, log_count: 14, fee_private: null, fee_group: 39000, fee_center_main: null, fee_center_assist: 0 },
];
const tierFees = [
  { tier_id: 'rookie', fee_private: 30000, fee_group: 35000, fee_center_main: 42500, fee_center_assist: 25000 },
  { tier_id: 'silver', fee_private: 31000, fee_group: 37500, fee_center_main: 42500, fee_center_assist: 27500 },
  { tier_id: 'gold', fee_private: 32000, fee_group: 40000, fee_center_main: 45000, fee_center_assist: 30000 },
  { tier_id: 'diamond', fee_private: 33000, fee_group: 42500, fee_center_main: 47500, fee_center_assist: 32500 },
  { tier_id: 'partner', fee_private: 35000, fee_group: 45000, fee_center_main: 50000, fee_center_assist: 35000 },
];
const now = new Date();
const day = now.getDate();
const at = (offset, hour, minute = 0) => new Date(now.getFullYear(), now.getMonth(), day + offset, hour, minute).toISOString();
const statuses = ['opened', 'finished', 'postponed', 'cancelled'];
const sessions = Array.from({ length: 12 }, (_, index) => ({
  id: `dense-${index + 1}`, title: index === 2 ? '아주 긴 수업명과 기관명을 함께 확인하는 유소년 통합 체육 프로그램' : `밀집 일정 수업 ${index + 1}`,
  start_at: at(0, 8 + Math.floor(index / 2), (index % 2) * 30), end_at: at(0, 9 + Math.floor(index / 2), (index % 2) * 30),
  session_type: index === 5 ? 'special_lecture' : 'regular_center', group_id: 'group-dense',
  created_by: '11111111-1111-4111-8111-111111111111', users: { id: '11111111-1111-4111-8111-111111111111', name: '김서윤' }, students_text: index === 2 ? '서울특별시 어린이 체육문화센터 긴 기관명' : '한빛센터',
  memo: index % 3 === 0 ? 'EXTRA_TEACHERS:[{"id":"22222222-2222-4222-8222-222222222222","price":0}]' : '', round_display: `${index + 1}/12`, status: statuses[index % statuses.length], price: 45000,
  mileage_option: '', round_index: index + 1, round_total: 12,
}));
sessions.push({ ...sessions[0], id: 'tomorrow-1', title: '내일 체육', start_at: at(1, 14), end_at: at(1, 15), group_id: 'group-next', round_index: 1, round_display: '1/8', round_total: 8, status: 'opened' });

const browser = await chromium.launch({ headless: true });
const authContext = await browser.newContext();
await applyMasterAdminSession(authContext, baseUrl, 'spm.qa.admin@spokedu.test');
const storageState = await authContext.storageState();
await authContext.close();
const widths = [1440, 1280, 1024, 958, 768, 390, 375];
const results = [];
for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: width <= 768 ? 900 : 1000 }, storageState, serviceWorkers: 'block' });
  const writes = [];
  await context.route('**/api/auth/check-admin', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"admin":true,"scope":"admin"}' }));
  await context.route('**/api/admin/classes/sessions**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessions }) }));
  await context.route('**/api/admin/class-ops/reference', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ teachers }) }));
  await context.route('**/api/admin/teacher-tier-fees', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ fees: tierFees }) }));
  await context.route('**/rest/v1/users**', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-1/2' }, body: JSON.stringify(teachers) }));
  await context.route('**/rest/v1/session_count_logs**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await context.route('**/*', route => {
    const request = route.request();
    if (request.url().includes('/auth/v1/')) return route.fallback();
    if (!['GET', 'HEAD'].includes(request.method())) { writes.push(`${request.method()} ${request.url()}`); return route.abort('blockedbyclient'); }
    return route.fallback();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/admin/classes/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  if (new URL(page.url()).pathname !== '/admin/classes/calendar') await page.goto(`${baseUrl}/admin/classes/calendar`, { waitUntil: 'domcontentloaded' });
  await page.locator('#class-ops-calendar').waitFor();
  await page.screenshot({ path: path.join(out, `calendar-${width}.png`), fullPage: true });
  const monthVisible = await page.locator('[data-class-ops-view="month"]').isVisible();
  const threeDayVisible = await page.locator('[data-class-ops-view="three-day"]').isVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (width >= 1024 && !monthVisible) errors.push('monthly view missing');
  if (width < 1024 && !threeDayVisible) errors.push('three-day view missing');
  if (width === 1440) {
    await page.getByRole('button', { name: /개 전체 보기/ }).first().click();
    await page.screenshot({ path: path.join(out, 'dense-day-1440.png'), fullPage: true });
    await page.getByRole('dialog').getByRole('button', { name: /밀집 일정 수업 1/ }).first().click();
    await page.locator('aside[aria-label="수업 상세 관리"]').waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, 'modal-1440.png'), fullPage: true });
  }
  if (width === 390) {
    await page.getByRole('button', { name: /밀집 일정 수업 1/ }).first().click();
    await page.locator('aside[aria-label="수업 상세 관리"]').waitFor();
    await page.screenshot({ path: path.join(out, 'modal-390.png'), fullPage: true });
  }
  results.push({ width, monthVisible, threeDayVisible, overflow, writes: writes.filter(value => !value.includes('/api/sessions/auto-finish') && !value.includes('/__nextjs_original-stack-frames')), autoFinishBlocked: writes.filter(value => value.includes('/api/sessions/auto-finish')).length, errors: errors.filter(error => !error.includes('Failed to load resource')) });
  await context.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
if (results.some(result => result.overflow || result.writes.length || result.errors.length)) process.exitCode = 1;
