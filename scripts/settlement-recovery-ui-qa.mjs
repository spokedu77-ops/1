// Historical pre-correction snapshot regression fixture. Amounts below are not current payroll.
// Current operating result is documented in docs/audits/2026-11-01-bukseoul-assistant-correction.md.
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Read-only local rendering against a separately captured, contact-free audit snapshot.
const base = process.argv[2] || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local QA only');
const out = '.tmp/settlement-recovery-qa';
await mkdir(out, { recursive: true });
const fixture = JSON.parse(await readFile(process.argv[3] || `${out}/fixtures.json`, 'utf8'));
const master = fixture.users.find(user => user.name === '최지훈');
const expires = Math.floor(Date.now() / 1000) + 86400;
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
// Deliberately unsigned fixture token. All browser auth/data traffic is intercepted below.
const access = `${b64({ alg: 'none' })}.${b64({ sub: master.id, exp: expires, role: 'authenticated' })}.fixture`;
const session = { access_token: access, refresh_token: 'local-fixture-only', token_type: 'bearer', expires_at: expires, expires_in: 86400,
  user: { id: master.id, email: 'choijihoon@spokedu.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated' } };
const cookie = `base64-${b64(session)}`;
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
    let writes = 0;
    let failRead = false;
    const errors = [];
    await context.addInitScript(({ cookie }) => {
      document.cookie = `sb-mwgvserdyflsqyhcqecp-auth-token=${cookie}; path=/; SameSite=Lax`;
    }, { cookie });
    await context.route('**/*', async route => {
      const req = route.request(); const url = new URL(req.url());
      const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/api/auth/check-admin') return json({ admin: true, scope: 'admin' });
      if (url.pathname === '/api/admin/consult/summary') return json({ pending: 0, pendingCount: 0 });
      if (url.pathname.includes('/rest/v1/')) {
        if (req.method() !== 'GET') { writes++; return route.abort(); }
        if (url.pathname.endsWith('/users')) return json(fixture.users);
        if (url.pathname.endsWith('/sessions')) return failRead ? json({ message: 'QA read failed' }, 500) : json(url.searchParams.has('status') ? fixture.sessions.filter(s => ['finished', 'verified'].includes(s.status)) : fixture.sessions);
        if (url.pathname.endsWith('/settlements')) return json(fixture.settlements);
        return json([]);
      }
      if (url.pathname.includes('/auth/v1/')) return json(session);
      if (url.host !== new URL(base).host) return route.abort();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && !url.pathname.startsWith('/__nextjs')) { writes++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/admin/master/reports?tab=teacher`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('heading', { name: 'Payroll', exact: true }).waitFor({ timeout: 30000 });
    const filters = page.locator('select');
    await filters.nth(0).selectOption('2026');
    await filters.nth(1).selectOption('10');
    await page.getByRole('button', { name: '16-말일', exact: true }).click();
    await page.getByRole('heading', { name: /정산 확인 필요/ }).waitFor();
    await page.getByRole('heading', { name: /이승범 T/ }).waitFor();
    const heading = page.getByRole('heading', { name: /강승현 T/ });
    await heading.click();
    await page.getByText('가재울청소년센터 부스', { exact: true }).waitFor();
    const text = await page.locator('body').innerText();
    assert.ok(text.includes('190,000'), 'Kang gross includes recovered 60,000');
    assert.ok(text.includes('3,710,000'), 'headline gross includes all recipients and 30,000 adjustment');
    assert.ok(text.includes('미완료로 제외된 확인 대상 금액: 0원'), 'remaining opened fee total');
    assert.ok(text.includes('비활성 · 과거 정산 포함'), 'inactive recipient visible');
    assert.ok(text.includes('금액 확인 필요'), 'malformed metadata is visible, never silently zero');
    await page.getByRole('heading', { name: 'Payroll', exact: true }).scrollIntoViewIfNeeded();
    await page.evaluate(() => { for (const animation of document.getAnimations()) if (Number.isFinite(animation.effect?.getComputedTiming().endTime)) animation.finish(); });
    await page.screenshot({ path: `${out}/overview-${width}.png`, fullPage: true });
    await page.getByText('가재울청소년센터 부스', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/detail-${width}.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'responsive page overflow');
    await page.getByRole('button', { name: '세금 계산용 (월별 세전)', exact: true }).click();
    await page.getByRole('cell', { name: /이승범/ }).waitFor();
    failRead = true;
    await page.getByRole('button', { name: '세금 계산용 (월별 세전)', exact: true }).click();
    await page.getByText('월별 세전 내역을 조회하지 못했습니다. 다시 조회해 주세요.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('cell', { name: /이승범/ }).count(), 0, 'failed monthly read hides old tax data');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button', { name: '다시 조회', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: /강승현 T/ }).count(), 0, 'failed read must hide old payroll');
    assert.equal(writes, 0, 'no operational write attempts');
    assert.deepEqual(errors, []);
    results.push({ width, recoveredGross: 190000, reportGross: 3710000, pendingGross: 0, inactiveVisible: true, readFailureHidesStale: true, monthlyFailureHidesStale: true, writes, overflow, errors });
    await context.close();
  }
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
