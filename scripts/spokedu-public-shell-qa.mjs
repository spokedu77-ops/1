/**
 * SPOKEDU public global shell P0 QA — runtime verification
 * SPOKEDU_QA_ORIGIN=http://127.0.0.1:PORT npm run qa:public-shell
 */
import { performance } from 'node:perf_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'os';
import path from 'node:path';
import { chromium } from 'playwright';
import { assertLocalQaTarget, installLocalQaRouteGuard } from './lib/qa-network-guard.mjs';

const ORIGIN = (process.env.SPOKEDU_QA_ORIGIN ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const PAGE_READY = process.env.SPOKEDU_QA_PAGE_READY ?? 'domcontentloaded';

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
  { name: '1024', width: 1024, height: 768 },
  { name: '1440', width: 1440, height: 900 },
];

const PRIMARY_NAV_LABELS = ['체육수업', 'SPOMOVE', 'SPOKEDU LAB', '수업사례', 'SPOKEDU 소개'];

const ACTIVE_NAV_BY_ROUTE = {
  '/education': '체육수업',
  '/spomove': 'SPOMOVE',
  '/spomove/catalog': 'SPOMOVE',
  '/records': '수업사례',
  '/records/dongjak-spomove': '수업사례',
  '/about': 'SPOKEDU 소개',
};

const NO_PRIMARY_NAV_ACTIVE = new Set(['/', '/private', '/partners', '/spomat']);

const LAB_ANCHORS = [
  ['#workflow', '서비스'],
  ['#library', '놀이체육'],
  ['#spomove', 'SPOMOVE'],
  ['#plans', '요금제'],
  ['#faq', '자주 묻는 질문'],
];

const stats = { navigations: 0, screenshots: 0, blockedRemote: 0 };

function fail(msg) {
  throw new Error(msg);
}

async function gotoStandardPublic(page, route) {
  const res = await page.goto(`${ORIGIN}${route}`, { waitUntil: PAGE_READY, timeout: 120_000 });
  stats.navigations += 1;
  await page.locator('[data-spokedu-global-header="true"]').waitFor({ state: 'visible', timeout: 45_000 });
  return res;
}

async function gotoLabPublic(page) {
  const res = await page.goto(`${ORIGIN}/spokedu-lab`, { waitUntil: PAGE_READY, timeout: 120_000 });
  stats.navigations += 1;
  await page.locator('[data-spokedu-master-local-nav="true"]').waitFor({ state: 'visible', timeout: 45_000 });
  await page.locator('[class*="landingRoot"]').first().waitFor({ state: 'attached', timeout: 45_000 });
  return res;
}

async function measureHeader(page) {
  return page.evaluate(() => {
    const header = document.querySelector('[data-spokedu-global-header="true"]');
    const container = header?.querySelector('.site-container') ?? header?.firstElementChild;
    const logo = header?.querySelector('a[aria-label="SPOKEDU 홈"]');
    const cta = [...(header?.querySelectorAll('a') ?? [])].find((a) => a.textContent?.trim() === '문의하기');
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
      navLabels: [...(nav?.querySelectorAll('a') ?? [])].map((a) => a.textContent?.trim() ?? ''),
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

async function assertPrimaryNavLabels(page) {
  const labels = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
    if (!nav) return null;
    return [...nav.querySelectorAll('a')].map((a) => a.textContent?.trim() ?? '');
  });
  if (!labels) fail('primary nav missing');
  if (JSON.stringify(labels) !== JSON.stringify(PRIMARY_NAV_LABELS)) {
    fail(`primary nav labels mismatch: ${JSON.stringify(labels)}`);
  }
}

async function assertActive(page, route) {
  if (route === '/contact') {
    const ok = await page.evaluate(() => {
      const cta = [...document.querySelectorAll('[data-spokedu-global-header="true"] a')].find(
        (a) => a.textContent?.trim() === '문의하기',
      );
      return Boolean(cta?.className.includes('ring-2'));
    });
    if (!ok) fail(`${route}: contact CTA active state (ring) missing`);
    return;
  }

  if (NO_PRIMARY_NAV_ACTIVE.has(route)) {
    const bad = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
      if (!nav) return 'nav missing';
      const items = [...nav.querySelectorAll('a')];
      const active = items.filter((el) => {
        const aria = el.getAttribute('aria-current');
        const cls = el.className;
        return aria === 'page' || (cls.includes('underline') && cls.includes('decoration'));
      });
      return active.length ? active.map((el) => el.textContent?.trim()).join(',') : null;
    });
    if (bad && bad !== 'nav missing') fail(`${route}: unexpected primary nav active: ${bad}`);
    if (bad === 'nav missing') fail(`${route}: nav missing`);
    return;
  }

  const label = ACTIVE_NAV_BY_ROUTE[route];
  if (!label) return;

  const ok = await page.evaluate(({ expected }) => {
    const nav = document.querySelector('nav[aria-label="주요 메뉴"]');
    if (!nav) return false;
    const link = [...nav.querySelectorAll('a')].find((a) => a.textContent?.trim() === expected);
    if (!link) return false;
    const aria = link.getAttribute('aria-current');
    const cls = link.className;
    return aria === 'page' || (cls.includes('underline') && cls.includes('decoration'));
  }, { expected: label });
  if (!ok) fail(`${route}: expected active nav "${label}"`);
}

async function testMobileMenu(page) {
  const menuButton = page.locator('[aria-controls="mobile-nav-panel"]');
  await menuButton.waitFor({ state: 'visible', timeout: 45_000 });
  const panel = page.locator('#mobile-nav-panel');

  const staticPanel = await page.evaluate(() => {
    const btn = document.querySelector('[aria-controls="mobile-nav-panel"]');
    const links = [...document.querySelectorAll('#mobile-nav-panel a[href]')].map((a) => a.getAttribute('href'));
    return {
      controls: btn?.getAttribute('aria-controls') ?? null,
      expandedInitial: btn?.getAttribute('aria-expanded') ?? null,
      panelLinks: links,
    };
  });
  if (staticPanel.controls !== 'mobile-nav-panel' || staticPanel.expandedInitial !== 'false') {
    fail(`mobile menu static chrome invalid: ${JSON.stringify(staticPanel)}`);
  }
  if (JSON.stringify(staticPanel.panelLinks) !== JSON.stringify(['/education', '/spomove', '/spokedu-lab', '/records', '/about', '/contact'])) {
    fail(`mobile menu static links mismatch: ${JSON.stringify(staticPanel.panelLinks)}`);
  }

  const clientReady = await page.evaluate(() =>
    [...document.querySelectorAll('button')].some((el) => Object.keys(el).some((key) => key.startsWith('__react'))),
  );
  if (!clientReady) {
    return 'BLOCKED: client hydration unavailable — static mobile IA verified only';
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await menuButton.click({ force: true, timeout: 15_000 });
    let expanded = await menuButton.getAttribute('aria-expanded');
    if (expanded === 'true') break;
    await menuButton.focus();
    await page.keyboard.press('Enter');
    expanded = await menuButton.getAttribute('aria-expanded');
    if (expanded === 'true') break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if ((await menuButton.getAttribute('aria-expanded')) !== 'true') {
    fail('mobile menu: panel did not open after client hydration was detected');
  }

  for (const label of [...PRIMARY_NAV_LABELS, '문의하기']) {
    if (label === '문의하기') {
      await panel.getByRole('link', { name: '문의하기' }).waitFor({ state: 'visible' });
    } else {
      await panel.getByRole('link', { name: label, exact: true }).waitFor({ state: 'visible' });
    }
  }

  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const el = document.getElementById('mobile-nav-panel');
    return Boolean(el?.hasAttribute('hidden') || el?.getAttribute('aria-hidden') === 'true');
  });
  const onBtn = await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'mobile-nav-panel');
  if (!onBtn) fail('mobile menu: hamburger focus not restored');

  await menuButton.click();
  await panel.getByRole('link', { name: 'SPOKEDU 소개', exact: true }).click();
  await page.waitForURL(/\/about$/);
  await panel.waitFor({ state: 'hidden' });
  const scrollLocked = await page.evaluate(() => document.documentElement.style.overflow === 'hidden');
  if (scrollLocked) fail('mobile menu: body scroll lock not released');
  return 'PASS';
}

async function testLabChrome(page) {
  const lm = await landmarks(page);
  if (lm.header !== 0 || lm.footer !== 0) {
    fail(`/spokedu-lab: expected no global header/footer, got ${JSON.stringify(lm)}`);
  }
  if (lm.main !== 1 || lm.mainId !== 1 || lm.masterLocal !== 1) {
    fail(`/spokedu-lab landmarks ${JSON.stringify(lm)}`);
  }

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

  for (const [hash, name] of LAB_ANCHORS) {
    await page.locator(`a[href="${hash}"]`).first().click();
    await page.locator(hash).waitFor({ state: 'attached' });
    const visible = await page.evaluate((targetHash) => {
      const el = document.querySelector(targetHash);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const local = document.querySelector('[data-spokedu-master-local-nav="true"]')?.getBoundingClientRect();
      const top = (local?.bottom ?? 0) + 4;
      return r.top >= top && r.top < window.innerHeight * 0.55;
    }, hash);
    if (!visible) fail(`/spokedu-lab anchor ${name} (${hash}) clipped under sticky chrome`);
  }
}

async function main() {
  assertLocalQaTarget(ORIGIN);
  const started = performance.now();
  const report = {
    routeMatrix: {},
    geometry: { byRoute: {}, innerX1440: [] },
    interaction: {},
    overflow: {},
    consoleErrors: [],
    stats: {},
  };

  const shotDir = await mkdtemp(path.join(tmpdir(), 'spokedu-p0-qa-'));
  const browser = await chromium.launch({ headless: true });
  const originalNewContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await originalNewContext(...args);
    await installLocalQaRouteGuard(context);
    return context;
  };
  let baselineGeo = null;

  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (text.includes('Content Security Policy') && text.includes('notion')) return;
        if (text.includes('_next/webpack-hmr') || text.includes('WebSocket connection')) return;
        report.consoleErrors.push(`${vp.name}: ${text}`);
      });
      page.on('pageerror', (e) => report.consoleErrors.push(`${vp.name} pageerror: ${e.message}`));
      page.on('requestfailed', (req) => {
        if (req.failure()?.errorText === 'blockedbyclient') stats.blockedRemote += 1;
      });

      for (const route of ROUTES) {
        const res = route === '/spokedu-lab' ? await gotoLabPublic(page) : await gotoStandardPublic(page, route);
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
          fail(`${key} horizontal overflow ${ov.sw}>${ov.iw}`);
        }

        if (route === '/spokedu-lab') {
          if (lm.header !== 0 || lm.footer !== 0 || lm.main !== 1 || lm.mainId !== 1 || lm.masterLocal !== 1) {
            fail(`${key} lab landmarks ${JSON.stringify(lm)}`);
          }
        } else if (lm.header !== 1 || lm.footer !== 1 || lm.main !== 1 || lm.mainId !== 1) {
          fail(`${key} landmarks ${JSON.stringify(lm)}`);
        }

        if (vp.name === '1440' && route !== '/spokedu-lab') {
          await assertPrimaryNavLabels(page);
          await assertActive(page, route);
          const geo = await measureHeader(page);
          report.geometry.byRoute[route] = geo;
          if (geo.innerX != null) report.geometry.innerX1440.push({ route, x: geo.innerX });
          if (!baselineGeo) baselineGeo = geo;
          else if (geo.logo && baselineGeo.logo) {
            for (const k of ['x', 'y']) {
              const d = Math.abs(geo.logo[k] - baselineGeo.logo[k]);
              if (d > 1 && k === 'x') report.geometry.maxLogoDelta = Math.max(report.geometry.maxLogoDelta ?? 0, d);
            }
          }
        }
      }

      if (vp.name === '1440') {
        const labPage = await context.newPage();
        await labPage.setViewportSize({ width: 1440, height: 900 });
        await gotoLabPublic(labPage);
        await testLabChrome(labPage);
        report.interaction.labAnchors = 'PASS';

        const recordsPage = await context.newPage();
        await recordsPage.setViewportSize({ width: 1440, height: 900 });
        await gotoStandardPublic(recordsPage, '/records');
        const b = await measureHeader(recordsPage);
        await gotoStandardPublic(recordsPage, '/records/dongjak-spomove');
        const a = await measureHeader(recordsPage);
        if (Math.abs((b.headerH ?? 0) - (a.headerH ?? 0)) > 1) fail('records continuity header height');
        if (b.navText !== a.navText) fail('records continuity nav labels');
        report.interaction.recordsContinuity = 'PASS';
      }

      if (vp.name === '390') {
        const mobilePage = await context.newPage();
        await mobilePage.setViewportSize({ width: 390, height: 844 });
        const res = await mobilePage.goto(`${ORIGIN}/`, { waitUntil: 'networkidle', timeout: 180_000 });
        stats.navigations += 1;
        if (!res?.ok()) fail(`mobile menu setup: HTTP ${res?.status()}`);
        await mobilePage.locator('[data-spokedu-global-header="true"]').waitFor({ state: 'visible', timeout: 45_000 });
        report.interaction.mobileMenu = await testMobileMenu(mobilePage);
      }

      if (vp.name === '1024') {
        const desktopPage = await context.newPage();
        await desktopPage.setViewportSize({ width: 1024, height: 768 });
        await gotoStandardPublic(desktopPage, '/');
        const nav = desktopPage.locator('nav[aria-label="주요 메뉴"]');
        await nav.waitFor({ state: 'visible' });
        const box = await nav.boundingBox();
        const cta = desktopPage.locator('[data-spokedu-global-header="true"]').getByRole('link', { name: '문의하기' });
        const ctaBox = await cta.boundingBox();
        if (!box || !ctaBox || ctaBox.x < box.x) fail('1024: nav/CTA overlap');
        report.interaction.breakpoint1024 = 'PASS';
      }

      await context.close();
    }

    if (report.consoleErrors.length) fail(`console errors:\n${report.consoleErrors.join('\n')}`);

    const innerXs = report.geometry.innerX1440.map((r) => r.x).filter((x) => x != null);
    const innerBad = innerXs.filter((x) => Math.abs(x - 84) > 4);
    if (innerBad.length) fail(`1440 inner X drift: ${JSON.stringify(report.geometry.innerX1440)}`);

    report.stats = {
      ...stats,
      elapsedMs: Math.round(performance.now() - started),
    };

    const blocked = Object.values(report.interaction).some((value) => typeof value === 'string' && value.startsWith('BLOCKED'));
    if (blocked) {
      console.log('SPOKEDU public shell QA BLOCKED (see interaction)');
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }

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
