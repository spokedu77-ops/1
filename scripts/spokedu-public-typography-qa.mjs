import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const outputDirectory = path.join(process.cwd(), '.qa-spokedu', 'typography');
const routes = ['/', '/subscription', '/education', '/spomove', '/private', '/dispatch', '/about'];
const widths = [390, 768, 1024, 1440];

await mkdir(outputDirectory, { recursive: true });

function slug(route) {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const results = [];

try {
  for (const route of routes) {
    await page.setViewportSize({ width: widths[0], height: 900 });
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.evaluate(() => document.fonts.ready);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);

      const audit = await page.evaluate(async () => {
        const computed = (element) => {
          if (!element) return null;
          const style = getComputedStyle(element);
          return {
            family: style.fontFamily,
            weight: style.fontWeight,
            synthesis: style.fontSynthesis,
            radius: style.borderRadius,
            shadow: style.boxShadow,
            text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ?? '',
          };
        };
        const displayH2 = document.querySelector('h2[class*="spokedu-marketing-font-display"]');
        const canonicalControl = document.querySelector(
          'main .button, main a[class*="spokedu-marketing-radius-sm"], main button[class*="spokedu-marketing-radius-sm"]',
        );
        const fontResponse = await fetch('/fonts/Cafe24SsurroundAir.woff', { method: 'HEAD' });
        return {
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          fontLoaded: document.fonts.check('400 32px "Cafe24SsurroundAir"'),
          fontAssetStatus: fontResponse.status,
          h1: computed(document.querySelector('h1')),
          h2: computed(displayH2),
          body: computed(document.querySelector('main p')),
          control: computed(canonicalControl),
          surface: computed(document.querySelector('main article[class*="spokedu-marketing-radius-md"]')),
        };
      });

      const displayOk = (value) =>
        value && value.family.includes('Cafe24SsurroundAir') && value.weight === '400' && value.synthesis === 'none';
      const bodyOk = (value) => !value || /Pretendard/.test(value.family);
      const controlOk = (value) => !value || (bodyOk(value) && value.radius === '14px');
      const pass = Boolean(
        response?.ok() &&
          !audit.overflowX &&
          audit.fontLoaded &&
          audit.fontAssetStatus === 200 &&
          displayOk(audit.h1) &&
          (!audit.h2 || displayOk(audit.h2)) &&
          bodyOk(audit.body) &&
          controlOk(audit.control),
      );

      const screenshot = path.join(outputDirectory, `${slug(route)}-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      results.push({ route, width, status: response?.status() ?? null, pass, ...audit, screenshot });
    }
  }
} finally {
  await browser.close();
}

const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  pass: results.every((result) => result.pass),
  results,
};
await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  pass: report.pass,
  checks: results.map(({ route, width, pass, status }) => ({ route, width, pass, status })),
}, null, 2));
process.exitCode = report.pass ? 0 : 1;
