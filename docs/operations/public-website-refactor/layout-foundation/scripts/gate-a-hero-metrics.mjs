#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from '../../scripts/capture-page-utils.mjs';
import { HERO_BREAKPOINT_WIDTHS } from './gate-a-qa-config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');
const repo = path.resolve(here, '../../../../..');
const phase = process.argv[2] === 'before' ? 'BEFORE' : 'AFTER';
const outJson = path.join(foundation, `HERO_BREAKPOINT_METRICS_${phase}.json`);
const port = process.env.GATE_A_PORT ?? (phase === 'BEFORE' ? '3074' : '3075');
const base = `http://127.0.0.1:${port}`;

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

let srv;
try {
  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitServer();
  const browser = await chromium.launch();
  const rows = [];

  for (const w of HERO_BREAKPOINT_WIDTHS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: w, height: 900 });
    await stabilizePublicPage(page, `${base}/`);
    const metrics = await page.evaluate(() => {
      const grid = document.querySelector('[class*="heroGrid"]');
      const h1 = document.querySelector('#home-hero-heading');
      const visual = document.querySelector('[class*="heroVisual"]');
      const img = visual?.querySelector('img');
      const cta = document.querySelector('[class*="heroActions"] a');
      const gridStyle = grid ? window.getComputedStyle(grid) : null;
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      return {
        gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
        gridTemplateAreas: gridStyle?.gridTemplateAreas ?? null,
        heroCopy: box(document.querySelector('[class*="heroCopy"]')),
        heroVisual: box(visual),
        heroImg: box(img),
        heroImgObjectPosition: img ? window.getComputedStyle(img).objectPosition : null,
        ctaPrimary: box(cta),
        h1Lines: h1 ? h1.getClientRects().length : 0,
      };
    });
    rows.push({ phase, viewport: w, ...metrics });
    await page.close();
  }
  await browser.close();
  await writeFile(outJson, JSON.stringify({ phase, capturedAt: new Date().toISOString(), rows }, null, 2));
  console.log(JSON.stringify({ ok: true, outJson, rows: rows.length }, null, 2));
} finally {
  if (srv) {
    if (process.platform === 'win32') {
      spawnSync(`taskkill /PID ${srv.pid} /T /F`, { shell: true, stdio: 'ignore' });
    } else {
      srv.kill('SIGTERM');
    }
  }
}
