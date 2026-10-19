#!/usr/bin/env node
/**
 * AFTER: local production build (authoritative for this refactor).
 * BEFORE: https://spokedu.kr — reference only; PO must confirm revision matches pre-refactor baseline.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from './capture-page-utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(here, '..', 'BEFORE_AFTER');
const resultsPath = path.join(here, '..', 'QA_CAPTURE_BEFORE_AFTER.json');
const repo = path.resolve(here, '../../../..');
const port = process.env.REFACTOR_CAPTURE_PORT ?? '3055';
const localBase = `http://127.0.0.1:${port}`;
const prodBase = process.env.REFACTOR_BEFORE_BASE ?? 'https://spokedu.kr';

const routes = ['/', '/education', '/private', '/spomove', '/spomove/catalog', '/spokedu-lab', '/records', '/about'];
const widths = [390, 941, 1440];

async function waitLocal() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${localBase}/`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('local server timeout');
}

function slugFor(route) {
  return route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
}

async function capture(browser, base, folder, label, results) {
  await mkdir(path.join(baseDir, folder), { recursive: true });
  for (const route of routes) {
    const slug = slugFor(route);
    for (const w of widths) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: w, height: 900 });
      let stability = {
        pageLoaded: false,
        fontReady: false,
        brokenImageCount: -1,
        pendingImageCount: -1,
        horizontalOverflow: true,
        hiddenContentCount: -1,
        imagesReady: false,
      };
      try {
        stability = await stabilizePublicPage(page, `${base}${route}`);
      } catch (e) {
        console.warn(JSON.stringify({ label, route, w, error: String(e) }));
      }
      const fold = path.join(baseDir, folder, `${slug}-${w}-fold.png`);
      const full = path.join(baseDir, folder, `${slug}-${w}-full.png`);
      await page.screenshot({ path: fold, fullPage: false });
      await page.screenshot({ path: full, fullPage: true });
      results.push({
        label,
        route,
        viewport: w,
        pageLoaded: stability.pageLoaded,
        fontReady: stability.fontReady,
        brokenImageCount: stability.brokenImageCount,
        pendingImageCount: stability.pendingImageCount,
        hiddenContentCount: stability.hiddenContentCount,
        horizontalOverflow: stability.horizontalOverflow,
        screenshotsCreated: true,
        qaPass: label === 'reference-before' ? null : stability.imagesReady && !stability.horizontalOverflow,
      });
      await page.close();
    }
  }
}

let srv;
const meta = {
  beforeBase: prodBase,
  afterBase: localBase,
  beforeNote: 'REFERENCE_ONLY — not verified as pre-refactor git baseline',
};
const results = [];

try {
  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitLocal();
  const browser = await chromium.launch();
  await capture(browser, prodBase, 'BEFORE', 'reference-before', results);
  await capture(browser, localBase, 'AFTER', 'after-local', results);
  await browser.close();
  await writeFile(resultsPath, JSON.stringify({ ...meta, capturedAt: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify({ ok: true, ...meta, resultsPath }, null, 2));
} finally {
  if (srv) srv.kill('SIGTERM');
}
