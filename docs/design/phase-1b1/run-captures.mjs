import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const capturesDir = path.join(__dirname, 'captures');
const repoRoot = path.resolve(__dirname, '../../..');
const baseUrl = 'http://127.0.0.1:3000/';

function waitForServer(url, timeoutMs = 180_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        if (res.ok || res.status === 304) {
          resolve();
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Server did not become ready in time'));
        return;
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

const server = spawn('npm run start', {
  cwd: repoRoot,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: '3000' },
});

let browser;
try {
  await waitForServer(baseUrl);
  await mkdir(capturesDir, { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage();

  const widths = [
    { w: 1440, h: 900, file: 'home-1440.png' },
    { w: 1024, h: 900, file: 'home-1024.png' },
    { w: 834, h: 900, file: 'home-834.png' },
    { w: 390, h: 844, file: 'home-390.png' },
  ];

  for (const { w, h, file } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('section[aria-labelledby="home-hero-heading"] img').waitFor({
      state: 'visible',
      timeout: 30_000,
    });
    await page.screenshot({ path: path.join(capturesDir, file), fullPage: true });
  }

  for (const { w, file } of [
    { w: 1440, file: 'gateway-1440.png' },
    { w: 390, file: 'gateway-390.png' },
  ]) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const gateway = page.locator('#home-gateway-heading');
    await gateway.scrollIntoViewIfNeeded();
    await gateway.waitFor({ state: 'visible' });
    const box = await gateway.evaluate((el) => {
      const section = el.closest('section');
      const rect = section?.getBoundingClientRect();
      return rect
        ? { x: 0, y: Math.max(0, rect.top + window.scrollY - 72), width: window.innerWidth, height: Math.min(rect.height + 120, 900) }
        : null;
    });
    if (box) {
      await page.screenshot({
        path: path.join(capturesDir, file),
        clip: { x: 0, y: box.y, width: box.width, height: Math.min(box.height, 820) },
      });
    } else {
      await page.locator('section').nth(1).screenshot({ path: path.join(capturesDir, file) });
    }
  }

  const hrefs = await page.evaluate(() => {
    const section = document.querySelector('#home-gateway-heading')?.closest('section');
    const cards = section ? [...section.querySelectorAll('a[href]')] : [];
    return cards.map((a) => a.getAttribute('href'));
  });
  console.log('GATEWAY_HREFS', JSON.stringify(hrefs));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
