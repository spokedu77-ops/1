import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.SPOKEDU_URL ?? 'http://localhost:3000/spokedu';
const OUT_DIR = path.resolve('.qa-spokedu-v4');

async function waitForPage(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('#hero', { timeout: 30_000 });
  await page.waitForTimeout(1200);
}

async function clipRegion(page, fromId, toId, filename) {
  await page.locator(`#${fromId}`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await page.evaluate(({ fromId, toId }) => {
    const from = document.getElementById(fromId);
    const to = document.getElementById(toId);
    if (!from || !to) return null;
    const header = document.querySelector('header');
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const h = header?.getBoundingClientRect();
    const top = Math.min(h?.top ?? a.top, a.top) + window.scrollY;
    const bottom = b.bottom + window.scrollY;
    const left = 0;
    const width = document.documentElement.clientWidth;
    return { x: left, y: top, width, height: bottom - top };
  }, { fromId, toId });

  if (!box) throw new Error(`clip region failed: ${fromId} -> ${toId}`);
  await page.screenshot({ path: path.join(OUT_DIR, filename), clip: box });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await waitForPage(page);

    await clipRegion(page, 'hero', 'spomove', 'layout-top-25pct-view.png');
    console.log('saved layout-top-25pct-view.png');

    await page.locator('#cases').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await clipRegion(page, 'cases', 'contact-cta', 'layout-bottom-25pct-view.png');
    console.log('saved layout-bottom-25pct-view.png');

    await page.locator('#hero').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('#hero').screenshot({ path: path.join(OUT_DIR, 'hero-100pct.png') });
    console.log('saved hero-100pct.png');

    const heroLines = await page.evaluate(() => {
      const h1 = document.querySelector('#hero h1');
      if (!h1) return null;
      const spans = [...h1.querySelectorAll('span')];
      return {
        spanCount: spans.length,
        renderedLines: spans.reduce((sum, span) => {
          const rect = span.getBoundingClientRect();
          const lineHeight = parseFloat(getComputedStyle(span).lineHeight) || 20;
          return sum + Math.max(1, Math.round(rect.height / lineHeight));
        }, 0),
      };
    });
    console.log('hero-line-check', JSON.stringify(heroLines));

    await page.close();
    console.log('done');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
