import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const baseUrl = 'http://localhost:3000/spokedu/contact';
const widths = [
  { name: '360', width: 360, height: 900 },
  { name: '390', width: 390, height: 900 },
  { name: '430', width: 430, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const report = { widths: {}, footer: null, hero: null, submit: null };

for (const vp of widths) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(800);

  const footerInfo = await page.evaluate(() => {
    const globalFooters = document.querySelectorAll('body > div.min-h-screen > footer');
    const allFooters = document.querySelectorAll('footer');
    const globalVisible = Array.from(globalFooters).filter(
      (el) => getComputedStyle(el).display !== 'none',
    ).length;
    const contactFooter = document.querySelector('footer.bg-gradient-to-b');
    return {
      globalFooterCount: globalFooters.length,
      globalVisibleCount: globalVisible,
      totalFooterCount: allFooters.length,
      hasContactFooter: Boolean(contactFooter),
      contactFooterText: contactFooter?.textContent?.slice(0, 80) ?? null,
    };
  });

  const heroInfo = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const sub = h1?.parentElement?.querySelector('p:last-of-type');
    if (!h1 || !sub) return null;
    const h1Rect = h1.getBoundingClientRect();
    const subStyle = getComputedStyle(sub);
    const subRect = sub.getBoundingClientRect();
    const h1Lines = Array.from(h1.querySelectorAll('span')).map((s) => s.textContent);
    return {
      h1Lines,
      h1Height: h1Rect.height,
      subWidth: subRect.width,
      subWordBreak: subStyle.wordBreak,
      subText: sub.textContent?.slice(0, 60),
    };
  });

  await page.screenshot({ path: path.join(outDir, `contact-${vp.name}-top.png`), fullPage: false });
  await page.screenshot({ path: path.join(outDir, `contact-${vp.name}-full.png`), fullPage: true });

  report.widths[vp.name] = { footerInfo, heroInfo };
  await context.close();
}

// Footer after hydration (client hide)
{
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  report.footer = await page.evaluate(() => {
    const globalFooters = document.querySelectorAll('body > div.min-h-screen > footer');
    const globalVisible = Array.from(globalFooters).filter(
      (el) => getComputedStyle(el).display !== 'none',
    );
    const contactFooters = document.querySelectorAll('footer.bg-gradient-to-b');
    return {
      globalFooterCount: globalFooters.length,
      globalVisibleCount: globalVisible.length,
      contactFooterCount: contactFooters.length,
      duplicateRisk: globalVisible.length > 0 && contactFooters.length > 0,
    };
  });
  await page.close();
}

await browser.close();
await writeFile(path.join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
