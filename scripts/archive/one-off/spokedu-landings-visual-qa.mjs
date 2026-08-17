/**
 * 주요 랜딩 4 viewport 시각 QA (overflow·깨진 이미지·placeholder)
 * Usage: node scripts/spokedu-landings-visual-qa.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = join(__dirname, '../.qa-spokedu/landings');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: 'desktop', width: 1280, height: 900 },
];

const PAGES = [
  { path: '/spokedu', slug: 'home' },
  { path: '/spokedu/about', slug: 'about' },
  { path: '/spokedu/private', slug: 'private' },
  { path: '/spokedu/dispatch', slug: 'dispatch' },
  { path: '/spokedu/curriculum', slug: 'curriculum' },
  { path: '/spokedu/records', slug: 'records' },
  { path: '/spokedu/programs', slug: 'programs' },
];

async function auditPage(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth > doc.clientWidth + 1;
    const broken = Array.from(document.querySelectorAll('img'))
      .filter((img) => {
        if (img.naturalWidth > 0) return false;
        if (!img.complete) return false;
        const r = img.getBoundingClientRect();
        return r.width > 48 && r.height > 48;
      })
      .map((img) => img.currentSrc || img.src);
    const placeholders = document.querySelectorAll('[data-spokedu-visual="placeholder"]').length;
    const h1 = document.querySelector('h1');
    const h1Lines = h1 ? h1.querySelectorAll(':scope > span').length || 1 : 0;
    return { overflowX, broken, placeholders, h1Lines };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  for (const { path, slug } of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    const viewports = [];

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(350);
      const audit = await auditPage(page);
      const shot = join(OUT, `${slug}-${vp.name}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      viewports.push({ viewport: vp.name, screenshot: shot, ...audit });
    }

    const pass = viewports.every(
      (v) => !v.overflowX && v.broken.length === 0 && v.placeholders === 0,
    );
    results.push({ path, slug, pass, viewports });
  }

  const report = {
    base: BASE,
    timestamp: new Date().toISOString(),
    pass: results.every((r) => r.pass),
    results,
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pass: report.pass, pages: results.map((r) => ({ slug: r.slug, pass: r.pass })) }, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
