/**
 * SPOKEDU 홈 IA·접근성 QA — H1 중복, 텍스트 추출, 반응형 캡처
 * 사용: npm run dev 후 `node scripts/spokedu-home-a11y-qa.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE_URL = process.env.SPOKEDU_QA_URL ?? 'http://localhost:3000/spokedu';
const OUT_DIR = path.join(process.cwd(), 'qa-screenshots', 'spokedu-home');
const TEXT_OUT = path.join(OUT_DIR, 'dom-text-extract.json');

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1000x900', width: 1000, height: 900 },
  { name: '1180x900', width: 1180, height: 900 },
  { name: '1440x1000', width: 1440, height: 1000 },
];

const SECTION_IDS = ['hero', 'proof', 'paths', 'spomove', 'cases', 'contact-cta'];

async function evaluateA11y(page) {
  return page.evaluate(() => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const h1s = [...document.querySelectorAll('h1')].filter(isVisible).map((el) => el.textContent?.trim() ?? '');

    const leafTexts = new Map();
    for (const el of document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button, main li')) {
      if (!isVisible(el)) continue;
      if (el.children.length > 0) continue;
      const text = el.textContent?.trim();
      if (!text || text.length < 8) continue;
      leafTexts.set(text, (leafTexts.get(text) ?? 0) + 1);
    }
    const duplicateLeafTexts = [...leafTexts.entries()].filter(([, count]) => count > 1).map(([text]) => text);

    const heroBlock = document.getElementById('hero');
    const heroVisibleCopy = heroBlock
      ? [...heroBlock.querySelectorAll('h1, p, a')].filter(isVisible).map((el) => ({
          tag: el.tagName,
          text: el.textContent?.trim() ?? '',
        }))
      : [];

    const sectionOrder = [...document.querySelectorAll('main section[id]')].map((el) => el.id);

    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;

    const overlaps = [];
    const finalCta = document.getElementById('contact-cta');
    if (finalCta) {
      const boxes = [...finalCta.querySelectorAll('h2, p, a')].filter(isVisible).map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      });
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
            overlaps.push(`${a.tag}+${b.tag}`);
          }
        }
      }
    }

    return {
      h1Count: h1s.length,
      h1s,
      duplicateLeafTexts,
      heroVisibleCopy,
      sectionOrder,
      overflow,
      overlaps,
    };
  });
}

async function extractDomText(page) {
  return page.evaluate(() => {
    const sections = {};
    for (const id of ['hero', 'proof', 'paths', 'spomove', 'cases', 'contact-cta']) {
      const el = document.getElementById(id);
      if (!el) continue;
      sections[id] = el.innerText.replace(/\s+/g, ' ').trim();
    }
    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      sections,
    };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(500);

  const domText = await extractDomText(page);
  await writeFile(TEXT_OUT, `${JSON.stringify(domText, null, 2)}\n`, 'utf8');

  let failures = 0;

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(400);

    const report = await evaluateA11y(page);
    const issues = [];
    if (report.h1Count !== 1) issues.push(`h1=${report.h1Count}`);
    if (report.duplicateLeafTexts.length > 0) issues.push(`dup=${report.duplicateLeafTexts.length}`);
    if (report.overflow) issues.push('overflow');
    if (report.overlaps.length > 0) issues.push(`overlap=${report.overlaps.join(',')}`);
    const expectedOrder = ['hero', 'proof', 'paths', 'spomove', 'cases', 'contact-cta'];
    if (JSON.stringify(report.sectionOrder) !== JSON.stringify(expectedOrder)) {
      issues.push(`order=${report.sectionOrder.join('>')}`);
    }

    const status = issues.length === 0 ? 'OK' : `FAIL: ${issues.join('; ')}`;
    if (issues.length > 0) failures += 1;
    console.log(`[${vp.name}] ${status}`);

    await page.screenshot({ path: path.join(OUT_DIR, `a11y-full-${vp.name}.png`), fullPage: true });

    for (const id of SECTION_IDS) {
      const el = page.locator(`#${id}`);
      if ((await el.count()) > 0) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await el.screenshot({ path: path.join(OUT_DIR, `a11y-${id}-${vp.name}.png`) });
      }
    }
  }

  console.log(`\nH1 (1440): ${domText.h1}`);
  console.log(`Section order: ${Object.keys(domText.sections).join(' → ')}`);
  console.log(`DOM text extract: ${TEXT_OUT}`);
  console.log(`Screenshots: ${OUT_DIR}`);

  await browser.close();

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
