import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlUrl = pathToFileURL(path.join(__dirname, 'METHOD_RECORDS_COMPARISON.html')).href;
const capturesDir = path.join(__dirname, 'captures');

const widths = [1440, 1024, 834, 390];
const report = { overflow: {}, contrast: {}, captures: [] };

const browser = await chromium.launch();
try {
  await mkdir(capturesDir, { recursive: true });
  const page = await browser.newPage();

  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    await page.goto(`${htmlUrl}?variant=a`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#method-block-a');
    report.overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  }

  for (const [variant, methodSel, recordsSel] of [
    ['a', '#method-block-a', '#records-block-a'],
    ['b', '#method-block-b', '#records-block-b'],
  ]) {
    for (const w of [1440, 390]) {
      await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
      await page.goto(`${htmlUrl}?variant=${variant}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector(methodSel);
      await page.locator(methodSel).scrollIntoViewIfNeeded();
      for (const img of await page.locator(`${methodSel} img`).all()) {
        await img.evaluate((el) => el.decode?.().catch(() => {}));
      }
      const methodFile = `method-${variant.toUpperCase()}-${w}.png`;
      await page.locator(methodSel).screenshot({ path: path.join(capturesDir, methodFile), animations: 'disabled' });
      report.captures.push(methodFile);

      await page.locator(recordsSel).scrollIntoViewIfNeeded();
      for (const img of await page.locator(`${recordsSel} img`).all()) {
        await img.evaluate((el) => el.decode?.().catch(() => {}));
      }
      const recordsFile = `records-${variant.toUpperCase()}-${w}.png`;
      await page.locator(recordsSel).screenshot({ path: path.join(capturesDir, recordsFile), animations: 'disabled' });
      report.captures.push(recordsFile);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${htmlUrl}?variant=a`, { waitUntil: 'domcontentloaded' });
  const btn = page.locator('.toolbar button').first();
  await btn.focus();
  await page.screenshot({ path: path.join(capturesDir, 'focus-toolbar-390.png') });

  report.contrast = await page.evaluate(() => {
    const navy = '#0b1f46';
    const sample = document.querySelector('.dark .display');
    if (!sample) return { note: 'no sample' };
    const fg = getComputedStyle(sample).color;
    return { darkHeadingColor: fg, navyToken: navy };
  });

  await writeFile(path.join(__dirname, 'playwright-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
