import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const capturesDir = path.join(__dirname, 'captures');
const port = process.env.RENDERING_QA_PORT ?? '3002';
const baseUrl = `http://127.0.0.1:${port}/`;
const BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();

function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok || res.status === 304) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) reject(new Error('timeout'));
      else setTimeout(tick, 400);
    };
    tick();
  });
}

async function assertStyles(page, w) {
  return page.evaluate((width) => {
    const methodGrid = document.querySelector('section[aria-labelledby="home-method-heading"] [role="group"]');
    const records = document.querySelector('section[aria-labelledby="home-records-heading"]');
    const root = document.querySelector('[data-spokedu-home-build] div');
    if (!methodGrid || !records || !root) return { ok: false, reason: 'missing nodes' };
    const mg = getComputedStyle(methodGrid);
    const rs = getComputedStyle(records);
    const rv = getComputedStyle(root).getPropertyValue('--navy').trim();
    const methodGridOk = mg.display === 'grid';
    const recordsOk = rs.backgroundColor === 'rgb(11, 31, 70)';
    const varsOk = rv === '#0b1f46' || rv === 'rgb(11, 31, 70)';
    const cols = mg.gridTemplateColumns.split(' ').filter(Boolean).length;
    const methodColsOk = width >= 1024 ? cols >= 3 : cols >= 1;
    return {
      ok: methodGridOk && recordsOk && varsOk && methodColsOk,
      methodGridOk,
      recordsOk,
      varsOk,
      methodColsOk,
      gridTemplateColumns: mg.gridTemplateColumns,
    };
  }, w);
}

async function readyPage(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
  await page.evaluate(() => document.fonts?.ready);
  const check = await assertStyles(page, w);
  if (!check.ok) throw new Error(`Styles not ready @ ${w}: ${JSON.stringify(check)}`);
}

async function decodeSectionImages(page, selector) {
  for (const img of await page.locator(`${selector} img`).all()) {
    await img.evaluate(async (el) => {
      if (el.decode) await el.decode().catch(() => {});
    });
  }
}

let server;
try {
  try {
    await waitForServer(baseUrl, 4_000);
  } catch {
    server = spawn('npm run start', {
      cwd: repoRoot,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: port },
    });
    await waitForServer(baseUrl);
  }

  await mkdir(capturesDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const widths = [
    { w: 1440, h: 900 },
    { w: 1024, h: 900 },
    { w: 834, h: 900 },
    { w: 390, h: 844 },
  ];
  const report = { BUILD_ID, port, overflow: {}, styleChecks: {} };

  for (const { w, h } of widths) {
    await readyPage(page, w, h);
    report.styleChecks[w] = await assertStyles(page, w);
    report.overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const method = page.locator('section[aria-labelledby="home-method-heading"]');
    const records = page.locator('section[aria-labelledby="home-records-heading"]');
    await method.scrollIntoViewIfNeeded();
    await decodeSectionImages(page, 'section[aria-labelledby="home-method-heading"]');
    await method.screenshot({ path: path.join(capturesDir, `method-${w}.png`), animations: 'disabled' });
    await records.scrollIntoViewIfNeeded();
    await decodeSectionImages(page, 'section[aria-labelledby="home-records-heading"]');
    await records.screenshot({ path: path.join(capturesDir, `records-${w}.png`), animations: 'disabled' });
    if (w === 1440 || w === 390) {
      await readyPage(page, w, h);
      await page.screenshot({ path: path.join(capturesDir, `home-full-${w}.png`), fullPage: true, animations: 'disabled' });
    }
  }

  await readyPage(page, 390, 844);
  const links = page.locator('section[aria-labelledby="home-records-heading"] a');
  for (let i = 0; i < 3; i++) {
    await links.nth(i).focus();
  }
  await links.first().focus();
  await page.screenshot({ path: path.join(capturesDir, 'focus-records-390.png'), animations: 'disabled' });

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}
