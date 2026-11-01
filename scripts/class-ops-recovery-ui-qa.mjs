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
const originalRows = structuredClone(rows);
const browser = await chromium.launch({ headless: true }); const results = [];
try {
  for (const width of [1440, 390, 375]) {
    rows.splice(0, rows.length, ...structuredClone(originalRows));
    let failure = ''; let checks = 0; let reindexes = 0; let rereads = 0; let autoFinishBlocked = 0; let shrinks = 0;
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
        if (failure && failure !== 'reread') return json({ error: failure }, failure.includes('FORBIDDEN') ? 403 : 409);
        const row = rows.find((candidate) => candidate.id === body.sessionId);
        for (const [key, value] of Object.entries(body.expected)) if ((row[key] ?? null) !== value) return json({ error: 'SESSION_UPDATE_STALE' }, 409);
        if (failure === 'reread') return json({ ok: true, session: { ...row, ...body.patch, memo: replaceSessionAssistants(row.memo, body.assistants) } });
        Object.assign(row, body.patch); if (body.assistants) row.memo = replaceSessionAssistants(row.memo, body.assistants);
        return json({ ok: true, session: row });
      }
      if (url.pathname === '/api/admin/classes/sessions/shrink') {
        shrinks++; const body = request.postDataJSON();
        if (failure === 'shrink') return json({ error: 'SESSION_SHRINK_STALE' }, 409);
        for (const id of body.removeIds) rows.splice(rows.findIndex(row => row.id === id), 1);
        for (const patch of body.roundUpdates) Object.assign(rows.find(row => row.id === patch.id), patch);
        return json({ ok: true, deleted: body.removeIds.length });
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
    for (const code of ['TEACHER_SCHEDULE_CONFLICT', 'SESSION_UPDATE_STALE', 'SESSION_UPDATE_FORBIDDEN', 'network', 'reread']) {
      failure = code; await selects().nth(1).selectOption(ids[2]); const before = checks;
      await row.getByRole('button', { name: '보조 저장', exact: true }).click();
      await row.getByRole('alert').waitFor(); assert.equal(checks, before + 1); assert.equal(await selects().nth(1).inputValue(), ids[2]);
      if (code === 'reread') assert.match(await row.getByRole('alert').innerText(), /DB 값이 다릅니다/);
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
    rows[0].start_at = new Date(Date.now() - 3600000).toISOString();
    rows[0].end_at = new Date(Date.now() - 60000).toISOString();
    rows[0].status = 'opened';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /격리 보조강사 검증/ }).first().click();
    const summary = panel.locator('section[aria-label="수업 운영 요약"]');
    await summary.getByText('종료·미처리 1건', { exact: true }).waitFor();
    const completed = summary.locator('dt').filter({ hasText: /^완료$/ }).locator('xpath=following-sibling::dd');
    assert.equal(await completed.innerText(), '0', 'elapsed opened must not count as stored completion');
    rows[0].status = 'finished';
    await page.evaluate(() => window.dispatchEvent(new Event('classes-auto-finish-completed')));
    await summary.getByText('종료·미처리 1건', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await completed.innerText(), '1', 'automatic completion refreshes the open detail panel');
    results.at(-1).pendingSummaryAndCompletionRefresh = true;
    await panel.getByRole('button', { name: '도구', exact: true }).click();
    await panel.getByRole('spinbutton', { name: '축소 회차' }).waitFor();
    page.on('dialog', dialog => dialog.accept());
    const beforeShrink = rows.length;
    failure = 'shrink';
    await Promise.all([page.waitForResponse(response => response.url().endsWith('/sessions/shrink')), panel.getByRole('button', { name: '마지막 삭제', exact: true }).click()]);
    await page.getByText('회차 축소를 완료하지 못했습니다.', { exact: false }).waitFor();
    assert.equal(rows.length, beforeShrink, 'rejected atomic shrink deletes nothing');
    failure = '';
    await panel.getByRole('button', { name: '마지막 삭제', exact: true }).click();
    await page.getByText('회차가 축소되었습니다.', { exact: true }).waitFor();
    assert.equal(rows.length, beforeShrink - 1); assert.equal(shrinks, 2); assert.equal(reindexes, 0, 'shrink uses one transaction, no direct round writes');
    results.at(-1).atomicShrinkFailureAndSuccess = true;
    await context.close();
  }
} finally { await browser.close(); await writeFile(`${out}/ui-results.json`, JSON.stringify(results, null, 2)); }
console.log(JSON.stringify(results, null, 2));
