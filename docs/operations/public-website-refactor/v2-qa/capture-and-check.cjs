const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = 'docs/operations/public-website-refactor/v2-qa';
const origin = 'http://127.0.0.1:3000';
const nav = ['SPOKEDU 소개', '기관·학교 수업', '개인·소그룹 수업', 'SPOMOVE', '수업사례'];

async function settle(page) {
  // Hide only the development overlay in evidence captures; product DOM is unchanged.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
  await page.waitForTimeout(250);
}
async function inspect(page) {
  return page.evaluate(() => ({
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map(node => node.textContent),
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    overflowElements: [...document.querySelectorAll('main *')].filter(node => { const r = node.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).slice(0, 12).map(node => ({ tag: node.tagName, text: node.textContent.slice(0, 60) })),
    brokenImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.getAttribute('src')),
    images: [...document.querySelectorAll('main img')].map(image => ({ src: image.getAttribute('src'), alt: image.getAttribute('alt'), width: image.clientWidth, height: image.clientHeight, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, fit: getComputedStyle(image).objectFit, position: getComputedStyle(image).objectPosition })),
    headings: [...document.querySelectorAll('main h2,main h3')].map(node => node.textContent),
  }));
}

(async () => {
  fs.mkdirSync(`${root}/after`, { recursive: true });
  const report = { home: [], subpages: [], links: [], inquiries: [], navigation: {}, errors: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  let homeLinks = [];
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(origin, { waitUntil: 'networkidle' })).status(), 200);
    await settle(page);
    const state = await inspect(page);
    report.home.push({ width, ...state });
    assert.equal(state.overflow, false, `Home overflow ${width}`);
    assert.deepEqual(state.brokenImages, [], `Home images ${width}`);
    const sections = await page.locator('main > section').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(sections.length, 6);
    await page.screenshot({ path: `${root}/after/home-${width}.png`, fullPage: true });
    for (const id of sections) await page.locator(`#${id}`).screenshot({ path: `${root}/after/section-${id}-${width}.png`, style: 'header, header * { visibility: hidden !important; opacity: 0 !important; transition: none !important; }' });
    if (width === 1440) {
      await page.locator('header').screenshot({ path: `${root}/after/gnb-desktop.png` });
      assert.deepEqual(await page.locator('header nav > a').allTextContents(), nav);
      homeLinks = await page.locator('main a,header a').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('href')))].filter(href => href?.startsWith('/') && !href.startsWith('//')));
      report.navigation.desktopOrder = nav;
    }
    console.log(`Home ${width}: six sections, all images decoded, no horizontal overflow`);
  }

  for (const route of ['/about', '/education', '/private', '/spomove', '/records', '/spomat', '/spomove/catalog', '/spokedu-lab']) {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
      await settle(page);
      const state = await inspect(page);
      report.subpages.push({ route, width, status: response.status(), finalPath: new URL(page.url()).pathname, ...state });
      assert.equal(response.status(), 200, route);
      await page.screenshot({ path: `${root}/after/${route.slice(1).replaceAll('/', '-')}-${width}.png`, fullPage: true });
      if (route === '/about') {
        assert.ok((await page.locator('#team').innerText()).includes('연세대학교 체육교육학과 출신의 운영진'));
        if (width === 375) {
          const button = page.getByRole('button', { name: '메뉴 열기' });
          await button.click();
          const panel = page.locator('#mobile-nav-panel');
          assert.deepEqual(await panel.locator('nav > a').allTextContents(), nav);
          assert.equal(await panel.locator('a[aria-current="page"]').innerText(), 'SPOKEDU 소개');
          await page.screenshot({ path: `${root}/after/gnb-mobile.png` });
          await page.keyboard.press('Escape');
          assert.equal(await panel.isVisible(), false);
          assert.equal(await button.evaluate(node => node === document.activeElement), true);
          await button.click();
          await panel.getByRole('link', { name: '기관·학교 수업', exact: true }).click();
          await page.waitForURL('**/education');
          assert.equal(await page.locator('#mobile-nav-panel').isVisible(), false);
          report.navigation.mobile = { order: nav, activeLink: 'SPOKEDU 소개', escapeCloses: true, focusRestored: true, navigationCloses: true };
        }
      }
      console.log(`${route} ${width}: ${response.status()}, overflow=${state.overflow}, broken=${state.brokenImages.length}`);
    }
  }

  for (const href of homeLinks) {
    const response = await context.request.get(origin + href);
    report.links.push({ href, status: response.status(), finalPath: new URL(response.url()).pathname });
    assert.ok(response.status() < 400, href);
  }
  for (const type of ['dispatch', 'private', 'spomove']) {
    await page.goto(`${origin}/contact?type=${type}`, { waitUntil: 'networkidle' });
    await settle(page);
    const submit = page.locator(`[data-track="contact-submit-${type}"]`);
    assert.equal(await submit.count(), 1, `Inquiry intent ${type}`);
    report.inquiries.push({ type, selectedForm: true, submitted: false });
    await page.screenshot({ path: `${root}/after/contact-${type}.png`, fullPage: true });
  }
  await page.goto(origin + '/contact', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('button[type="submit"]').count(), 0, 'Bare contact must not preselect a type');
  report.inquiries.push({ type: null, unselected: true, submitted: false });

  const hashes = new Map();
  for (const item of report.home.find(item => item.width === 1440).images) {
    if (!item.src?.startsWith('/')) continue;
    const file = path.join('public', decodeURIComponent(item.src));
    if (!fs.existsSync(file)) continue;
    const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const group = hashes.get(hash) ?? [];
    group.push(item.src);
    hashes.set(hash, group);
  }
  report.homeDuplicateByteGroups = [...hashes.values()].filter(group => group.length > 1);
  await browser.close();
  fs.writeFileSync(`${root}/results.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(report.errors, [], 'Browser runtime errors');
  console.log(`Saved report: ${report.home.length} widths, ${report.subpages.length} subpage views, ${report.links.length} internal links, ${report.inquiries.length} inquiry states`);
})().catch(error => { console.error(error); process.exit(1); });
