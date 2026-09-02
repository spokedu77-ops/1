/**
 * SPOKEDU /education service sales editorial QA
 * Usage: dev server → node scripts/spokedu-education-qa.mjs
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/education';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-education');

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1440', width: 1440, height: 900 },
];

const SECTION_IDS = ['hero', 'institutional', 'cases'];

async function evaluateLayout(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth > doc.clientWidth + 1;

    const hasCardUi = Boolean(document.querySelector('[class*="marketingCardInteractive"]'));

    const spomoveCta = [...document.querySelectorAll('a, button')].some((el) =>
      /SPOMOVE 알아보기/i.test(el.textContent ?? ''),
    );

    const duplicateLargeCta = [...document.querySelectorAll('a, button')].filter((el) =>
      /기관 운영안 문의|개인·소그룹 상담/i.test(el.textContent ?? ''),
    ).length;

    const casesMosaic = (() => {
      const grid = document.querySelector('[class*="casesGrid"]');
      if (!grid) return { fail: true };
      const featured = grid.querySelector('[class*="caseFeatured"] img, [class*="caseFeatured"] [role="img"]');
      const imgs = [...grid.querySelectorAll('img')].filter((img) => img.naturalWidth > 0 || img.getAttribute('alt'));
      return {
        fail: !featured || imgs.length < 3,
        featuredW: featured ? Math.round(featured.getBoundingClientRect().width) : 0,
      };
    })();

    return { overflow, hasCardUi, spomoveCta, duplicateLargeCta, casesMosaic };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve(), status: 'loaded' },
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1200);
    await page.locator('#cases').scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(1500);

    const layout = await evaluateLayout(page);
    const fails = [];
    if (layout.overflow) fails.push('overflow-x');
    if (layout.hasCardUi) fails.push('card-ui');
    if (layout.spomoveCta) fails.push('spomove-cta');
    if (layout.duplicateLargeCta > 0) fails.push('duplicate-final-cta');
    if (vp.width >= 1024 && layout.casesMosaic.fail) fails.push('cases-mosaic');

    console.log(`[${vp.name}] ${fails.length === 0 ? 'OK' : `FAIL: ${fails.join('; ')}`}`);

    try {
      await page.screenshot({ path: path.join(OUT_DIR, `full-${vp.name}.png`), fullPage: true, animations: 'disabled' });
    } catch {
      await page.screenshot({ path: path.join(OUT_DIR, `full-${vp.name}.png`), fullPage: false, animations: 'disabled' });
    }
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
