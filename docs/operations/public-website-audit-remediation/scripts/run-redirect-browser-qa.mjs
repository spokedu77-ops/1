#!/usr/bin/env node
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'qa-evidence', 'captures');
const repoRoot = path.resolve(here, '../../../..');
const port = process.env.RELEASE_GATE_PORT ?? '3041';
const base = `http://127.0.0.1:${port}`;

const redirectCases = [
  { from: '/info/curriculum?utm_source=naver&utm_campaign=%ED%95%9C%EA%B8%80', expectPath: '/education', expectQuery: ['utm_source=naver', 'program=spomove'], expectHash: 'contact' },
  { from: '/info/private?utm_medium=cpc', expectPath: '/private', expectQuery: ['utm_medium=cpc'], expectHash: 'apply' },
];

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('server timeout');
}

let srv;
const evidence = { port, redirects: [], pages: [], overall: 'FAIL', error: null };

try {
  srv = spawn('npm run start', { cwd: repoRoot, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitServer();
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const c of redirectCases) {
    const resp = await page.goto(`${base}${c.from}`, { waitUntil: 'commit', timeout: 60000 });
    const url = new URL(page.url());
    const pass =
      url.pathname === c.expectPath &&
      c.expectQuery.every((q) => url.search.includes(q.split('=')[0])) &&
      url.hash === `#${c.expectHash}`;
    evidence.redirects.push({ from: c.from, finalUrl: page.url(), status: pass ? 'PASS' : 'FAIL', chainStatus: resp?.status() });
  }

  for (const vp of [
    { w: 390, n: '390' },
    { w: 941, n: '941' },
    { w: 1440, n: '1440' },
  ]) {
    await page.setViewportSize({ width: vp.w, height: 900 });
    await page.goto(`${base}/spokedu-lab`, { waitUntil: 'load', timeout: 60000 });
    const labOk = page.url().includes('/spokedu-lab');
    await page.screenshot({ path: path.join(outDir, `spokedu-lab-${vp.n}.png`), fullPage: false });
    await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60000 });
    const homeText = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(outDir, `home-${vp.n}.png`), fullPage: false });
    await page.goto(`${base}/records`, { waitUntil: 'load', timeout: 60000 });
    const recordsOk = page.url().includes('/records');
    await page.screenshot({ path: path.join(outDir, `records-${vp.n}.png`), fullPage: false });
    await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load', timeout: 60000 });
    const catalogText = await page.locator('body').innerText();
    await page.screenshot({ path: path.join(outDir, `catalog-${vp.n}.png`), fullPage: false });
    evidence.pages.push({
      viewport: vp.n,
      catalogHasProgramTitle: catalogText.includes('프로그램 구성'),
      labLoaded: labOk,
      homeHasHero: homeText.length > 200,
      recordsLoaded: recordsOk,
    });
  }

  await page.goto(`${base}/consult`, { waitUntil: 'load' });
  const consultHtml = await page.content();
  evidence.consultDevMessageHidden = !consultHtml.includes('NEXT_PUBLIC_KAKAO_JS_KEY');

  await browser.close();
  evidence.overall =
    evidence.redirects.every((r) => r.status === 'PASS') && evidence.consultDevMessageHidden ? 'PASS' : 'FAIL';
} catch (e) {
  evidence.error = String(e?.message ?? e);
} finally {
  if (srv) srv.kill('SIGTERM');
  await writeFile(path.join(here, '..', 'qa-evidence', 'BROWSER_QA.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ overall: evidence.overall }, null, 2));
  if (evidence.overall !== 'PASS') process.exit(1);
}
