/**
 * Compare Stitch static HTML vs Next.js (NEXT_PUBLIC_SPOKEDU_STITCH_C0=1) under same capture profiles.
 * Requires dev server at BASE_URL (default http://127.0.0.1:3000).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(__dirname, '..');
const STITCH_ROOT = path.join(
  CONTRACT,
  'sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign',
);
const OUT = path.join(CONTRACT, 'stitch-c0-fidelity');
const BASE_URL = process.env.STITCH_C0_BASE_URL ?? 'http://127.0.0.1:3000';

const PAGES = [
  { folder: 'home_spomove', nextPath: '/', cssWidth: 1179, dpr: 2 },
  { folder: 'education_programs_spomove', nextPath: '/education', cssWidth: 1280, dpr: 2 },
  { folder: 'private_lesson_spomove', nextPath: '/private', cssWidth: 1280, dpr: 2 },
  { folder: 'spomove_system_spomove', nextPath: '/spomove', cssWidth: 1232, dpr: 2 },
  { folder: 'field_records_spomove', nextPath: '/records', cssWidth: 1280, dpr: 2 },
  { folder: 'about_spomove', nextPath: '/about', cssWidth: 1280, dpr: 2 },
];

function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    const abs = path.normalize(path.join(root, urlPath.replace(/^\//, '')));
    if (!abs.startsWith(path.normalize(root)) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function capture(url, profile, outPath) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: profile.cssWidth, height: 900 },
    deviceScaleFactor: profile.dpr,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((i) => !i.complete)
        .map((i) => new Promise((r) => { i.onload = r; i.onerror = r; })),
    );
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: outPath, fullPage: true, scale: 'device' });
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    dpr: window.devicePixelRatio,
  }));
  const meta = await sharp(outPath).metadata();
  await context.close();
  await browser.close();
  return { metrics, meta };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, port } = await startStaticServer(STITCH_ROOT);
  const results = [];
  try {
    for (const p of PAGES) {
      const dir = path.join(OUT, p.folder);
      fs.mkdirSync(dir, { recursive: true });
      const refPath = path.join(STITCH_ROOT, p.folder, 'code.html');
      const refUrl = `http://127.0.0.1:${port}/${p.folder}/code.html`;
      const nextUrl = `${BASE_URL}${p.nextPath}`;
      const refPng = path.join(dir, '01-stitch-static.png');
      const nextPng = path.join(dir, '02-nextjs.png');
      const ref = await capture(refUrl, p, refPng);
      const next = await capture(nextUrl, p, nextPng);
      results.push({
        folder: p.folder,
        nextPath: p.nextPath,
        ref: ref.meta,
        next: next.meta,
        refMetrics: ref.metrics,
        nextMetrics: next.metrics,
        heightDelta: (next.meta.height ?? 0) - (ref.meta.height ?? 0),
        widthDelta: (next.meta.width ?? 0) - (ref.meta.width ?? 0),
      });
    }
  } finally {
    server.close();
  }
  const verdict = results.every((r) => Math.abs(r.widthDelta) <= 2 && Math.abs(r.heightDelta) <= 80)
    ? 'STITCH_NEXTJS_FIDELITY_PASS_CANDIDATE'
    : 'STITCH_NEXTJS_FIDELITY_PARTIAL';
  fs.writeFileSync(path.join(OUT, 'SUMMARY.json'), JSON.stringify({ verdict, baseUrl: BASE_URL, results }, null, 2));
  console.log(JSON.stringify({ verdict, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
