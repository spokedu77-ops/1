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
    await page.goto('about:blank');
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outputDirectory, `home-${width}-viewport.jpg`), type: 'jpeg', quality: 82 });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(500, window.innerHeight * 0.75)) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.evaluate(async () => {
      const images = [...document.querySelectorAll('main img')];
      for (const image of images) image.loading = 'eager';
      await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
          window.setTimeout(resolve, 5_000);
        });
      }));
      window.scrollTo(0, 0);
    });
    await page.screenshot({ path: path.join(outputDirectory, `home-${width}-full.jpg`), type: 'jpeg', quality: 68, fullPage: true });
    const audit = await page.evaluate(async (sectionIds) => {
      const heroPrimary = document.querySelector('[data-track-label="cta-home-education-hero"]');
      const heroSecondary = document.querySelector('[data-track-label="cta-home-spomove-hero"]');
      const sections = sectionIds.map((id) => document.getElementById(id));
      const images = [...document.querySelectorAll('main img')];
      const imageSources = images.map((image) => image.currentSrc || image.getAttribute('src') || '');
      const duplicateImageSources = [...new Set(imageSources.filter((src, index) => src && imageSources.indexOf(src) !== index))];
      const unresolvedImages = images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.getAttribute('src') || '')
        .filter(Boolean);
      const brokenImages = (await Promise.all(unresolvedImages.map(async (src) => {
        try {
          const response = await fetch(src, { cache: 'no-store' });
          return response.ok ? null : src;
        } catch {
          return src;
        }
      }))).filter(Boolean);
      return {
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        h1: document.querySelector('h1')?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        sectionOrder: sections.filter(Boolean).map((element) => element.id),
        primaryHref: heroPrimary?.getAttribute('href') ?? null,
        secondaryHref: heroSecondary?.getAttribute('href') ?? null,
        primaryRadius: heroPrimary ? getComputedStyle(heroPrimary).borderRadius : null,
        pathLinks: [...document.querySelectorAll('#paths a[data-track-label]')].map((link) => link.getAttribute('href')),
        brokenImages,
        duplicateImageSources,
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
      audit.brokenImages.length === 0 &&
      audit.duplicateImageSources.length === 0 &&
      ['/dispatch', '/private', '/subscription', '/contact'].every((href) => audit.pathLinks.includes(href))
    );
    home.push({ width, status: response?.status() ?? null, pass, ...audit });
  }

  for (const route of smokeRoutes) {
    for (const width of [390, 1440]) {
      await page.goto('about:blank');
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
