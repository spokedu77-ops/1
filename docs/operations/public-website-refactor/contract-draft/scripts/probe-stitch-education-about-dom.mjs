/**
 * Deep DOM/style compare: static code.html vs Next (education + about).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const CONTRACT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STITCH_ROOT = path.join(
  CONTRACT,
  'sources/b0-extracted/stitch-unpacked/stitch_editorial_website_redesign',
);
const BASE = process.env.STITCH_C0_BASE_URL ?? 'http://127.0.0.1:3000';

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
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function snapshot(page, label) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.tailwind?.refresh?.();
  });
  await page.waitForTimeout(1200);
  return page.evaluate((label) => {
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        class: el.className?.slice?.(0, 120) ?? '',
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        gap: cs.gap,
        rowGap: cs.rowGap,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        display: cs.display,
        position: cs.position,
      };
    };
    const main = document.querySelector('main');
    const section1 = document.querySelector('main section');
    const h1 = document.querySelector('main h1');
    const shell = document.querySelector('[data-stitch-c0-shell]');
    const root = document.querySelector('.stitch-c0-root');
    const bodyCs = getComputedStyle(document.body);
    const children = [];
    let el = document.body.firstElementChild;
    let i = 0;
    while (el && i < 8) {
      children.push(pick(el));
      el = el.nextElementSibling;
      i++;
    }
    return {
      label,
      scrollHeight: document.documentElement.scrollHeight,
      bodyPadding: bodyCs.paddingTop,
      bodyMargin: bodyCs.marginTop,
      shell: pick(shell),
      stitchRoot: pick(root),
      main: pick(main),
      section1: pick(section1),
      h1: pick(h1),
      bodyChildren: children,
    };
  }, label);
}

async function runPage(browser, staticUrl, nextPath, profile) {
  const ctx = await browser.newContext({
    viewport: { width: profile.w, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(staticUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}',
  });
  const ref = await snapshot(page, 'static');

  await page.goto(`${BASE}${nextPath}`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}',
  });
  const next = await snapshot(page, 'next');
  await ctx.close();
  return { ref, next };
}

async function main() {
  const { server, port } = await startStaticServer(STITCH_ROOT);
  const browser = await chromium.launch({ headless: true });
  try {
    const out = {};
    for (const [folder, nextPath, w] of [
      ['education_programs_spomove', '/education', 1280],
      ['about_spomove', '/about', 1280],
      ['home_spomove', '/', 1179],
    ]) {
      out[folder] = await runPage(
        browser,
        `http://127.0.0.1:${port}/${folder}/code.html`,
        nextPath,
        { w },
      );
    }
    fs.writeFileSync(
      path.join(CONTRACT, 'stitch-c0-fidelity', 'DOM_PROBE_EDUCATION_ABOUT.json'),
      JSON.stringify(out, null, 2),
      'utf8',
    );
    console.log(JSON.stringify(out, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main();
