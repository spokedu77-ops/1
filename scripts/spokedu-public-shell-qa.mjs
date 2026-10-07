/**
 * SPOKEDU public global shell P0 QA — runtime verification
 * SPOKEDU_QA_ORIGIN=http://127.0.0.1:PORT npm run qa:public-shell
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const ORIGIN = (process.env.SPOKEDU_QA_ORIGIN ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
/** `networkidle` hangs on GA/third-party; `load` + shell landmark is enough for P0 QA. */
const PAGE_READY = process.env.SPOKEDU_QA_PAGE_READY ?? 'load';

async function gotoPublicRoute(page, route) {
  const res = await page.goto(`${ORIGIN}${route}`, { waitUntil: PAGE_READY, timeout: 180_000 });
  await page.locator('[data-spokedu-global-header="true"]').waitFor({ state: 'visible', timeout: 60_000 });
  return res;
}

const ROUTES = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/spomove/catalog',
  '/spokedu-lab',
  '/records',
  '/records/dongjak-spomove',
  '/contact',
  '/about',
  '/partners',
  '/spomat',
];

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '834', width: 834, height: 1112 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

const ACTIVE_GROUP = {
  '/education': '체육수업',
  '/private': '체육수업',
  '/spomove': '솔루션',
  '/spomove/catalog': '솔루션',
  '/spomat': '솔루션',
  '/spokedu-lab': '솔루션',
  '/records': '현장 사례',
  '/records/dongjak-spomove': '현장 사례',
  '/about': '소개',
};

const SCREENSHOT_ROUTES = ['/', '/education', '/spomove', '/spokedu-lab', '/records', '/records/dongjak-spomove', '/contact'];

function fail(msg) {
  throw new Error(msg);
}

async function measureHeader(page) {
  return page.evaluate(() => {
    const header = document.querySelector('[data-spokedu-global-header="true"]');
    const container = header?.querySelector('.site-container');
    const logo = header?.querySelector('a[aria-label="SPOKEDU 홈"]');
    const cta = [...(header?.querySelectorAll('a') ?? [])].find((a) => a.textContent?.trim() === '상담하기');
    const nav = header?.querySelector('nav[aria-label="주요 메뉴"]');
    const navText = nav?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const hb = header?.getBoundingClientRect();
    const lb = logo?.getBoundingClientRect();
    const cb = cta?.getBoundingClientRect();
    const innerX = container
      ? container.getBoundingClientRect().x + (parseFloat(getComputedStyle(container).paddingLeft) || 0)
      : null;
    return {
      headerH: hb?.height ?? null,
      logo: lb ? { x: lb.x, y: lb.y, w: lb.width, h: lb.height } : null,
      ctaH: cb?.height ?? null,
      innerX,
      navText,
    };
  });
}

async function landmarks(page) {
  return page.evaluate(() => ({
    header: document.querySelectorAll('[data-spokedu-global-header="true"]').length,
    footer: document.querySelectorAll('[data-spokedu-global-footer="true"]').length,
    main: document.querySelectorAll('main').length,
    mainId: document.querySelectorAll('main#main-content').length,
    masterLocal: document.querySelectorAll('[data-spokedu-master-local-nav="true"]').length,
  }));
}

async function overflow(page) {
  return page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }));
}

async function assertActive(page, route) {
  if (route === '/contact') {
    const ok = await page.evaluate(() => {
      const cta = [...document.querySelectorAll('[data-spokedu-global-header="true"] a')].find(
        (a) => a.textContent?.trim() === '상담하기',
      );
      return Boolean(cta?.className.includes('ring-2'));
    });
    if (!ok) fail(`${route}: contact CTA current state (ring) missing`);
    return;
  }
  if (route === '/' || route === '/partners') {
    const bad = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
      if (!nav) return 'nav missing';
      const items = [...nav.querySelectorAll('button,a')].filter((el) => {
        const t = el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return ['체육수업', '솔루션', '현장 사례', '소개'].some((l) => t.startsWith(l));
      });
      const active = items.filter((el) => el.className.includes('underline') || el.className.includes('decoration-[#245DFF]'));
      return active.length ? active.map((el) => el.textContent).join(',') : null;
    });
    if (bad) fail(`${route}: unexpected primary active: ${bad}`);
    return;
  }
  const label = ACTIVE_GROUP[route];
  if (!label) return;
  const ok = await page.evaluate((expected) => {
    const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
    if (!nav) return false;
    const btn = [...nav.querySelectorAll('button')].find((b) => b.textContent?.includes(expected));
    const link = [...nav.querySelectorAll('a')].find((a) => a.textContent?.trim() === expected);
    const el = btn ?? link;
    if (!el) return false;
    return el.className.includes('underline') || el.className.includes('decoration');
  }, label);
  if (!ok) fail(`${route}: expected active "${label}"`);
}

async function testDropdown(page, label) {
  const nav = page.locator('nav[aria-label="주요 메뉴"]');
  const trigger = nav.getByRole('button', { name: new RegExp(label) });
  await trigger.focus();
  await trigger.press('Enter');
  const panel = page.locator(`[id^="desktop-nav-group-"]`).filter({ visible: true });
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  if (label === '체육수업') {
    await panel.getByRole('link', { name: '기관·학교 수업' }).waitFor({ state: 'visible' });
    await panel.getByRole('link', { name: '개인·소그룹 수업' }).waitFor({ state: 'visible' });
  } else {
    await panel.getByRole('link', { name: /^SPOMOVE\b/ }).waitFor({ state: 'visible' });
    await panel.getByRole('link', { name: /^SPOKEDU MASTER\b/ }).waitFor({ state: 'visible' });
  }
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden', timeout: 5000 });
  const focused = await page.evaluate((expected) => document.activeElement?.textContent?.includes(expected), label);
  if (!focused) fail(`${label} dropdown: focus not restored to trigger`);
  await trigger.click();
  await panel.waitFor({ state: 'visible' });
  await page.mouse.click(10, 10);
  await panel.waitFor({ state: 'hidden', timeout: 5000 });
}

async function testMobileMenu(page) {
  const btn = page.getByRole('button', { name: /메뉴/ }).first();
  await btn.click();
  const panel = page.locator('#mobile-nav-panel');
  await panel.waitFor({ state: 'visible' });
  const mobileGroupLabels = new Set(['체육수업', '솔루션']);
  for (const t of [
    '체육수업',
    '기관·학교 수업',
    '개인·소그룹 수업',
    '솔루션',
    'SPOMOVE',
    'SPOKEDU MASTER',
    '현장 사례',
    '소개',
    '상담하기',
  ]) {
    if (mobileGroupLabels.has(t)) {
      await page.locator('#mobile-nav-panel').getByText(t, { exact: true }).first().waitFor({ state: 'visible' });
    } else {
      await page
        .locator('#mobile-nav-panel')
        .getByRole('link', { name: t, exact: t === 'SPOMOVE' })
        .first()
        .waitFor({ state: 'visible' });
    }
  }
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
  const onBtn = await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'mobile-nav-panel');
  if (!onBtn) fail('mobile menu: hamburger focus not restored');
  await btn.click();
  await page.locator('#mobile-nav-panel').getByRole('link', { name: '소개' }).click();
  await page.waitForURL(/\/about$/);
  await panel.waitFor({ state: 'hidden' });
  const scrollLocked = await page.evaluate(() => document.documentElement.style.overflow === 'hidden');
  if (scrollLocked) fail('mobile menu: body scroll lock not released');
}

async function testMaster(page) {
  const nested = await page.evaluate(() => {
    const root = document.querySelector('main#main-content [class*="landingRoot"]');
    if (!root) return { ok: false, reason: 'no landingRoot' };
    const style = getComputedStyle(root);
    const vh = window.innerHeight;
    const h = root.getBoundingClientRect().height;
    const bad =
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      Math.abs(h - vh) < 48 &&
      root.scrollHeight > root.clientHeight + 8;
    return { ok: !bad, overflowY: style.overflowY, h, vh };
  });
  if (!nested.ok) fail(`/spokedu-lab nested scroll: ${JSON.stringify(nested)}`);
  const globalHeaderUsesSpm = await page.evaluate(() => {
    const h = document.querySelector('[data-spokedu-global-header="true"]');
    if (!h) return true;
    const bg = getComputedStyle(h).backgroundColor;
    return bg === 'rgb(255, 255, 255)' || bg.includes('255, 255, 255');
  });
  if (!globalHeaderUsesSpm) fail('/spokedu-lab: global header appears non-white');
  for (const [name, id] of [
    ['서비스', '#workflow'],
    ['사용 방법', '#library'],
    ['SPOMOVE', '#spomove'],
    ['요금', '#plans'],
    ['FAQ', '#faq'],
  ]) {
    await page.locator(`a[href="${id}"]`).first().click();
    await page.waitForTimeout(350);
    const visible = await page.evaluate((hash) => {
      const el = document.querySelector(hash);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const header = document.querySelector('[data-spokedu-global-header="true"]')?.getBoundingClientRect();
      const local = document.querySelector('[data-spokedu-master-local-nav="true"]')?.getBoundingClientRect();
      const top = (local?.bottom ?? header?.bottom ?? 0) + 4;
      return r.top >= top && r.top < window.innerHeight * 0.55;
    }, id);
    if (!visible) fail(`/spokedu-lab anchor ${name} (${id}) clipped under sticky chrome`);
  }
}

async function main() {
  const report = {
    routeMatrix: {},
    geometry: { byRoute: {}, maxLogoDelta: null, innerX1440: [] },
    interaction: {},
    overflow: {},
    consoleErrors: [],
  };

  const shotDir = await mkdtemp(path.join(tmpdir(), 'spokedu-p0-qa-'));
  const browser = await chromium.launch({ headless: true });
  let baselineGeo = null;

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // SPOMOVE catalog Notion embed is blocked by frame-src CSP (pre-existing); not shell P0.
        if (text.includes('Content Security Policy') && text.includes('notion')) return;
        report.consoleErrors.push(`${vp.name}: ${text}`);
      });
      page.on('pageerror', (e) => report.consoleErrors.push(`${vp.name} pageerror: ${e.message}`));

      for (const route of ROUTES) {
        const res = await gotoPublicRoute(page, route);
        if (!res?.ok()) fail(`${route}@${vp.name}: HTTP ${res?.status()}`);

        const lm = await landmarks(page);
        const ov = await overflow(page);
        const key = `${route}@${vp.name}`;
        report.routeMatrix[key] = {
          header: lm.header,
          main: lm.main,
          footer: lm.footer,
          mainId: lm.mainId,
          masterLocal: route === '/spokedu-lab' ? lm.masterLocal : undefined,
          overflow: ov.sw <= ov.iw + 1 ? 'PASS' : `FAIL ${ov.sw}>${ov.iw}`,
        };
        if (ov.sw > ov.iw + 1) {
          const offender = await page.evaluate(() => {
            const iw = window.innerWidth;
            const bad = [];
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect();
              if (r.right > iw + 1.5 || r.left < -1.5) {
                bad.push(`${el.tagName}.${el.className}`.slice(0, 120));
                if (bad.length >= 5) break;
              }
            }
            return bad;
          });
          fail(`${key} overflow offenders: ${offender.join(' | ')}`);
        }
        if (lm.header !== 1 || lm.footer !== 1 || lm.main !== 1 || lm.mainId !== 1) {
          fail(`${key} landmarks ${JSON.stringify(lm)}`);
        }
        if (route === '/spokedu-lab' && lm.masterLocal !== 1) fail(`${key} master local nav`);

        if (vp.name === '1440') {
          await assertActive(page, route);
          const geo = await measureHeader(page);
          report.geometry.byRoute[route] = geo;
          if (geo.innerX != null) report.geometry.innerX1440.push({ route, x: geo.innerX });
          if (!baselineGeo) baselineGeo = geo;
          else if (geo.logo && baselineGeo.logo) {
            for (const k of ['x', 'y', 'w', 'h']) {
              const d = Math.abs(geo.logo[k === 'w' ? 'width' : k === 'h' ? 'height' : k] - baselineGeo.logo[k]);
              if (d > 1 && k === 'x') report.geometry.maxLogoDelta = Math.max(report.geometry.maxLogoDelta ?? 0, d);
            }
          }
        }

        if (vp.name === '1440' && SCREENSHOT_ROUTES.includes(route)) {
          await page.screenshot({ path: path.join(shotDir, `${route.replace(/\//g, '_')}-1440.png`), fullPage: false });
        }
        if (vp.name === '390' && SCREENSHOT_ROUTES.includes(route)) {
          await page.screenshot({ path: path.join(shotDir, `${route.replace(/\//g, '_')}-390.png`), fullPage: false });
        }
      }

      if (vp.name === '1440') {
        const page = await context.newPage();
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoPublicRoute(page, '/');
        await testDropdown(page, '체육수업');
        await testDropdown(page, '솔루션');
        await gotoPublicRoute(page, '/spokedu-lab');
        await testMaster(page);
        await gotoPublicRoute(page, '/records');
        const b = await measureHeader(page);
        await gotoPublicRoute(page, '/records/dongjak-spomove');
        const a = await measureHeader(page);
        if (Math.abs((b.headerH ?? 0) - (a.headerH ?? 0)) > 1) fail('records continuity header height');
        if (b.navText !== a.navText) fail('records continuity nav labels');
        report.interaction.recordsContinuity = 'PASS';
      }

      if (vp.name === '390') {
        const page = await context.newPage();
        await page.setViewportSize({ width: 390, height: 844 });
        await gotoPublicRoute(page, '/');
        await testMobileMenu(page);
        report.interaction.mobileMenu = 'PASS';
      }

      if (vp.name === '1024') {
        const page = await context.newPage();
        await page.setViewportSize({ width: 1024, height: 768 });
        await gotoPublicRoute(page, '/');
        const nav = page.locator('nav[aria-label="주요 메뉴"]');
        await nav.waitFor({ state: 'visible' });
        const box = await nav.boundingBox();
        const cta = page.locator('[data-spokedu-global-header="true"]').getByRole('link', { name: '상담하기' });
        const ctaBox = await cta.boundingBox();
        if (!box || !ctaBox || ctaBox.x < box.x) fail('1024: nav/CTA overlap');
        report.interaction.breakpoint1024 = 'PASS';
      }

      await context.close();
    }

    if (report.consoleErrors.length) fail(`console errors:\n${report.consoleErrors.join('\n')}`);

    const innerXs = report.geometry.innerX1440.map((r) => r.x);
    const innerBad = innerXs.filter((x) => Math.abs(x - 84) > 1);
    if (innerBad.length) fail(`1440 inner X not 84±1: ${JSON.stringify(report.geometry.innerX1440)}`);

    report.interaction.dropdowns = 'PASS';
    report.interaction.masterAnchors = 'PASS';

    console.log('SPOKEDU public shell QA PASS');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await rm(shotDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
