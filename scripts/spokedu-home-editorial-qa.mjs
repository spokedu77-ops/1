/**
 * SPOKEDU Home editorial visual QA — Playwright screenshots + layout checks
 * Usage: dev server running → node scripts/spokedu-home-editorial-qa.mjs
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-home-editorial-finish');

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1280', width: 1280, height: 900 },
  { name: '1440', width: 1440, height: 900 },
];

const SECTION_IDS = ['hero', 'why', 'spomove', 'subscription', 'cases'];

async function evaluateLayout(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth > doc.clientWidth + 1;

    const subscriptionBlank = (() => {
      const frame = document.querySelector('#subscription .productStageFrame, [class*="productStageFrame"]');
      const img = frame?.querySelector('img');
      if (!frame || !img) return { fail: true, reason: 'missing-frame' };
      const fr = frame.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      const blankBelow = Math.max(0, fr.bottom - ir.bottom);
      const blankRatio = fr.height > 0 ? blankBelow / fr.height : 0;
      return { fail: blankRatio > 0.12, blankRatio: Math.round(blankRatio * 100) / 100, frameH: Math.round(fr.height) };
    })();

    const casesMosaic = (() => {
      const grid = document.querySelector('[class*="casesGrid"]');
      if (!grid) return { fail: true, reason: 'missing-grid' };
      const featured = grid.querySelector('[class*="caseFeatured"] img');
      const compact = [...grid.querySelectorAll('[class*="caseCompact"] img')];
      if (!featured || compact.length < 2) return { fail: true, reason: 'missing-images' };
      const fr = featured.getBoundingClientRect();
      const cr = compact.map((img) => img.getBoundingClientRect());
      const featuredTooSmall = fr.width < 280;
      const compactThumb = cr.some((r) => r.height < 80 || r.width < 120);
      const featuredMass = fr.width * fr.height;
      const compactMass = cr.reduce((sum, r) => sum + r.width * r.height, 0);
      const massOk = featuredMass >= compactMass * 0.85;
      return {
        fail: featuredTooSmall || compactThumb || !massOk,
        featured: { w: Math.round(fr.width), h: Math.round(fr.height) },
        compact: cr.map((r) => ({ w: Math.round(r.width), h: Math.round(r.height) })),
        massOk,
      };
    })();

    const sideways = (() => {
      const imgs = [...document.querySelectorAll('#why img, #cases img')];
      return imgs
        .filter((img) => {
          const nw = img.naturalWidth;
          const nh = img.naturalHeight;
          if (!nw || !nh) return false;
          const box = img.getBoundingClientRect();
          const boxLandscape = box.width > box.height * 1.15;
          const pixelPortrait = nh > nw * 1.15;
          return boxLandscape && pixelPortrait;
        })
        .map((img) => img.alt || img.src.slice(-24));
    })();

    return { overflow, subscriptionBlank, casesMosaic, sideways };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(800);
    await page.locator('#cases').scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => [...document.querySelectorAll('#cases img')].every((img) => img.complete && img.naturalWidth > 0),
      { timeout: 45_000 },
    ).catch(() => undefined);

    const layout = await evaluateLayout(page);
    const fails = [];
    if (layout.overflow) fails.push('overflow-x');
    if (layout.subscriptionBlank.fail) fails.push(`subscription-blank(${JSON.stringify(layout.subscriptionBlank)})`);
    if (vp.width >= 1024 && layout.casesMosaic.fail) fails.push(`cases-mosaic(${JSON.stringify(layout.casesMosaic)})`);
    if (layout.sideways.length > 0) fails.push(`sideways(${layout.sideways.join(',')})`);

    const status = fails.length === 0 ? 'OK' : `FAIL: ${fails.join('; ')}`;
    console.log(`[${vp.name}] ${status}`);
    results.push({ viewport: vp.name, status, layout });

    await page.screenshot({ path: path.join(OUT_DIR, `full-${vp.name}.png`), fullPage: true });

    for (const id of SECTION_IDS) {
      const el = page.locator(`#${id}`);
      if ((await el.count()) > 0) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await el.screenshot({ path: path.join(OUT_DIR, `section-${id}-${vp.name}.png`) });
      }
    }
  }

  await browser.close();
  console.log(`\nScreenshots: ${OUT_DIR}`);
  const failed = results.filter((r) => r.status.startsWith('FAIL'));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
