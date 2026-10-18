import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const capturesDir = path.join(__dirname, 'captures');
const port = process.env.B3A_QA_PORT ?? '3002';
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

async function assertHomeCss(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-spokedu-home-build] div');
    if (!root) return { ok: false, reason: 'no home root' };
    const navy = getComputedStyle(root).getPropertyValue('--navy').trim();
    return { ok: navy === '#0b1f46' || navy === 'rgb(11, 31, 70)', navy };
  });
}

async function decodeImages(page, sel) {
  for (const img of await page.locator(`${sel} img`).all()) {
    await img.evaluate(async (el) => {
      if (el.decode) await el.decode().catch(() => {});
    });
  }
}

let server;
try {
  try {
    await waitForServer(baseUrl, 5_000);
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
  const report = { BUILD_ID, port, overflow: {}, cssOk: {} };

  for (const { w, h } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 120_000 });
    await page.evaluate(() => document.fonts?.ready);
    report.cssOk[w] = await assertHomeCss(page);
    if (!report.cssOk[w].ok) throw new Error(`CSS not applied @ ${w}`);

    report.overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    const spomove = page.locator('section[aria-labelledby="home-spomove-heading"]');
    const lab = page.locator('section[aria-labelledby="home-master-heading"]');
    await spomove.scrollIntoViewIfNeeded();
    await decodeImages(page, 'section[aria-labelledby="home-spomove-heading"]');
    await spomove.screenshot({ path: path.join(capturesDir, `spomove-${w}.png`), animations: 'disabled' });
    await lab.scrollIntoViewIfNeeded();
    await decodeImages(page, 'section[aria-labelledby="home-master-heading"]');
    await lab.screenshot({ path: path.join(capturesDir, `lab-${w}.png`), animations: 'disabled' });

    if (w === 1440 || w === 390) {
      await spomove.scrollIntoViewIfNeeded();
      const spBox = await spomove.boundingBox();
      await lab.scrollIntoViewIfNeeded();
      const labBox = await lab.boundingBox();
      if (spBox && labBox) {
        const y = Math.min(spBox.y, labBox.y);
        const h = Math.max(spBox.y + spBox.height, labBox.y + labBox.height) - y;
        await page.screenshot({
          path: path.join(capturesDir, `combined-${w}.png`),
          clip: { x: 0, y: Math.max(0, y), width: w, height: Math.min(h, 9000) },
          animations: 'disabled',
        });
      }
    }
  }

  await browser.close();
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (server) server.kill('SIGTERM');
}
