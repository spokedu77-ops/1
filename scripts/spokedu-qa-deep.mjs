/**
 * Spokedu deep QA — contact links, form state, CTA heights
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:3000';
const OUT_DIR = join(__dirname, '../.qa-spokedu');
mkdirSync(OUT_DIR, { recursive: true });

const PAGES = [
  '/spokedu',
  '/spokedu/about',
  '/spokedu/private',
  '/spokedu/dispatch',
  '/spokedu/curriculum',
  '/spokedu/programs/spomove',
  '/spokedu/programs/paps',
  '/spokedu/programs/oneday-event',
  '/spokedu/programs/camp',
  '/spokedu/records',
  '/spokedu/cases',
  '/spokedu/monthly',
  '/spokedu/insights',
];

const EXPECTED_CTAS = {
  '/spokedu': [
    ['개인수업 상담', 'type=private'],
    ['기관 제안받기', 'type=dispatch'],
    ['콘텐츠 문의', 'type=curriculum'],
  ],
  '/spokedu/private': [['개인수업 상담하기', 'type=private']],
  '/spokedu/dispatch': [['기관 프로그램 제안받기', 'type=dispatch']],
  '/spokedu/curriculum': [['커리큘럼 콘텐츠 문의하기', 'type=curriculum']],
  '/spokedu/programs/spomove': [['SPOMOVE 도입 문의하기', 'type=dispatch']],
  '/spokedu/programs/paps': [['PAPS 프로그램 문의하기', 'type=dispatch']],
  '/spokedu/programs/oneday-event': [['원데이 이벤트 문의하기', 'type=dispatch']],
  '/spokedu/programs/camp': [['방학캠프 운영 문의하기', 'type=dispatch']],
  '/spokedu/records': [['기관 프로그램', 'type=dispatch']],
  '/spokedu/cases': [['기관 프로그램', 'type=dispatch']],
  '/spokedu/monthly': [['월간 수업 문의', 'type=dispatch']],
  '/spokedu/insights': [['스포키듀 수업 상담하기', '/spokedu/contact']],
  '/spokedu/about': [
    ['개인수업 상담', 'type=private'],
    ['기관 프로그램 제안', 'type=dispatch'],
    ['커리큘럼 콘텐츠 문의', 'type=curriculum'],
  ],
};

const VIEWPORTS = [360, 390, 430, 768, 1280];

const report = {
  contactLinks: {},
  contactForms: [],
  ctaHeights: [],
  footers: {},
  priorities: [],
  duplicateImages: {},
  postimg: [],
  overflow: [],
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', (r) => {
    if (/postimg/i.test(r.url())) report.postimg.push(r.url());
  });

  for (const path of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
    const links = await page.evaluate(() => {
      return [...document.querySelectorAll('a[href*="contact"]')].map((a) => ({
        text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        href: a.getAttribute('href') || '',
      }));
    });
    report.contactLinks[path] = links;

    const pri = await page.evaluate(() =>
      [...document.querySelectorAll('img[fetchpriority="high"], img[loading="eager"]')].map((i) => i.src),
    );
    if (pri.length) report.priorities.push({ path, count: pri.length, srcs: pri.slice(0, 3) });

    const imgs = await page.evaluate(() =>
      [...document.querySelectorAll('img')].map((i) => i.src).filter((s) => s.includes('/images/spokedu/')),
    );
    for (const src of imgs) {
      report.duplicateImages[src] = (report.duplicateImages[src] || 0) + 1;
    }
  }

  for (const [type, titleExpect] of [
    ['private', '개인·소그룹'],
    ['dispatch', '기관 프로그램'],
    ['curriculum', '커리큘럼'],
  ]) {
    await page.goto(`${BASE}/spokedu/contact?type=${type}`, { waitUntil: 'networkidle', timeout: 45000 });
    const state = await page.evaluate((expect) => {
      const params = new URLSearchParams(location.search);
      const h3 = document.querySelector('form h3')?.textContent?.trim() || '';
      const selected = [...document.querySelectorAll('#contact-type-select button')].map((b) => ({
        text: b.querySelector('p.font-bold')?.textContent?.trim(),
        active: b.className.includes('ring-2') || b.className.includes('border-indigo-500') || b.textContent?.includes('선택됨'),
        cls: b.className.slice(0, 120),
      }));
      const phoneRequired = !!document.querySelector('input[type="tel"][required], input[name*="phone"][required]');
      const emailOptional = [...document.querySelectorAll('label')].some((l) => l.textContent?.includes('이메일') && !l.textContent?.includes('필수'));
      const footers = [...document.querySelectorAll('footer')].length;
      const privateOnly = !!document.querySelector('select, [name*="preferredClass"], input[placeholder*="아이"]');
      return { type: params.get('type'), h3, selected, phoneRequired, emailOptional, footers, hasForm: !!document.querySelector('form') };
    }, titleExpect);
    report.contactForms.push({ type, ...state, titleOk: state.h3.includes(titleExpect) });
  }

  await page.goto(`${BASE}/spokedu/contact`, { waitUntil: 'networkidle' });
  report.footers.contact = await page.evaluate(() => ({
    footers: document.querySelectorAll('footer').length,
    contactFooter: !!document.querySelector('footer')?.textContent?.includes('상담'),
  }));

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp, height: 900 });
    await page.goto(`${BASE}/spokedu/about`, { waitUntil: 'domcontentloaded' });
    const cta = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('a.rounded-full')].filter((a) => a.textContent?.includes('상담') || a.textContent?.includes('제안') || a.textContent?.includes('문의'));
      return btns.map((b) => {
        const s = getComputedStyle(b);
        return { text: b.textContent?.trim().slice(0, 30), height: b.getBoundingClientRect().height, minH: s.minHeight };
      });
    });
    report.ctaHeights.push({ viewport: vp, aboutCtas: cta });
    const ox = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    if (ox) report.overflow.push({ viewport: vp, path: '/spokedu/about' });
  }

  report.ctaAudit = [];
  for (const [path, expects] of Object.entries(EXPECTED_CTAS)) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    for (const [labelPart, hrefPart] of expects) {
      const match = await page.evaluate(
        ({ labelPart, hrefPart }) => {
          const links = [...document.querySelectorAll('a')];
          const found = links.filter((a) => a.textContent?.includes(labelPart) && (a.getAttribute('href') || '').includes(hrefPart.replace('type=', 'type=')));
          return found.map((a) => ({ text: a.textContent?.trim().slice(0, 50), href: a.getAttribute('href') }));
        },
        { labelPart, hrefPart },
      );
      report.ctaAudit.push({
        page: path,
        labelPart,
        hrefPart,
        ok: match.length > 0,
        matches: match.slice(0, 3),
      });
    }
  }

  await browser.close();
  const out = join(OUT_DIR, 'report-deep.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('Deep report:', out);
  console.log('Postimg:', report.postimg.length);
  console.log('CTA audit fails:', report.ctaAudit.filter((c) => !c.ok).length);
  console.log('Contact form fails:', report.contactForms.filter((c) => !c.titleOk).length);
  for (const c of report.ctaAudit.filter((x) => !x.ok)) {
    console.log('FAIL', c.page, c.labelPart, JSON.stringify(c.matches));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
