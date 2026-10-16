import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const capturesDir = path.join(__dirname, 'captures');
const port = process.env.B3B_QA_PORT ?? '3002';
const baseUrl = `http://127.0.0.1:${port}/`;
const BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();

function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok || res.status === 304) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) reject(new Error('timeout'));
      else setTimeout(tick, 400);
    };
    tick();
  });
}

async function assertHomeCss(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-spokedu-home-build] div');
    if (!root) return { ok: false, reason: 'no home root' };
    const navy = getComputedStyle(root).getPropertyValue('--navy').trim();
    return { ok: navy === '#0b1f46' || navy === 'rgb(11, 31, 70)', navy };
  });
}

async function decodeImages(page, sel) {
  for (const img of await page.locator(`${sel} img`).all()) {
    await img.evaluate(async (el) => {
      if (el.decode) await el.decode().catch(() => {});
    });
  }
}

async function inspectLabImage(page) {
  return page.evaluate(() => {
    const img = document.querySelector('section[aria-labelledby="home-master-heading"] img');
    if (!img) return null;
    const cs = getComputedStyle(img);
    const frame =
      img.parentElement?.className?.includes('productFrame') ? img.parentElement : img.parentElement;
    const fcs = frame ? getComputedStyle(frame) : null;
    return {
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      objectFit: cs.objectFit,
      width: cs.width,
      left: cs.left,
      top: cs.top,
      frameAspect: fcs?.aspectRatio ?? null,
    };
  });
}

async function heroTabletProbe(page, width) {
  await page.setViewportSize({ width, height: 861 });
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
  await page.evaluate(() => document.fonts?.ready);
  return page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="home-hero-heading"]');
    const cta = hero?.querySelector('a[href]');
    const heroRect = hero?.getBoundingClientRect();
    const ctaRect = cta?.getBoundingClientRect();
    const split = hero?.querySelector('[class*="split"]') || hero?.firstElementChild;
    const splitStyle = split ? getComputedStyle(split) : null;
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      heroHeight: heroRect?.height ?? null,
      ctaInFirstViewport: ctaRect ? ctaRect.top < window.innerHeight && ctaRect.bottom > 0 : null,
      ctaTop: ctaRect?.top ?? null,
      splitGrid: splitStyle?.gridTemplateColumns ?? splitStyle?.display ?? null,
      splitGap: splitStyle?.gap ?? null,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

let server;
const report = { BUILD_ID, port, cssOk: {}, overflow: {}, labImage: {}, heroTablet: {}, cta: {} };

try {
  try {
    await waitForServer(baseUrl, 5_000);
  } catch {
    server = spawn('npm run start', {
      cwd: repoRoot,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: port },
    });
    await waitForServer(baseUrl);
  }

  await mkdir(capturesDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const widths = [
    { w: 1440, h: 900 },
    { w: 1024, h: 900 },
    { w: 941, h: 861 },
    { w: 834, h: 900 },
    { w: 390, h: 844 },
  ];

  for (const { w, h } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
    await page.evaluate(() => document.fonts?.ready);
    report.cssOk[w] = await assertHomeCss(page);
    if (!report.cssOk[w].ok) throw new Error(`CSS not applied @ ${w}px`);

    report.overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    const spomove = page.locator('section[aria-labelledby="home-spomove-heading"]');
    const lab = page.locator('section[aria-labelledby="home-master-heading"]');
    await spomove.scrollIntoViewIfNeeded();
    await decodeImages(page, 'section[aria-labelledby="home-spomove-heading"]');
    await spomove.screenshot({ path: path.join(capturesDir, `spomove-${w}.png`), animations: 'disabled' });
    await lab.scrollIntoViewIfNeeded();
    await decodeImages(page, 'section[aria-labelledby="home-master-heading"]');
    report.labImage[w] = await inspectLabImage(page);
    await lab.screenshot({ path: path.join(capturesDir, `lab-${w}.png`), animations: 'disabled' });

    if (w === 1440 || w === 941 || w === 390) {
      await page.goto(baseUrl, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts?.ready);
      await page.setViewportSize({ width: w, height: h });
      await page.screenshot({
        path: path.join(capturesDir, `home-full-${w}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }

  report.cta = await page.evaluate(() => {
    const sp = document.querySelector('section[aria-labelledby="home-spomove-heading"] a');
    const lab = document.querySelector('section[aria-labelledby="home-master-heading"] a');
    return { spomoveHref: sp?.getAttribute('href') ?? null, labHref: lab?.getAttribute('href') ?? null };
  });

  for (const tw of [768, 834, 941, 1023, 1024]) {
    report.heroTablet[tw] = await heroTabletProbe(page, tw);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.locator('section[aria-labelledby="home-master-heading"]').scrollIntoViewIfNeeded();
  await decodeImages(page, 'section[aria-labelledby="home-master-heading"]');
  await page.locator('section[aria-labelledby="home-master-heading"] img').first().screenshot({
    path: path.join(capturesDir, 'lab-mobile-crop-after-390.png'),
    animations: 'disabled',
  });

  await browser.close();
  await writeFile(path.join(__dirname, 'capture-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}
