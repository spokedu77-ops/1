import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const BASE = process.argv[2] || 'http://localhost:3000';
const PAGES = ['/spokedu', '/spokedu/records', '/spokedu/cases', '/spokedu/about', '/spokedu/programs/spomove', '/spokedu/contact'];
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../.qa-spokedu/report-network.json');
mkdirSync(dirname(OUT), { recursive: true });

const report = {};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const path of PAGES) {
    const reqs = [];
    const handler = (r) => {
      const u = r.url();
      if (/\.(jpg|jpeg|png|webp|gif)/i.test(u) || u.includes('/_next/image')) reqs.push({ url: u, status: r.status() });
    };
    page.on('response', handler);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
    page.off('response', handler);
    const pri = await page.evaluate(() =>
      [...document.querySelectorAll('img')].filter((i) => i.getAttribute('fetchpriority') === 'high' || i.loading === 'eager').length,
    );
    const srcs = await page.evaluate(() => [...new Set([...document.querySelectorAll('img')].map((i) => i.currentSrc || i.src))]);
    report[path] = {
      imageRequests: reqs.length,
      failed: reqs.filter((r) => r.status >= 400),
      postimg: reqs.filter((r) => /postimg/i.test(r.url)),
      priorityImgTags: pri,
      uniqueImgSrc: srcs.length,
      sampleSrc: srcs.slice(0, 8),
    };
  }
  await browser.close();
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
