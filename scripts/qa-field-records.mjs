// Local browser QA. Administrator requests use an in-memory fixture, never operational writes.
// First: FIELD_RECORDS_RENDER_QA=true vitest run app/lib/field-records/contract.test.ts
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { assertLocalQaTarget, installLocalQaRouteGuard } from './lib/qa-network-guard.mjs';
const base = assertLocalQaTarget(process.env.QA_BASE_URL ?? 'http://127.0.0.1:3000').origin;
const seed = JSON.parse(readFileSync(new URL('../app/lib/field-records/approved-seed.json', import.meta.url), 'utf8'));
const out = new URL('../.tmp/field-records-qa/', import.meta.url); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext(); await installLocalQaRouteGuard(context);
await context.route('https://**', route => route.abort());
const page = await context.newPage();
const evidence = { fixturesOnly: true, layouts: [], editor: {}, filters: {} };
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.filter(link => new URL(link.href).origin === location.origin).map(link => link.outerHTML).join(''));
  const detailCss = readFileSync(new URL('../app/spokedu/website/styles/field-records.css', import.meta.url), 'utf8');
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const slug of ['home', ...seed.records.map(record => record.slug)]) {
      const markup = readFileSync(new URL(`${slug}.html`, out), 'utf8');
      await page.setContent(`<!doctype html><html lang="ko"><head><base href="${base}/">${styles}<style>${detailCss}</style></head><body><div class="phase-d-preview"><div class="website-content">${markup}</div></div></body></html>`, { waitUntil: 'networkidle' });
      await page.locator('img').evaluateAll(images => Promise.all(images.map(img => { img.loading = 'eager'; return img.decode().catch(() => {}); })));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${slug} overflows at ${width}`);
      if (slug === 'home') {
        const sizes = await page.locator('.web-case-card').evaluateAll(cards => cards.map(card => ({ width: card.clientWidth, radius: getComputedStyle(card).borderRadius })));
        assert.equal(sizes.length, 3); evidence.layouts.push({ width, slug, cards: sizes });
        await page.locator('#field-stories').screenshot({ path: new URL(`home-${width}.png`, out).pathname.replace(/^\/(\w:)/, '$1') });
      } else {
        assert.equal(await page.locator('h1').count(), 1);
        const count = await page.locator('.web-field-record-sections > section').count();
        assert.equal(count, slug === 'dongjak-spomove' ? 5 : 6);
        evidence.layouts.push({ width, slug, sections: count });
        await page.screenshot({ path: new URL(`${slug}-${width}.png`, out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
      }
      console.log(`Rendered ${slug} at ${width}px`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/records`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '특수체육', exact: true }).click();
  assert.ok(await page.locator('.web-case-card').count() > 0); evidence.filters.special = await page.locator('.web-case-card').count();
  await page.getByRole('button', { name: '개인·소그룹 체육교육', exact: true }).click();
  assert.equal(await page.locator('.web-case-card').count(), 0); assert.ok(await page.locator('.web-empty').isVisible()); evidence.filters.privateEmpty = true;
  const id = '22222222-2222-4222-8222-222222222222';
  let record = { id, slug: seed.records[0].slug, status: 'draft', draft_content: structuredClone(seed.records[0].content), published_content: null, featured_slot: null, published_at: null, revision: 1, updated_at: new Date().toISOString() };
  await context.route('**/api/auth/check-admin', route => route.fulfill({ json: { admin: true, scope: 'admin' } }));
  await context.route('**/api/admin/field-records**', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.pathname.endsWith('/media')) return route.fulfill({ json: { media: [] } });
    if (request.method() === 'PUT') {
      const body = request.postDataJSON(); assert.equal(body.revision, record.revision);
      record = { ...record, draft_content: body.content ?? record.draft_content, revision: record.revision + 1 };
    }
    return route.fulfill({ json: url.pathname === '/api/admin/field-records' ? { records: [record] } : { record } });
  });
  await page.goto(`${base}/admin/field-records/${id}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: '기본 정보', exact: true }).waitFor();
  await page.getByLabel('콘텐츠 제목', { exact: true }).fill('로컬 검증용 수정 제목');
  await page.getByRole('button', { name: '초안 저장', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '초안을 저장했습니다.' }).waitFor();
  assert.equal(record.draft_content.title, '로컬 검증용 수정 제목'); evidence.editor.saved = true;
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.getByLabel('콘텐츠 제목', { exact: true }).inputValue(), '로컬 검증용 수정 제목'); evidence.editor.reloaded = true;
  await page.locator('.bn-editor[contenteditable="true"]').waitFor();
  evidence.editor.richEditor = true;
  await page.screenshot({ path: new URL('admin-editor-1440.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400); // Existing admin drawer transitions for 300ms on breakpoint changes.
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: new URL('admin-editor-390.png', out).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  writeFileSync(new URL('results.json', out), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally { await browser.close(); }
