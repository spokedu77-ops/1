import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const capturesDir = path.join(__dirname, 'captures');
const repoRoot = path.resolve(__dirname, '../../..');
const port = process.env.PHASE1B2B_PORT ?? '3001';
const baseUrl = `http://127.0.0.1:${port}/`;

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

async function decodeSectionImages(page, selector) {
  for (const img of await page.locator(`${selector} img`).all()) {
    await img.evaluate((el) => {
      const node = el;
      if (node.decode) return node.decode().catch(() => {});
      return undefined;
    });
    await img.evaluate((el) => el.naturalWidth > 0);
  }
}

const widths = [
  { w: 1440, h: 900 },
  { w: 1024, h: 900 },
  { w: 834, h: 900 },
  { w: 390, h: 844 },
];

const report = {
  overflow: {},
  sections: {},
  links: {},
  captures: [],
};

const server = spawn('npm run start', {
  cwd: repoRoot,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: port },
});

let browser;
try {
  await waitForServer(baseUrl);
  await mkdir(capturesDir, { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { w, h } of widths) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForSelector('section[aria-labelledby="home-method-heading"]', { timeout: 60_000 });
    report.overflow[w] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

    const method = page.locator('section[aria-labelledby="home-method-heading"]');
    const records = page.locator('section[aria-labelledby="home-records-heading"]');
    await method.scrollIntoViewIfNeeded();
    await decodeSectionImages(page, 'section[aria-labelledby="home-method-heading"]');
    const methodFile = `method-${w}.png`;
    await method.screenshot({ path: path.join(capturesDir, methodFile), animations: 'disabled' });
    report.captures.push(methodFile);

    await records.scrollIntoViewIfNeeded();
    await decodeSectionImages(page, 'section[aria-labelledby="home-records-heading"]');
    const recordsFile = `records-${w}.png`;
    await records.screenshot({ path: path.join(capturesDir, recordsFile), animations: 'disabled' });
    report.captures.push(recordsFile);

    if (w === 1440 || w === 390) {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForSelector('section[aria-labelledby="home-method-heading"]', { timeout: 60_000 });
      const fullFile = `home-full-${w}.png`;
      await page.screenshot({ path: path.join(capturesDir, fullFile), fullPage: true, animations: 'disabled' });
      report.captures.push(fullFile);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForSelector('section[aria-labelledby="home-records-heading"]', { timeout: 60_000 });
  const firstRecord = page.locator('section[aria-labelledby="home-records-heading"] a').first();
  await firstRecord.focus();
  await page.screenshot({ path: path.join(capturesDir, 'focus-records-390.png'), animations: 'disabled' });
  report.captures.push('focus-records-390.png');

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForSelector('#home-method-heading', { timeout: 60_000 });
  report.sections.methodH2 = await page.locator('#home-method-heading').innerText();
  report.sections.recordsH2 = await page.locator('#home-records-heading').innerText();
  report.sections.methodArticles = await page.locator('section[aria-labelledby="home-method-heading"] article').count();
  report.sections.recordCards = await page
    .locator('section[aria-labelledby="home-records-heading"] .gallery a')
    .count();

  const hrefs = await page.locator('section[aria-labelledby="home-records-heading"] a').evaluateAll((nodes) =>
    nodes.map((n) => (n instanceof HTMLAnchorElement ? n.href : '')),
  );
  report.links.recordHrefs = hrefs;

  await writeFile(path.join(__dirname, 'playwright-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
