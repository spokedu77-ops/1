#!/usr/bin/env node
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const capDir = path.join(docsDir, 'captures');
const repoRoot = path.resolve(docsDir, '../../..');
const port = process.env.PHASE2B_PORT ?? '3019';
const base = `http://127.0.0.1:${port}`;

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/spomove/catalog`)).ok) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('server timeout');
}

function parseEnvKey(text, key) {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '').trim();
  }
  return null;
}

const envText = await readFile(path.join(repoRoot, '.env.local'), 'utf8');
const catalogUrl = parseEnvKey(envText, 'SPOMOVE_NOTION_CATALOG_URL');
if (!catalogUrl) throw new Error('SPOMOVE_NOTION_CATALOG_URL missing in .env.local for local QA');

let srv;
const evidence = {
  BUILD_ID: null,
  port,
  configQA: { envLocalSet: true, host: new URL(catalogUrl).hostname },
  contentQA: {},
  journeyQA: {},
  viewports: {},
};

try {
  evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  if (process.env.PHASE2B_NO_SPAWN !== '1') {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
  }
  await waitServer();
  await mkdir(capDir, { recursive: true });

  const browser = await chromium.launch();
  const viewports = [
    { n: '390', w: 390, h: 844 },
    { n: '941', w: 941, h: 861 },
    { n: '1440', w: 1440, h: 900 },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage();
    const consoleErr = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErr.push(m.text().slice(0, 180));
    });
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(8000);

    const probe = await page.evaluate(() => {
      const body = document.body?.innerText ?? '';
      const fallback = body.includes('전체 카탈로그를 아직 표시할 수 없습니다');
      const iframe = document.querySelector('iframe[title*="카탈로그"], iframe[title*="SPOMOVE"]');
      const rect = iframe?.getBoundingClientRect();
      return {
        fallback,
        hasIframe: Boolean(iframe),
        iframeW: rect?.width ?? 0,
        iframeH: rect?.height ?? 0,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });

    await page.screenshot({ path: path.join(capDir, `catalog-local-${vp.n}.png`) });
    if (vp.n === '390') {
      const iframe = page.locator('iframe').first();
      if (await iframe.count()) {
        await iframe.screenshot({ path: path.join(capDir, 'catalog-local-content.png') }).catch(() => {});
      }
    }

    evidence.viewports[vp.n] = { ...probe, consoleErrors: consoleErr.slice(0, 8) };
    await page.close();
  }

  // Customer journey links on 390
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load' });
  await page.waitForTimeout(5000);
  const newTab = page.waitForEvent('popup').catch(() => null);
  await page.locator('a:has-text("새 창에서 보기")').click({ timeout: 8000 }).catch(() => {});
  const popup = await newTab;
  let newWindowOk = false;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded');
    newWindowOk = (popup.url() ?? '').includes('notion');
    await popup.close();
  }
  await page.locator('a:has-text("기관 도입")').first().click();
  await page.waitForTimeout(1200);
  evidence.journeyQA = {
    newWindowOk,
    dispatchNav: page.url(),
    dispatchPass: page.url().includes('contact') || page.url().includes('education'),
  };
  await browser.close();

  const v390 = evidence.viewports['390'];
  const v1440 = evidence.viewports['1440'];
  const iframeOk = v390?.hasIframe && v390.iframeH > 120 && !v390.fallback;
  evidence.contentQA = {
    status: iframeOk ? 'PASS' : 'FAIL',
    note: 'Cross-origin iframe inner DOM not readable; PASS requires iframe geometry + no fallback + visual capture',
    iframeOk,
    fallbackOn390: v390?.fallback,
  };
  evidence.contentQADetail = 'See captures/catalog-local-content.png for visual program content check';

  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(docsDir, 'LOCAL_EMBED_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ BUILD_ID: evidence.BUILD_ID, contentQA: evidence.contentQA.status }, null, 2));
} finally {
  if (srv && process.env.PHASE2B_NO_SPAWN !== '1') srv.kill('SIGTERM');
}
