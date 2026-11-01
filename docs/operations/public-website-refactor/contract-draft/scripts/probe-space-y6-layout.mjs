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

async function inspect(page, label) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.tailwind?.refresh?.();
  });
  await page.waitForTimeout(1200);
  return page.evaluate((label) => {
    const el = document.querySelector('main section .space-y-6');
    if (!el) return { label, missing: true };
    const cs = getComputedStyle(el);
    const h1 = el.querySelector('h1');
    const badge = el.children[0];
    const r1 = badge.getBoundingClientRect();
    const r2 = h1.getBoundingClientRect();
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText?.includes('space-y-6')) {
            rules.push({ sheet: sheet.href?.slice(-40) ?? 'inline', sel: rule.selectorText, css: rule.cssText.slice(0, 200) });
          }
        }
      } catch {
        /* cross-origin */
      }
    }
    const bcs = getComputedStyle(badge);
    const hcs = getComputedStyle(h1);
    return {
      label,
      display: cs.display,
      gapBetweenBadgeAndH1: r2.top - r1.bottom,
      badgeMarginBottom: bcs.marginBottom,
      h1MarginTop: hcs.marginTop,
      h1PaddingTop: hcs.paddingTop,
      h1BorderTop: hcs.borderTopWidth,
      spaceY6Rules: rules.length,
      h1MatchedMarginRules: [...document.styleSheets].flatMap((sheet) => {
        const out = [];
        try {
          for (const rule of sheet.cssRules) {
            if (rule.style?.marginTop && rule.selectorText && h1.matches(rule.selectorText.replace(/:is\([^)]+\)/g, '*').split(',')[0]?.trim() || '___')) {
              out.push(rule.cssText.slice(0, 120));
            }
          }
        } catch {
          /* */
        }
        return out;
      }).slice(0, 5),
    };
  }, label);
}

async function main() {
  const { server, port } = await startStaticServer(STITCH_ROOT);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/education_programs_spomove/code.html`, {
    waitUntil: 'networkidle',
  });
  const ref = await inspect(page, 'static');
  await page.goto(`${BASE}/education`, { waitUntil: 'networkidle' });
  const next = await inspect(page, 'next');
  console.log(JSON.stringify({ ref, next }, null, 2));
  await browser.close();
  server.close();
}

main();
