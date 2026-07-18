/**
 * Spokedu Release Candidate QA
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:3000';
const OUT = join(__dirname, '../.qa-spokedu/rc-report.json');
mkdirSync(dirname(OUT), { recursive: true });

const VIEWPORTS = [360, 390, 430, 768, 1280];
const NAV_PATHS = [
  '/spokedu',
  '/spokedu/about',
  '/spokedu/private',
  '/spokedu/dispatch',
  '/spokedu/curriculum',
  '/spokedu/records',
  '/spokedu/programs',
  '/spokedu/monthly',
  '/spokedu/insights',
  '/spokedu/contact',
];

const report = {
  base: BASE,
  timestamp: new Date().toISOString(),
  homeAbout: {},
  contact: [],
  mobile: [],
  links: { broken: [], ok: 0 },
  network: { postimg: [], img404: [], consoleErrors: [] },
  seo: {},
  perf: {},
};

const TEST_NAME = '테스트 문의입니다 - 삭제 가능';
const TEST_PHONE = '010-0000-0001';

async function fillCommon(page) {
  await page.locator('input[autocomplete="name"]').fill(TEST_NAME);
  await page.locator('input[autocomplete="tel"]').fill(TEST_PHONE);
  await page.locator('textarea').first().fill('RC QA 테스트 문의입니다. 삭제 가능.');
  const region = page.locator('input[placeholder*="서울"]');
  if ((await region.count()) > 0) await region.fill('서울 테스트');
}

async function testContactType(page, type) {
  const result = { type, url: `${BASE}/spokedu/contact?type=${type}` };
  const apiCalls = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/api\/(private|dispatch|curriculum)\/leads/.test(req.url())) {
      apiCalls.push({ url: req.url(), postData: req.postData() });
    }
  });

  await page.goto(result.url, { waitUntil: 'networkidle', timeout: 45000 });
  result.h3 = await page.locator('form h3').innerText().catch(() => '');
  result.activeCard = await page.evaluate((t) => {
    const btn = [...document.querySelectorAll('#contact-type-select button')].find((b) =>
      b.textContent?.includes('선택됨'),
    );
    return btn?.querySelector('p.font-bold')?.textContent?.trim() || '';
  }, type);

  const emailReq = await page.locator('input[autocomplete="email"]').getAttribute('required');
  result.emailRequired = emailReq !== null && emailReq !== '';

  await fillCommon(page);

  if (type === 'private') {
    const age = page.locator('input').filter({ has: page.locator('xpath=..') });
    const childAge = page.getByLabel(/아이 연령|연령/i).first();
    if ((await childAge.count()) > 0) await childAge.fill('초등 1학년');
  }
  if (type === 'dispatch') {
    const org = page.getByLabel(/기관명/i).first();
    if ((await org.count()) > 0) await org.fill('RC 테스트 기관');
    const participants = page.getByLabel(/예상 인원/i).first();
    if ((await participants.count()) > 0) await participants.fill('20');
  }
  if (type === 'curriculum') {
    const org = page.getByLabel(/기관명|소속/i).first();
    if ((await org.count()) > 0) await org.fill('RC 테스트 소속');
  }

  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await page.waitForTimeout(2500);

  result.apiCalls = apiCalls;
  result.notice = await page.locator('[role="status"], .rounded-xl').filter({ hasText: /접수|문제/ }).first().innerText().catch(() => {
    return page.evaluate(() => {
      const el = [...document.querySelectorAll('p, div')].find((n) =>
        /접수|문제가 발생/.test(n.textContent || ''),
      );
      return el?.textContent?.trim().slice(0, 200) || '';
    });
  });

  const noEmailSubmit = !result.notice.includes('문제');
  result.submittedWithoutEmail = noEmailSubmit;
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.network.consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('response', (r) => {
    const u = r.url();
    if (/postimg/i.test(u)) report.network.postimg.push(u);
    if (r.status() === 404) report.network.img404.push(u);
  });

  await page.goto(`${BASE}/spokedu`, { waitUntil: 'networkidle', timeout: 45000 });
  const homeH1 = await page.locator('h1').first().innerText();
  await page.goto(`${BASE}/spokedu/about`, { waitUntil: 'networkidle', timeout: 45000 });
  const aboutH1 = await page.locator('h1').first().innerText();
  report.homeAbout = {
    homeH1: homeH1.replace(/\s+/g, ' ').trim(),
    aboutH1: aboutH1.replace(/\s+/g, ' ').trim(),
    identical: homeH1.replace(/\n/g, '') === aboutH1.replace(/\n/g, ''),
  };

  for (const type of ['private', 'dispatch', 'curriculum']) {
    const p = await context.newPage();
    report.contact.push(await testContactType(p, type));
    await p.close();
  }

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp, height: 900 });
    const samples = [];
    for (const path of ['/spokedu', '/spokedu/about', '/spokedu/contact', '/spokedu/records', '/spokedu/programs', '/spokedu/programs/spomove']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const m = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const ctas = [...document.querySelectorAll('a.rounded-full')].filter((a) =>
          /상담|제안|문의/.test(a.textContent || ''),
        );
        return {
          path: location.pathname,
          h1Lines: h1?.innerText?.split('\n').filter(Boolean).length || 0,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
          ctaHeights: ctas.slice(0, 4).map((b) => Math.round(b.getBoundingClientRect().height)),
          ctaTwoLine: ctas.some((b) => b.getBoundingClientRect().height > 56),
        };
      });
      samples.push({ viewport: vp, ...m });
    }
    report.mobile.push({ viewport: vp, samples });
  }

  await page.goto(`${BASE}/spokedu`, { waitUntil: 'networkidle' });
  const hrefs = await page.evaluate(() => {
    const base = location.origin;
    return [...document.querySelectorAll('a[href]')].map((a) => {
      const h = a.getAttribute('href') || '';
      try {
        return new URL(h, base).pathname + (new URL(h, base).search || '');
      } catch {
        return h;
      }
    });
  });
  const unique = [...new Set(hrefs)].filter((h) => h.startsWith('/spokedu') || h.startsWith('/api'));
  for (const h of unique.slice(0, 40)) {
    if (h.startsWith('#')) continue;
    try {
      const r = await page.request.get(`${BASE}${h.split('?')[0]}`, { timeout: 15000 });
      if (r.status() >= 400) report.links.broken.push({ href: h, status: r.status() });
      else report.links.ok++;
    } catch (e) {
      report.links.broken.push({ href: h, error: String(e) });
    }
  }

  for (const path of NAV_PATHS) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  }
  report.seo = {
    home: await page.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name="description"]')?.content })),
  };
  await page.goto(`${BASE}/spokedu/about`);
  report.seo.about = await page.evaluate(() => ({
    title: document.title,
    og: document.querySelector('meta[property="og:image"]')?.content || '',
  }));
  await page.goto(`${BASE}/spokedu/contact`);
  report.seo.contact = await page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.content,
  }));
  await page.goto(`${BASE}/spokedu/monthly/2026-05`);
  report.seo.monthlyDetail = await page.evaluate(() => document.title);

  const t0 = Date.now();
  await page.goto(`${BASE}/spokedu`, { waitUntil: 'load' });
  report.perf.homeLoadMs = Date.now() - t0;
  const lcpHint = await page.evaluate(() => {
    const img = document.querySelector('img');
    return img?.currentSrc?.slice(0, 120) || '';
  });
  report.perf.firstImg = lcpHint;

  await browser.close();
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('RC report written:', OUT);
  console.log('Home H1:', report.homeAbout.homeH1);
  console.log('About H1:', report.homeAbout.aboutH1);
  console.log('Contact tests:', report.contact.length);
  console.log('Broken links:', report.links.broken.length);
  console.log('Console errors:', report.network.consoleErrors.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
