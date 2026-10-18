import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'captures', 'hero-941-before-reference.png');
const port = '3007';

const srv = spawn('npm run start', {
  cwd: repoRoot,
  shell: true,
  stdio: 'pipe',
  env: { ...process.env, PORT: port },
});

await mkdir(path.dirname(out), { recursive: true });
for (let i = 0; i < 120; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${port}/`)).ok) break;
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 400));
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 941, height: 861 });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
await page.locator('section[aria-labelledby="home-hero-heading"]').screenshot({ path: out });
await browser.close();
srv.kill('SIGTERM');
console.log('saved', out);
