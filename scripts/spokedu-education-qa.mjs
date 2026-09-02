/**
 * SPOKEDU /education service sales editorial QA
 * Usage: dev server → node scripts/spokedu-education-qa.mjs
 * Production: SPOKEDU_QA_URL=https://.../education node scripts/spokedu-education-qa.mjs
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/education';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-education');

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1440', width: 1440, height: 900 },
];

const SECTION_IDS = ['hero', 'institutional', 'cases'];
const FONT_READY_MS = 12_000;

async function waitForFonts(page) {
  const result = await page.evaluate(async (timeoutMs) => {
    if (document.fonts.status === 'loaded') {
      return { winner: 'already', status: document.fonts.status, size: document.fonts.size };
    }
    const ready = document.fonts.ready.then(() => 'ready');
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), timeoutMs));
    const winner = await Promise.race([ready, timeout]);
    return { winner, status: document.fonts.status, size: document.fonts.size };
  }, FONT_READY_MS);

  // Chromium can leave fonts.ready pending even after status=loaded; do not fake fonts.
  if (result.status === 'loaded') return;

  throw new Error(`FONT LOAD QA BLOCKED (winner=${result.winner}, status=${result.status}, size=${result.size})`);
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
    const { writeFile } = await import('node:fs/promises');
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
    // Playwright screenshot waits on fonts.ready; CDP does not fake document.fonts.
    await cdpPng(page, filePath, null);
  } catch (err) {
    throw new Error(`FULL-PAGE SCREENSHOT FAIL: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function captureSection(page, sectionId, filePath) {
  const el = page.locator(`#${sectionId}`);
  if ((await el.count()) === 0) return;
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await el.boundingBox();
  if (!box) throw new Error(`FULL-PAGE SCREENSHOT FAIL: missing box for #${sectionId}`);
  // Document-relative clip for captureBeyondViewport
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
  if (!docBox) throw new Error(`FULL-PAGE SCREENSHOT FAIL: missing #${sectionId}`);
  try {
    await cdpPng(page, filePath, docBox);
  } catch (err) {
    throw new Error(`SECTION SCREENSHOT FAIL (#${sectionId}): ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function evaluateLayout(page, viewportWidth) {
  return page.evaluate((vw) => {
    const doc = document.documentElement;
    const body = document.body;
    const horizontalOverflow = doc.scrollWidth > doc.clientWidth + 1;
    const verticalScrollOk = doc.scrollHeight >= doc.clientHeight;

    const hasCardUi = Boolean(document.querySelector('[class*="marketingCardInteractive"]'));

    const spomoveCta = [...document.querySelectorAll('a, button')].some((el) =>
      /SPOMOVE 알아보기/i.test(el.textContent ?? ''),
    );

    const casesGrammar = (() => {
      const grid = document.querySelector('[class*="casesGrid"]');
      if (!grid) return { fail: true, reason: 'missing-grid' };
      const items = [...grid.querySelectorAll('li')];
      if (items.length !== 3) return { fail: true, reason: 'expected-3-cases' };
      const layouts = items.map((li) => {
        const article = li.querySelector('article');
        const photo = li.querySelector('[class*="casePhoto"]');
        const meta = li.querySelector('[class*="caseMeta"]');
        if (!article || !photo || !meta) return 'incomplete';
        const articleCol = getComputedStyle(article).flexDirection === 'column';
        const photoBeforeMeta = photo.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING;
        return articleCol && photoBeforeMeta ? 'photo-caption-cta' : 'broken';
      });
      const compactHorizontal = items.some((li) => {
        const article = li.querySelector('article');
        return article && getComputedStyle(article).flexDirection === 'row';
      });
      return {
        fail: layouts.some((l) => l !== 'photo-caption-cta') || compactHorizontal,
        layouts,
        compactHorizontal,
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

      return { outOfBoundsText, clippedText, sampleCount: nodes.length };
    })();

    const documentaryRadius = (() => {
      const photo = document.querySelector('#cases [class*="casePhoto"]');
      if (!photo) return { fail: true, reason: 'missing-photo' };
      const radius = getComputedStyle(photo).borderRadius;
      const px = Number.parseFloat(radius);
      return { fail: Number.isNaN(px) || px > 8.5, radius, px };
    })();

    return {
      horizontalOverflow,
      verticalScrollOk,
      hasCardUi,
      spomoveCta,
      casesGrammar,
      textAudit,
      documentaryRadius,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyScrollWidth: body.scrollWidth,
    };
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
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await waitForFonts(page);
    await page.waitForTimeout(800);
    await page.locator('#cases').scrollIntoViewIfNeeded().catch(() => undefined);
    await page
      .waitForFunction(
        () => [...document.querySelectorAll('#cases img')].every((img) => img.complete && img.naturalWidth > 0),
        { timeout: 45_000 },
      )
      .catch(() => undefined);

    const layout = await evaluateLayout(page, vp.width);
    const fails = [];
    if (layout.horizontalOverflow) fails.push('overflow-x');
    if (layout.hasCardUi) fails.push('card-ui');
    if (layout.spomoveCta) fails.push('spomove-cta');
    if (vp.width >= 1024 && layout.casesGrammar.fail) fails.push(`cases-grammar(${JSON.stringify(layout.casesGrammar)})`);
    if (layout.documentaryRadius.fail) fails.push(`documentary-radius(${layout.documentaryRadius.radius})`);
    if (layout.textAudit.outOfBoundsText > 0) fails.push(`outOfBoundsText=${layout.textAudit.outOfBoundsText}`);
    if (layout.textAudit.clippedText > 0) fails.push(`clippedText=${layout.textAudit.clippedText}`);

    const status = fails.length === 0 ? 'OK' : `FAIL: ${fails.join('; ')}`;
    console.log(
      `[${vp.name}] ${status} | outOfBoundsText=${layout.textAudit.outOfBoundsText} clippedText=${layout.textAudit.clippedText} horizontalOverflow=${layout.horizontalOverflow}`,
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
  const failed = results.filter((r) => r.status.startsWith('FAIL'));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
