import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const w of [360, 390, 430, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(`${BASE}/spokedu`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const collage = document.querySelector('[aria-label="스포키듀 수업 현장"]');
      const gateImg = document.querySelector('#visitor-gate a .relative.h-\\[min');
      const gateLink = document.querySelector('#visitor-gate a');
      const fieldFeatured = document.querySelector('[aria-label="현장 운영 증거"] > div:first-child a');
      return {
        collage: collage?.getBoundingClientRect().height,
        gateCard: gateLink?.getBoundingClientRect().height,
        gatePhoto: gateLink?.querySelector('.relative')?.getBoundingClientRect().height,
        fieldFeatured: fieldFeatured?.getBoundingClientRect().height,
      };
    });
    console.log(w, m);
  }
  await browser.close();
}

main();
