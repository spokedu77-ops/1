import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { chromium } from 'playwright';
import { assertLocalQaTarget, installLocalQaRouteGuard } from './lib/qa-network-guard.mjs';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';
const outputDirectory = path.join(process.cwd(), '.qa-spokedu', 'home-commercial');
const homeWidths = [390, 1440];
const smokeRoutes = ['/private', '/education', '/spomove', '/spokedu-lab'];

const stats = { navigations: 0, screenshots: 0, blockedRemote: 0 };

await mkdir(outputDirectory, { recursive: true });
assertLocalQaTarget(baseUrl);
const started = performance.now();
const browser = await chromium.launch({ headless: true });
const originalNewPage = browser.newPage.bind(browser);
browser.newPage = async (...args) => {
  const page = await originalNewPage(...args);
  await installLocalQaRouteGuard(page.context());
  page.on('requestfailed', (req) => {
    if (req.failure()?.errorText === 'blockedbyclient') stats.blockedRemote += 1;
  });
  return page;
};
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const home = [];
const smoke = [];

const EXPECTED_SECTION_HEADINGS = [
  'home-heading',
  'audience-heading',
  'expertise-heading',
  'records-heading',
  'products-heading',
  'consult-heading',
];

try {
  for (const width of homeWidths) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    stats.navigations += 1;
    await page.locator('#home-heading').waitFor({ state: 'visible', timeout: 45_000 });
    await page.evaluate(() => document.fonts.ready);

    const audit = await page.evaluate(async (headingIds) => {
      const root = document.querySelector('[data-spokedu-home-build]');
      const sections = root ? [...root.querySelectorAll('section')] : [];
      const headingOrder = sections.map((section) => {
        const h = section.querySelector('h1, h2');
        return h?.id ?? null;
      });
      const h1Nodes = [...document.querySelectorAll('main#main-content h1')];
      const images = [...document.querySelectorAll('main#main-content img')];
      for (const image of images) image.loading = 'eager';
      await Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
            window.setTimeout(resolve, 8_000);
          });
        }),
      );
      const brokenImages = images
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.getAttribute('src') || '')
        .filter(Boolean);
      const audienceHrefs = [...document.querySelectorAll('#audience a[href]')].map((a) => a.getAttribute('href'));
      const productLinks = [...document.querySelectorAll('section[class*="products"] a[href], .products a[href]')].map((a) =>
        a.getAttribute('href'),
      );
      const allMainLinks = [...document.querySelectorAll('main#main-content a[href]')].map((a) => a.getAttribute('href'));
      const heroPrimary = document.querySelector('.heroActions a.primaryButton, [class*="heroActions"] a')?.getAttribute('href');
      const consultLinks = [...document.querySelectorAll('[class*="consultLinks"] a[href]')].map((a) => a.getAttribute('href'));

      return {
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        sectionCount: sections.length,
        headingOrder,
        h1Count: h1Nodes.length,
        h1: h1Nodes[0]?.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        sectionsAttr: root?.getAttribute('data-spokedu-home-sections') ?? null,
        heroPrimary,
        audienceHrefs,
        productLinks,
        allMainLinks,
        consultLinks,
        brokenImages,
        hasExpertiseCopy: Boolean(document.querySelector('#expertise-heading')),
        hasRecordsGrid: document.querySelectorAll('[class*="recordsGrid"] img, [class*="recordMedia"] img').length >= 5,
      };
    }, EXPECTED_SECTION_HEADINGS);

    const hrefIncludes = (list, target) =>
      list.some((href) => href === target || (typeof href === 'string' && href.startsWith(`${target}?`)));

    const pass = Boolean(
      response?.ok() &&
        !audit.overflowX &&
        audit.sectionCount === 6 &&
        audit.headingOrder.join('|') === EXPECTED_SECTION_HEADINGS.join('|') &&
        audit.h1Count === 1 &&
        /아이의 움직임을/.test(audit.h1) &&
        audit.sectionsAttr === '6' &&
        audit.heroPrimary === '#audience' &&
        hrefIncludes(audit.audienceHrefs, '/private') &&
        hrefIncludes(audit.audienceHrefs, '/education') &&
        hrefIncludes(audit.audienceHrefs, '/spokedu-lab') &&
        hrefIncludes(audit.allMainLinks, '/spomove') &&
        hrefIncludes(audit.allMainLinks, '/spokedu-lab') &&
        hrefIncludes(audit.consultLinks, '/contact') &&
        audit.hasExpertiseCopy &&
        audit.hasRecordsGrid &&
        audit.brokenImages.length === 0,
    );

    home.push({ width, status: response?.status() ?? null, pass, ...audit });
  }

  for (const route of smokeRoutes) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      stats.navigations += 1;
      await page.locator('main#main-content').waitFor({ state: 'attached', timeout: 45_000 });
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      smoke.push({ route, width, status: response?.status() ?? null, pass: Boolean(response?.ok() && !overflowX) });
    }
  }
} finally {
  await browser.close();
}

const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  pass: [...home, ...smoke].every((item) => item.pass),
  home,
  smoke,
  stats: { ...stats, elapsedMs: Math.round(performance.now() - started) },
};
await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, home: home.map(({ width, pass }) => ({ width, pass })), smoke, stats: report.stats }, null, 2));
process.exitCode = report.pass ? 0 : 1;
