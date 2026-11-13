import { chromium } from 'playwright';
import nextEnv from '@next/env';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { assertLocalQaTarget, isForbiddenQaRequest } from './lib/qa-network-guard.mjs';

nextEnv.loadEnvConfig(process.cwd());
const base = 'http://127.0.0.1:3000';
assertLocalQaTarget(base);
const out = 'artifacts/library-detail-all';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { cases: [], errors: [], writes: [] };
const clean = a => (a ?? []).map(s => s.trim()).filter(Boolean);
const normalize = s => s.replace(/\s+/g, ' ').trim();
try {
  const context = await browser.newContext();
  await context.route('**/*', async route => {
    const request = route.request();
    if (isForbiddenQaRequest(request.url())) return route.abort();
    if (request.url().startsWith(`${base}/api/spokedu-master/`) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      report.writes.push({ path: new URL(request.url()).pathname, method: request.method() });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(`${base}/login`);
  await page.locator('input[name=spk-account]').fill('spm.qa.admin@spokedu.test');
  await page.locator('input[name=spk-secret]').fill(process.env.SPM_QA_PASSWORD);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 60000 });
  const access = await (await context.request.get(`${base}/api/spokedu-master/access`)).json();
  assert(access.isAdmin === true || access.data?.isAdmin === true);
  assert(access.canUseLibrary === true || access.data?.canUseLibrary === true);
  const payload = await (await context.request.get(`${base}/api/spokedu-master/programs`)).json();
  const programs = payload.data;
  assert(programs.length > 0);
  report.programCount = programs.length;
  const longest = [...programs].sort((a,b) => b.title.length-a.title.length)[0];
  const sparsest = [...programs].sort((a,b) => JSON.stringify(a.lessonDetail ?? {}).length-JSON.stringify(b.lessonDetail ?? {}).length)[0];
  const samples = new Set(['198', '201', String(longest.id), String(sparsest.id), ...[...new Set(programs.map(p=>p.category))].map(c=>String(programs.find(p=>p.category===c).id))]);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const program of programs) {
      if (process.env.QA_CAPTURE_ONLY === '1' && !samples.has(String(program.id))) continue;
      await page.goto(`${base}/spokedu-lab/library/${encodeURIComponent(program.id)}`, { waitUntil: 'domcontentloaded' });
      const root = page.locator('[data-library-detail-v2]');
      await root.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const title = await root.locator('h1').innerText();
      assert(normalize(title).includes(normalize(program.title.replace(/\s*\([^()]+\)\s*$/, ''))), `Title ${program.id}`);
      const detail = program.lessonDetail;
      const method = clean(detail?.rules?.length ? detail.rules : program.steps);
      assert.deepEqual(await root.locator('[data-v2-card="method"] li p').allTextContents(), method);
      const text = normalize(await root.textContent());
      for (const item of [...clean(detail?.variations), ...clean(detail?.briefingNotes), ...clean(detail?.fieldTips), ...clean(detail?.setupNotes), ...clean(detail?.safetyNotes), ...clean(program.equipment)]) {
        assert(text.includes(normalize(item)), `Missing content ${program.id}: ${item}`);
      }
      if (detail?.coachScript?.trim()) {
        const actual = normalize(await root.locator('blockquote').textContent());
        assert.equal(actual, normalize(detail.coachScript.replace(/\\r\\n|\\n|\\r/g, '\n')), `Script ${program.id}`);
      }
      const geometry = await root.evaluate(el => {
        const boundary = el.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth,
          clipped: [...el.querySelectorAll('h1,h2,button,p,dd')].some(e=>e.scrollWidth>e.clientWidth+1),
          outside: [...el.querySelectorAll('[data-v2-card]')].some(e=>{const r=e.getBoundingClientRect();return r.left<boundary.left-1||r.right>boundary.right+1;}) };
      });
      assert(!geometry.overflow && !geometry.clipped && !geometry.outside, `Layout ${program.id}/${width}: ${JSON.stringify(geometry)}`);
      if (samples.has(String(program.id))) {
        await root.locator('img').evaluateAll(images => Promise.race([
          Promise.all(images.map(img => { img.loading = 'eager'; return img.decode().catch(()=>{}); })),
          new Promise(resolve => setTimeout(resolve, 3000)),
        ]));
        const height = await page.locator('[data-spm-app-shell]').evaluate(el=>Math.ceil(el.scrollHeight)+180);
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(500);
        await root.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)p.scrollTop=0;window.scrollTo(0,0);});
        await page.screenshot({ path: `${out}/${program.id}-${width}.png`, fullPage: true, timeout: 30000 });
        await page.setViewportSize({ width, height: 1000 });
      }
      report.cases.push({ id: program.id, width, methodCount: method.length, ...geometry });
      if (report.cases.length % 24 === 0) console.log(JSON.stringify({ checked: report.cases.length, total: programs.length*2 }));
    }
  }
  assert.equal(report.errors.length, 0);
  await writeFile(`${out}/${process.env.QA_CAPTURE_ONLY === '1' ? 'capture-report' : 'report'}.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify({ programs: programs.length, cases: report.cases.length, errors: report.errors }));
} catch (error) {
  await writeFile(`${out}/failure.json`, JSON.stringify({ ...report, failure: String(error) },null,2));
  throw error;
} finally { await browser.close(); }
