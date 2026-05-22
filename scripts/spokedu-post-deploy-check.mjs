/**
 * 프로덕션 배포 후 스모크 체크
 * Usage: node scripts/spokedu-post-deploy-check.mjs https://your-domain.com
 */
import { chromium } from 'playwright';

const BASE = (process.argv[2] || '').replace(/\/$/, '');
if (!BASE) {
  console.error('Usage: node scripts/spokedu-post-deploy-check.mjs https://PRODUCTION_URL');
  process.exit(1);
}

const PATHS = [
  '/spokedu',
  '/spokedu/contact',
  '/spokedu/contact?type=private',
  '/spokedu/contact?type=dispatch',
  '/spokedu/contact?type=curriculum',
];

const OG_PAGES = [
  { path: '/spokedu', label: 'Home' },
  { path: '/spokedu/about', label: 'About' },
  { path: '/spokedu/contact', label: 'Contact' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const postimg = [];

  page.on('response', (r) => {
    if (/postimg/i.test(r.url())) postimg.push(r.url());
  });

  console.log('=== Page status ===');
  for (const path of PATHS) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const status = res?.status() ?? 0;
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    console.log(`${status} ${path}`);
    console.log(`  H1: ${h1.replace(/\s+/g, ' ').trim().slice(0, 80)}`);
    if (path.includes('contact')) {
      const h3 = await page.locator('form h3').innerText().catch(() => '(no form)');
      console.log(`  Form: ${h3}`);
    }
  }

  console.log('\n=== OG / SEO ===');
  for (const { path, label } of OG_PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    const meta = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    }));
    console.log(`[${label}] ${path}`);
    console.log(`  title: ${meta.title}`);
    console.log(`  og:image: ${meta.ogImage}`);
  }

  console.log('\n=== Network ===');
  console.log(`postimg requests: ${postimg.length}`);

  await browser.close();
  console.log('\n카카오/문자 OG: 배포 URL을 Kakao OG Debugger 또는 실제 공유로 1회 확인하세요.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
