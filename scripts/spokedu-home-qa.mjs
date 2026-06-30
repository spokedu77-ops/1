/**
 * SPOKEDU 홈 반응형 QA — Playwright 스크린샷
 * 사용: npm run dev 실행 후 `node scripts/spokedu-home-qa.mjs`
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/spokedu';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-home');

const VIEWPORTS = [
  { name: '375x812', width: 375, height: 812 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x1000', width: 1440, height: 1000 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const SECTION_IDS = ['hero', 'paths', 'spomove', 'cases'];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(600);

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 1;
    });

    await page.screenshot({
      path: path.join(OUT_DIR, `full-${vp.name}.png`),
      fullPage: true,
    });

    for (const id of SECTION_IDS) {
      const el = page.locator(`#${id}`);
      if ((await el.count()) > 0) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await el.screenshot({ path: path.join(OUT_DIR, `${id}-${vp.name}.png`) });
      }
    }

    if (vp.width < 1024) {
      const menuBtn = page.getByRole('button', { name: /메뉴 열기/ });
      if ((await menuBtn.count()) > 0) {
        await menuBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT_DIR, `mobile-menu-open-${vp.name}.png`) });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    console.log(`[${vp.name}] overflow-x: ${overflow ? 'FAIL' : 'OK'}`);
  }

  await browser.close();

  if (consoleErrors.length > 0) {
    console.log('\nConsole errors:');
    consoleErrors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log('\nConsole errors: none');
  }

  console.log(`\nScreenshots saved to: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
