import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(docsDir, '../../..');
const outDir = path.join(docsDir, 'captures');
const port = process.env.B4A_PORT ?? '3010';
const base = `http://127.0.0.1:${port}/spokedu/`;
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
      /* retry */
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
    const heroCopy = hero?.querySelector('[class*="heroCopy"]');
    const primary = hero?.querySelector('a[class*="btnPrimary"]');
    const secondary = hero?.querySelector('a[class*="btnSecondary"]');
    const grid = hero?.querySelector('[class*="heroGrid"]');
    const visual = hero?.querySelector('[class*="heroVisual"]');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const p = rect(primary);
    const s = rect(secondary);
    const g = cs(grid);
    const cols = g?.gridTemplateColumns?.trim().split(/\s+/).filter(Boolean).length ?? 0;
    const copyRect = rect(heroCopy);
    const visualRect = rect(visual);
    const twoColumn =
      cols >= 2 &&
      copyRect &&
      visualRect &&
      visualRect.left >= copyRect.right - 4;
    return {
      heroHeight: rect(hero)?.height,
      h1Count: document.querySelectorAll('#home-hero-heading').length,
      englishCount: hero?.querySelectorAll('[class*="heroEnglish"]').length ?? 0,
      imageCount: hero?.querySelectorAll('img').length ?? 0,
      primaryHref: primary?.getAttribute('href'),
      secondaryHref: secondary?.getAttribute('href'),
      primary: { ...p, pass: p ? p.bottom <= window.innerHeight : null },
      secondary: { ...s, pass: s ? s.bottom <= window.innerHeight : null },
      gridColumns: g?.gridTemplateColumns,
      gridColumnCount: cols,
      heroTextDisplay: cs(heroText)?.display ?? null,
      heroCopyDisplay: cs(heroCopy)?.display,
      twoColumnTabletLayout: twoColumn,
      englishFontSize: cs(english)?.fontSize,
      englishColor: cs(english)?.color,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1Text: h1?.textContent?.replace(/\s+/g, ' ').trim(),
    };
  });
}

async function tabToHeroLinks(page) {
  const primarySel = 'section[aria-labelledby="home-hero-heading"] a[class*="btnPrimary"]';
  const secondarySel = 'section[aria-labelledby="home-hero-heading"] a[class*="btnSecondary"]';
  const hits = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName,
        href: el?.getAttribute('href'),
        outline: el ? getComputedStyle(el).outlineWidth : null,
        text: el?.textContent?.trim().slice(0, 40),
      };
    });
    hits.push(info);
    if (info.href && (info.text?.includes('수업') || info.text?.includes('자료'))) {
      if (hits.filter((h) => h.href === info.href).length >= 2) break;
    }
  }
  const primary = await page.locator(primarySel).evaluate((el) => ({
    href: el.getAttribute('href'),
    focused: el === document.activeElement,
  }));
  await page.locator(primarySel).focus();
  const focusPrimary = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute('href'),
    outline: getComputedStyle(document.activeElement).outlineWidth,
  }));
  await page.locator(secondarySel).focus();
  const focusSecondary = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute('href'),
    outline: getComputedStyle(document.activeElement).outlineWidth,
  }));
  return { tabSequenceSample: hits.slice(-8), focusPrimary, focusSecondary };
}

let srv;
try {
  const BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
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
  const report = { BUILD_ID, port, base, mode, viewports: {} };

  if (mode === 'before') {
    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => document.fonts?.ready);
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
      await page.goto(base, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      const hero = page.locator('section[aria-labelledby="home-hero-heading"]');
      await hero.scrollIntoViewIfNeeded();
      if (!n.includes('h700')) {
        await hero.screenshot({ path: path.join(outDir, `hero-${n}.png`) });
      }
      const m = await metrics(page);
      m.pass =
        !m.overflowX &&
        m.h1Count === 1 &&
        m.imageCount === 1 &&
        (n === '390' || n === '767' || n === '1024' || n === '1440'
          ? true
          : w >= 768 && w <= 1023
            ? m.twoColumnTabletLayout && m.gridColumnCount >= 2
            : true) &&
        (n === '941' || n === '834' || n === '1023'
          ? m.primary?.pass === true && m.secondary?.pass === true
          : n === '941-h700'
            ? m.primary?.pass !== false
            : true);
      report.viewports[n] = m;
    }

    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    await page.locator('section[aria-labelledby="home-hero-heading"]').screenshot({
      path: path.join(outDir, 'after-941.png'),
    });

    const beforePath = path.join(outDir, 'before-941.png');
    const afterPath = path.join(outDir, 'after-941.png');
    try {
      await access(beforePath);
      await page.setViewportSize({ width: 1882, height: 900 });
      await page.setContent(
        `<!doctype html><body style="margin:0;display:flex;background:#fff"><img src="file://${beforePath.replace(/\\/g, '/')}" width="941"/><img src="file://${afterPath.replace(/\\/g, '/')}" width="941"/></body>`,
      );
      await page.screenshot({ path: path.join(outDir, 'before-after-941.png'), fullPage: true });
    } catch {
      await copyFile(afterPath, path.join(outDir, 'before-after-941.png'));
    }

    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    report.keyboard = await tabToHeroLinks(page);

    await browser.close();
    await writeFile(path.join(docsDir, 'RESPONSIVE_METRICS.json'), JSON.stringify(report, null, 2));
    console.log('941 primary', report.viewports['941']?.primary);
    console.log('941 pass', report.viewports['941']?.pass);
  }
} finally {
  if (srv) srv.kill('SIGTERM');
}
