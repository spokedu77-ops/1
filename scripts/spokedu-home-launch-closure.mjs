/**
 * SPOKEDU Home — launch closure QA (production)
 * Usage: node scripts/spokedu-home-launch-closure.mjs [baseUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE_URL = (process.argv[2] ?? process.env.SPOKEDU_QA_URL ?? 'https://spokedu.kr/').replace(/\/?$/, '/');
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-home-launch-closure');
const SECTION_IDS = ['hero', 'choice', 'spomove', 'subscription', 'cases', 'contact'];
const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1440', width: 1440, height: 900 },
];

async function runLighthouse(page, formFactor) {
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  await session.send('Emulation.setCPUThrottlingRate', { rate: formFactor === 'mobile' ? 4 : 1 });
  if (formFactor === 'mobile') {
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
  }
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(1500);

  const metrics = await session.send('Performance.getMetrics');
  const nav = await page.evaluate(() => {
    const navEntry = performance.getEntriesByType('navigation')[0];
    return navEntry
      ? { domContentLoaded: navEntry.domContentLoadedEventEnd, load: navEntry.loadEventEnd }
      : null;
  });

  let lcpElement = null;
  let lcpTime = null;
  try {
    const lcp = await page.evaluate(() =>
      new Promise((resolve) => {
        let value = null;
        let element = null;
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) {
            value = last.startTime;
            element = last.element?.tagName?.toLowerCase() ?? null;
            const src =
              last.element?.currentSrc ||
              last.element?.getAttribute?.('src') ||
              last.element?.textContent?.slice(0, 80) ||
              null;
            resolve({ value, element, src });
          }
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve({ value, element, src: null }), 8000);
      }),
    );
    lcpElement = lcp;
    lcpTime = lcp.value;
  } catch {
    /* unsupported */
  }

  const cls = metrics.metrics.find((m) => m.name === 'CumulativeLayoutShift')?.value ?? null;
  const tbtProxy = metrics.metrics.find((m) => m.name === 'TotalBlockingTime')?.value ?? null;

  await session.detach().catch(() => undefined);
  return { formFactor, lcpTime, lcpElement, cls, tbtProxy, nav };
}

async function captureNetworkWaterfall(page) {
  const requests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (
      /home-hero-field|home-spomove-field|_next\/image/i.test(url) ||
      /field-editorial/i.test(url)
    ) {
      requests.push({ url: url.slice(0, 200), start: Date.now(), resourceType: req.resourceType() });
    }
  });
  page.on('response', async (res) => {
    const url = res.url();
    const hit = requests.find((r) => url.startsWith(r.url.slice(0, 120)) || r.url.includes('home-hero') || r.url.includes('home-spomove'));
    if (/home-hero-field|home-spomove-field|_next\/image.*home-(hero|spomove)/i.test(url)) {
      const req = requests.find((r) => url.includes(r.url.split('?')[0].slice(-40)) || url === r.url);
      const timing = performanceNow();
      requests.push({
        url: url.slice(0, 220),
        status: res.status(),
        size: (await res.headerValue('content-length')) ?? 'chunked',
        timing,
        resourceType: res.request().resourceType(),
      });
    }
  });

  const t0 = Date.now();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(3000);

  const heroImg = await page.evaluate(() => {
    const img = document.querySelector('#hero img');
    if (!img) return null;
    return {
      currentSrc: img.currentSrc,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      loading: img.getAttribute('loading'),
      fetchPriority: img.getAttribute('fetchpriority'),
      complete: img.complete,
    };
  });

  const spomoveImg = await page.evaluate(() => {
    const img = document.querySelector('#spomove img');
    if (!img) return null;
    return {
      currentSrc: img.currentSrc,
      loading: img.getAttribute('loading'),
      fetchPriority: img.getAttribute('fetchpriority'),
    };
  });

  const imagePolicy = await page.evaluate(() =>
    [...document.querySelectorAll('main img')].map((img) => ({
      section: img.closest('section')?.id ?? 'unknown',
      loading: img.getAttribute('loading'),
      fetchPriority: img.getAttribute('fetchpriority'),
      src: (img.currentSrc || img.getAttribute('src') || '').slice(-80),
    })),
  );

  const preloadLinks = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel="preload"]')].map((l) => ({
      as: l.getAttribute('as'),
      href: (l.getAttribute('href') || '').slice(-100),
    })),
  );

  return {
    elapsedMs: Date.now() - t0,
    heroImg,
    spomoveImg,
    imagePolicy,
    preloadLinks,
    capturedRequests: requests.slice(0, 20),
  };
}

function performanceNow() {
  return Date.now();
}

async function auditDom(page) {
  return page.evaluate((sectionIds) => {
    const h1s = [...document.querySelectorAll('h1')];
    const h2s = [...document.querySelectorAll('h2')].map((el) => el.textContent?.trim().slice(0, 60));
    const sections = sectionIds.map((id) => Boolean(document.getElementById(id)));
    const why = Boolean(document.getElementById('why'));
    const heroCtas = document.querySelectorAll('#hero [data-track-label^="cta-home-"]').length;
    const skip = document.querySelector('a[href="#main-content"], a[href="#main"]');
    const imgs = [...document.querySelectorAll('main img')].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 0;
    });
    const missingAlt = imgs.filter((img) => !img.getAttribute('alt')?.trim()).length;
    const reducedMotion = getComputedStyle(document.documentElement).getPropertyValue('--he-section-quiet');
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null;
    const title = document.title;
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    const ldJson = [...document.querySelectorAll('script[type="application/ld+json"]')].length;
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      h1Count: h1s.length,
      h1Text: h1s[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
      h2s,
      sectionPresent: Object.fromEntries(sectionIds.map((id, i) => [id, sections[i]])),
      why,
      heroCtas,
      skipLink: Boolean(skip),
      missingAlt,
      canonical,
      robots,
      title,
      desc: desc?.slice(0, 120),
      ldJsonCount: ldJson,
      overflowX: overflow,
      fontsStatus: document.fonts.status,
    };
  }, SECTION_IDS);
}

async function captureScreenshots(browser) {
  await mkdir(OUT_DIR, { recursive: true });
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of document.querySelectorAll('img')) {
        if (!img.complete) {
          await new Promise((r) => {
            img.addEventListener('load', r, { once: true });
            img.addEventListener('error', r, { once: true });
            setTimeout(r, 6000);
          });
        }
      }
    });
    await page.screenshot({ path: path.join(OUT_DIR, `full-${vp.name}.png`), fullPage: true });
    for (const id of SECTION_IDS) {
      if (vp.name === '390' && !['hero', 'spomove', 'cases'].includes(id)) continue;
      const el = page.locator(`#${id}`);
      if ((await el.count()) === 0) continue;
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await el.screenshot({ path: path.join(OUT_DIR, `section-${id}-${vp.name}.png`) });
    }
    await page.close();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const report = { baseUrl: BASE_URL, timestamp: new Date().toISOString() };

  const browser = await chromium.launch();

  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  report.network = await captureNetworkWaterfall(desktopPage);
  report.domDesktop = await auditDom(desktopPage);
  await desktopPage.close();

  const mobilePage = await browser.newPage({ ...devices['iPhone 13'] });
  report.domMobile = await auditDom(mobilePage);
  report.lighthouseMobile = await runLighthouse(mobilePage, 'mobile');
  await mobilePage.close();

  const lhDesktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  report.lighthouseDesktop = await runLighthouse(lhDesktopPage, 'desktop');
  await lhDesktopPage.close();

  await captureScreenshots(browser);
  await browser.close();

  const reportPath = path.join(OUT_DIR, 'closure-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log('=== SPOKEDU HOME LAUNCH CLOSURE ===');
  console.log(`URL: ${BASE_URL}`);
  console.log(`H1: ${report.domDesktop.h1Count} | Hero CTAs: ${report.domDesktop.heroCtas} | Why: ${report.domDesktop.why}`);
  console.log(`Sections: ${JSON.stringify(report.domDesktop.sectionPresent)}`);
  console.log(`Canonical: ${report.domDesktop.canonical}`);
  console.log(`Title: ${report.domDesktop.title}`);
  console.log(`Hero img: ${JSON.stringify(report.network.heroImg)}`);
  console.log(`SPOMOVE img: ${JSON.stringify(report.network.spomoveImg)}`);
  console.log(`Preloads: ${JSON.stringify(report.network.preloadLinks)}`);
  console.log(`Image policy: ${JSON.stringify(report.network.imagePolicy, null, 2)}`);
  console.log(`Mobile LCP: ${report.lighthouseMobile.lcpTime}ms element=${JSON.stringify(report.lighthouseMobile.lcpElement)}`);
  console.log(`Desktop LCP: ${report.lighthouseDesktop.lcpTime}ms element=${JSON.stringify(report.lighthouseDesktop.lcpElement)}`);
  console.log(`Mobile CLS: ${report.lighthouseMobile.cls} | Desktop CLS: ${report.lighthouseDesktop.cls}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Screenshots: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
