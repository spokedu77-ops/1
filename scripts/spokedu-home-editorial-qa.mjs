/**
 * SPOKEDU Home editorial visual QA — Playwright screenshots + layout checks
 * Usage: node scripts/spokedu-home-editorial-qa.mjs
 * Production: SPOKEDU_QA_URL=https://.../ node scripts/spokedu-home-editorial-qa.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/';
const OUT_DIR = path.join(
  process.cwd(),
  'qa-screenshots',
  process.env.SPOKEDU_QA_OUT ?? 'spokedu-home-optical-finish',
);
const FONT_READY_MS = 12_000;

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1440', width: 1440, height: 900 },
];

const SECTION_IDS = ['hero', 'choice', 'spomove', 'subscription', 'cases', 'contact'];

async function waitForFonts(page) {
  const result = await page.evaluate(async (timeoutMs) => {
    if (document.fonts.status === 'loaded') {
      return { status: document.fonts.status };
    }
    const ready = document.fonts.ready.then(() => 'ready');
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), timeoutMs));
    await Promise.race([ready, timeout]);
    return { status: document.fonts.status };
  }, FONT_READY_MS);
  if (result.status !== 'loaded') {
    throw new Error(`FONT LOAD QA BLOCKED (status=${result.status})`);
  }
}

async function cdpPng(page, filePath, clip) {
  const session = await page.context().newCDPSession(page);
  try {
    const params = {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
    };
    if (clip) {
      params.clip = {
        x: Math.max(0, clip.x),
        y: Math.max(0, clip.y),
        width: Math.max(1, clip.width),
        height: Math.max(1, clip.height),
        scale: 1,
      };
    }
    const { data } = await session.send('Page.captureScreenshot', params);
    await writeFile(filePath, Buffer.from(data, 'base64'));
  } finally {
    await session.detach().catch(() => undefined);
  }
}

async function captureFullPage(page, filePath) {
  await page.evaluate(async () => {
    const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  try {
    await cdpPng(page, filePath, null);
  } catch (err) {
    throw new Error(`FULL-PAGE SCREENSHOT FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function captureSection(page, sectionId, filePath) {
  const el = page.locator(`#${sectionId}`);
  if ((await el.count()) === 0) return;
  await el.scrollIntoViewIfNeeded();
  await page.evaluate(async (id) => {
    const node = document.getElementById(id);
    if (!node) return;
    const images = [...node.querySelectorAll('img')];
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          window.setTimeout(resolve, 5000);
        });
      }),
    );
  }, sectionId);
  await page.waitForTimeout(120);
  const docBox = await page.evaluate((id) => {
    const node = document.getElementById(id);
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }, sectionId);
  if (!docBox) throw new Error(`SECTION SCREENSHOT FAIL: missing #${sectionId}`);
  await cdpPng(page, filePath, docBox);
}

async function evaluateLayout(page, viewportWidth) {
  return page.evaluate((vw) => {
    const doc = document.documentElement;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 1;
    const heroCtas = document.querySelectorAll('#hero [data-track-label^="cta-home-"]').length;
    const whySection = Boolean(document.getElementById('why'));

    const heroNatural = (() => {
      const img = document.querySelector('#hero img');
      if (!img) return { fail: true, reason: 'missing' };
      const src = img.currentSrc || img.getAttribute('src') || '';
      const isFieldHero = /home-hero-field\.webp/i.test(src) || /fieldEditorialHero|home-hero-field/i.test(src);
      return {
        fail: !isFieldHero,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        src: src.slice(-80),
      };
    })();

    const textAudit = (() => {
      const nodes = [...document.querySelectorAll('h1, h2, h3, p, a, button')].filter((el) => {
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      let outOfBoundsText = 0;
      let clippedText = 0;
      for (const el of nodes) {
        const rect = el.getBoundingClientRect();
        if (rect.left < -1 || rect.right > vw + 1) outOfBoundsText += 1;
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
          const ps = getComputedStyle(parent);
          if (ps.overflow === 'hidden' || ps.overflowX === 'hidden' || ps.overflowY === 'hidden') {
            const pr = parent.getBoundingClientRect();
            if (rect.top < pr.top - 1 || rect.bottom > pr.bottom + 1 || rect.left < pr.left - 1 || rect.right > pr.right + 1) {
              clippedText += 1;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }
      return { outOfBoundsText, clippedText };
    })();

    return { horizontalOverflow, heroCtas, whySection, heroNatural, textAudit };
  }, viewportWidth);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    page.setDefaultTimeout(90_000);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await waitForFonts(page);
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img')) {
        img.loading = 'eager';
        if (!img.complete) {
          await new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            window.setTimeout(resolve, 8000);
          });
        }
      }
    });
    await page
      .waitForFunction(
        () => {
          const img = document.querySelector('#hero img');
          return Boolean(img && img.complete && img.naturalWidth > 0);
        },
        { timeout: 45_000 },
      )
      .catch(() => undefined);

    const layout = await evaluateLayout(page, vp.width);
    const fails = [];
    if (layout.horizontalOverflow) fails.push('overflow-x');
    if (layout.whySection) fails.push('why-section-present');
    if (layout.heroCtas !== 2) fails.push(`hero-cta-count(${layout.heroCtas})`);
    if (layout.heroNatural.fail) fails.push(`hero-source-low(${JSON.stringify(layout.heroNatural)})`);
    if (layout.textAudit.outOfBoundsText > 0) fails.push(`outOfBoundsText=${layout.textAudit.outOfBoundsText}`);
    if (layout.textAudit.clippedText > 0) fails.push(`clippedText=${layout.textAudit.clippedText}`);

    const status = fails.length === 0 ? 'OK' : `FAIL: ${fails.join('; ')}`;
    console.log(
      `[${vp.name}] ${status} | hero=${layout.heroNatural.naturalWidth}x${layout.heroNatural.naturalHeight} outOfBounds=${layout.textAudit.outOfBoundsText} clipped=${layout.textAudit.clippedText}`,
    );
    results.push({ viewport: vp.name, status, layout });

    await captureFullPage(page, path.join(OUT_DIR, `full-${vp.name}.png`));
    for (const id of SECTION_IDS) {
      await captureSection(page, id, path.join(OUT_DIR, `section-${id}-${vp.name}.png`));
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nScreenshots: ${OUT_DIR}`);
  if (results.some((r) => r.status.startsWith('FAIL'))) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
