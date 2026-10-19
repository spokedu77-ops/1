#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from './capture-page-utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'BEFORE_AFTER', 'AFTER');
const resultsPath = path.join(here, '..', 'QA_CAPTURE_RESULTS.json');
const repo = path.resolve(here, '../../../..');
const port = process.env.REFACTOR_CAPTURE_PORT ?? '3055';
const base = `http://127.0.0.1:${port}`;

const routes = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/spomove/catalog',
  '/spokedu-lab',
  '/records',
  '/about',
  '/spomat',
  '/partners',
  '/contact',
  '/consult',
];
const widths = [360, 390, 768, 941, 1024, 1440];

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('server timeout');
}

function slugFor(route) {
  return route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
}

let srv;
const results = [];

try {
  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitServer();
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const route of routes) {
    for (const w of widths) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: w, height: 900 });
      let stability;
      try {
        stability = await stabilizePublicPage(page, `${base}${route}`);
      } catch (err) {
        stability = {
          pageLoaded: false,
          fontReady: false,
          brokenImageCount: -1,
          pendingImageCount: -1,
          hiddenContentCount: -1,
          horizontalOverflow: true,
          imagesReady: false,
          error: String(err),
        };
      }
      const slug = slugFor(route);
      const foldPath = path.join(outDir, `${slug}-${w}-fold.png`);
      const fullPath = path.join(outDir, `${slug}-${w}-full.png`);
      await page.screenshot({ path: foldPath, fullPage: false });
      await page.screenshot({ path: fullPath, fullPage: true });
      const pass =
        stability.imagesReady &&
        !stability.horizontalOverflow &&
        stability.hiddenContentCount === 0;
      results.push({
        route,
        viewport: w,
        pageLoaded: stability.pageLoaded,
        fontReady: stability.fontReady,
        brokenImageCount: stability.brokenImageCount,
        pendingImageCount: stability.pendingImageCount,
        hiddenContentCount: stability.hiddenContentCount,
        horizontalOverflow: stability.horizontalOverflow,
        screenshotsCreated: true,
        qaPass: pass,
        foldPath: path.relative(path.join(here, '..'), foldPath).replace(/\\/g, '/'),
      });
      await page.close();
    }
  }
  await browser.close();
  await writeFile(resultsPath, JSON.stringify({ capturedAt: new Date().toISOString(), base, results }, null, 2));
  const failed = results.filter((r) => !r.qaPass);
  console.log(JSON.stringify({ ok: failed.length === 0, outDir, failed: failed.length, resultsPath }, null, 2));
  if (failed.length) process.exitCode = 1;
} finally {
  if (srv) srv.kill('SIGTERM');
}
