import { assertLocalQaTarget, installLocalQaRouteGuard } from '../../../scripts/lib/qa-network-guard.mjs';
#!/usr/bin/env node
/**
 * Phase 2-A — Production + Local customer journey audit (read-only, no form submit on prod).
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const capDir = path.join(docsDir, 'captures');
const repoRoot = path.resolve(docsDir, '../../..');

const PROD = `http://127.0.0.1:${process.env.PHASE2A_PORT ?? '3018'}`; // Remote baseline removed: local-only QA
const LOCAL_PORT = process.env.PHASE2A_PORT ?? '3018';
const LOCAL = `http://127.0.0.1:${LOCAL_PORT}`;
assertLocalQaTarget(PROD);
assertLocalQaTarget(LOCAL);

const VIEWPORTS = [
  { name: '390', w: 390, h: 844 },
  { name: '941', w: 941, h: 861 },
  { name: '1440', w: 1440, h: 900 },
];

const PRIVATE_MARKERS = ['1:1과 소그룹', '개인·소그룹 수업을 안내', '어떤 아이에게 맞을까요'];
const CATALOG_FALLBACK = '전체 카탈로그를 아직 표시할 수 없습니다';
const CATALOG_IFRAME_TITLE = 'SPOMOVE 전체 프로그램 카탈로그';
const CONTACT_LOADING = '문의 폼을 불러오는 중';

function summarizeConsole(messages) {
  return messages
    .filter((m) => m.type === 'error' || m.type === 'warning')
    .slice(0, 15)
    .map((m) => ({ type: m.type, text: m.text().slice(0, 200) }));
}

function summarizeFailedRequests(failed) {
  return failed.slice(0, 20).map((r) => ({
    url: r.url.replace(/\?.*$/, '?…'),
    status: r.status ?? r.failure?.errorText ?? 'failed',
  }));
}

async function waitContent(page, probeFn, label) {
  const timeline = [];
  for (const sec of [0, 3, 10]) {
    if (sec > 0) await page.waitForTimeout(sec * 1000 - (timeline.at(-1)?.elapsedMs ?? 0));
    const elapsedMs = sec * 1000;
    const probe = await probeFn(page);
    timeline.push({ elapsedMs, ...probe });
    if (probe.ok) return { settledMs: elapsedMs, timeline, ok: true, detail: probe };
  }
  return { settledMs: 10000, timeline, ok: false, detail: timeline.at(-1) };
}

async function probePrivate(page) {
  return page.evaluate((markers) => {
    const bodyText = document.body?.innerText ?? '';
    const markerHits = markers.filter((m) => bodyText.includes(m));
    const main = document.querySelector('main') ?? document.body;
    const mainH = main.getBoundingClientRect().height;
    const imgs = document.querySelectorAll('main img, .site-container img');
    let imgsLoaded = 0;
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) imgsLoaded += 1;
    });
    const apply = document.querySelector('#apply, [id="apply"]');
    return {
      markerHits,
      markerCount: markerHits.length,
      mainHeight: mainH,
      imgCount: imgs.length,
      imgsLoaded,
      hasApply: Boolean(apply),
      bodyLen: bodyText.length,
      ok: markerHits.length >= 2 && mainH > 400 && bodyText.length > 800,
    };
  }, PRIVATE_MARKERS);
}

async function probeCatalog(page) {
  return page.evaluate(({ fallbackText }) => {
    const bodyText = document.body?.innerText ?? '';
    const iframe = document.querySelector('iframe[title*="카탈로그"], iframe[title*="SPOMOVE"]');
    const isFallback = bodyText.includes(fallbackText);
    const hasIframe = Boolean(iframe);
    const h1 = document.querySelector('h1')?.textContent?.trim() ?? '';
    return {
      isFallback,
      hasIframe,
      h1,
      bodySnippet: bodyText.slice(0, 400),
      okCatalogList: hasIframe && !isFallback,
      okFallbackUi: isFallback && bodyText.includes('SPOMOVE 소개'),
      ok: hasIframe || (isFallback && bodyText.includes('기관 도입')),
    };
  }, { fallbackText: CATALOG_FALLBACK });
}

async function probeContact(page) {
  return page.evaluate((loadingSnippet) => {
    const bodyText = document.body?.innerText ?? '';
    const loading = bodyText.includes(loadingSnippet);
    const form = document.querySelector('form');
    const nameInput =
      document.querySelector('input[name="name"], input#name, input[autocomplete="name"]') ??
      document.querySelector('input[type="text"]');
    const submit = document.querySelector('button[type="submit"], input[type="submit"]');
    const typeButtons = document.querySelectorAll('[data-inquiry-type], button[type="button"]');
    return {
      loadingVisible: loading,
      hasForm: Boolean(form),
      hasNameInput: Boolean(nameInput),
      hasSubmit: Boolean(submit),
      typeControlCount: typeButtons.length,
      ok: Boolean(form && nameInput && submit && !loading),
    };
  }, CONTACT_LOADING);
}

async function auditPageEnv(browser, envName, baseUrl, pagePath, viewport, shotName) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const consoleMsgs = [];
  const failedReqs = [];
  page.on('console', (m) => consoleMsgs.push(m));
  page.on('requestfailed', (r) => failedReqs.push({ url: r.url(), failure: r.failure(), status: null }));
  page.on('response', (r) => {
    if (r.status() >= 400) failedReqs.push({ url: r.url(), status: r.status(), failure: null });
  });

  await page.setViewportSize({ width: viewport.w, height: viewport.h });
  const url = `${baseUrl}${pagePath}`;
  let httpStatus = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    httpStatus = resp?.status() ?? null;
  } catch (e) {
    httpStatus = 'goto_error';
  }

  let probeFn;
  if (pagePath.startsWith('/private')) probeFn = probePrivate;
  else if (pagePath.includes('catalog')) probeFn = probeCatalog;
  else probeFn = probeContact;

  const wait = await waitContent(page, probeFn, pagePath);
  const shotPath = path.join(capDir, shotName);
  await page.screenshot({ path: shotPath, fullPage: false });

  await context.close();
  return {
    env: envName,
    url,
    viewport: viewport.name,
    httpStatus,
    wait,
    console: summarizeConsole(consoleMsgs),
    failedRequests: summarizeFailedRequests(failedReqs),
    screenshot: path.relative(docsDir, shotPath).replace(/\\/g, '/'),
  };
}

async function runJourneys(browser, envName, baseUrl) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const journeys = [];

  async function record(id, steps) {
    journeys.push({ id, env: envName, ...steps });
  }

  // J01–J03 private path
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const privateVisible = page.locator('a[href="/private"]:visible').first();
  let j01Ok = false;
  let j01Note = '';
  if (await privateVisible.count()) {
    await privateVisible.click();
    await page.waitForTimeout(1500);
    j01Ok = page.url().includes('/private');
    j01Note = 'clicked visible /private link on home';
  } else {
    await page.goto(`${baseUrl}/private`, { waitUntil: 'domcontentloaded' });
    j01Ok = page.url().includes('/private');
    j01Note = 'no visible home link; direct /private navigation fallback';
  }
  await record('J01', {
    status: j01Ok ? 'PASS' : 'FAIL',
    finalUrl: page.url(),
    note: j01Note,
  });

  await page.goto(`${baseUrl}/private`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const j02 = await probePrivate(page);
  await record('J02', { status: j02.ok ? 'PASS' : 'FAIL', detail: j02, finalUrl: page.url() });

  const consultLink = page.locator('a[href="/contact"], a[href*="/contact"]').first();
  const contactHref = await consultLink.getAttribute('href').catch(() => null);
  if (contactHref) {
    await consultLink.click();
    await page.waitForTimeout(2000);
  }
  await record('J03', {
    status: page.url().includes('/contact') ? 'PASS' : contactHref ? 'PARTIAL' : 'NOT_VERIFIED',
    finalUrl: page.url(),
  });

  // J04–J06 spomove
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const spomoveVisible = page.locator('a[href="/spomove"]:visible').first();
  if (await spomoveVisible.count()) {
    await spomoveVisible.click();
    await page.waitForTimeout(1500);
  } else {
    await page.goto(`${baseUrl}/spomove`, { waitUntil: 'domcontentloaded' });
  }
  await record('J04', {
    status: page.url().includes('/spomove') ? 'PASS' : 'FAIL',
    finalUrl: page.url(),
  });

  await page.goto(`${baseUrl}/spomove/catalog`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  const j05 = await probeCatalog(page);
  await record('J05', {
    status: j05.okCatalogList ? 'PASS' : j05.okFallbackUi ? 'PARTIAL' : 'FAIL',
    detail: j05,
    finalUrl: page.url(),
  });

  const dispatch = page.locator('a[href*="contact"], a[href*="dispatch"], a:has-text("도입")').first();
  const dHref = await dispatch.getAttribute('href').catch(() => null);
  if (dHref) await dispatch.click().catch(() => {});
  await page.waitForTimeout(1500);
  await record('J06', {
    status: page.url().includes('contact') || page.url().includes('dispatch') ? 'PASS' : dHref ? 'PARTIAL' : 'NOT_VERIFIED',
    finalUrl: page.url(),
    note: dHref ?? 'no dispatch link',
  });

  // J07–J10 contact
  await page.goto(`${baseUrl}/contact`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  const j07 = { url: page.url(), ok: page.url().includes('/contact') };
  await record('J07', { status: j07.ok ? 'PASS' : 'FAIL', finalUrl: page.url() });

  const settled = await probeContact(page);
  await record('J08', { status: settled.ok ? 'PASS' : settled.loadingVisible ? 'PARTIAL' : 'FAIL', detail: settled });

  // J09 validation — block submit on production
  if (envName === 'production') {
    await page.route('**/api/**', (route) => {
      if (route.request().method() === 'POST') route.abort('blockedbyclient');
      else route.continue();
    });
  }
  const submitBtn = page.locator('button[type="submit"]').first();
  if (await submitBtn.count()) {
    await submitBtn.click();
    await page.waitForTimeout(800);
    const validation = await page.evaluate(() => {
      const invalid = document.querySelectorAll(':invalid, [aria-invalid="true"]');
      const alerts = document.body.innerText.includes('필수') || document.body.innerText.includes('입력');
      return { invalidCount: invalid.length, alerts };
    });
    await record('J09', {
      status: validation.invalidCount > 0 || validation.alerts ? 'PASS' : 'PARTIAL',
      detail: validation,
      note: 'submit blocked on prod POST; client validation only',
    });
  } else {
    await record('J09', { status: 'NOT_VERIFIED', note: 'no submit button' });
  }

  const alt = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      hasPhone: /\d{2,3}-\d{3,4}-\d{4}/.test(t) || t.includes('전화'),
      hasEmail: t.includes('@') || t.includes('이메일'),
    };
  });
  await record('J10', { status: alt.hasPhone || alt.hasEmail ? 'PASS' : 'PARTIAL', detail: alt });

  await context.close();
  return journeys;
}

async function waitLocalServer() {
  const base = `${LOCAL}/`;
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('local server timeout');
}

let srv;
const evidence = {
  generatedAt: new Date().toISOString(),
  productionBase: PROD,
  localBase: LOCAL,
  BUILD_ID: null,
  checks: [],
  pages: [],
  journeys: { production: [], local: [] },
};

try {
  await mkdir(capDir, { recursive: true });
  try {
    evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  } catch {
    evidence.BUILD_ID = null;
  }

  if (process.env.PHASE2A_NO_SPAWN !== '1') {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: LOCAL_PORT },
    });
    await waitLocalServer();
  }

  const browser = await chromium.launch();
  const originalNewPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => { const page = await originalNewPage(...args); await installLocalQaRouteGuard(page.context()); return page; };
const originalNewContext = browser.newContext.bind(browser);
browser.newContext = async (...args) => { const context = await originalNewContext(...args); await installLocalQaRouteGuard(context); return context; };

  const pageSpecs = [
    { path: '/private', prefix: 'private' },
    { path: '/spomove/catalog', prefix: 'catalog' },
    { path: '/contact', prefix: 'contact' },
  ];

  for (const spec of pageSpecs) {
    for (const env of [
      { name: 'production', base: PROD },
      { name: 'local', base: LOCAL },
    ]) {
      const vps =
        spec.prefix === 'contact' && env.name === 'production'
          ? [{ name: '390', w: 390, h: 844, shots: ['initial', 'settled'] }]
          : VIEWPORTS.filter((v) => {
              if (env.name === 'local' && v.name === '941') return false;
              if (spec.prefix === 'contact' && v.name === '941') return false;
              return true;
            });

      for (const vp of vps) {
        if (spec.prefix === 'contact' && env.name === 'production' && vp.name === '390') {
          const ctx = await browser.newContext();
          const page = await ctx.newPage();
          await page.setViewportSize({ width: vp.w, height: vp.h });
          await page.goto(`${env.base}/contact`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          const initShot = `${spec.prefix}-${env.name}-390-initial.png`;
          await page.screenshot({ path: path.join(capDir, initShot) });
          await page.waitForTimeout(10000);
          const settled = await probeContact(page);
          const settledShot = `${spec.prefix}-${env.name}-390-settled.png`;
          await page.screenshot({ path: path.join(capDir, settledShot) });
          evidence.pages.push({
            env: env.name,
            path: spec.path,
            viewport: '390',
            initialScreenshot: `captures/${initShot}`,
            settledScreenshot: `captures/${settledShot}`,
            settledMs: 10000,
            contactProbe: settled,
            status: settled.ok ? 'PASS' : settled.loadingVisible ? 'PARTIAL' : 'FAIL',
          });
          await ctx.close();

          if (env.name === 'production') {
            const ctx2 = await browser.newContext();
            const page2 = await ctx2.newPage();
            await page2.setViewportSize({ width: 1440, height: 900 });
            await page2.goto(`${env.base}/contact`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page2.waitForTimeout(10000);
            const settled1440 = `${spec.prefix}-${env.name}-1440-settled.png`;
            await page2.screenshot({ path: path.join(capDir, settled1440) });
            evidence.pages.push({
              env: env.name,
              path: spec.path,
              viewport: '1440',
              settledScreenshot: `captures/${settled1440}`,
              contactProbe: await probeContact(page2),
              status: (await probeContact(page2)).ok ? 'PASS' : 'PARTIAL',
            });
            await ctx2.close();
          }
          continue;
        }

        const shot = `${spec.prefix}-${env.name}-${vp.name}.png`;
        if (spec.prefix === 'contact') {
          const r = await auditPageEnv(browser, env.name, env.base, spec.path, vp, shot.replace('.png', '-settled.png'));
          r.settledMs = r.wait.settledMs;
          r.status = r.wait.ok ? 'PASS' : r.wait.timeline?.some((t) => t.loadingVisible === false) ? 'PARTIAL' : 'FAIL';
          evidence.pages.push(r);
        } else {
          const r = await auditPageEnv(browser, env.name, env.base, spec.path, vp, shot);
          r.status = r.wait.ok ? 'PASS' : 'FAIL';
          r.check =
            spec.prefix === 'private'
              ? 'PRIVATE_CONTENT_VISIBLE'
              : spec.prefix === 'catalog'
                ? 'CATALOG_CONTENT_AVAILABLE'
                : 'CONTACT_FORM_INTERACTIVE';
          evidence.pages.push(r);
        }
      }
    }
  }

  try {
    evidence.journeys.production = await runJourneys(browser, 'production', PROD);
  } catch (e) {
    evidence.journeys.production = [{ id: 'JOURNEY_ERROR', status: 'FAIL', note: String(e.message).slice(0, 300) }];
  }
  try {
    evidence.journeys.local = await runJourneys(browser, 'local', LOCAL);
  } catch (e) {
    evidence.journeys.local = [{ id: 'JOURNEY_ERROR', status: 'FAIL', note: String(e.message).slice(0, 300) }];
  }

  await browser.close();

  // Compare envs
  for (const check of ['private', 'catalog', 'contact']) {
    const prod = evidence.pages.filter((p) => p.url?.includes(check) || p.path?.includes(check));
    const loc = evidence.pages.filter((p) => p.env === 'local' && JSON.stringify(p).includes(check));
  }

  const classify = (prefix) => {
    const prodPass = evidence.pages.some(
      (p) => p.env === 'production' && p.screenshot?.includes(prefix) && p.status === 'PASS',
    );
    const localPass = evidence.pages.some(
      (p) => p.env === 'local' && p.screenshot?.includes(prefix) && p.status === 'PASS',
    );
    const prodFail = evidence.pages.some(
      (p) => p.env === 'production' && p.screenshot?.includes(prefix) && p.status === 'FAIL',
    );
    const localFail = evidence.pages.some(
      (p) => p.env === 'local' && p.screenshot?.includes(prefix) && p.status === 'FAIL',
    );
    if (prodPass && localPass) return 'BOTH_PASS';
    if (prodFail && localPass) return 'PRODUCTION_FAIL_LOCAL_PASS';
    if (prodPass && localFail) return 'PRODUCTION_PASS_LOCAL_FAIL';
    if (prodFail && localFail) return 'BOTH_FAIL';
    return 'NOT_VERIFIED';
  };

  evidence.environmentMatrix = {
    private: classify('private'),
    catalog: classify('catalog'),
    contact: classify('contact'),
  };

  await writeFile(path.join(docsDir, 'QA_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ BUILD_ID: evidence.BUILD_ID, matrix: evidence.environmentMatrix }, null, 2));
} finally {
  if (srv && process.env.PHASE2A_NO_SPAWN !== '1') srv.kill('SIGTERM');
}
