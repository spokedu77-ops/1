/**
 * Stitch OFF + non-target routes — requires dev server with NEXT_PUBLIC_SPOKEDU_STITCH_C0 unset or 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'stitch-c0-fidelity');
const BASE_URL = process.env.STITCH_C0_BASE_URL ?? 'http://127.0.0.1:3010';

const LEGACY_SIX = ['/', '/education', '/private', '/spomove', '/records', '/about'];
const OTHER = ['/contact', '/spokedu-lab', '/spomat', '/spomove/catalog'];

async function probe(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  const data = await page.evaluate(() => ({
    stitchRoot: !!document.querySelector('.stitch-c0-root'),
    stitchShell: !!document.querySelector('[data-stitch-c0-shell]'),
    marketingLayout: !!document.querySelector('[data-spokedu-marketing-layout]'),
    title: document.title,
  }));
  await browser.close();
  return data;
}

async function main() {
  const results = [];
  for (const p of LEGACY_SIX) {
    const d = await probe(`${BASE_URL}${p}`);
    results.push({
      path: p,
      expectStitch: false,
      stitchRoot: d.stitchRoot,
      pass: !d.stitchRoot,
    });
  }
  for (const p of OTHER) {
    const d = await probe(`${BASE_URL}${p}`);
    results.push({
      path: p,
      expectStitch: false,
      stitchRoot: d.stitchRoot,
      pass: !d.stitchRoot,
    });
  }
  const pass = results.every((r) => r.pass);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(
    path.join(OUT, 'REGRESSION_OFF.json'),
    JSON.stringify({ pass, baseUrl: BASE_URL, results }, null, 2),
    'utf8',
  );
  console.log(JSON.stringify({ pass, results }, null, 2));
  if (!pass) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
