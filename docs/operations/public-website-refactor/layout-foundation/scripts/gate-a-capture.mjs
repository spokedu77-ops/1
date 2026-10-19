#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from '../../scripts/capture-page-utils.mjs';
import { CAPTURE_VIEWPORTS } from './gate-a-qa-config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');
const repo = path.resolve(here, '../../../../..');
const phase = process.argv[2] === 'before' ? 'BEFORE' : 'AFTER';
const outDir = path.join(foundation, 'BEFORE_AFTER', phase);
const port = process.env.GATE_A_PORT ?? String(3070 + (phase === 'BEFORE' ? 0 : 1));
const base = `http://127.0.0.1:${port}`;

const routes = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/spomove/catalog',
  '/records',
  '/spokedu-lab',
  '/about',
  '/spomat',
  '/partners',
  '/contact',
];

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

function slug(route) {
  return route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
}

async function sha256File(filePath) {
  const buf = await readFile(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

let srv;
const manifest = [];

try {
  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitServer();
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();

  for (const route of routes) {
    for (const vp of CAPTURE_VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: vp.w, height: vp.h });
      const stability = await stabilizePublicPage(page, `${base}${route}`);
      const s = slug(route);
      const foldName = `${s}-${vp.tag}-fold.png`;
      const fullName = `${s}-${vp.tag}-full.png`;
      const foldPath = path.join(outDir, foldName);
      const fullPath = path.join(outDir, fullName);
      await page.screenshot({ path: foldPath, fullPage: false });
      await page.screenshot({ path: fullPath, fullPage: true });
      manifest.push({
        phase,
        route,
        viewport: vp.w,
        foldFile: foldName,
        foldSha256: await sha256File(foldPath),
        fullSha256: await sha256File(fullPath),
        imagesReady: stability.imagesReady,
        hiddenContentCount: stability.hiddenContentCount,
      });
      await page.close();
    }
  }
  await browser.close();

  const manifestPath = path.join(foundation, `CAPTURE_MANIFEST_${phase}.json`);
  await writeFile(manifestPath, JSON.stringify({ phase, port, base, entries: manifest }, null, 2));

  const pairs = manifest.filter((e) => e.route === '/');
  console.log(JSON.stringify({ ok: true, phase, outDir, port, homeEntries: pairs.length, manifestPath }, null, 2));
} finally {
  if (srv) {
    if (process.platform === 'win32') {
      spawnSync(`taskkill /PID ${srv.pid} /T /F`, { shell: true, stdio: 'ignore' });
    } else {
      srv.kill('SIGTERM');
    }
  }
}
