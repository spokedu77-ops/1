import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.SPOKEDU_URL ?? 'http://localhost:3000/spokedu';
const OUT_DIR = path.resolve('.qa-spokedu-v5');

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
    return { x: 0, y: top, width: document.documentElement.clientWidth, height: bottom - top };
  }, { fromId, toId });

  if (!box) throw new Error(`clip region failed: ${fromId} -> ${toId}`);
  await page.screenshot({ path: path.join(OUT_DIR, filename), clip: box });
}

const HERO_CANDIDATES = [
  {
    id: 'yangcheon',
    label: 'yangcheon.jpg',
    src: '/images/spokedu/records/yangcheon.jpg',
    objectPosition: '50% 28%',
  },
  {
    id: 'private-small-group',
    label: 'private-small-group.jpg',
    src: '/images/spokedu/private/private-small-group.jpg',
    objectPosition: '50% 38%',
  },
  {
    id: 'dongjak',
    label: 'dongjak.jpg',
    src: '/images/spokedu/records/dongjak.jpg',
    objectPosition: '50% 52%',
  },
];

async function captureHeroCandidates(page) {
  for (const candidate of HERO_CANDIDATES) {
    await page.evaluate((c) => {
      const img = document.querySelector('#hero img');
      if (!img) return;
      img.src = c.src;
      img.srcset = '';
      img.style.objectPosition = c.objectPosition;
    }, candidate);
    await page.waitForTimeout(800);
    await page.locator('#hero').screenshot({
      path: path.join(OUT_DIR, `hero-compare-${candidate.id}.png`),
    });
    console.log(`saved hero-compare-${candidate.id}.png`);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await waitForPage(page);

    await captureHeroCandidates(page);

    await clipRegion(page, 'hero', 'spomove', 'layout-top-25pct-view.png');
    console.log('saved layout-top-25pct-view.png');

    await page.locator('#hero').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.locator('#hero').screenshot({ path: path.join(OUT_DIR, 'hero-100pct.png') });
    console.log('saved hero-100pct.png');

    await page.locator('#business').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(400);
    await page.locator('#business').screenshot({ path: path.join(OUT_DIR, 'business-100pct.png') });
    console.log('saved business-100pct.png');

    await page.locator('#spomove').scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.locator('#spomove').screenshot({ path: path.join(OUT_DIR, 'spomove-100pct.png') });
    console.log('saved spomove-100pct.png');

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
