/**
 * SPOKEDU 홈 반응형 QA — Playwright 스크린샷 + 레이아웃 검증
 * 사용: npm run start 실행 후 `node scripts/spokedu-home-qa.mjs`
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/spokedu';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-home');

const VIEWPORT_WIDTHS = [
  320, 360, 390, 430, 540, 640, 720, 768, 820, 900, 975, 1000, 1024, 1100, 1180, 1200, 1280, 1440,
];

const PRIORITY_WIDTHS = new Set([975, 1024, 1180]);

const SECTION_IDS = ['hero', 'paths', 'cases', 'spomove', 'contact-cta'];

function viewportName(width) {
  return `${width}x900`;
}

async function evaluateLayout(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth > doc.clientWidth + 1;

    const gutterFail = [];
    for (const el of document.querySelectorAll('main section, footer')) {
      const container = el.querySelector('.site-container');
      if (!container) continue;
      const style = getComputedStyle(container);
      const padL = Number.parseFloat(style.paddingLeft);
      const padR = Number.parseFloat(style.paddingRight);
      if (padL < 19 || padR < 19) {
        gutterFail.push({ id: el.id || el.tagName, left: Math.round(padL), right: Math.round(padR) });
      }
    }

    const overlaps = [];
    const finalCta = document.querySelector('#contact-cta');
    if (finalCta) {
      const texts = finalCta.querySelectorAll('h2, p, a, button');
      const boxes = [...texts].map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      });
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const intersect =
            a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          if (intersect && Math.abs(a.top - b.top) < 200) {
            overlaps.push(`${a.tag}+${b.tag}`);
          }
        }
      }
    }

    const koreanBreaks = [];
    for (const el of document.querySelectorAll('footer p, #contact-cta h2, #contact-cta p')) {
      const text = el.textContent ?? '';
      if (/브랜[\u200b\u00ad]\s*드/.test(text)) {
        koreanBreaks.push(text.trim().slice(0, 40));
      }
    }

    const sectionStarts = [];
    for (const id of ['hero', 'paths', 'cases', 'spomove', 'contact-cta']) {
      const section = document.getElementById(id);
      if (!section) continue;
      const inner = section.querySelector('.site-container');
      if (inner) {
        const style = getComputedStyle(inner);
        const rect = inner.getBoundingClientRect();
        sectionStarts.push(Math.round(rect.left + Number.parseFloat(style.paddingLeft)));
      }
    }
    const alignMismatch =
      sectionStarts.length > 1 && Math.max(...sectionStarts) - Math.min(...sectionStarts) > 2;

    return { overflow, gutterFail, overlaps, koreanBreaks, alignMismatch, sectionStarts };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  let totalFails = 0;

  for (const width of VIEWPORT_WIDTHS) {
    const name = viewportName(width);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(600);

    const layout = await evaluateLayout(page);
    const fails = [];
    if (layout.overflow) fails.push('overflow-x');
    if (layout.gutterFail.length > 0) fails.push(`gutter(${layout.gutterFail.length})`);
    if (layout.overlaps.length > 0) fails.push(`overlap(${layout.overlaps.join(',')})`);
    if (layout.koreanBreaks.length > 0) fails.push('korean-break');
    if (layout.alignMismatch) fails.push('align');

    const status = fails.length === 0 ? 'OK' : `FAIL: ${fails.join('; ')}`;
    if (fails.length > 0) totalFails += 1;
    console.log(`[${name}] ${status}`);

    if (PRIORITY_WIDTHS.has(width) || width === 320) {
      await page.screenshot({
        path: path.join(OUT_DIR, `full-${name}.png`),
        fullPage: true,
      });

      for (const id of SECTION_IDS) {
        const el = page.locator(`#${id}`);
        if ((await el.count()) > 0) {
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await el.screenshot({ path: path.join(OUT_DIR, `${id}-${name}.png`) });
        }
      }
    }
  }

  await browser.close();

  if (consoleErrors.length > 0) {
    console.log('\nConsole errors:');
    consoleErrors.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log('\nConsole errors: none');
  }

  console.log(`\nPriority screenshots: ${[...PRIORITY_WIDTHS].map(viewportName).join(', ')}`);
  console.log(`Screenshots saved to: ${OUT_DIR}`);
  console.log(`Viewports with issues: ${totalFails}/${VIEWPORT_WIDTHS.length}`);

  if (totalFails > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
