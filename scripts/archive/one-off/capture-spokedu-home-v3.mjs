import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.SPOKEDU_URL ?? 'http://localhost:3000/spokedu';
const OUT_DIR = path.resolve('.qa-spokedu-v3');

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];

const SECTIONS = [
  { id: 'hero', name: 'hero-header', scrollY: 0 },
  { id: 'trust', name: 'trust' },
  { id: 'business', name: 'business' },
  { id: 'spomove', name: 'spomove' },
  { id: 'cases', name: 'cases' },
  { id: 'operation', name: 'operation' },
  { id: 'contact-cta', name: 'final-cta' },
];

async function waitForPage(page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForSelector('#hero', { timeout: 30_000 });
  await page.waitForTimeout(1000);
}

async function captureFullPages(browser) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await waitForPage(page);
    await page.screenshot({ path: path.join(OUT_DIR, `full-${vp.name}.png`), fullPage: true });
    await context.close();
    console.log(`saved full-${vp.name}.png`);
  }
}

async function captureDesktopSections(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await waitForPage(page);

  await page.locator('#trust').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.locator('header').screenshot({ path: path.join(OUT_DIR, 'header-scrolled-1440.png') });
  console.log('saved header-scrolled-1440.png');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const hero = page.locator('#hero');
  await hero.screenshot({ path: path.join(OUT_DIR, 'hero-1440.png') });
  console.log('saved hero-1440.png');

  for (const section of SECTIONS) {
    if (section.id === 'hero') continue;
    const el = page.locator(`#${section.id}`);
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await el.screenshot({ path: path.join(OUT_DIR, `section-${section.name}-1440.png`) });
    console.log(`saved section-${section.name}-1440.png`);
  }

  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await footer.screenshot({ path: path.join(OUT_DIR, 'footer-1440.png') });
  console.log('saved footer-1440.png');

  await context.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await captureFullPages(browser);
    await captureDesktopSections(browser);
    console.log('done');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
