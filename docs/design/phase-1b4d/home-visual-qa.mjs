#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import {
  checkLabel,
  measureGateway,
  measureRecords,
  measureOverflow,
  measureHero941,
  measureLab,
  REQUIRED_WIDTHS,
} from './home-visual-checks.mjs';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(docsDir, '../../..');
const outDir = path.join(docsDir, 'captures');
const port = process.env.B4D_PORT ?? '3016';
const base = `http://127.0.0.1:${port}/spokedu/`;

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('server timeout');
}

async function scrollAllSections(page) {
  for (const id of [
    'home-hero-heading',
    'home-gateway-heading',
    'home-method-heading',
    'home-records-heading',
    'home-spomove-heading',
    'home-master-heading',
    'home-final-heading',
  ]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
  }
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) {
      if (img.complete) continue;
      await new Promise((r) => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
      });
    }
    await document.fonts?.ready;
  });
}

const widths = [
  { w: 390, h: 844, n: '390' },
  { w: 767, h: 861, n: '767' },
  { w: 768, h: 861, n: '768' },
  { w: 834, h: 861, n: '834' },
  { w: 941, h: 861, n: '941' },
  { w: 1023, h: 861, n: '1023' },
  { w: 1024, h: 861, n: '1024' },
  { w: 1440, h: 900, n: '1440' },
];

let srv;
const evidence = {
  BUILD_ID: null,
  port,
  base,
  serverPid: srv?.pid ?? null,
  checks: [],
  viewports: {},
};

try {
  evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  const noSpawn = process.env.B4D_NO_SPAWN === '1';
  if (!noSpawn) {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
    evidence.serverPid = srv.pid;
  }
  await waitServer();

  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { w, h, n } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    await scrollAllSections(page);
    evidence.viewports[n] = { overflowX: await measureOverflow(page) };
  }

  const missingViewport = REQUIRED_WIDTHS.some((n) => evidence.viewports[n] == null);
  evidence.checks.push(checkLabel(!missingViewport, 'VIEWPORTS_COMPLETE', { missingViewport }));

  const overflowFailed = Object.values(evidence.viewports).some((v) => v.overflowX !== false);
  evidence.checks.push(checkLabel(!overflowFailed, 'OVERFLOW_X', { overflowFailed, viewports: evidence.viewports }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'load' });
  await scrollAllSections(page);
  const g1440 = await measureGateway(page);
  evidence.checks.push(
    checkLabel(g1440.count === 3 && g1440.rowDesktop && g1440.bordersOk, 'GATEWAY_LAYOUT_1440', g1440),
  );
  evidence.checks.push(checkLabel(g1440.bordersOk, 'GATEWAY_BORDER', g1440));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  await scrollAllSections(page);
  const g390 = await measureGateway(page);
  evidence.checks.push(
    checkLabel(g390.count === 3 && g390.colMobile && g390.bordersOk, 'GATEWAY_LAYOUT_390', g390),
  );

  const rec390 = await measureRecords(page, { mobileMinRatio: 0.6 });
  evidence.checks.push(
    checkLabel(
      rec390.tileCount === 3 &&
        rec390.allImages &&
        rec390.allLinks &&
        rec390.allInfo &&
        rec390.mobileHeightsOk,
      'RECORDS_MEDIA_HEIGHT_390',
      rec390,
    ),
  );

  await page.locator('#home-records-heading').scrollIntoViewIfNeeded();
  await page.locator('section[aria-labelledby="home-records-heading"]').screenshot({
    path: path.join(outDir, 'records-mobile-after-390.png'),
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'load' });
  await scrollAllSections(page);
  const rec1440 = await measureRecords(page);
  const galleryCols = await page.evaluate(() =>
    getComputedStyle(document.querySelector('[class*="gallery"]')).gridTemplateColumns,
  );
  const galleryColCount = galleryCols.trim().split(/\s+/).filter(Boolean).length;
  evidence.checks.push(
    checkLabel(
      rec1440.bg === 'rgb(11, 31, 70)' && rec1440.tileCount === 3 && galleryColCount >= 2,
      'RECORDS_GALLERY_1440',
      { ...rec1440, galleryCols, galleryColCount },
    ),
  );
  await page.locator('section[aria-labelledby="home-records-heading"]').screenshot({
    path: path.join(outDir, 'records-desktop-after-1440.png'),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  await page.locator('#home-master-heading').scrollIntoViewIfNeeded();
  const lab390 = await measureLab(page);
  evidence.checks.push(
    checkLabel(
      !lab390.has144 && lab390.imgNatural > 0 && lab390.objectFit === 'contain',
      'LAB_STYLE_390',
      lab390,
    ),
  );

  await page.setViewportSize({ width: 941, height: 861 });
  await page.goto(base, { waitUntil: 'load' });
  const hero941 = await measureHero941(page);
  evidence.checks.push(checkLabel(hero941.pass, 'HERO_CTA_941', hero941));

  for (const n of ['390', '941', '1440']) {
    const spec = widths.find((x) => x.n === n);
    await page.setViewportSize({ width: spec.w, height: spec.h });
    await page.goto(base, { waitUntil: 'load' });
    await scrollAllSections(page);
    await page.screenshot({ path: path.join(outDir, `home-full-${n}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  await page.locator('a[class*="btnPrimary"]').first().focus();
  await page.screenshot({ path: path.join(outDir, 'focus-navigation-390.png') });

  await browser.close();

  const anyFail = evidence.checks.some((c) => c.status === 'FAIL');
  evidence.overall = anyFail ? 'FAIL' : 'PASS';
  await writeFile(path.join(docsDir, 'FINAL_QA_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log('overall', evidence.overall);
  if (anyFail) process.exit(1);
} finally {
  if (srv && process.env.B4D_NO_SPAWN !== '1') srv.kill('SIGTERM');
}
