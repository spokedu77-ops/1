#!/usr/bin/env node
/**
 * RUNTIME VISUAL CONTRACT — home /spokedu/ (7 sections).
 * Exit 1 on any FAIL. Requires fresh production server + BUILD_ID.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(docsDir, '../../..');
const outDir = path.join(docsDir, 'captures');
const port = process.env.B4C_PORT ?? '3015';
const base = `http://127.0.0.1:${port}/spokedu/`;
const mode = process.argv[2] ?? 'after';

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

function status(label, pass, detail) {
  return { label, status: pass ? 'PASS' : 'FAIL', detail };
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
    await page.waitForTimeout(120);
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

async function measureGateway(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[class*="gatewayCard"]')].filter(
      (el) => el.tagName === 'A' && el.querySelector('[class*="gatewayCardTitle"]'),
    );
    const rects = cards.map((c) => c.getBoundingClientRect());
    const cs = cards[0] ? getComputedStyle(cards[0]) : null;
    const row =
      rects.length === 3 &&
      Math.abs(rects[0].top - rects[1].top) < 8 &&
      Math.abs(rects[1].top - rects[2].top) < 8;
    const col =
      rects.length === 3 &&
      rects[1].top > rects[0].bottom - 4 &&
      rects[2].top > rects[1].bottom - 4;
    return {
      count: cards.length,
      rowDesktop: row,
      colMobile: col,
      borderWidth: cs?.borderWidth,
      bg: cs?.backgroundColor,
    };
  });
}

async function measureRecords(page) {
  return page.evaluate(() => {
    const section = document.querySelector('#home-records-heading')?.closest('section');
    const bg = section ? getComputedStyle(section).backgroundColor : null;
    const tiles = section?.querySelectorAll('[class*="tileCard"]') ?? [];
    const info = section?.querySelector('[class*="tileInfo"]');
    return {
      tileCount: tiles.length,
      bg,
      infoBg: info ? getComputedStyle(info).backgroundColor : null,
    };
  });
}

async function measureLab(page) {
  return page.evaluate(() => {
    const section = document.querySelector('#home-master-heading')?.closest('section');
    const text = section?.textContent ?? '';
    const img = section?.querySelector('.productFrame img, [class*="productFrame"] img');
    const cs = img ? getComputedStyle(img) : null;
    return {
      has144: /144\+/.test(text),
      objectFit: cs?.objectFit,
      imgNatural: img?.naturalWidth ?? 0,
    };
  });
}

async function measureHero941(page) {
  await page.locator('section[aria-labelledby="home-hero-heading"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() => {
    const primary = document.querySelector('section[aria-labelledby="home-hero-heading"] a[class*="btnPrimary"]');
    const secondary = document.querySelector('section[aria-labelledby="home-hero-heading"] a[class*="btnSecondary"]');
    const r = primary?.getBoundingClientRect();
    const s = secondary?.getBoundingClientRect();
    const vh = window.innerHeight;
    const pass =
      r &&
      s &&
      r.top >= 0 &&
      s.top >= 0 &&
      r.bottom <= vh &&
      s.bottom <= vh;
    return { ctaBottom: r?.bottom, secondaryBottom: s?.bottom, vh, pass: Boolean(pass) };
  });
}

let srv;
const evidence = { BUILD_ID: null, port, base, mode, checks: [], viewports: {} };

try {
  evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  try {
    await waitServer();
  } catch {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
    await waitServer();
  }

  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

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

  for (const { w, h, n } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    await scrollAllSections(page);
    evidence.viewports[n] = {
      overflowX: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    };
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'load' });
  await scrollAllSections(page);
  const g1440 = await measureGateway(page);
  evidence.checks.push(
    status('GATEWAY_LAYOUT_1440', g1440.count === 3 && g1440.rowDesktop, g1440),
  );
  if (mode === 'after') {
    await page.locator('#home-gateway-heading').scrollIntoViewIfNeeded();
    await page.locator('section[aria-labelledby="home-gateway-heading"]').screenshot({
      path: path.join(outDir, 'after-gateway-1440.png'),
    });
    await page.locator('#home-records-heading').scrollIntoViewIfNeeded();
    await page.locator('section[aria-labelledby="home-records-heading"]').screenshot({
      path: path.join(outDir, 'after-records-1440.png'),
    });
    await page.locator('#home-method-heading').scrollIntoViewIfNeeded();
    await page.locator('section[aria-labelledby="home-method-heading"]').screenshot({
      path: path.join(outDir, 'after-method-1440.png'),
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  await scrollAllSections(page);
  const g390 = await measureGateway(page);
  evidence.checks.push(
    status('GATEWAY_LAYOUT_390', g390.count === 3 && g390.colMobile, g390),
  );
  const rec390 = await measureRecords(page);
  evidence.checks.push(
    status('RECORDS_LAYOUT_390', rec390.tileCount === 3, rec390),
  );
  const lab390 = await measureLab(page);
  evidence.checks.push(
    status('LAB_STYLE_390', !lab390.has144 && lab390.imgNatural > 0, lab390),
  );

  if (mode === 'after') {
    await page.locator('section[aria-labelledby="home-gateway-heading"]').screenshot({
      path: path.join(outDir, 'after-gateway-390.png'),
    });
    await page.locator('section[aria-labelledby="home-records-heading"]').screenshot({
      path: path.join(outDir, 'after-records-390.png'),
    });
    await page.locator('section[aria-labelledby="home-method-heading"]').screenshot({
      path: path.join(outDir, 'after-method-390.png'),
    });
    await page.locator('section[aria-labelledby="home-spomove-heading"]').screenshot({
      path: path.join(outDir, 'after-spomove-390.png'),
    });
    await page.locator('section[aria-labelledby="home-master-heading"]').screenshot({
      path: path.join(outDir, 'after-lab-390.png'),
    });
    await page.locator('section[aria-labelledby="home-final-heading"]').screenshot({
      path: path.join(outDir, 'after-finalcta-390.png'),
    });

    for (const n of ['390', '834', '941', '1440']) {
      const spec = widths.find((x) => x.n === n);
      await page.setViewportSize({ width: spec.w, height: spec.h });
      await page.goto(base, { waitUntil: 'load' });
      await scrollAllSections(page);
      await page.screenshot({ path: path.join(outDir, `home-full-${n}.png`), fullPage: true });
    }
  }

  await page.setViewportSize({ width: 941, height: 861 });
  await page.goto(base, { waitUntil: 'load' });
  await scrollAllSections(page);
  const hero941 = await measureHero941(page);
  evidence.checks.push(status('HERO_CTA_941', hero941.pass, hero941));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load' });
  const labMobile = await measureLab(page);
  evidence.checks.push(
    status(
      'LAB_OBJECT_FIT_MOBILE',
      labMobile.objectFit === 'contain',
      labMobile,
    ),
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: 'load' });
  const rec1440 = await measureRecords(page);
  evidence.checks.push(
    status(
      'RECORDS_BG_1440',
      rec1440.bg === 'rgb(11, 31, 70)' && rec1440.tileCount === 3,
      rec1440,
    ),
  );

  await browser.close();

  const anyFail = evidence.checks.some((c) => c.status === 'FAIL');
  evidence.overall = anyFail ? 'FAIL' : 'PASS';
  await writeFile(path.join(docsDir, 'QA_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log('overall', evidence.overall);
  if (anyFail) process.exit(1);
} finally {
  if (srv) srv.kill('SIGTERM');
}
