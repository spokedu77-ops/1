import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseUrl = 'http://127.0.0.1:3000/';

function waitForServer(url, timeoutMs = 180_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Server not ready'));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

const server = spawn('npm run start', {
  cwd: repoRoot,
  stdio: 'pipe',
  shell: true,
});

let browser;
try {
  await waitForServer(baseUrl);
  browser = await chromium.launch();
  const page = await browser.newPage();
  const widths = [1440, 1024, 834, 390];
  const report = {};

  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('section[aria-labelledby="home-hero-heading"] img').waitFor({ state: 'visible' });
    report[w] = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      const heroH1 = document.querySelector('#home-hero-heading')?.textContent?.trim() ?? '';
      const heroEn = document.querySelector('section[aria-labelledby="home-hero-heading"] p')?.textContent ?? '';
      const ctas = [...document.querySelectorAll('section[aria-labelledby="home-hero-heading"] a[href]')].map((a) => ({
        href: a.getAttribute('href'),
        label: a.textContent?.trim(),
      }));
      const cards = [...document.querySelectorAll('#home-gateway-heading')].flatMap((h) => {
        const section = h.closest('section');
        return section ? [...section.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')) : [];
      });
      const h1Count = document.querySelectorAll('h1').length;
      const gatewayNumbers = /^\s*0[1-3]\s*$/.test(
        document.querySelector('#home-gateway-heading')?.closest('section')?.textContent ?? '',
      );
      return { overflow, heroH1: heroH1.slice(0, 40), h1Count, ctas, cards, gatewayHasDecorNumbers: gatewayNumbers };
    });
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
