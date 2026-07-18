/**
 * Spokedu 통합 QA — Playwright headless
 * Usage: node scripts/spokedu-qa.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:3000';
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

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
  '/spokedu/programs',
  '/spokedu/monthly',
  '/spokedu/monthly/2026-05',
  '/spokedu/insights',
  '/spokedu/contact',
  '/spokedu/contact?type=private',
  '/spokedu/contact?type=dispatch',
  '/spokedu/contact?type=curriculum',
];

const CTA_CHECKS = [
  { page: '/spokedu', linkText: /개인수업 상담/, href: /type=private/ },
  { page: '/spokedu', linkText: /기관 제안|기관 프로그램/, href: /type=dispatch/ },
  { page: '/spokedu/private', linkText: /개인수업/, href: /type=private/ },
  { page: '/spokedu/dispatch', linkText: /제안|문의/, href: /type=dispatch/ },
  { page: '/spokedu/curriculum', linkText: /커리큘럼|문의/, href: /type=curriculum/ },
  { page: '/spokedu/about', linkText: /개인수업 상담/, href: /type=private/ },
];

const OUT_DIR = join(__dirname, '../.qa-spokedu');
mkdirSync(OUT_DIR, { recursive: true });

const report = {
  base: BASE,
  timestamp: new Date().toISOString(),
  pageResults: [],
  network: { postimg: [], failedImages: [], status404: [] },
  contact: [],
  cta: [],
  heroSamples: [],
  errors: [],
};

function grade(status, issues) {
  if (status >= 500 || issues.some((i) => i.severity === 'critical')) return 'D';
  if (issues.filter((i) => i.severity === 'high').length >= 2) return 'C';
  if (issues.length > 0) return 'B';
  return 'A';
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('response', (res) => {
    const url = res.url();
    if (/postimg/i.test(url)) report.network.postimg.push(url);
    if (res.status() === 404) report.network.status404.push({ url, page: report._currentPage });
    if (res.status() >= 400 && /\.(jpg|jpeg|png|webp|gif|svg)/i.test(url)) {
      report.network.failedImages.push({ url, status: res.status() });
    }
  });

  for (const path of PAGES) {
    report._currentPage = path;
    const issues = [];
    let status = 0;
    let title = '';
    let h1Text = '';
    let footerCount = 0;
    let postimgOnPage = 0;

    try {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 45000 });
      status = res?.status() ?? 0;
      if (status >= 400) issues.push({ severity: 'critical', msg: `HTTP ${status}` });

      title = await page.title();
      const h1 = page.locator('h1').first();
      if ((await h1.count()) > 0) h1Text = (await h1.innerText()).replace(/\s+/g, ' ').trim();

      footerCount = await page.locator('footer').count();
      if (path.startsWith('/spokedu/contact') && footerCount > 1) {
        issues.push({ severity: 'high', msg: `Contact footer 중복: ${footerCount}개` });
      }

      const brokenImgs = await page.evaluate(() => {
        return [...document.querySelectorAll('img')].filter((img) => {
          const complete = img.complete;
          const natural = img.naturalWidth;
          return complete && natural === 0 && img.src && !img.src.startsWith('data:');
        }).map((img) => img.src);
      });
      if (brokenImgs.length) {
        issues.push({ severity: 'high', msg: `깨진 img ${brokenImgs.length}개`, detail: brokenImgs.slice(0, 5) });
      }

      if (path.includes('contact')) {
        const active = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('#contact-type-select button, #contact-type-select [role="button"]')];
          const selected = document.querySelector('#contact-type-select [aria-pressed="true"], #contact-type-select button[class*="ring"], #contact-type-select button.border-indigo-600');
          const params = new URLSearchParams(window.location.search);
          const type = params.get('type') || 'private';
          const buttons = [...document.querySelectorAll('#contact-type-select button')];
          const activeBtn = buttons.find((b) => b.getAttribute('aria-pressed') === 'true' || b.className.includes('ring-2') || b.className.includes('border-indigo-600'));
          const activeId = activeBtn?.textContent?.trim() || '';
          const formVisible = !!document.querySelector('form');
          return { type, activeId, formVisible, buttonCount: buttons.length };
        });
        report.contact.push({ path, ...active });
      }

      if (path === '/spokedu/monthly/2026-05' && status === 404) {
        issues.push({ severity: 'high', msg: 'monthly/2026-05 404' });
      }
    } catch (e) {
      issues.push({ severity: 'critical', msg: String(e.message || e) });
    }

    report.pageResults.push({
      path,
      status,
      grade: grade(status, issues),
      title,
      h1: h1Text.slice(0, 120),
      footerCount,
      issues,
    });
  }

  for (const vp of VIEWPORTS.slice(0, 3)) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const path of ['/spokedu', '/spokedu/about', '/spokedu/contact']) {
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const hero = await page.evaluate(() => {
          const h1 = document.querySelector('h1');
          const rect = h1?.getBoundingClientRect();
          const subs = document.querySelector('p');
          return {
            h1Lines: h1?.innerText?.split('\n').map((l) => l.trim()).filter(Boolean),
            h1Width: rect?.width,
            overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
          };
        });
        report.heroSamples.push({ viewport: vp.name, path, ...hero });
        const shot = join(OUT_DIR, `hero-${vp.name}-${path.replace(/\//g, '_')}.png`);
        await page.screenshot({ path: shot, fullPage: false });
      } catch (e) {
        report.errors.push({ viewport: vp.name, path, error: String(e) });
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const check of CTA_CHECKS) {
    try {
      await page.goto(`${BASE}${check.page}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const link = page.getByRole('link', { name: check.linkText }).first();
      const href = (await link.count()) > 0 ? await link.getAttribute('href') : null;
      const ok = href && check.href.test(href);
      report.cta.push({ page: check.page, href, ok, expected: String(check.href) });
    } catch (e) {
      report.cta.push({ page: check.page, error: String(e) });
    }
  }

  await browser.close();
  const outPath = join(OUT_DIR, 'report.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('QA report:', outPath);
  console.log('Pages:', report.pageResults.length);
  console.log('Postimg:', report.network.postimg.length);
  console.log('404 responses:', report.network.status404.length);
  console.log('Failed images:', report.network.failedImages.length);
  for (const p of report.pageResults.filter((r) => r.grade !== 'A')) {
    console.log(`${p.grade} ${p.path}:`, p.issues.map((i) => i.msg).join('; '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
