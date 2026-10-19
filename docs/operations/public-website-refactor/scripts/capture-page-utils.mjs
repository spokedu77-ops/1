#!/usr/bin/env node
/**
 * Shared Playwright stabilization for refactor screenshot QA.
 */

const IMAGE_WAIT_MS = 45_000;
const SCROLL_PAUSE_MS = 120;

/**
 * @param {import('playwright').Page} page
 * @param {string} route
 */
export async function stabilizePublicPage(page, route) {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto(route, {
    waitUntil: 'domcontentloaded',
    timeout: 120_000,
  });

  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const urlPath = route.replace(/^https?:\/\/[^/]+/, '') || '/';
  const headingSel =
    urlPath === '/records'
      ? '#records-title, h1'
      : 'main h1, h1, [role="heading"][aria-level="1"]';

  try {
    await page.locator(headingSel).first().waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    await page.locator('main, [role="main"], body').first().waitFor({ state: 'visible', timeout: 20_000 });
  }

  await progressiveScroll(page);

  const imageReport = await waitForVisibleImages(page, IMAGE_WAIT_MS);
  const layoutReport = await detectLayoutIssues(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);

  return {
    pageLoaded: true,
    fontReady: true,
    ...imageReport,
    ...layoutReport,
  };
}

/** @param {import('playwright').Page} page */
async function progressiveScroll(page) {
  const metrics = await page.evaluate(() => ({
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    viewport: window.innerHeight,
  }));

  let y = 0;
  const step = Math.max(200, Math.floor(metrics.viewport * 0.85));
  while (y < metrics.height) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(SCROLL_PAUSE_MS);
    y += step;
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(SCROLL_PAUSE_MS);
}

/**
 * @param {import('playwright').Page} page
 * @param {number} budgetMs
 */
async function waitForVisibleImages(page, budgetMs) {
  const started = Date.now();
  let brokenImageCount = 0;
  let pendingImageCount = 0;

  while (Date.now() - started < budgetMs) {
    const scan = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      let broken = 0;
      let pending = 0;
      for (const img of imgs) {
        const style = window.getComputedStyle(img);
        const hidden =
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0 ||
          img.getAttribute('aria-hidden') === 'true';
        const rect = img.getBoundingClientRect();
        const visible = !hidden && rect.width >= 8 && rect.height >= 8;
        if (!visible) continue;
        if (!img.complete || img.naturalWidth <= 0) pending += 1;
        else if (img.complete && img.naturalWidth <= 0) broken += 1;
      }
      return { broken, pending };
    });

    brokenImageCount = scan.broken;
    pendingImageCount = scan.pending;
    if (pendingImageCount === 0 && brokenImageCount === 0) break;
    await page.waitForTimeout(250);
  }

  return { brokenImageCount, pendingImageCount, imagesReady: pendingImageCount === 0 && brokenImageCount === 0 };
}

/** @param {import('playwright').Page} page */
async function detectLayoutIssues(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 2;
    let hiddenContentCount = 0;
    for (const el of document.querySelectorAll('h1, h2, main a[href], button')) {
      const style = window.getComputedStyle(el);
      if (Number(style.opacity) === 0 && style.display !== 'none') hiddenContentCount += 1;
    }
    return { horizontalOverflow, hiddenContentCount };
  });
}

/**
 * @param {string} src
 */
export function normalizeImageSrc(src, origin) {
  if (!src) return '';
  try {
    const url = new URL(src, origin);
    if (url.pathname === '/_next/image') {
      const inner = url.searchParams.get('url');
      if (inner) return decodeURIComponent(inner);
    }
    if (url.pathname.startsWith('/images/')) return url.pathname;
    return url.href;
  } catch {
    return src;
  }
}
