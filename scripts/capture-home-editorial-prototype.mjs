/**
 * Playwright capture for Home editorial prototype QA.
 * Usage: npx next dev (port 3000) then node scripts/capture-home-editorial-prototype.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.HOME_PROTOTYPE_URL ?? 'http://localhost:3000/';
const outDir = join(process.cwd(), 'tmp', 'home-editorial-qa');

const viewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.waitForTimeout(800);

  const fullPath = join(outDir, `home-editorial-${vp.name}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('saved', fullPath);

  if (vp.width >= 1024) {
    const foldPath = join(outDir, `home-editorial-${vp.name}-fold.png`);
    await page.screenshot({ path: foldPath, fullPage: false });
    console.log('saved', foldPath);
  }
}

const report = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  viewports: viewports.map((v) => v.name),
  outDir,
};

await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log('done', outDir);
