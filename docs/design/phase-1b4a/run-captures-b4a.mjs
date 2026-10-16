import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const capturesDir = path.join(__dirname, 'captures');
const port = process.env.B4A_QA_PORT ?? '3005';
const baseUrl = `http://127.0.0.1:${port}/`;
const BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();

const viewports = [
  { w: 390, h: 844, name: '390' },
  { w: 767, h: 861, name: '767' },
  { w: 768, h: 861, name: '768' },
  { w: 834, h: 861, name: '834' },
  { w: 941, h: 861, name: '941' },
  { w: 941, h: 700, name: '941-h700' },
  { w: 1023, h: 861, name: '1023' },
  { w: 1024, h: 861, name: '1024' },
  { w: 1440, h: 900, name: '1440' },
];

function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok && res.status !== 304) throw new Error(String(res.status));
        const html = await res.text();
        const m = html.match(/data-spokedu-home-build="([^"]+)"/);
        if (m && html.includes('home-hero-heading')) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) reject(new Error('timeout'));
      else setTimeout(tick, 400);
    };
    tick();
  });
}

async function heroMetrics(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="home-hero-heading"]');
    const h1 = document.querySelector('#home-hero-heading');
    const english = hero?.querySelector('[class*="heroEnglish"]');
    const primary = hero?.querySelector('a.btnPrimary, a[class*="btnPrimary"]');
    const secondary = hero?.querySelector('a.btnSecondary, a[class*="btnSecondary"]');
    const img = hero?.querySelector('img');
    const grid = hero?.querySelector('[class*="heroGrid"]');
    const cs = (el) => (el ? getComputedStyle(el) : null);

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };

    const g = cs(grid);
    const primaryRect = rect(primary);

    return {
      dom: {
        h1Count: document.querySelectorAll('#home-hero-heading').length,
        heroImages: hero?.querySelectorAll('img').length ?? 0,
        primaryHref: primary?.getAttribute('href') ?? null,
        secondaryHref: secondary?.getAttribute('href') ?? null,
      },
      hero: rect(hero),
      h1: rect(h1),
      english: {
        rect: rect(english),
        fontSize: cs(english)?.fontSize ?? null,
        lineHeight: cs(english)?.lineHeight ?? null,
      },
      image: rect(img),
      primary: {
        ...rect(primary),
        inFirstViewport:
          primaryRect != null
            ? primaryRect.bottom <= window.innerHeight && primaryRect.top >= 0
            : null,
        fullyInFirstViewport:
          primaryRect != null ? primaryRect.bottom <= window.innerHeight : null,
      },
      secondary: rect(secondary),
      grid: {
        display: g?.display ?? null,
        gridTemplateColumns: g?.gridTemplateColumns ?? null,
        gridTemplateAreas: g?.gridTemplateAreas ?? null,
        columnGap: g?.columnGap ?? null,
      },
      heroCopy: {
        fontSize: cs(hero?.querySelector('[class*="heroCopy"]'))?.fontSize ?? null,
      },
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  });
}

let server;
let spawned = false;
try {
  try {
    await waitForServer(baseUrl, 3_000);
  } catch {
    server = spawn('npm run start', {
      cwd: repoRoot,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: port },
    });
    spawned = true;
    await waitForServer(baseUrl);
  }

  await mkdir(capturesDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const metrics = { BUILD_ID, port, viewports: {} };

  for (const { w, h, name } of viewports) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
    await page.evaluate(() => document.fonts?.ready);
    const hero = page.locator('section[aria-labelledby="home-hero-heading"]');
    await hero.scrollIntoViewIfNeeded();
    for (const img of await hero.locator('img').all()) {
      await img.evaluate(async (el) => {
        if (el.decode) await el.decode().catch(() => {});
      });
    }
    if (!name.includes('h700')) {
      await hero.screenshot({ path: path.join(capturesDir, `hero-${name}.png`), animations: 'disabled' });
    }
    metrics.viewports[name] = await heroMetrics(page);
    if (name === '941') {
      await page.screenshot({
        path: path.join(capturesDir, 'home-full-941.png'),
        fullPage: true,
        animations: 'disabled',
      });
    }
    if (name === '390') {
      await page.screenshot({
        path: path.join(capturesDir, 'home-full-390.png'),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }

  const beforeHero = path.join(repoRoot, 'docs/design/phase-1b4a/captures/hero-941-before-reference.png');
  const afterPath = path.join(capturesDir, 'hero-941.png');
  try {
    await readFile(beforeHero);
    await page.setViewportSize({ width: 1882, height: 900 });
    await page.setContent(
      `<!doctype html><body style="margin:0;display:flex;background:#fff"><img src="file://${beforeHero.replace(/\\/g, '/')}" style="width:941px;height:auto"/><img src="file://${afterPath.replace(/\\/g, '/')}" style="width:941px;height:auto"/></body>`,
    );
    await page.screenshot({ path: path.join(capturesDir, 'before-after-941.png'), fullPage: true });
    metrics.beforeAfterNote = 'Side-by-side: hero-941-before-reference.png (pre-B4A git) vs hero-941.png (B4A), same 941×861 viewport';
  } catch {
    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.locator('section[aria-labelledby="home-hero-heading"]').screenshot({
      path: path.join(capturesDir, 'before-after-941.png'),
    });
    metrics.beforeAfterNote =
      'Single after-only frame; pre-B4A reference PNG missing — compare CTA top via RESPONSIVE_METRICS vs B3B table (~1124px)';
  }

  await browser.close();
  await writeFile(path.join(__dirname, 'RESPONSIVE_METRICS.json'), JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics.viewports['941']?.primary, null, 2));
} finally {
  if (spawned && server) server.kill('SIGTERM');
}
