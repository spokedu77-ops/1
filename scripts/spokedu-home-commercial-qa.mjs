import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const outputDirectory = path.join(process.cwd(), '.qa-spokedu', 'home-commercial');
const widths = [390, 768, 1024, 1440];
const smokeRoutes = ['/education', '/spomove', '/subscription'];
const expectedSections = ['hero', 'pillars', 'paths', 'spomove', 'subscription', 'cases', 'final-action'];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const home = [];
const smoke = [];

try {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const audit = await page.evaluate((sectionIds) => {
      const heroPrimary = document.querySelector('[data-track-label="cta-home-education-hero"]');
      const heroSecondary = document.querySelector('[data-track-label="cta-home-spomove-hero"]');
      const sections = sectionIds.map((id) => document.getElementById(id));
      return {
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        h1: document.querySelector('h1')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        sectionOrder: sections.filter(Boolean).map((element) => element.id),
        primaryHref: heroPrimary?.getAttribute('href') ?? null,
        secondaryHref: heroSecondary?.getAttribute('href') ?? null,
        primaryRadius: heroPrimary ? getComputedStyle(heroPrimary).borderRadius : null,
        pathLinks: [...document.querySelectorAll('#paths a[data-track-label]')].map((link) => link.getAttribute('href')),
      };
    }, expectedSections);
    const pass = Boolean(
      response?.ok() &&
      !audit.overflowX &&
      /아동·청소년 체육교육/.test(audit.h1) &&
      audit.sectionOrder.join('|') === expectedSections.join('|') &&
      audit.primaryHref === '/education' &&
      audit.secondaryHref === '/spomove' &&
      audit.primaryRadius === '14px' &&
      ['/dispatch', '/private', '/subscription', '/contact'].every((href) => audit.pathLinks.includes(href))
    );
    await page.screenshot({ path: path.join(outputDirectory, `home-${width}-viewport.jpg`), type: 'jpeg', quality: 82 });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(500, window.innerHeight * 0.75)) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(outputDirectory, `home-${width}-full.jpg`), type: 'jpeg', quality: 68, fullPage: true });
    home.push({ width, status: response?.status() ?? null, pass, ...audit });
  }

  for (const route of smokeRoutes) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      smoke.push({ route, width, status: response?.status() ?? null, pass: Boolean(response?.ok() && !overflowX) });
    }
  }
} finally {
  await browser.close();
}

const report = { baseUrl, generatedAt: new Date().toISOString(), pass: [...home, ...smoke].every((item) => item.pass), home, smoke };
await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, home: home.map(({ width, pass }) => ({ width, pass })), smoke }, null, 2));
process.exitCode = report.pass ? 0 : 1;
