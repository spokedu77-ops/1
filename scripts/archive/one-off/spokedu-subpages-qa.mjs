/** 서브 페이지 레이아웃 손상 여부 — Playwright 스크린샷 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SPOKEDU_QA_URL?.replace(/\/spokedu$/, '') ?? 'http://localhost:3000';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-subpages');
const PAGES = ['/spokedu/private', '/spokedu/dispatch', '/spokedu/curriculum', '/spokedu/about', '/spokedu/records', '/spokedu/contact'];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const route of PAGES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 60_000 });
    const slug = route.replace('/spokedu/', '') || 'home';
    await page.screenshot({ path: path.join(OUT_DIR, `${slug}-1440.png`), fullPage: false });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    console.log(`${route}: overflow-x ${overflow ? 'FAIL' : 'OK'}`);
  }

  await browser.close();
  console.log(`Saved to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
