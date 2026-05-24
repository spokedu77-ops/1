/**
 * Home 이미지 QA — Playwright
 * Usage: node scripts/spokedu-home-images-qa.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = join(__dirname, '../.qa-spokedu/home-images');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: 'desktop', width: 1280, height: 900 },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const failedImages = [];
  const postimg = [];

  page.on('response', (res) => {
    const url = res.url();
    if (/postimg/i.test(url)) postimg.push(url);
    if (res.status() === 404 && /images\/spokedu|_next\/image/i.test(url)) {
      failedImages.push(url);
    }
  });

  await page.goto(`${BASE}/spokedu`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);

  const imgAudit = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const broken = imgs
      .filter((img) => {
        if (img.naturalWidth > 0) return false;
        if (!img.complete) return false;
        const r = img.getBoundingClientRect();
        return r.width > 48 && r.height > 48;
      })
      .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt }));
    const gradientPlaceholders = document.querySelectorAll('[data-spokedu-visual="placeholder"]').length;
    const placeholderSvg = Array.from(document.querySelectorAll('img'))
      .filter((img) => /_fallback\/.*\.svg/i.test(img.src))
      .map((img) => img.src);
    return { broken, gradientPlaceholders, placeholderSvg, total: imgs.length };
  });

  const viewportChecks = [];

  const report = {
    base: BASE,
    timestamp: new Date().toISOString(),
    brokenImages: imgAudit.broken,
    placeholderSvg: imgAudit.placeholderSvg,
    postimgCount: postimg.length,
    failed404: [...new Set(failedImages)],
    screenshots: [],
    gradientPlaceholders: imgAudit.gradientPlaceholders,
    viewportChecks,
    pass: false,
  };

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);
    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth > doc.clientWidth + 1;
      const h1 = document.querySelector('h1');
      const h1SemanticLines = h1 ? h1.querySelectorAll(':scope > span').length : 0;
      return { overflowX, h1SemanticLines };
    });
    viewportChecks.push({ viewport: vp.name, ...layout });
    const path = join(OUT, `home-${vp.name}.png`);
    await page.screenshot({ path, fullPage: true });
    report.screenshots.push(path);
  }

  report.pass =
    imgAudit.broken.length === 0 &&
    imgAudit.placeholderSvg.length === 0 &&
    imgAudit.gradientPlaceholders === 0 &&
    postimg.length === 0 &&
    failedImages.length === 0 &&
    viewportChecks.every((v) => !v.overflowX && v.h1SemanticLines === 2);

  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
