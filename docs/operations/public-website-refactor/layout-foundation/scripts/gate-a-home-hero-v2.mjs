#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from '../../scripts/capture-page-utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const foundation = path.join(here, '..');
const repo = path.resolve(here, '../../../../..');
const outDir =
  process.env.GATE_A_OUTPUT_DIR ??
  path.join(process.env.USERPROFILE ?? '', 'Downloads', 'SPOKEDU_GATE_A_PO_HERO_REWORK_V2');
const port = process.env.GATE_A_PORT ?? '3076';
const base = `http://127.0.0.1:${port}`;

const METRIC_WIDTHS = [390, 941, 1023, 1024, 1100, 1199, 1200, 1440];
const CTA_FOLD_HEIGHT = 900;
const CTA_FOLD_HEIGHT_TABLET = 768;
const CTA_BOTTOM_MAX = 750;

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

async function sha256File(fp) {
  const buf = await readFile(fp);
  return createHash('sha256').update(buf).digest('hex');
}

let srv;
try {
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join(outDir, 'AFTER_V2'), { recursive: true });
  await mkdir(path.join(outDir, 'BEFORE_ref'), { recursive: true });

  const buildId = (await readFile(path.join(repo, '.next/BUILD_ID'), 'utf8')).trim();
  const head = spawnSync('git rev-parse HEAD', { cwd: repo, shell: true, encoding: 'utf8' }).stdout.trim();

  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitServer();
  const browser = await chromium.launch();

  const metricsRows = [];
  const ctaRows = [];

  for (const w of METRIC_WIDTHS) {
    for (const foldH of [CTA_FOLD_HEIGHT, ...(w === 1023 ? [CTA_FOLD_HEIGHT_TABLET] : [])]) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: w, height: foldH });
      await stabilizePublicPage(page, `${base}/`);
      const m = await page.evaluate(() => {
        const grid = document.querySelector('[class*="heroGrid"]');
        const h1 = document.querySelector('#home-hero-heading');
        const ctas = [...document.querySelectorAll('[class*="heroActions"] a')];
        const gridStyle = grid ? window.getComputedStyle(grid) : null;
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right };
        };
        const usable = (el) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          const st = window.getComputedStyle(el);
          return r.width >= 24 && r.height >= 24 && st.visibility !== 'hidden' && Number(st.opacity) > 0.05;
        };
        const doc = document.documentElement;
        return {
          gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
          gridTemplateAreas: gridStyle?.gridTemplateAreas ?? null,
          horizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
          scrollDelta: doc.scrollWidth - doc.clientWidth,
          heroCopy: box(document.querySelector('[class*="heroCopy"]')),
          heroVisual: box(document.querySelector('[class*="heroVisual"]')),
          ctas: ctas.map((a, i) => ({
            index: i,
            href: a.getAttribute('href'),
            text: a.textContent?.trim(),
            box: box(a),
            usable: usable(a),
            tabIndex: a.tabIndex,
          })),
          h1: box(h1),
        };
      });

      metricsRows.push({ viewport: w, foldHeight: foldH, ...m });

      const foldLimit = Math.min(CTA_BOTTOM_MAX, foldH);
      const bothInFold =
        m.ctas.length >= 2 &&
        m.ctas.every(
          (c) => c.usable && c.box && c.box.y >= 0 && c.box.bottom <= foldLimit && c.box.bottom <= foldH,
        );
      const pass1024band =
        w < 1024 || w > 1199 ? null : bothInFold && !m.horizontalOverflow;

      ctaRows.push({
        viewport: w,
        foldHeight: foldH,
        ctaBottomMaxTarget: CTA_BOTTOM_MAX,
        ctas: m.ctas,
        bothCtasInFoldTarget: w >= 1024 && w <= 1199 ? bothInFold : null,
        pass: w >= 1024 && w <= 1199 ? bothInFold && !m.horizontalOverflow : true,
        horizontalOverflow: m.horizontalOverflow,
        scrollDeltaPx: m.scrollDelta,
      });

      if (foldH === CTA_FOLD_HEIGHT) {
        const shot = path.join(outDir, 'AFTER_V2', `home-${w}-fold.png`);
        await page.screenshot({ path: shot, fullPage: false });
      }
      await page.close();
    }
  }

  await browser.close();

  const beforeManifest = JSON.parse(
    await readFile(path.join(foundation, 'CAPTURE_MANIFEST_BEFORE.json'), 'utf8'),
  );
  const shaManifest = { buildId, gitHead: head, generatedAt: new Date().toISOString(), files: [] };

  for (const w of METRIC_WIDTHS) {
    const be = beforeManifest.entries.find((e) => e.route === '/' && e.viewport === w);
    const v2File = `home-${w}-fold.png`;
    const v2Path = path.join(outDir, 'AFTER_V2', v2File);
    const beforeSrc = be
      ? path.join(foundation, 'BEFORE_AFTER/BEFORE', be.foldFile)
      : null;
    const beforeDest = path.join(outDir, 'BEFORE_ref', v2File);
    if (beforeSrc) {
      await copyFile(beforeSrc, beforeDest);
      shaManifest.files.push({
        role: 'BEFORE_ref',
        file: v2File,
        sha256: await sha256File(beforeDest),
        manifestSha256: be.foldSha256,
      });
    }
    shaManifest.files.push({
      role: 'AFTER_V2',
      file: v2File,
      sha256: await sha256File(v2Path),
    });
  }

  await writeFile(path.join(outDir, 'HERO_METRICS_V2.json'), JSON.stringify({ buildId, head, rows: metricsRows }, null, 2));
  await writeFile(
    path.join(outDir, 'HOME_HERO_CTA_FOLD_QA.json'),
    JSON.stringify(
      {
        buildId,
        head,
        foldHeightPrimary: CTA_FOLD_HEIGHT,
        ctaBottomMaxTarget: CTA_BOTTOM_MAX,
        passCount: ctaRows.filter((r) => r.pass).length,
        failCount: ctaRows.filter((r) => !r.pass).length,
        results: ctaRows,
      },
      null,
      2,
    ),
  );
  await writeFile(path.join(outDir, 'SHA_MANIFEST_V2.json'), JSON.stringify(shaManifest, null, 2));

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>BEFORE vs AFTER V2</title>
<style>body{font-family:system-ui;margin:20px;background:#f4f6f9}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}img{width:100%;border:1px solid #ccc;border-radius:8px}h2{font-size:1rem}</style></head><body>
<h1>Home Hero — BEFORE (ref) vs AFTER V2</h1>
<p>Build ${buildId} · HEAD ${head}</p>
${METRIC_WIDTHS.map(
  (w) => `<section><h2>${w}px fold</h2><div class="row">
<img src="BEFORE_ref/home-${w}-fold.png" alt="before ${w}"/>
<img src="AFTER_V2/home-${w}-fold.png" alt="after v2 ${w}"/>
</div></section>`,
).join('')}
</body></html>`;
  await writeFile(path.join(outDir, 'BEFORE_VS_V2.html'), html);

  console.log(JSON.stringify({ ok: true, outDir, ctaFail: ctaRows.filter((r) => !r.pass).length }, null, 2));
} finally {
  if (srv) {
    spawnSync(`taskkill /PID ${srv.pid} /T /F`, { shell: true, stdio: 'ignore' });
  }
}
