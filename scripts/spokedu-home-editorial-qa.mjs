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
  { name: '1440', width: 1440, height: 900 },
];

const SECTION_IDS = ['hero', 'spomove', 'subscription', 'cases'];

async function evaluateLayout(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth > doc.clientWidth + 1;

    const heroCtas = document.querySelectorAll('#hero [data-track-label^="cta-home-"]').length;

    const subscriptionBlank = (() => {
      const frame = document.querySelector('#subscription [class*="productStageFrame"]');
      const img = frame?.querySelector('img');
      if (!frame || !img) return { fail: true, reason: 'missing-frame' };
      const fr = frame.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      const blankBelow = Math.max(0, fr.bottom - ir.bottom);
      const blankRatio = fr.height > 0 ? blankBelow / fr.height : 0;
      return { fail: blankRatio > 0.12, blankRatio: Math.round(blankRatio * 100) / 100, frameH: Math.round(fr.height) };
    })();

    const casesGrammar = (() => {
      const grid = document.querySelector('[class*="casesGrid"]');
      if (!grid) return { fail: true, reason: 'missing-grid' };
      const items = [...grid.querySelectorAll('li')];
      if (items.length !== 3) return { fail: true, reason: 'expected-3-cases' };
      const layouts = items.map((li) => {
        const article = li.querySelector('article');
        const photo = li.querySelector('[class*="casePhoto"]');
        const meta = li.querySelector('[class*="caseMeta"]');
        if (!article || !photo || !meta) return 'incomplete';
        const articleCol = getComputedStyle(article).flexDirection === 'column';
        const photoBeforeMeta = photo.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING;
        return articleCol && photoBeforeMeta ? 'photo-caption-cta' : 'broken';
      });
      const compactHorizontal = items.some((li) => {
        const article = li.querySelector('article');
        return article && getComputedStyle(article).flexDirection === 'row';
      });
      const photos = items.map((li) => li.querySelector('img')?.getBoundingClientRect()).filter(Boolean);
      const topAligned =
        photos.length === 3 &&
        Math.max(...photos.map((r) => Math.abs(r.top - photos[0].top))) < 8;
      return {
        fail: layouts.some((l) => l !== 'photo-caption-cta') || compactHorizontal || !topAligned,
        layouts,
        compactHorizontal,
        topAligned,
        photoWidths: photos.map((r) => Math.round(r.width)),
      };
    })();

    const spomoveStructure = (() => {
      const section = document.getElementById('spomove');
      if (!section) return { fail: true, reason: 'missing-section' };
      const header = section.querySelector('[class*="spomoveHeader"]');
      const photo = section.querySelector('[class*="spomovePhoto"]');
      const principles = section.querySelector('[class*="spomovePrinciples"]');
      const sideGrid = section.querySelector('[class*="spomoveGrid"]');
      return {
        fail: !header || !photo || !principles || Boolean(sideGrid),
        hasHeader: Boolean(header),
        hasWidePhoto: Boolean(photo),
        principleCount: principles?.querySelectorAll('li').length ?? 0,
      };
    })();

    const sideways = (() => {
      const imgs = [...document.querySelectorAll('#cases img')];
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

    const whySection = Boolean(document.getElementById('why'));

    return { overflow, heroCtas, subscriptionBlank, casesGrammar, spomoveStructure, sideways, whySection };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.evaluate(() => document.fonts.ready).catch(() => undefined);
    await page.waitForTimeout(900);
    await page.locator('#cases').scrollIntoViewIfNeeded();
    await page
      .waitForFunction(
        () => [...document.querySelectorAll('#cases img')].every((img) => img.complete && img.naturalWidth > 0),
        { timeout: 45_000 },
      )
      .catch(() => undefined);

    const layout = await evaluateLayout(page);
    const fails = [];
    if (layout.overflow) fails.push('overflow-x');
    if (layout.whySection) fails.push('why-section-present');
    if (layout.heroCtas !== 2) fails.push(`hero-cta-count(${layout.heroCtas})`);
    if (layout.subscriptionBlank.fail) fails.push(`subscription-blank(${JSON.stringify(layout.subscriptionBlank)})`);
    if (vp.width >= 1024 && layout.casesGrammar.fail) fails.push(`cases-grammar(${JSON.stringify(layout.casesGrammar)})`);
    if (layout.spomoveStructure.fail) fails.push(`spomove-structure(${JSON.stringify(layout.spomoveStructure)})`);
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
