import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import metadata from '../app/admin/classes-shared/lib/sessionMetadata.ts';
const { replaceSessionAssistants } = metadata;

// Actual admin DOM + intercepted isolated fixture responses. No production authentication or writes.
const base = 'http://localhost:3000';
const out = '.tmp/class-ops-recovery-qa'; await mkdir(out, { recursive: true });
const ids = [1, 2, 3, 4].map((n) => `70000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const group = '80000000-0000-4000-8000-000000000001';
const teachers = ids.map((id, i) => ({ id, name: ['메인 QA', '보조 하나 QA', '보조 둘 QA', '보조 변경 QA'][i], is_active: true, session_count: 10, log_count: 0, fee_private: null, fee_group: null, fee_center_main: null, fee_center_assist: 0 }));
const date = new Date(); date.setHours(20, 0, 0, 0);
const at = (days) => new Date(+date + days * 86400000).toISOString();
const rows = [0, 7, 14].map((days, i) => ({ id: `90000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, group_id: group, title: '격리 보조강사 검증', start_at: at(days), end_at: new Date(Date.parse(at(days)) + 3600000).toISOString(), created_by: ids[0], users: { id: ids[0], name: teachers[0].name }, status: i === 2 ? 'postponed' : 'opened', session_type: 'regular_center', price: 50000, memo: '일반 메모  \nOTHER_META:{"preserve":true}', round_index: i + 1, round_total: 3, round_display: `${i + 1}/3`, sequence_number: i + 1, mileage_option: '' }));
const original = rows[0].memo;
const browser = await chromium.launch({ headless: true }); const results = [];
try {
  for (const width of [1440, 390, 375]) {
    rows[0].memo = original;
    let failure = ''; let checks = 0; let reindexes = 0; let rereads = 0; let autoFinishBlocked = 0;
    const writes = []; const errors = [];
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', async (route) => {
      const request = route.request(); const url = new URL(request.url());
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/auth/check-admin') return json({ admin: true, scope: 'admin' });
      if (url.pathname === '/api/admin/class-ops/reference') return json({ teachers });
      if (url.pathname === '/api/admin/teacher-tier-fees') return json({ fees: [] });
      if (url.pathname === '/api/admin/classes/sessions/checked-update') {
        checks++; const body = request.postDataJSON(); writes.push(body);
        if (failure === 'network') return route.abort('connectionfailed');
        if (failure) return json({ error: failure }, failure.includes('FORBIDDEN') ? 403 : 409);
        const row = rows.find((candidate) => candidate.id === body.sessionId);
        for (const [key, value] of Object.entries(body.expected)) if ((row[key] ?? null) !== value) return json({ error: 'SESSION_UPDATE_STALE' }, 409);
        Object.assign(row, body.patch); if (body.assistants) row.memo = replaceSessionAssistants(row.memo, body.assistants);
        return json({ ok: true, session: row });
      }
      if (url.pathname === '/api/admin/classes/sessions') { if (url.searchParams.has('groupIds')) rereads++; return json({ sessions: rows }); }
      if (url.pathname === '/api/sessions/auto-finish') { autoFinishBlocked++; return json({ ok: true, blockedForQa: true }); }
      if (url.pathname.includes('/rest/v1/users')) return json(teachers);
      if (url.pathname.includes('/rest/v1/session_count_logs')) return json([]);
      if (url.pathname.includes('/rest/v1/sessions') && request.method() === 'PATCH') { reindexes++; return json([{ id: rows[0].id }]); }
      if (url.host === 'cdn.jsdelivr.net' && request.method() === 'GET') return route.continue();
      if (url.host !== new URL(base).host || !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        if (!url.pathname.includes('__nextjs')) errors.push('unexpected blocked request: ' + request.method() + ' ' + url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/admin/classes/calendar', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /격리 보조강사 검증/ }).first().click();
    const panel = page.locator('aside[aria-label="수업 상세 관리"]'); await panel.waitFor();
    const row = panel.locator('input[aria-label="1회차 날짜"]:visible').locator('xpath=ancestor::div[contains(@class,"border-t")][1]'); await row.waitFor();
    const selects = () => row.locator('select:visible');
    await row.getByRole('button', { name: '보조', exact: true }).click(); assert.equal(checks, 0, 'adding blank draft must not write');
    await row.getByRole('button', { name: '보조 저장', exact: true }).click(); assert.equal(checks, 0, 'invalid draft must not write');
    await selects().nth(1).selectOption(ids[1]); await row.getByRole('button', { name: '보조 저장', exact: true }).click();
    await row.locator('[aria-label="1회차 보조강사 저장"]:visible').waitFor({ state: 'hidden' }); assert.ok(rereads >= 2);
    await row.getByRole('button', { name: '보조', exact: true }).click(); assert.equal(await selects().nth(1).inputValue(), ids[1]);
    await selects().nth(2).selectOption(ids[2]); await row.locator('input[aria-label="1회차 보조2 수업료"]:visible').fill('33000');
    await row.getByRole('button', { name: '보조 저장', exact: true }).click(); await row.locator('[aria-label="1회차 보조강사 저장"]:visible').waitFor({ state: 'hidden' });
    assert.deepEqual(writes.at(-1).assistants, [{ id: ids[1], price: 0 }, { id: ids[2], price: 33000 }]);
    await selects().nth(2).selectOption(ids[3]); await row.getByRole('button', { name: '보조 저장', exact: true }).click(); await row.locator('[aria-label="1회차 보조강사 저장"]:visible').waitFor({ state: 'hidden' });
    assert.equal(writes.at(-1).assistants[0].id, ids[1]); assert.equal(writes.at(-1).assistants[1].price, 33000);
    await row.locator('button[title="보조 제거"]:visible').first().click(); await row.getByRole('button', { name: '보조 저장', exact: true }).click(); await row.locator('[aria-label="1회차 보조강사 저장"]:visible').waitFor({ state: 'hidden' }); assert.deepEqual(writes.at(-1).assistants, [{ id: ids[3], price: 33000 }]);
    await row.getByRole('button', { name: '보조', exact: true }).click(); await selects().nth(2).selectOption(ids[3]); const beforeDuplicate = checks; await row.getByRole('button', { name: '보조 저장', exact: true }).click(); assert.equal(checks, beforeDuplicate); await row.getByRole('button', { name: '입력 취소', exact: true }).click();
    await row.getByRole('button', { name: '보조', exact: true }).click(); await selects().nth(2).selectOption(ids[0]); await row.getByRole('button', { name: '보조 저장', exact: true }).click(); assert.equal(checks, beforeDuplicate); await row.getByRole('button', { name: '입력 취소', exact: true }).click();
    for (const code of ['TEACHER_SCHEDULE_CONFLICT', 'SESSION_UPDATE_STALE', 'SESSION_UPDATE_FORBIDDEN', 'network']) {
      failure = code; await selects().nth(1).selectOption(ids[2]); const before = checks;
      await row.getByRole('button', { name: '보조 저장', exact: true }).click();
      await row.getByRole('alert').waitFor(); assert.equal(checks, before + 1); assert.equal(await selects().nth(1).inputValue(), ids[2]);
      await row.getByRole('button', { name: '입력 취소', exact: true }).click();
    }
    failure = 'TEACHER_SCHEDULE_CONFLICT'; await row.locator('input[type="time"]:visible').fill('21:30'); const beforeSchedule = checks;
    await row.getByRole('button', { name: '저장', exact: true }).click(); await page.waitForTimeout(150); assert.equal(checks, beforeSchedule + 1); assert.equal(reindexes, 0); assert.equal(await row.locator('input[type="time"]:visible').inputValue(), '21:30');
    await row.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/assistant-failed-save-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    failure = ''; await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /격리 보조강사 검증/ }).first().click(); await panel.waitFor(); await row.waitFor(); assert.equal(await selects().nth(1).inputValue(), ids[3]); assert.equal(await row.locator('input[aria-label="1회차 보조1 수업료"]:visible').inputValue(), '33000');
    await panel.getByRole('button', { name: /전체/ }).first().click();
    await panel.locator('span:visible').filter({ hasText: '과거 연기 기록 · 복구 개별 검토 필요' }).waitFor(); assert.equal(await panel.getByRole('button', { name: '연기 취소', exact: true }).count(), 0);
    await panel.locator('span:visible').filter({ hasText: '과거 연기 기록 · 복구 개별 검토 필요' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/assistant-legacy-safety-${width}.png` });
    assert.deepEqual(errors, []); results.push({ width, pass: true, checkedRequests: checks, postCommitReads: rereads, failedSaveReindexes: reindexes, autoFinishBlocked, productionMutation: 'NONE', persistenceMode: 'intercepted fixture; actual API contracts and transactions tested separately' });
    await context.close();
  }
} finally { await browser.close(); await writeFile(`${out}/ui-results.json`, JSON.stringify(results, null, 2)); }
console.log(JSON.stringify(results, null, 2));
