/**
 * Targeted visual diagnosis — uses existing evidence PNGs + optional DOM probe (no HTML edits).
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
const OUT = path.join(CONTRACT, 'stitch-baseline-render');
const EVIDENCE = path.join(OUT, 'evidence');
const DIAG = path.join(OUT, 'diagnosis');

const CAPTURE_PROFILE = {
  home_spomove: { cssWidth: 1179, deviceScaleFactor: 2 },
  education_programs_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
  private_lesson_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
  spomove_system_spomove: { cssWidth: 1232, deviceScaleFactor: 2 },
  field_records_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
  about_spomove: { cssWidth: 1280, deviceScaleFactor: 2 },
};

const FOCUS = [
  'home_spomove',
  'about_spomove',
  'spomove_system_spomove',
  'education_programs_spomove',
  'private_lesson_spomove',
  'field_records_spomove',
];

function startStaticServer(root) {
  const server = http.createServer((req, res) => {
    try {
      let urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
      const abs = path.normalize(path.join(root, urlPath.replace(/^\//, '')));
      if (!abs.startsWith(path.normalize(root)) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      const ext = path.extname(abs).toLowerCase();
      const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png' };
      res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
      fs.createReadStream(abs).pipe(res);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function bandMismatch(refPath, renPath, top, height, width) {
  const refMeta = await sharp(refPath).metadata();
  const renMeta = await sharp(renPath).metadata();
  const w = Math.min(width, refMeta.width ?? 0, renMeta.width ?? 0);
  if (top + height > (refMeta.height ?? 0) || top + height > (renMeta.height ?? 0) || w < 10) {
    return { skipped: true, reason: 'out of bounds', top, height, w };
  }
  const refRaw = await sharp(refPath).extract({ left: 0, top, width: w, height }).ensureAlpha().raw().toBuffer();
  const renRaw = await sharp(renPath)
    .extract({ left: 0, top, width: w, height })
    .ensureAlpha()
    .raw()
    .toBuffer();
  let mismatches = 0;
  const threshold = 18;
  for (let i = 0; i < w * height; i++) {
    const ri = i * 4;
    const delta = (Math.abs(refRaw[ri] - renRaw[ri]) + Math.abs(refRaw[ri + 1] - renRaw[ri + 1]) + Math.abs(refRaw[ri + 2] - renRaw[ri + 2])) / 3;
    if (delta > threshold) mismatches++;
  }
  return { top, height, width: w, mismatches, pixels: w * height, ratio: mismatches / (w * height) };
}

async function makeOverlay(refPath, renPath, outPath, compareHeight, xOffset = 0) {
  const refMeta = await sharp(refPath).metadata();
  const renMeta = await sharp(renPath).metadata();
  const h = Math.min(compareHeight, refMeta.height ?? 0, renMeta.height ?? 0);
  const w = Math.min(refMeta.width ?? 0, renMeta.width ?? 0);
  const refBuf = await sharp(refPath).extract({ left: 0, top: 0, width: w, height: h }).png().toBuffer();
  let renExtract = sharp(renPath).extract({ left: Math.max(0, xOffset), top: 0, width: w, height: h });
  const renBuf = await renExtract.png().toBuffer();
  await sharp(renBuf)
    .composite([{ input: refBuf, blend: 'over', opacity: 0.45 }])
    .png()
    .toFile(outPath);
}

async function probeHomeElements(baseUrl, folder, profile) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: profile.cssWidth, height: 900 },
      deviceScaleFactor: profile.deviceScaleFactor,
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/${folder}/code.html`, { waitUntil: 'networkidle', timeout: 180000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const imgs = [...document.images];
      await Promise.all(
        imgs.filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = r; i.onerror = r; })),
      );
    });
    await page.waitForTimeout(800);
    const dpr = profile.deviceScaleFactor;
    const data = await page.evaluate((scale) => {
      const px = (r) => ({
        x: Math.round(r.x * scale),
        y: Math.round(r.y * scale),
        w: Math.round(r.width * scale),
        h: Math.round(r.height * scale),
      });
      const header = document.querySelector('header');
      const h1 = document.querySelector('main h1');
      const heroImg = document.querySelector('main section img');
      const heroSection = document.querySelector('main section');
      const imgs = [...document.images].map((img, idx) => {
        const r = img.getBoundingClientRect();
        const cs = getComputedStyle(img);
        return {
          idx,
          src: img.src.slice(0, 80),
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          display: cs.display,
          visibility: cs.visibility,
          opacity: cs.opacity,
          rect: px(r),
          inViewport: r.bottom > 0 && r.top < window.innerHeight,
        };
      });
      const h1Style = h1 ? getComputedStyle(h1) : null;
      return {
        innerWidth: window.innerWidth,
        dpr: window.devicePixelRatio,
        scrollHeight: document.documentElement.scrollHeight,
        header: header ? px(header.getBoundingClientRect()) : null,
        h1: h1
          ? {
              rect: px(h1.getBoundingClientRect()),
              textLines: h1.innerText.split('\n').length,
              fontSize: h1Style?.fontSize,
              fontWeight: h1Style?.fontWeight,
              lineHeight: h1Style?.lineHeight,
              fontFamily: h1Style?.fontFamily?.slice(0, 40),
            }
          : null,
        heroSection: heroSection ? px(heroSection.getBoundingClientRect()) : null,
        heroImg: heroImg
          ? {
              rect: px(heroImg.getBoundingClientRect()),
              complete: heroImg.complete,
              naturalWidth: heroImg.naturalWidth,
              naturalHeight: heroImg.naturalHeight,
              currentSrc: heroImg.currentSrc.slice(0, 100),
            }
          : null,
        images: imgs,
        pulseBadge: !!document.querySelector('.animate-pulse'),
      };
    }, dpr);
    await context.close();
    return data;
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(DIAG, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), pages: {} };

  for (const folder of FOCUS) {
    const dir = path.join(EVIDENCE, folder);
    const refPath = path.join(dir, '01-stitch-reference.png');
    const renPath = path.join(dir, '02-local-render.png');
    if (!fs.existsSync(refPath) || !fs.existsSync(renPath)) continue;

    const refMeta = await sharp(refPath).metadata();
    const renMeta = await sharp(renPath).metadata();
    const pageDiag = {
      ref: { w: refMeta.width, h: refMeta.height },
      render: { w: renMeta.width, h: renMeta.height },
      bands: [],
    };

    const bandStep = folder === 'home_spomove' ? 300 : 500;
    const bandH = folder === 'home_spomove' ? 300 : 500;
    const maxCompare =
      folder === 'spomove_system_spomove'
        ? Math.min(10000, refMeta.height ?? 0, renMeta.height ?? 0)
        : Math.min(refMeta.height ?? 0, renMeta.height ?? 0);

    let xOff = 0;
    if (folder === 'spomove_system_spomove' && (renMeta.width ?? 0) > (refMeta.width ?? 0)) {
      xOff = 0;
    }

    for (let top = 0; top + bandH <= maxCompare; top += bandStep) {
      const b = await bandMismatch(refPath, renPath, top, bandH, Math.min(refMeta.width ?? 0, renMeta.width ?? 0));
      if (!b.skipped) pageDiag.bands.push(b);
    }

    const diagDir = path.join(DIAG, folder);
    fs.mkdirSync(diagDir, { recursive: true });

    const overlayH = folder === 'home_spomove' ? 2400 : Math.min(4000, maxCompare);
    await makeOverlay(
      refPath,
      renPath,
      path.join(diagDir, 'overlay-top.png'),
      overlayH,
      xOff,
    );

    if (folder === 'home_spomove') {
      const heroBands = [];
      for (let top = 0; top < 2400; top += 200) {
        heroBands.push(await bandMismatch(refPath, renPath, top, 200, refMeta.width ?? 0));
      }
      pageDiag.heroBands200 = heroBands.filter((b) => !b.skipped);
      const heat = Buffer.alloc((refMeta.width ?? 0) * 2400 * 4);
      const refRaw = await sharp(refPath)
        .extract({ left: 0, top: 0, width: refMeta.width, height: 2400 })
        .ensureAlpha()
        .raw()
        .toBuffer();
      const renRaw = await sharp(renPath)
        .extract({ left: 0, top: 0, width: refMeta.width, height: 2400 })
        .ensureAlpha()
        .raw()
        .toBuffer();
      for (let i = 0; i < (refMeta.width ?? 0) * 2400; i++) {
        const ri = i * 4;
        const delta =
          (Math.abs(refRaw[ri] - renRaw[ri]) + Math.abs(refRaw[ri + 1] - renRaw[ri + 1]) + Math.abs(refRaw[ri + 2] - renRaw[ri + 2])) / 3;
        if (delta > 18) {
          heat[ri] = 255;
          heat[ri + 1] = 0;
          heat[ri + 2] = 100;
          heat[ri + 3] = 200;
        } else {
          heat[ri + 3] = 0;
        }
      }
      await sharp(heat, { raw: { width: refMeta.width, height: 2400, channels: 4 } })
        .png()
        .toFile(path.join(diagDir, 'hero-diff-heatmap-2400.png'));
    }

    if (folder === 'spomove_system_spomove') {
      const commonH = Math.min(10000, refMeta.height ?? 0, renMeta.height ?? 0);
      pageDiag.commonCaptureHeight = commonH;
      pageDiag.refHeightCapNote = (refMeta.height ?? 0) === 10000 ? 'ref_exactly_10000px' : null;
      pageDiag.fullWithinCommon = await bandMismatch(refPath, renPath, 0, commonH, refMeta.width ?? 0);
      const w1 = await bandMismatch(refPath, renPath, 0, 2400, refMeta.width ?? 0);
      pageDiag.heroWithinCommon = w1;
      if ((renMeta.width ?? 0) !== (refMeta.width ?? 0)) {
        pageDiag.widthOffsetTest = await bandMismatch(refPath, renPath, 0, 2400, refMeta.width ?? 0);
        pageDiag.widthDeltaPx = (renMeta.width ?? 0) - (refMeta.width ?? 0);
      }
    }

    if (folder === 'about_spomove') {
      pageDiag.heightDeltaPx = (renMeta.height ?? 0) - (refMeta.height ?? 0);
      const firstSpike = pageDiag.bands.find((b) => b.ratio > 0.04);
      pageDiag.firstBandAbove4Pct = firstSpike ?? null;
    }

    report.pages[folder] = pageDiag;
  }

  const { server, baseUrl } = await startStaticServer(STITCH_ROOT);
  try {
    report.pages.home_spomove = report.pages.home_spomove ?? {};
    report.pages.home_spomove.domProbe = await probeHomeElements(baseUrl, 'home_spomove', CAPTURE_PROFILE.home_spomove);
  } finally {
    server.close();
  }

  fs.writeFileSync(path.join(DIAG, 'VISUAL_DIAGNOSIS.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, (k, v) => (k === 'bands' && Array.isArray(v) ? `[${v.length} bands]` : v), 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
