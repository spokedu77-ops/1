import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const capturesDir = path.join(__dirname, 'captures');
const repoRoot = path.resolve(__dirname, '../../../../');
const baseUrl = 'http://127.0.0.1:3000/';

function waitForServer(url, timeoutMs = 180_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) resolve();
        else throw new Error(String(res.status));
      } catch {
        if (Date.now() - start > timeoutMs) reject(new Error('Server not ready'));
        else setTimeout(tick, 400);
      }
    };
    tick();
  });
}

async function waitForSectionImages(page, sectionSelector) {
  await page.locator(sectionSelector).scrollIntoViewIfNeeded();
  await page.evaluate(async (sel) => {
    const section = document.querySelector(sel);
    if (!section) return;
    const imgs = [...section.querySelectorAll('img')];
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
            setTimeout(resolve, 8000);
          }),
      ),
    );
  }, sectionSelector);
}

const server = spawn('npm run start', {
  cwd: repoRoot,
  stdio: 'pipe',
  shell: true,
});

const report = {
  viewports: {},
  gatewayCapture: {},
  sections: {},
  mobileCtaStyles: {},
  keyboard: {},
  imageAudit: [],
};

let browser;
try {
  await waitForServer(baseUrl);
  await mkdir(capturesDir, { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage();

  const sectionIds = [
    ['method', 'section[aria-labelledby="home-method-heading"]'],
    ['records', 'section[aria-labelledby="home-records-heading"]'],
    ['spomove', 'section[aria-labelledby="home-spomove-heading"]'],
    ['master', 'section[aria-labelledby="home-master-heading"]'],
    ['final', 'section[aria-labelledby="home-final-heading"]'],
  ];

  for (const [w, h, file] of [
    [1440, 900, 'home-1440.png'],
    [1024, 900, 'home-1024.png'],
    [834, 900, 'home-834.png'],
    [390, 844, 'home-390.png'],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    for (const [, sel] of sectionIds) {
      await waitForSectionImages(page, sel);
    }
    await page.locator('section[aria-labelledby="home-hero-heading"] img').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(capturesDir, file), fullPage: true });
    report.viewports[w] = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      h1Count: document.querySelectorAll('h1').length,
    }));
  }

  for (const [w, file] of [
    [1440, 'gateway-1440.png'],
    [390, 'gateway-390.png'],
  ]) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    const gateway = page.locator('section[aria-labelledby="home-gateway-heading"]');
    await gateway.waitFor({ state: 'visible' });
    await gateway.scrollIntoViewIfNeeded();
    const box = await gateway.boundingBox();
    await gateway.screenshot({ path: path.join(capturesDir, file), animations: 'disabled' });
    report.gatewayCapture[file] = await page.evaluate(() => {
      const section = document.querySelector('section[aria-labelledby="home-gateway-heading"]');
      const cards = section ? section.querySelectorAll('a[href]').length : 0;
      const titles = section
        ? [...section.querySelectorAll('strong')].map((el) => el.textContent?.trim())
        : [];
      return { cardLinks: cards, titles, height: section?.getBoundingClientRect().height ?? 0 };
    });
    report.gatewayCapture[file].boundingHeight = box?.height ?? 0;
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  for (const [name, sel, file] of [
    ['spomove', 'section[aria-labelledby="home-spomove-heading"]', 'spomove-mobile-390.png'],
    ['master', 'section[aria-labelledby="home-master-heading"]', 'lab-mobile-390.png'],
    ['final', 'section[aria-labelledby="home-final-heading"]', 'finalcta-mobile-390.png'],
  ]) {
    const loc = page.locator(sel);
    await loc.scrollIntoViewIfNeeded();
    await waitForSectionImages(page, sel);
    await loc.screenshot({ path: path.join(capturesDir, file), animations: 'disabled' });
    const btnLoc = loc.locator('a').filter({ hasNotText: '→' }).first();
    await btnLoc.waitFor({ state: 'visible' });
    const actionsLoc = btnLoc.locator('xpath=..');
    report.mobileCtaStyles[name] = {
      ...(await btnLoc.evaluate((btn) => {
        const actions = btn.parentElement;
        const aStyle = actions ? getComputedStyle(actions) : null;
        const bStyle = getComputedStyle(btn);
        return {
          actionsFlexDirection: aStyle?.flexDirection ?? null,
          actionsAlignItems: aStyle?.alignItems ?? null,
          btnWidth: bStyle.width,
          btnMinHeight: bStyle.minHeight,
          btnDisplay: bStyle.display,
          href: btn.getAttribute('href'),
          label: btn.textContent?.trim(),
        };
      })),
    };
  }

  const heroSection = page.locator('section[aria-labelledby="home-hero-heading"]');
  const heroActionsLoc = heroSection.locator('a').first().locator('xpath=..');
  report.mobileCtaStyles.hero = await heroActionsLoc.evaluate((actions) => {
    const buttons = [...actions.querySelectorAll('a')];
    return {
      flexDirection: getComputedStyle(actions).flexDirection,
      buttons: buttons.map((b) => ({
        width: getComputedStyle(b).width,
        flex: getComputedStyle(b).flex,
        label: b.textContent?.trim(),
      })),
    };
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [name, sel] of sectionIds) {
    await waitForSectionImages(page, sel);
    report.sections[name] = await page.evaluate((sectionSel) => {
      const section = document.querySelector(sectionSel);
      if (!section) return { exists: false };
      const imgs = [...section.querySelectorAll('img')].map((img) => ({
        src: img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
      }));
      const links = [...section.querySelectorAll('a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent?.trim().slice(0, 50),
      }));
      const heading = section.querySelector('h2')?.textContent?.trim() ?? '';
      return { exists: true, heading: heading.slice(0, 80), imgs, links };
    }, sel);
  }

  await page.setViewportSize({ width: 390, height: 844 });

  const focusTargets = [
    'section[aria-labelledby="home-hero-heading"] a >> nth=0',
    'section[aria-labelledby="home-hero-heading"] a >> nth=1',
    'section[aria-labelledby="home-gateway-heading"] a >> nth=0',
    'section[aria-labelledby="home-gateway-heading"] a >> nth=1',
    'section[aria-labelledby="home-gateway-heading"] a >> nth=2',
  ];
  report.keyboard.focusChecks = [];
  for (const sel of focusTargets) {
    const el = page.locator(sel);
    await el.focus();
    report.keyboard.focusChecks.push({
      sel,
      ...(await el.evaluate((node) => ({
        href: node.getAttribute('href'),
        outlineWidth: getComputedStyle(node).outlineWidth,
        outlineStyle: getComputedStyle(node).outlineStyle,
        outlineColor: getComputedStyle(node).outlineColor,
      }))),
    });
  }
  await page.locator('section[aria-labelledby="home-hero-heading"] a').first().focus();
  await page.screenshot({ path: path.join(capturesDir, 'focus-visible-390.png'), fullPage: false });

  const heroPrimary = page.locator('section[aria-labelledby="home-hero-heading"] a').first();
  await heroPrimary.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/education**', { timeout: 10_000 }).catch(() => null);
  report.keyboard.heroPrimaryEnterUrl = page.url();

  await writeFile(path.join(__dirname, 'automation-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
