/**
 * Walk main sections + education hero children for static vs Next rect diff.
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

async function walk(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.tailwind?.refresh?.();
  });
  await page.waitForTimeout(1200);
  return page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        class: (typeof el.className === 'string' ? el.className : '').slice(0, 100),
        h: r.height,
        y: r.y,
        marginTop: cs.marginTop,
        paddingTop: cs.paddingTop,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        rowGap: cs.rowGap,
      };
    };
    const sections = [...document.querySelectorAll('main section')].map((s, i) => ({
      i,
      class: s.className.slice(0, 80),
      ...pick(s),
    }));
    const hero = document.querySelector('main section');
    const heroKids = hero
      ? [...hero.querySelectorAll('.max-w-3xl, .max-w-7xl')].flatMap((wrap) =>
          [...wrap.children].map((c, j) => ({ wrap: wrap.className.slice(0, 40), j, ...pick(c) })),
        )
      : [];
    const spaceY6 = document.querySelector('main .space-y-6');
    const spaceY6Kids = spaceY6
      ? [...spaceY6.children].map((c, j) => ({ j, ...pick(c) }))
      : [];
    const h1 = document.querySelector('main h1');
    const h1Mt = h1 ? getComputedStyle(h1).marginTop : null;
    return {
      scrollHeight: document.documentElement.scrollHeight,
      sections,
      spaceY6Kids,
      heroKids,
      h1MarginTop: h1Mt,
    };
  });
}

async function compare(browser, folder, nextPath) {
  const { server, port } = await startStaticServer(STITCH_ROOT);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/${folder}/code.html`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}',
  });
  const ref = await walk(page);
  await page.goto(`${BASE}${nextPath}`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.addStyleTag({
    content: '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}',
  });
  const next = await walk(page);
  await ctx.close();
  server.close();

  const sectionDiffs = ref.sections.map((r, i) => {
    const n = next.sections[i];
    if (!n) return { i, missing: true };
    return { i, dh: n.h - r.h, refH: r.h, nextH: n.h, class: r.class.slice(0, 60) };
  });

  return { folder, ref, next, sectionDiffs };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    for (const [folder, path] of [
      ['education_programs_spomove', '/education'],
      ['about_spomove', '/about'],
    ]) {
      results.push(await compare(browser, folder, path));
    }
    const outPath = path.join(CONTRACT, 'stitch-c0-fidelity', 'DOM_PROBE_SECTION_WALK.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
    for (const r of results) {
      console.log('\n===', r.folder, '===');
      console.log('scroll', r.ref.scrollHeight, '->', r.next.scrollHeight, 'Δ', r.next.scrollHeight - r.ref.scrollHeight);
      console.log('section dh:', r.sectionDiffs.filter((d) => Math.abs(d.dh || 0) > 0.5));
      console.log('space-y-6 kids ref:', r.ref.spaceY6Kids);
      console.log('space-y-6 kids next:', r.next.spaceY6Kids);
    }
  } finally {
    await browser.close();
  }
}

main();
