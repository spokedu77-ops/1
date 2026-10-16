import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const worktreeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const repoRoot = path.resolve(worktreeRoot, '../..');
let buildRoot = worktreeRoot;
try {
  await readFile(path.join(worktreeRoot, '.next', 'BUILD_ID'));
} catch {
  buildRoot = repoRoot;
}
const root = worktreeRoot;
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'captures');
const docsDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.B4A_PORT ?? '3010';
const base = `http://127.0.0.1:${port}/spokedu/`;
const BUILD_ID = (await readFile(path.join(buildRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
const mode = process.argv[2] ?? 'after';

const widths = [
  { w: 390, h: 844, n: '390' },
  { w: 767, h: 861, n: '767' },
  { w: 768, h: 861, n: '768' },
  { w: 834, h: 861, n: '834' },
  { w: 941, h: 861, n: '941' },
  { w: 941, h: 700, n: '941-h700' },
  { w: 1023, h: 861, n: '1023' },
  { w: 1024, h: 861, n: '1024' },
  { w: 1440, h: 900, n: '1440' },
];

async function waitServer() {
  for (let i = 0; i < 150; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('server timeout');
}

async function metrics(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('section[aria-labelledby="home-hero-heading"]');
    const h1 = document.querySelector('#home-hero-heading');
    const english = hero?.querySelector('[class*="heroEnglish"]');
    const heroText = hero?.querySelector('[class*="heroText"]');
    const primary = hero?.querySelector('a[class*="btnPrimary"]');
    const secondary = hero?.querySelector('a[class*="btnSecondary"]');
    const grid = hero?.querySelector('[class*="heroGrid"]');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    };
    const p = rect(primary);
    const g = cs(grid);
    const t = cs(heroText);
    return {
      heroHeight: rect(hero)?.height,
      h1Count: document.querySelectorAll('#home-hero-heading').length,
      englishCount: hero?.querySelectorAll('[class*="heroEnglish"]').length ?? 0,
      imageCount: hero?.querySelectorAll('img').length ?? 0,
      primaryHref: primary?.getAttribute('href'),
      secondaryHref: secondary?.getAttribute('href'),
      primary: { ...p, pass: p ? p.bottom <= window.innerHeight : null },
      secondary: rect(secondary),
      gridColumns: g?.gridTemplateColumns,
      heroTextDisplay: t?.display,
      englishFontSize: cs(english)?.fontSize,
      englishColor: cs(english)?.color,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

let srv;
try {
  try {
    await waitServer();
  } catch {
    srv = spawn('npm run start', {
      cwd: worktreeRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
    await waitServer();
  }
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report = { BUILD_ID, port, mode, viewports: {} };

  if (mode === 'before') {
    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load' });
    await page.locator('section[aria-labelledby="home-hero-heading"]').screenshot({
      path: path.join(outDir, 'before-941.png'),
    });
    report.viewports['941'] = await metrics(page);
    await writeFile(path.join(docsDir, 'RESPONSIVE_METRICS.before.json'), JSON.stringify(report, null, 2));
    await browser.close();
    console.log('before ok', report.viewports['941'].primary);
  } else {
    for (const { w, h, n } of widths) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(base, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts?.ready);
      const hero = page.locator('section[aria-labelledby="home-hero-heading"]');
      await hero.scrollIntoViewIfNeeded();
      if (!n.includes('h700')) {
        await hero.screenshot({ path: path.join(outDir, `hero-${n}.png`) });
      }
      report.viewports[n] = await metrics(page);
    }

    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load' });
    await page.locator('section[aria-labelledby="home-hero-heading"]').screenshot({
      path: path.join(outDir, 'after-941.png'),
    });

    const beforePath = path.join(outDir, 'before-941.png');
    const afterPath = path.join(outDir, 'after-941.png');
    await page.setViewportSize({ width: 1882, height: 900 });
    await page.setContent(
      `<!doctype html><body style="margin:0;display:flex;background:#fff"><img src="file://${beforePath.replace(/\\/g, '/')}" width="941"/><img src="file://${afterPath.replace(/\\/g, '/')}" width="941"/></body>`,
    );
    await page.screenshot({ path: path.join(outDir, 'before-after-941.png'), fullPage: true });

    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load' });
    await page.keyboard.press('Tab');
    const focus1 = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      href: document.activeElement?.getAttribute('href'),
      outline: getComputedStyle(document.activeElement).outlineWidth,
    }));
    await page.keyboard.press('Tab');
    const focus2 = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      href: document.activeElement?.getAttribute('href'),
    }));
    report.keyboard = { firstTab: focus1, secondTab: focus2 };

    await browser.close();
    await writeFile(path.join(docsDir, 'RESPONSIVE_METRICS.json'), JSON.stringify(report, null, 2));
    console.log('941 primary', report.viewports['941']?.primary);
  }
} finally {
  if (srv) srv.kill('SIGTERM');
}
