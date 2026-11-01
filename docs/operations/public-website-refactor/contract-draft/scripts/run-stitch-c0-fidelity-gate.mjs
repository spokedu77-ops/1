/**
 * Stitch static code.html vs Next.js — same capture profile as baseline gate (DPR2, scale device).
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
const BASE_URL = process.env.STITCH_C0_BASE_URL ?? 'http://127.0.0.1:3010';

const PAGES = [
  { folder: 'home_spomove', nextPath: '/', cssWidth: 1179, dpr: 2 },
  { folder: 'education_programs_spomove', nextPath: '/education', cssWidth: 1280, dpr: 2 },
  { folder: 'private_lesson_spomove', nextPath: '/private', cssWidth: 1280, dpr: 2 },
  { folder: 'spomove_system_spomove', nextPath: '/spomove', cssWidth: 1232, dpr: 2 },
  { folder: 'field_records_spomove', nextPath: '/records', cssWidth: 1280, dpr: 2 },
  { folder: 'about_spomove', nextPath: '/about', cssWidth: 1280, dpr: 2 },
];

const PROBE_SELECTORS = [
  { key: 'header', sel: 'header' },
  { key: 'h1', sel: 'main h1' },
  { key: 'heroImg', sel: 'main section img' },
  { key: 'footer', sel: 'footer' },
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

async function computePixelDiff(refPath, renPath, diffPath, compareW, compareH) {
  const refRaw = await sharp(refPath)
    .extract({ left: 0, top: 0, width: compareW, height: compareH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const renRaw = await sharp(renPath)
    .resize(compareW, compareH, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const diff = Buffer.alloc(compareW * compareH * 4);
  let mismatches = 0;
  const threshold = 18;
  for (let i = 0; i < compareW * compareH; i++) {
    const ri = i * 4;
    const delta =
      (Math.abs(refRaw.data[ri] - renRaw[ri]) +
        Math.abs(refRaw.data[ri + 1] - renRaw[ri + 1]) +
        Math.abs(refRaw.data[ri + 2] - renRaw[ri + 2])) /
      3;
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
  await sharp(diff, { raw: { width: compareW, height: compareH, channels: 4 } }).png().toFile(diffPath);
  return { mismatches, pixels: compareW * compareH, ratio: mismatches / (compareW * compareH) };
}

async function makeOverlay(refPath, renPath, outPath, compareH, compareW) {
  const refBuf = await sharp(refPath).extract({ left: 0, top: 0, width: compareW, height: compareH }).png().toBuffer();
  const renBuf = await sharp(renPath).extract({ left: 0, top: 0, width: compareW, height: compareH }).png().toBuffer();
  await sharp(renBuf).composite([{ input: refBuf, blend: 'over', opacity: 0.45 }]).png().toFile(outPath);
}

async function captureAndProbe(url, profile, outPath, isNext) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: profile.cssWidth, height: 900 },
    deviceScaleFactor: profile.dpr,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;}',
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((i) => !i.complete)
        .map((i) => new Promise((r) => { i.onload = r; i.onerror = r; })),
    );
  });
  await page.waitForTimeout(4000);
  if (isNext) {
    await page.evaluate(() => {
      window.tailwind?.refresh?.();
    });
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.screenshot({ path: outPath, fullPage: true, scale: 'device' });

  const probe = await page.evaluate(
    ({ selectors, dpr, isNextPage }) => {
      const px = (r) => ({
        x: Math.round(r.x * dpr),
        y: Math.round(r.y * dpr),
        w: Math.round(r.width * dpr),
        h: Math.round(r.height * dpr),
      });
      const boxes = {};
      for (const { key, sel } of selectors) {
        const el = document.querySelector(sel);
        if (!el) {
          boxes[key] = null;
          continue;
        }
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        boxes[key] = {
          rect: px(r),
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily?.slice(0, 60),
          color: cs.color,
          backgroundColor: cs.backgroundColor,
        };
      }
      const imgs = [...document.images].map((img) => ({
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        display: getComputedStyle(img).display,
      }));
      return {
        innerWidth: window.innerWidth,
        dpr: window.devicePixelRatio,
        scrollHeight: document.documentElement.scrollHeight,
        fontsStatus: document.fonts?.status,
        imagesPending: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
        imagesTotal: imgs.length,
        svgCount: document.querySelectorAll('svg').length,
        canvasCount: document.querySelectorAll('canvas').length,
        stitchRoot: !!document.querySelector('.stitch-c0-root'),
        boxes,
        isNextPage,
      };
    },
    { selectors: PROBE_SELECTORS, dpr: profile.dpr, isNextPage: isNext },
  );

  const meta = await sharp(outPath).metadata();
  await context.close();
  await browser.close();
  return { meta, probe, consoleErrors };
}

function compareBoxes(refBoxes, nextBoxes) {
  const deltas = [];
  for (const key of Object.keys(refBoxes)) {
    const r = refBoxes[key];
    const n = nextBoxes[key];
    if (!r && !n) continue;
    if (!r || !n) {
      deltas.push({ key, issue: r ? 'missing_on_next' : 'extra_on_next' });
      continue;
    }
    const dr = r.rect;
    const dn = n.rect;
    deltas.push({
      key,
      dx: dn.x - dr.x,
      dy: dn.y - dr.y,
      dw: dn.w - dr.w,
      dh: dn.h - dr.h,
      fontSizeRef: r.fontSize,
      fontSizeNext: n.fontSize,
      fontWeightRef: r.fontWeight,
      fontWeightNext: n.fontWeight,
      colorRef: r.color,
      colorNext: n.color,
    });
  }
  return deltas;
}

function pageVerdict(r) {
  const geomOk = Math.abs(r.widthDelta) <= 2 && Math.abs(r.heightDelta) <= 80;
  const diffOk = r.diff.ratio < 0.05;
  const imgsOk = (r.nextMetrics?.imagesPending ?? 0) === 0;
  const bboxOk = r.boxDeltas.every(
    (d) =>
      !d.issue &&
      Math.abs(d.dx ?? 0) <= 4 &&
      Math.abs(d.dy ?? 0) <= 8 &&
      Math.abs(d.dw ?? 0) <= 6 &&
      Math.abs(d.dh ?? 0) <= 6,
  );
  if (geomOk && diffOk && imgsOk && bboxOk && r.missingGraphics.length === 0) return 'PASS';
  if (geomOk && r.diff.ratio < 0.12 && r.missingGraphics.length === 0) return 'PARTIAL';
  return 'FAIL';
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { server, port } = await startStaticServer(STITCH_ROOT);
  const results = [];
  try {
    for (const p of PAGES) {
      const dir = path.join(OUT, p.folder);
      fs.mkdirSync(dir, { recursive: true });
      const refUrl = `http://127.0.0.1:${port}/${p.folder}/code.html`;
      const nextUrl = `${BASE_URL}${p.nextPath}`;
      const refPng = path.join(dir, '01-stitch-static.png');
      const nextPng = path.join(dir, '02-nextjs.png');
      const diffOut = path.join(dir, '03-pixel-diff.png');
      const overlayPng = path.join(dir, '04-overlay.png');

      const refCap = await captureAndProbe(refUrl, p, refPng, false);
      const nextCap = await captureAndProbe(nextUrl, p, nextPng, true);

      const compareW = Math.min(refCap.meta.width ?? 0, nextCap.meta.width ?? 0);
      const compareH = Math.min(refCap.meta.height ?? 0, nextCap.meta.height ?? 0);
      const diff = await computePixelDiff(refPng, nextPng, diffOut, compareW, compareH);
      await makeOverlay(refPng, nextPng, overlayPng, Math.min(compareH, 4000), compareW);

      const boxDeltas = compareBoxes(refCap.probe.boxes, nextCap.probe.boxes);
      const missingGraphics = [];
      if ((refCap.probe.svgCount ?? 0) > (nextCap.probe.svgCount ?? 0)) {
        missingGraphics.push(`svg ref ${refCap.probe.svgCount} vs next ${nextCap.probe.svgCount}`);
      }
      if ((refCap.probe.canvasCount ?? 0) > (nextCap.probe.canvasCount ?? 0)) {
        missingGraphics.push(`canvas ref ${refCap.probe.canvasCount} vs next ${nextCap.probe.canvasCount}`);
      }
      if (!nextCap.probe.stitchRoot) missingGraphics.push('missing .stitch-c0-root on Next');

      const styleConflicts = boxDeltas.filter(
        (d) => d.fontSizeRef && d.fontSizeNext && d.fontSizeRef !== d.fontSizeNext,
      );

      results.push({
        folder: p.folder,
        nextPath: p.nextPath,
        ref: refCap.meta,
        next: nextCap.meta,
        widthDelta: (nextCap.meta.width ?? 0) - (refCap.meta.width ?? 0),
        heightDelta: (nextCap.meta.height ?? 0) - (refCap.meta.height ?? 0),
        refMetrics: {
          scrollHeight: refCap.probe.scrollHeight,
          dpr: refCap.probe.dpr,
        },
        nextMetrics: {
          scrollHeight: nextCap.probe.scrollHeight,
          dpr: nextCap.probe.dpr,
          imagesPending: nextCap.probe.imagesPending,
          fontsStatus: nextCap.probe.fontsStatus,
        },
        diff,
        boxDeltas,
        styleConflicts,
        missingGraphics,
        nextConsoleErrors: nextCap.consoleErrors.slice(0, 5),
        pageVerdict: null,
      });
      results[results.length - 1].pageVerdict = pageVerdict(results[results.length - 1]);
    }
  } finally {
    server.close();
  }

  const allPass = results.every((r) => r.pageVerdict === 'PASS');
  const verdict = allPass ? 'STITCH_NEXTJS_FIDELITY_PASS' : 'STITCH_NEXTJS_FIDELITY_PARTIAL';

  const md = [];
  md.push('# Stitch C0 — Next.js fidelity gate');
  md.push('');
  md.push(`**Verdict:** \`${verdict}\``);
  md.push(`**Next base URL:** ${BASE_URL}`);
  md.push(`**Capture:** Playwright Chromium, DPR 2, \`scale: device\`, fonts.ready + images`);
  md.push('');
  md.push('| Page | Verdict | Ref WxH | Next WxH | Diff % | H Δ |');
  md.push('|------|---------|---------|----------|--------|-----|');
  for (const r of results) {
    md.push(
      `| ${r.folder} | ${r.pageVerdict} | ${r.ref.width}×${r.ref.height} | ${r.next.width}×${r.next.height} | ${(r.diff.ratio * 100).toFixed(2)}% | ${r.heightDelta} |`,
    );
  }
  md.push('');
  for (const r of results) {
    md.push(`## ${r.folder}`);
    md.push(`- **Evidence:** \`stitch-c0-fidelity/${r.folder}/\` → 01–04 PNG`);
    md.push(`- **Box deltas:** ${JSON.stringify(r.boxDeltas)}`);
    if (r.styleConflicts.length) md.push(`- **Computed style diffs:** ${JSON.stringify(r.styleConflicts)}`);
    if (r.missingGraphics.length) md.push(`- **Missing graphics:** ${r.missingGraphics.join('; ')}`);
    if (r.nextConsoleErrors.length) md.push(`- **Console errors:** ${r.nextConsoleErrors.join(' | ')}`);
    md.push('');
  }

  fs.writeFileSync(path.join(OUT, 'STITCH_C0_FIDELITY_REPORT.md'), md.join('\n'), 'utf8');
  fs.writeFileSync(
    path.join(OUT, 'SUMMARY.json'),
    JSON.stringify({ verdict, baseUrl: BASE_URL, chromium: 'playwright', results }, null, 2),
    'utf8',
  );
  console.log(JSON.stringify({ verdict, results: results.map((r) => ({ folder: r.folder, v: r.pageVerdict, diff: r.diff.ratio })) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
