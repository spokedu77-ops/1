/**
 * STITCH_BASELINE_RENDER_GATE — isolated local render vs ZIP screen.png (no app/spokedu changes).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT = path.join(__dirname, '..');
const REPO = path.join(__dirname, '../../../../..');
const STITCH_ROOT = path.join(
  CONTRACT,
  'sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign',
);
const OUT = path.join(CONTRACT, 'stitch-baseline-render');
const EVIDENCE = path.join(OUT, 'evidence');

/** CSS viewport + DPR aligned to Stitch screen.png pixel dimensions (ref_w ≈ css_w × DPR). */
const CAPTURE_PROFILE = {
  home_spomove: { cssWidth: 1179, deviceScaleFactor: 2 },
  education_programs_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
  private_lesson_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
  spomove_system_spomove: { cssWidth: 1232, deviceScaleFactor: 2 },
  field_records_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
  about_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
};

const PAGES = [
  { folder: 'home_spomove', route: '/' },
  { folder: 'education_programs_spomove', route: '/education' },
  { folder: 'private_lesson_spomove', route: '/private' },
  { folder: 'spomove_system_spomove', route: '/spomove' },
  { folder: 'field_records_spomove', route: '/records' },
  { folder: 'about_spomove', route: '/about' },
];

const HERO_BAND_CSS_PX = 1200;

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
      if (urlPath === '/') urlPath = '/index.html';
      const abs = path.normalize(path.join(root, urlPath.replace(/^\//, '')));
      if (!abs.startsWith(path.normalize(root))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(abs).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
      fs.createReadStream(abs).pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function diffPng(refPath, renderPath, diffPath, { width, height }) {
  const refRaw = await sharp(refPath)
    .extract({ left: 0, top: 0, width, height: Math.min(height, (await sharp(refPath).metadata()).height) })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const h = refRaw.info.height;
  const w = refRaw.info.width;
  const renRaw = await sharp(renderPath)
    .resize(w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const diff = Buffer.alloc(w * h * 4);
  let mismatches = 0;
  const threshold = 18;
  for (let i = 0; i < w * h; i++) {
    const ri = i * 4;
    const dr = Math.abs(refRaw.data[ri] - renRaw[ri]);
    const dg = Math.abs(refRaw.data[ri + 1] - renRaw[ri + 1]);
    const db = Math.abs(refRaw.data[ri + 2] - renRaw[ri + 2]);
    const delta = (dr + dg + db) / 3;
    if (delta > threshold) {
      mismatches++;
      diff[ri] = 255;
      diff[ri + 1] = 0;
      diff[ri + 2] = 80;
      diff[ri + 3] = 255;
    } else {
      diff[ri] = Math.floor(refRaw.data[ri] * 0.25);
      diff[ri + 1] = Math.floor(refRaw.data[ri + 1] * 0.25);
      diff[ri + 2] = Math.floor(refRaw.data[ri + 2] * 0.25);
      diff[ri + 3] = 180;
    }
  }
  await sharp(diff, { raw: { width: w, height: h, channels: 4 } }).png().toFile(diffPath);
  const ratio = mismatches / (w * h);
  return { mismatches, pixels: w * h, mismatchRatio: ratio, compareWidth: w, compareHeight: h };
}

async function waitForFontsAndImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images];
    await Promise.all(
      imgs
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
        ),
    );
  });
}

async function collectDomMetrics(page) {
  return page.evaluate(() => {
    const imgs = [...document.images];
    const loaded = imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
    const pending = imgs.length - loaded;
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      fontFaces: document.fonts?.size ?? null,
      fontsStatus: document.fonts?.status ?? null,
      imagesTotal: imgs.length,
      imagesLoaded: loaded,
      imagesPending: pending,
    };
  });
}

async function capturePage(pageUrl, refMeta, refPath, outPath, profile) {
  const browser = await chromium.launch({ headless: true });
  try {
    const { cssWidth, deviceScaleFactor } = profile;
    const context = await browser.newContext({
      viewport: { width: cssWidth, height: 900 },
      deviceScaleFactor,
    });
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: 'light' });
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const failedRequests = [];
    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
    });
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 180000 });
    await waitForFontsAndImages(page);
    await page.waitForTimeout(1500);
    const domMetrics = await collectDomMetrics(page);
    const expectedPngWidth = cssWidth * deviceScaleFactor;
    const expectedPngHeight = domMetrics.scrollHeight * deviceScaleFactor;

    await page.screenshot({ path: outPath, fullPage: true, scale: 'device' });
    const topPath = outPath.replace('02-local-render.png', '04-viewport-top.png');
    await page.evaluate(() => window.scrollTo(0, 0));
    const topClipH = Math.min(HERO_BAND_CSS_PX, domMetrics.scrollHeight);
    await page.screenshot({
      path: topPath,
      clip: { x: 0, y: 0, width: cssWidth, height: topClipH },
      scale: 'device',
    });
    const renderMeta = await sharp(outPath).metadata();
    const topMeta = await sharp(topPath).metadata();
    const topDiffPath = outPath.replace('02-local-render.png', '05-viewport-top-diff.png');
    const topCompareH = Math.min(
      HERO_BAND_CSS_PX * deviceScaleFactor,
      refMeta.height ?? 0,
      topMeta.height ?? 0,
      renderMeta.height ?? 0,
    );
    let topDiff = null;
    if (topCompareH > 100) {
      const refTop = path.join(path.dirname(outPath), '04-ref-top-crop.png');
      await sharp(refPath).extract({ left: 0, top: 0, width: refMeta.width, height: topCompareH }).toFile(refTop);
      topDiff = await diffPng(refTop, topPath, topDiffPath, { width: refMeta.width, height: topCompareH });
    }
    await context.close();
    return {
      consoleErrors,
      failedRequests,
      renderMeta,
      topMeta,
      topDiff,
      cssWidth,
      deviceScaleFactor,
      domMetrics,
      expectedPngWidth,
      expectedPngHeight,
      captureScale: 'device',
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const hashBefore = {};
  for (const p of PAGES) {
    const htmlPath = path.join(STITCH_ROOT, p.folder, 'code.html');
    hashBefore[p.folder] = sha256File(htmlPath);
  }

  const { server, baseUrl } = await startStaticServer(STITCH_ROOT);
  const results = [];

  try {
    for (const p of PAGES) {
      const dir = path.join(EVIDENCE, p.folder);
      fs.mkdirSync(dir, { recursive: true });
      const refPath = path.join(STITCH_ROOT, p.folder, 'screen.png');
      const refCopy = path.join(dir, '01-stitch-reference.png');
      fs.copyFileSync(refPath, refCopy);

      const refMeta = await sharp(refPath).metadata();
      const url = `${baseUrl}/${p.folder}/code.html`;
      const renderPath = path.join(dir, '02-local-render.png');
      const profile = CAPTURE_PROFILE[p.folder];
      const capture = await capturePage(url, refMeta, refPath, renderPath, profile);

      const renderMeta = capture.renderMeta;
      const heightDelta = Math.abs((renderMeta.height ?? 0) - (refMeta.height ?? 0));
      const widthDelta = Math.abs((renderMeta.width ?? 0) - (refMeta.width ?? 0));
      const cssScrollHeight = capture.domMetrics.scrollHeight;
      const refImpliedCssH = (refMeta.height ?? 0) / profile.deviceScaleFactor;
      const cssHeightDelta = Math.abs(cssScrollHeight - refImpliedCssH);

      const compareHeight = Math.min(refMeta.height ?? 0, renderMeta.height ?? 0);
      const diffPath = path.join(dir, '03-pixel-diff.png');
      const diff = await diffPng(refPath, renderPath, diffPath, {
        width: refMeta.width,
        height: compareHeight,
      });

      const structural = [];
      if (widthDelta > 2) {
        structural.push(
          `PNG width delta ${widthDelta}px (ref ${refMeta.width} vs render ${renderMeta.width}; expected ${capture.expectedPngWidth})`,
        );
      }
      if (heightDelta > 80) {
        structural.push(
          `PNG height delta ${heightDelta}px (ref ${refMeta.height} vs render ${renderMeta.height}; CSS scroll ${cssScrollHeight}×DPR${profile.deviceScaleFactor}≈${Math.round(capture.expectedPngHeight)})`,
        );
      }
      if (cssHeightDelta > 60) {
        structural.push(
          `CSS scrollHeight delta ${Math.round(cssHeightDelta)}px (DOM ${cssScrollHeight} vs ref-implied ${Math.round(refImpliedCssH)})`,
        );
      }
      if (capture.failedRequests.length) {
        structural.push(`Failed network: ${capture.failedRequests.slice(0, 5).map((r) => r.url).join('; ')}`);
      }

      const issues = [];
      if (diff.mismatchRatio > 0.08) issues.push('High pixel mismatch (>8%) — likely CDN images/fonts or environment drift');
      else if (diff.mismatchRatio > 0.03) issues.push('Moderate pixel mismatch (3–8%) — review diff overlay');
      if (capture.consoleErrors.length) issues.push(`Console errors: ${capture.consoleErrors.slice(0, 3).join(' | ')}`);

      results.push({
        folder: p.folder,
        route: p.route,
        ref: { w: refMeta.width, h: refMeta.height },
        render: { w: renderMeta.width, h: renderMeta.height },
        captureProfile: profile,
        domMetrics: capture.domMetrics,
        expectedPng: { w: capture.expectedPngWidth, h: Math.round(capture.expectedPngHeight) },
        captureScale: capture.captureScale,
        cssWidth: capture.cssWidth,
        deviceScaleFactor: capture.deviceScaleFactor,
        cssScrollHeight,
        diff,
        topDiff: capture.topDiff,
        structural,
        issues,
        failedRequests: capture.failedRequests,
        htmlSha256: hashBefore[p.folder],
        screenSha256: sha256File(refPath),
      });
    }
  } finally {
    server.close();
  }

  for (const p of PAGES) {
    const htmlPath = path.join(STITCH_ROOT, p.folder, 'code.html');
    const after = sha256File(htmlPath);
    if (after !== hashBefore[p.folder]) throw new Error(`Stitch HTML modified: ${p.folder}`);
  }

  const missingStructural = results.filter((r) => r.structural.some((s) => s.includes('Failed network')));
  const geometryOk = results.every(
    (r) => Math.abs(r.render.w - r.ref.w) <= 2 && Math.abs(r.render.h - r.ref.h) <= 80,
  );
  const heroOk = results.every((r) => !r.topDiff || r.topDiff.mismatchRatio < 0.05);
  const noStructuralFlags = results.every((r) => r.structural.length === 0);

  const pass =
    results.length === 6 &&
    results.every((r) => r.render.h > 500) &&
    geometryOk &&
    noStructuralFlags &&
    missingStructural.length === 0 &&
    heroOk &&
    results.every((r) => r.domMetrics.imagesPending === 0);

  const verdict = pass ? 'STITCH_BASELINE_RENDER_PASS' : 'STITCH_BASELINE_RENDER_PARTIAL';

  const correctionMd = [];
  correctionMd.push('## Capture environment correction (CSS viewport + DPR 2, `scale: device`)');
  correctionMd.push('');
  correctionMd.push(`**Verdict (this run):** \`${verdict}\``);
  correctionMd.push(`**Run at:** ${new Date().toISOString()}`);
  correctionMd.push('');
  correctionMd.push('### DPR / viewport hypothesis');
  correctionMd.push('');
  correctionMd.push(
    'Prior run used **CSS viewport width = reference PNG width** with `scale: css`, which matched **DPR 1 at 2560px CSS** while Stitch `screen.png` is **device pixels at ~1280 CSS × DPR 2**. Education / Private / Records showed **exact 2× height ratio** — consistent with that mismatch, not HTML layout drift.',
  );
  correctionMd.push('');
  correctionMd.push('### DOM probe (after networkidle + fonts.ready + images)');
  correctionMd.push('');
  correctionMd.push(
    '| Page | CSS W | DPR | innerWidth | scrollHeight | Expected PNG W×H | Actual PNG W×H | Imgs pending |',
  );
  correctionMd.push('|------|-------|-----|------------|--------------|------------------|----------------|--------------|');
  for (const r of results) {
    const m = r.domMetrics;
    correctionMd.push(
      `| ${r.folder} | ${r.captureProfile.cssWidth} | ${r.captureProfile.deviceScaleFactor} | ${m.innerWidth} | ${m.scrollHeight} | ${r.expectedPng.w}×${r.expectedPng.h} | ${r.render.w}×${r.render.h} | ${m.imagesPending} |`,
    );
  }
  correctionMd.push('');
  correctionMd.push('### Summary (aligned capture)');
  correctionMd.push('');
  correctionMd.push('| Page | Ref WxH | Render WxH | Full mismatch % | Hero band % | Structural |');
  correctionMd.push('|------|---------|------------|-----------------|-------------|------------|');
  for (const r of results) {
    correctionMd.push(
      `| ${r.folder} | ${r.ref.w}×${r.ref.h} | ${r.render.w}×${r.render.h} | ${(r.diff.mismatchRatio * 100).toFixed(2)}% | ${r.topDiff ? (r.topDiff.mismatchRatio * 100).toFixed(2) : '—'}% | ${r.structural[0] ?? '—'} |`,
    );
  }
  correctionMd.push('');
  for (const r of results) {
    correctionMd.push(`#### ${r.folder}`);
    correctionMd.push('');
    correctionMd.push(
      `- **Capture:** viewport ${r.captureProfile.cssWidth}×900, DPR ${r.captureProfile.deviceScaleFactor}, \`scale: device\`, fonts \`${r.domMetrics.fontsStatus}\`, images ${r.domMetrics.imagesLoaded}/${r.domMetrics.imagesTotal}`,
    );
    correctionMd.push(`- **Full-page pixel diff:** ${(r.diff.mismatchRatio * 100).toFixed(2)}%`);
    if (r.topDiff) correctionMd.push(`- **Hero band diff:** ${(r.topDiff.mismatchRatio * 100).toFixed(2)}%`);
    if (r.structural.length) {
      correctionMd.push('- **Structural:**');
      for (const s of r.structural) correctionMd.push(`  - ${s}`);
    }
    if (r.issues.length) {
      correctionMd.push('- **Residual (pixel / CDN):**');
      for (const s of r.issues) correctionMd.push(`  - ${s}`);
    }
    correctionMd.push('');
  }
  correctionMd.push('### PASS criteria (this correction run)');
  correctionMd.push('');
  correctionMd.push('| Criterion | Status |');
  correctionMd.push('|-----------|--------|');
  correctionMd.push(`| 6/6 render success | ${results.every((r) => r.render.h > 500) ? 'YES' : 'NO'} |`);
  correctionMd.push(`| PNG W×H vs ref (±2px W, ±80px H) | ${geometryOk ? 'YES' : 'NO'} |`);
  correctionMd.push(`| No geometry structural flags | ${noStructuralFlags ? 'YES' : 'NO'} |`);
  correctionMd.push(`| Hero band diff < 5% each | ${heroOk ? 'YES' : 'NO'} |`);
  correctionMd.push(`| Images pending at capture | ${results.every((r) => r.domMetrics.imagesPending === 0) ? '0' : 'FAIL'} |`);
  correctionMd.push(`| HTML unmodified | YES |`);
  correctionMd.push(`| **Overall** | **${verdict}** — pixel % alone does not grant PASS; side-by-side required |`);
  correctionMd.push('');
  correctionMd.push(
    '> **10 000px ref height:** no Playwright clip cap observed when geometry matches; prior half-height was capture-env mismatch.',
  );

  const reportPath = path.join(OUT, 'STITCH_BASELINE_RENDER_REPORT.md');
  let reportBody = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '# STITCH baseline render gate\n';
  if (!reportBody.includes('**Verdict:**')) {
    reportBody = `# STITCH baseline render gate\n\n**Verdict:** \`${verdict}\` (see correction section)\n\n${reportBody.replace(/^# STITCH baseline render gate\n+/i, '')}`;
  } else {
    reportBody = reportBody.replace(/\*\*Verdict:\*\* `STITCH_BASELINE_RENDER_[A-Z]+`/, `**Verdict:** \`${verdict}\``);
  }
  const sectionRe = /## Capture environment correction[\s\S]*?(?=\n## [^#]|$)/;
  if (sectionRe.test(reportBody)) {
    reportBody = reportBody.replace(sectionRe, `${correctionMd.join('\n')}\n`);
  } else {
    reportBody = `${reportBody.trim()}\n\n${correctionMd.join('\n')}\n`;
  }

  fs.writeFileSync(reportPath, reportBody, 'utf8');
  fs.writeFileSync(
    path.join(OUT, 'STITCH_BASELINE_RENDER_SUMMARY.json'),
    JSON.stringify(
      {
        verdict,
        captureMode: 'css_viewport_dpr2_scale_device',
        results: results.map(({ failedRequests, ...rest }) => rest),
      },
      null,
      2,
    ),
    'utf8',
  );
  fs.writeFileSync(
    path.join(OUT, 'CAPTURE_ENV_PROBE.json'),
    JSON.stringify(
      results.map((r) => ({
        folder: r.folder,
        profile: r.captureProfile,
        domMetrics: r.domMetrics,
        expectedPng: r.expectedPng,
        actualPng: r.render,
        topDiffRatio: r.topDiff?.mismatchRatio ?? null,
        fullDiffRatio: r.diff.mismatchRatio,
      })),
      null,
      2,
    ),
    'utf8',
  );
  fs.writeFileSync(
    path.join(OUT, 'STITCH_HTML_SHA256_MANIFEST.json'),
    JSON.stringify(
      results.map((r) => ({
        folder: r.folder,
        code_html_sha256: r.htmlSha256,
        screen_png_sha256: r.screenSha256,
      })),
      null,
      2,
    ),
    'utf8',
  );

  console.log(JSON.stringify({ verdict, results: results.map((r) => ({ folder: r.folder, mismatch: r.diff.mismatchRatio, h: r.render.h })) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
