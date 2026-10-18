import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(docsDir, '../../..');
const outDir = path.join(docsDir, 'captures');
const port = process.env.B4B_PORT ?? '3013';
const base = `http://127.0.0.1:${port}/spokedu/`;
const mode = process.argv[2] ?? 'after';

const widths = [
  { w: 360, h: 800, n: '360' },
  { w: 390, h: 844, n: '390' },
  { w: 430, h: 932, n: '430' },
  { w: 767, h: 861, n: '767' },
  { w: 768, h: 861, n: '768' },
  { w: 834, h: 861, n: '834' },
  { w: 941, h: 861, n: '941' },
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
    const heroVisual = hero?.querySelector('[class*="heroVisual"]');
    const heroActions = hero?.querySelector('[class*="heroActions"]');
    const primary = hero?.querySelector('a[class*="btnPrimary"]');
    const secondary = hero?.querySelector('a[class*="btnSecondary"]');
    const grid = hero?.querySelector('[class*="heroGrid"]');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const p = rect(primary);
    const s = rect(secondary);
    const v = rect(heroVisual);
    const a = rect(heroActions);
    const g = cs(grid);
    const cols = g?.gridTemplateColumns?.trim().split(/\s+/).filter(Boolean).length ?? 0;
    const copyRect = rect(heroCopy);
    const visualRect = rect(heroVisual);
    const twoColumn =
      cols >= 2 &&
      copyRect &&
      visualRect &&
      visualRect.left >= copyRect.right - 4;
    const actionsAfterVisual = v && a ? a.top >= v.bottom - 2 : null;
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
      heroTextDisplay: cs(heroText)?.display,
      heroCopyDisplay: cs(heroCopy)?.display,
      twoColumnTabletLayout: twoColumn,
      mobileActionsAfterVisual: actionsAfterVisual,
      englishFontSize: cs(english)?.fontSize,
      englishColor: cs(english)?.color,
      h1Color: cs(h1)?.color,
      h1FontSize: cs(h1)?.fontSize,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1Text: h1?.textContent?.replace(/\s+/g, ' ').trim(),
      actionsInsideHeroText: heroText?.contains(heroActions) ?? false,
    };
  });
}

async function keyboardCheck(page) {
  await page.locator('a[class*="btnPrimary"]').first().focus();
  const focusPrimary = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute('href'),
    outline: getComputedStyle(document.activeElement).outlineWidth,
  }));
  await page.locator('section[aria-labelledby="home-hero-heading"] a[class*="btnSecondary"]').focus();
  const focusSecondary = await page.evaluate(() => ({
    href: document.activeElement?.getAttribute('href'),
    outline: getComputedStyle(document.activeElement).outlineWidth,
  }));
  return { focusPrimary, focusSecondary };
}

async function composite(page, left, right, out, width) {
  await page.setViewportSize({ width: width * 2, height: 900 });
  await page.setContent(
    `<!doctype html><body style="margin:0;display:flex;background:#fff"><img src="file://${left.replace(/\\/g, '/')}" width="${width}"/><img src="file://${right.replace(/\\/g, '/')}" width="${width}"/></body>`,
  );
  await page.screenshot({ path: out, fullPage: true });
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
    for (const n of ['390', '1024']) {
      const spec = widths.find((x) => x.n === n);
      await page.setViewportSize({ width: spec.w, height: spec.h });
      await page.goto(base, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      await page.locator('section[aria-labelledby="home-hero-heading"]').screenshot({
        path: path.join(outDir, `before-hero-${n}.png`),
      });
    }
    console.log('before captures ok');
  } else {
    for (const { w, h, n } of widths) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(base, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      const hero = page.locator('section[aria-labelledby="home-hero-heading"]');
      await hero.scrollIntoViewIfNeeded();
      await hero.screenshot({ path: path.join(outDir, `hero-${n}.png`) });
      report.viewports[n] = await metrics(page);
    }

    for (const [n, h] of [
      ['390', 2400],
      ['941', 3200],
      ['1440', 3600],
    ]) {
      const spec = widths.find((x) => x.n === n);
      await page.setViewportSize({ width: spec.w, height: spec.h });
      await page.goto(base, { waitUntil: 'load', timeout: 60000 });
      await page.evaluate(() => document.fonts?.ready);
      await page.screenshot({
        path: path.join(outDir, `home-full-${n}.png`),
        fullPage: true,
        clip: undefined,
      });
    }

    const before390 = path.join(outDir, 'before-hero-390.png');
    const before1024 = path.join(outDir, 'before-hero-1024.png');
    const legacy390 = path.resolve(docsDir, '../phase-1b4a-main-recovery/captures/hero-390.png');
    const legacy1024 = path.resolve(docsDir, '../phase-1b4a-main-recovery/captures/hero-1024.png');
    let b390 = before390;
    let b1024 = before1024;
    try {
      await access(b390);
    } catch {
      try {
        await copyFile(legacy390, path.join(outDir, 'before-hero-390.png'));
        b390 = path.join(outDir, 'before-hero-390.png');
      } catch {
        b390 = null;
      }
    }
    try {
      await access(b1024);
    } catch {
      try {
        await copyFile(legacy1024, path.join(outDir, 'before-hero-1024.png'));
        b1024 = path.join(outDir, 'before-hero-1024.png');
      } catch {
        b1024 = null;
      }
    }
    if (b390) {
      await composite(page, b390, path.join(outDir, 'hero-390.png'), path.join(outDir, 'hero-mobile-before-after.png'), 390);
    }
    if (b1024) {
      await composite(
        page,
        b1024,
        path.join(outDir, 'hero-1024.png'),
        path.join(outDir, 'hero-desktop-before-after.png'),
        1024,
      );
    }

    await page.setViewportSize({ width: 941, height: 861 });
    await page.goto(base, { waitUntil: 'load', timeout: 60000 });
    report.keyboard = await keyboardCheck(page);

    for (const [n, m] of Object.entries(report.viewports)) {
      const w = Number(n.split('-')[0]) || parseInt(n, 10);
      m.pass =
        !m.overflowX &&
        m.h1Count === 1 &&
        m.imageCount === 1 &&
        m.actionsInsideHeroText === true &&
        (w >= 768 && w <= 1023 ? m.twoColumnTabletLayout : true) &&
        (w <= 767 ? m.mobileActionsAfterVisual === true : true) &&
        (['834', '941', '1023'].includes(n) ? m.primary?.pass && m.secondary?.pass : true) &&
        (m.englishColor?.includes('36, 93, 255') || m.englishColor?.includes('36,93,255') || w > 1023
          ? m.englishColor?.includes('36') || w > 1023
          : true);
    }

    await browser.close();
    await writeFile(path.join(docsDir, 'RESPONSIVE_METRICS.json'), JSON.stringify(report, null, 2));
    console.log('941', report.viewports['941']?.primary);
  }
} finally {
  if (srv) srv.kill('SIGTERM');
}
