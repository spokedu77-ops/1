import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const outDir = __dirname;
const capturesDir = path.join(outDir, 'captures');
const diagnoseDir = path.join(outDir, 'diagnose-evidence');

const LOCAL_BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();

function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok || res.status === 304) resolve();
        else if (Date.now() - start > timeoutMs) reject(new Error(`HTTP ${res.status}`));
        else setTimeout(tick, 400);
      } catch {
        if (Date.now() - start > timeoutMs) reject(new Error('Server timeout'));
        else setTimeout(tick, 400);
      }
    };
    tick();
  });
}

async function sha256File(relPath) {
  const buf = await readFile(path.join(repoRoot, relPath));
  return createHash('sha256').update(buf).digest('hex');
}

const serviceFiles = [
  'app/spokedu/components/home-web/spokedu-method.tsx',
  'app/spokedu/components/home-web/field-records.tsx',
  'app/spokedu/components/home-web/home-web-assets.ts',
  'app/spokedu/components/home-web/home-web.module.css',
];

const fileHashes = Object.fromEntries(
  await Promise.all(serviceFiles.map(async (f) => [f, await sha256File(f)])),
);

function pickStyles(computed) {
  return {
    display: computed.display,
    width: computed.width,
    height: computed.height,
    gridTemplateColumns: computed.gridTemplateColumns,
    gridTemplateRows: computed.gridTemplateRows,
    backgroundColor: computed.backgroundColor,
    color: computed.color,
    fontSize: computed.fontSize,
    fontFamily: computed.fontFamily,
    overflow: computed.overflow,
    objectFit: computed.objectFit,
    flexDirection: computed.flexDirection,
    gap: computed.gap,
  };
}

async function collectPageEvidence(page, baseUrl, viewport) {
  await page.setViewportSize(viewport);
  const cssResponses = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('.css') && !url.includes('/_next/static/css/')) return;
    let bodySample = '';
    try {
      const text = await res.text();
      bodySample = text.slice(0, 120);
    } catch {
      bodySample = '(body unreadable)';
    }
    cssResponses.push({
      url,
      status: res.status(),
      contentType: res.headers()['content-type'] ?? '',
      ok: res.ok(),
      bodySample,
      includesStepsRule: bodySample.includes('grid-template-columns') || bodySample.includes('repeat(3'),
      includesTileCard: bodySample.includes('tileCard') || bodySample.includes('flex-direction'),
    });
  });

  await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForSelector('section[aria-labelledby="home-method-heading"]', { timeout: 60_000 });
  await page.waitForSelector('section[aria-labelledby="home-records-heading"]', { timeout: 60_000 });

  const buildId = await page.evaluate(() => {
    const src = document.querySelector('script[src*="/_next/static/"]')?.getAttribute('src') ?? '';
    return src.match(/\/_next\/static\/([^/]+)\//)?.[1] ?? null;
  });

  const styles = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      return {
        display: c.display,
        width: c.width,
        height: c.height,
        gridTemplateColumns: c.gridTemplateColumns,
        gridTemplateRows: c.gridTemplateRows,
        backgroundColor: c.backgroundColor,
        color: c.color,
        fontSize: c.fontSize,
        fontFamily: c.fontFamily,
        overflow: c.overflow,
        objectFit: c.objectFit,
        flexDirection: c.flexDirection,
        gap: c.gap,
        className: el.className,
      };
    };

    const homeRoot =
      document.querySelector('[data-spokedu-home-build]')?.firstElementChild ??
      document.querySelector('[class*="root"]');
    const methodSection = document.querySelector('section[aria-labelledby="home-method-heading"]');
    const methodGrid = methodSection?.querySelector('[role="group"]');
    const methodArticles = [...(methodSection?.querySelectorAll('article') ?? [])];
    const methodMedia = methodSection?.querySelector('article .media img, article img');
    const recordsSection = document.querySelector('section[aria-labelledby="home-records-heading"]');
    const recordLinks = [...recordsSection.querySelectorAll('a[aria-label*="사례"]')];
    const firstCard = recordLinks[0] ?? null;
    const tileMedia = firstCard?.querySelector('img')?.parentElement ?? null;
    const tileInfo = firstCard?.querySelector('span')?.parentElement ?? null;
    const gallery = firstCard?.parentElement ?? null;

    const rootStyles = pick(homeRoot);
    if (homeRoot) {
      rootStyles.cssVars = {
        navy: getComputedStyle(homeRoot).getPropertyValue('--navy').trim(),
        blue: getComputedStyle(homeRoot).getPropertyValue('--blue').trim(),
        paper: getComputedStyle(homeRoot).getPropertyValue('--paper').trim(),
      };
    }

    return {
      homeRoot: rootStyles,
      methodSection: pick(methodSection),
      methodGrid: pick(methodGrid),
      methodArticles: methodArticles.map(pick),
      methodImage: pick(methodMedia),
      recordsSection: pick(recordsSection),
      recordsGallery: pick(gallery),
      recordsCard: pick(firstCard),
      recordsImageFrame: pick(tileMedia),
      recordsInfoPanel: pick(tileInfo),
      recordLinkCount: recordLinks.length,
    };
  });

  return { buildId, styles, cssResponses, consoleErrors, pageErrors };
}

async function waitForStyledLayout(page, viewportWidth) {
  await page.waitForFunction(
    (w) => {
      const methodGrid = document.querySelector('section[aria-labelledby="home-method-heading"] [role="group"]');
      const records = document.querySelector('section[aria-labelledby="home-records-heading"]');
      if (!methodGrid || !records) return false;
      const mg = getComputedStyle(methodGrid);
      const rs = getComputedStyle(records);
      const methodOk =
        mg.display === 'grid' &&
        (w >= 1024 ? mg.gridTemplateColumns.split(' ').length >= 3 : mg.gridTemplateColumns.includes('1fr'));
      const recordsBg = rs.backgroundColor;
      const recordsOk = recordsBg === 'rgb(11, 31, 70)' || recordsBg === 'rgba(11, 31, 70, 1)';
      return methodOk && recordsOk;
    },
    viewportWidth,
    { timeout: 45_000 },
  );
}

async function decodeSectionImages(page, selector) {
  for (const img of await page.locator(`${selector} img`).all()) {
    await img.evaluate(async (el) => {
      if (el.decode) await el.decode().catch(() => {});
      return el.complete && el.naturalWidth > 0;
    });
  }
}

async function runCaptures(page, baseUrl) {
  await mkdir(capturesDir, { recursive: true });
  const widths = [
    { w: 1440, h: 900 },
    { w: 1024, h: 900 },
    { w: 834, h: 900 },
    { w: 390, h: 844 },
  ];
  const overflow = {};
  for (const { w, h } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
    await page.evaluate(() => document.fonts?.ready);
    await waitForStyledLayout(page, w);
    overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    const method = page.locator('section[aria-labelledby="home-method-heading"]');
    const records = page.locator('section[aria-labelledby="home-records-heading"]');
    await method.scrollIntoViewIfNeeded();
    await decodeSectionImages(page, 'section[aria-labelledby="home-method-heading"]');
    await method.screenshot({ path: path.join(capturesDir, `method-${w}.png`), animations: 'disabled' });
    await records.scrollIntoViewIfNeeded();
    await decodeSectionImages(page, 'section[aria-labelledby="home-records-heading"]');
    await records.screenshot({ path: path.join(capturesDir, `records-${w}.png`), animations: 'disabled' });
    if (w === 1440 || w === 390) {
      await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
      await waitForStyledLayout(page, w);
      await page.screenshot({
        path: path.join(capturesDir, `home-full-${w}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
  await waitForStyledLayout(page, 390);
  const first = page.locator('section[aria-labelledby="home-records-heading"] a').first();
  await first.focus();
  await page.screenshot({ path: path.join(capturesDir, 'focus-records-390.png'), animations: 'disabled' });
  return overflow;
}

const probePorts = ['3000', '3001'];
const qaPort = process.env.RENDERING_QA_PORT ?? '3002';
let server;
const probeResults = {};

try {
  await mkdir(diagnoseDir, { recursive: true });
  const browser = await chromium.launch();

  for (const port of probePorts) {
    const baseUrl = `http://127.0.0.1:${port}/`;
    try {
      await waitForServer(baseUrl, 5_000);
      const page = await browser.newPage();
      probeResults[port] = {
        ...(await collectPageEvidence(page, baseUrl, { width: 1440, height: 900 })),
        reachable: true,
      };
      await page.close();
    } catch (e) {
      probeResults[port] = { reachable: false, error: String(e) };
    }
  }

  await waitForServer(`http://127.0.0.1:${qaPort}/`, 3_000).catch(() => null);
  let qaBase = `http://127.0.0.1:${qaPort}/`;
  let startedServer = false;
  try {
    await fetch(qaBase);
  } catch {
    startedServer = true;
    server = spawn('npm run start', {
      cwd: repoRoot,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: qaPort },
    });
    await waitForServer(qaBase);
  }

  const page = await browser.newPage();
  const qa1440 = await collectPageEvidence(page, qaBase, { width: 1440, height: 900 });
  const qa390 = await collectPageEvidence(page, qaBase, { width: 390, height: 844 });

  const computedReport = {
    meta: {
      localBuildId: LOCAL_BUILD_ID,
      qaPort,
      qaBase,
      startedFreshServer: startedServer,
      fileHashes,
      nodeVersion: process.version,
    },
    probePorts: probeResults,
    qa: {
      '1440': qa1440,
      '390': qa390,
    },
  };

  await writeFile(path.join(outDir, 'COMPUTED_STYLE_REPORT.json'), JSON.stringify(computedReport, null, 2));

  let visualPass = false;
  let captureOverflow = null;
  try {
    await waitForStyledLayout(page, 1440);
    captureOverflow = await runCaptures(page, qaBase);
    visualPass = true;
  } catch (e) {
    computedReport.captureError = String(e);
    await writeFile(path.join(outDir, 'COMPUTED_STYLE_REPORT.json'), JSON.stringify(computedReport, null, 2));
    await mkdir(diagnoseDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(qaBase, { waitUntil: 'load' });
    await page.screenshot({ path: path.join(diagnoseDir, 'FAIL-1440-full.png'), fullPage: true });
  }

  // a11y: tab + contrast sample
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(qaBase, { waitUntil: 'load' });
  await waitForStyledLayout(page, 390);
  const a11y = await page.evaluate(() => {
    const records = document.querySelector('section[aria-labelledby="home-records-heading"]');
    const desc = records?.querySelector('.tileDescription, [class*="tileDescription"]');
    const el = desc ?? records?.querySelector('a');
    if (!el) return { contrast: null };
    const fg = getComputedStyle(el).color;
    const bg = getComputedStyle(el.closest('a') ?? el).backgroundColor;
    return { sampleText: el.textContent?.slice(0, 40), fg, bg };
  });

  const cssNetwork = {
    probe3000: probeResults['3000']?.cssResponses ?? [],
    probe3001: probeResults['3001']?.cssResponses ?? [],
    qa1440: qa1440.cssResponses,
    qa390: qa390.cssResponses,
    consoleErrors: [...new Set([...(qa1440.consoleErrors ?? []), ...(qa390.consoleErrors ?? [])])],
    pageErrors: [...new Set([...(qa1440.pageErrors ?? []), ...(qa390.pageErrors ?? [])])],
  };

  await writeFile(path.join(outDir, 'css-network-raw.json'), JSON.stringify(cssNetwork, null, 2));

  await browser.close();

  const summary = { visualPass, captureOverflow, a11y, localBuildId: LOCAL_BUILD_ID };
  await writeFile(path.join(outDir, 'diagnose-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}
