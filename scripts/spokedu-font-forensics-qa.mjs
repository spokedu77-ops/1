import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const outputDirectory = path.join(process.cwd(), '.qa-spokedu', 'font-forensics');
const widths = [390, 430, 480, 489, 768, 1024, 1440];
const testText = '수업을 찾고\n진행하고\n기록합니다.';

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const fontRequests = [];

try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('response', (response) => {
      if (response.url().includes('/fonts/Cafe24SsurroundAir.woff')) {
        fontRequests.push({ width, url: response.url(), status: response.status() });
      }
    });

    const response = await page.goto(`${baseUrl}/subscription`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outputDirectory, `current-subscription-${width}.png`) });

    const audit = await page.evaluate(async ({ testText }) => {
      const h1 = document.querySelector('main h1');
      if (!h1) throw new Error('Subscription H1 not found');
      const style = getComputedStyle(h1);
      const h2 = document.querySelector('main h2');
      const h2Style = h2 ? getComputedStyle(h2) : null;
      const mainStyle = getComputedStyle(document.querySelector('main') ?? document.body);
      const fontAsset = await fetch('/fonts/Cafe24SsurroundAir.woff', { method: 'HEAD', cache: 'no-store' });

      const overlay = document.createElement('section');
      overlay.dataset.fontForensics = 'true';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'grid',
        alignContent: 'start',
        gap: '24px',
        padding: '28px',
        overflow: 'auto',
        color: '#081126',
        background: '#fff',
      });

      const makeSample = (label, fontFamily, literalReference = false) => {
        const wrapper = document.createElement('div');
        const caption = document.createElement('strong');
        caption.textContent = label;
        Object.assign(caption.style, { display: 'block', marginBottom: '8px', font: '700 12px sans-serif' });
        const sample = document.createElement('div');
        sample.textContent = testText;
        Object.assign(sample.style, {
          display: 'inline-block',
          width: 'max-content',
          maxWidth: '100%',
          whiteSpace: 'pre-line',
          wordBreak: 'keep-all',
          fontFamily,
          fontWeight: literalReference ? '400' : style.fontWeight,
          fontSize: literalReference ? (innerWidth <= 480 ? '38px' : 'clamp(44px, 6vw, 76px)') : style.fontSize,
          lineHeight: literalReference ? '1.08' : style.lineHeight,
          letterSpacing: literalReference ? '-0.04em' : style.letterSpacing,
          fontSynthesis: 'none',
        });
        wrapper.append(caption, sample);
        overlay.append(wrapper);
        return sample;
      };

      const reference = makeSample('REFERENCE V17', '"Cafe24SsurroundAir"', true);
      const current = makeSample('CURRENT PUBLIC', style.fontFamily);
      const pretendard = makeSample('FALLBACK B — Pretendard', 'Pretendard');
      const sans = makeSample('FALLBACK C — sans-serif', 'sans-serif');
      document.body.append(overlay);

      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      };

      return {
        fontCheck: document.fonts.check('400 76px "Cafe24SsurroundAir"'),
        fontAssetStatus: fontAsset.status,
        h1: {
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          width: h1.getBoundingClientRect().width,
        },
        h2: h2Style ? {
          fontFamily: h2Style.fontFamily,
          fontWeight: h2Style.fontWeight,
          fontSize: h2Style.fontSize,
          lineHeight: h2Style.lineHeight,
          letterSpacing: h2Style.letterSpacing,
        } : null,
        bodyFontFamily: mainStyle.fontFamily,
        testText: {
          reference: rect(reference),
          current: rect(current),
          pretendard: rect(pretendard),
          sans: rect(sans),
        },
      };
    }, { testText });

    const screenshot = path.join(outputDirectory, `parity-${width}.png`);
    await page.screenshot({ path: screenshot });
    const widthDelta = Math.abs(audit.testText.reference.width - audit.testText.current.width);
    const fallbackSeparated =
      Math.abs(audit.testText.current.width - audit.testText.pretendard.width) > 1 &&
      Math.abs(audit.testText.current.width - audit.testText.sans.width) > 1;
    const expectedSize = width <= 480 ? 38 : Math.min(76, Math.max(44, width * 0.06));
    const expectedSectionSize = Math.min(58, Math.max(34, width * 0.05));
    const pass = Boolean(
      response?.ok() &&
      audit.fontCheck &&
      audit.fontAssetStatus === 200 &&
      audit.h1.fontFamily.includes('Cafe24SsurroundAir') &&
      audit.h1.fontWeight === '400' &&
      Math.abs(Number.parseFloat(audit.h1.fontSize) - expectedSize) < 0.05 &&
      Math.abs(Number.parseFloat(audit.h1.lineHeight) - expectedSize * 1.08) < 0.05 &&
      Math.abs(Number.parseFloat(audit.h1.letterSpacing) - expectedSize * -0.04) < 0.05 &&
      audit.h2?.fontFamily.includes('Cafe24SsurroundAir') &&
      audit.h2.fontWeight === '400' &&
      Math.abs(Number.parseFloat(audit.h2.fontSize) - expectedSectionSize) < 0.05 &&
      audit.bodyFontFamily.startsWith('Pretendard,') &&
      widthDelta < 0.05 &&
      fallbackSeparated
    );

    results.push({ width, pass, expectedSize, expectedSectionSize, widthDelta, fallbackSeparated, ...audit, screenshot });
    await page.close();
  }
} finally {
  await browser.close();
}

const report = {
  baseUrl,
  generatedAt: new Date().toISOString(),
  pass: results.every((result) => result.pass) && fontRequests.some((request) => request.status === 200),
  fontRequests,
  results,
};

await writeFile(path.join(outputDirectory, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  pass: report.pass,
  fontRequests,
  results: results.map(({ width, pass, h1, h2, bodyFontFamily, testText: metrics, widthDelta }) => ({ width, pass, h1, h2, bodyFontFamily, metrics, widthDelta })),
}, null, 2));
process.exitCode = report.pass ? 0 : 1;
