import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { chromium } from 'playwright';
import { assertLocalQaTarget, installLocalQaRouteGuard } from './lib/qa-network-guard.mjs';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';
const outputDirectory = path.join(process.cwd(), '.qa-spokedu', 'typography');
const widths = [390, 1440];

/** @type {Record<string, { readySelector: string; checks: (audit: object) => boolean; required: string[] }>} */
const PAGE_POLICIES = {
  '/': {
    readySelector: '#home-heading',
    required: ['h1', 'heroLead', 'overflow'],
    checks: (audit) =>
      audit.h1 &&
      /Pretendard|Noto Sans|Apple SD Gothic|Malgun Gothic|system-ui/i.test(audit.h1.family) &&
      Number.parseInt(audit.h1.weight, 10) >= 400 &&
      audit.heroLead &&
      /Pretendard|Noto Sans|Apple SD Gothic|Malgun Gothic|system-ui/i.test(audit.heroLead.family) &&
      !audit.overflowX,
  },
  '/education': {
    readySelector: '#edu-hero',
    required: ['h1', 'bodySample', 'overflow'],
    checks: (audit) =>
      audit.h1 &&
      /Pretendard|Noto Sans|Apple SD Gothic|Malgun Gothic|system-ui/i.test(audit.h1.family) &&
      audit.bodySample &&
      /Pretendard|Noto Sans|Apple SD Gothic|Malgun Gothic|system-ui/i.test(audit.bodySample.family) &&
      !audit.overflowX,
  },
  '/spomove': {
    readySelector: 'main#main-content h1',
    required: ['h1', 'sectionH2', 'overflow'],
    checks: (audit) =>
      audit.h1 &&
      /Pretendard/i.test(audit.h1.family) &&
      audit.h1.weight === '780' &&
      audit.sectionH2 &&
      /Pretendard/i.test(audit.sectionH2.family) &&
      audit.sectionH2.weight === '780' &&
      !audit.overflowX,
  },
  '/private': {
    readySelector: 'main#main-content h1',
    required: ['h1', 'bodySample', 'overflow'],
    checks: (audit) =>
      audit.h1 &&
      /Pretendard/i.test(audit.h1.family) &&
      audit.bodySample &&
      /Pretendard|Noto Sans|Apple SD Gothic|Malgun Gothic|system-ui/i.test(audit.bodySample.family) &&
      !audit.overflowX,
  },
  '/spokedu-lab': {
    readySelector: '[data-spokedu-master-local-nav="true"]',
    required: ['h1', 'overflow'],
    checks: (audit) =>
      audit.h1 &&
      /Pretendard/i.test(audit.h1.family) &&
      audit.h1.weight === '700' &&
      !audit.overflowX,
  },
  '/contact?type=dispatch': {
    readySelector: 'main#main-content h1',
    required: ['h1', 'submitControl', 'overflow'],
    checks: (audit) =>
      audit.h1 &&
      /Pretendard/i.test(audit.h1.family) &&
      audit.h1.weight === '700' &&
      audit.submitControl &&
      /Pretendard/i.test(audit.submitControl.family) &&
      audit.submitControl.radius === '14px' &&
      !audit.overflowX,
  },
};

const routes = Object.keys(PAGE_POLICIES);
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
const page = await browser.newPage({ viewport: { width: widths[0], height: 900 } });
const results = [];

try {
  for (const route of routes) {
    const policy = PAGE_POLICIES[route];
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: route.startsWith('/contact') ? 'networkidle' : 'domcontentloaded',
      timeout: route.startsWith('/contact') ? 180_000 : 120_000,
    });
    stats.navigations += 1;
    await page.locator(policy.readySelector).first().waitFor({ state: 'visible', timeout: 45_000 });
    let contactClientReady = true;
    if (route.startsWith('/contact')) {
      contactClientReady = await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll('main#main-content button')].some((el) =>
              Object.keys(el).some((key) => key.startsWith('__react')),
            ),
          undefined,
          { timeout: 45_000 },
        )
        .then(() => true)
        .catch(() => false);
      if (contactClientReady) {
        await page.waitForFunction(
          () => !document.body.textContent?.includes('문의 폼을 불러오는 중'),
          undefined,
          { timeout: 60_000 },
        );
        await page
          .locator('main#main-content button[data-track^="contact-submit"]')
          .first()
          .waitFor({ state: 'attached', timeout: 60_000 });
      }
    }
    await page.evaluate(() => document.fonts.ready);

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });

      const audit = await page.evaluate(() => {
        const computed = (element) => {
          if (!element) return null;
          const style = getComputedStyle(element);
          return {
            family: style.fontFamily,
            weight: style.fontWeight,
            size: style.fontSize,
            lineHeight: style.lineHeight,
            wordBreak: style.wordBreak,
            radius: style.borderRadius,
          };
        };
        const sectionH2 = document.querySelector('main#main-content h2');
        const submitControl = document.querySelector('main#main-content button[data-track^="contact-submit"]');
        return {
          overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          h1: computed(document.querySelector('main#main-content h1')),
          heroLead: computed(document.querySelector('#home-heading')?.closest('section')?.querySelector('p')),
          bodySample: computed(document.querySelector('main#main-content p')),
          sectionH2: computed(sectionH2),
          submitControl: computed(submitControl),
        };
      });

      if (route.startsWith('/contact') && !contactClientReady) {
        results.push({
          route,
          width,
          status: response?.status() ?? null,
          pass: false,
          blocked: true,
          reason: 'BLOCKED: contact form client bundle did not hydrate in this runtime',
          ...audit,
        });
        continue;
      }

      const missingRequired = policy.required.filter((key) => key !== 'overflow' && !audit[key]);
      const pass = Boolean(
        response?.ok() && missingRequired.length === 0 && policy.checks(audit),
      );
      results.push({
        route,
        width,
        status: response?.status() ?? null,
        pass,
        reason: missingRequired.length
          ? `missing required: ${missingRequired.join(',')}`
          : pass
            ? null
            : 'policy check failed',
        ...audit,
      });
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
  stats: { ...stats, elapsedMs: Math.round(performance.now() - started) },
};
await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
const blocked = results.some((result) => result.blocked);
console.log(
  JSON.stringify(
    {
      pass: report.pass,
      blocked,
      checks: results.map(({ route, width, pass, status, reason, blocked: isBlocked }) => ({
        route,
        width,
        pass,
        status,
        reason,
        blocked: Boolean(isBlocked),
      })),
      stats: report.stats,
    },
    null,
    2,
  ),
);
process.exitCode = blocked ? 2 : report.pass ? 0 : 1;
