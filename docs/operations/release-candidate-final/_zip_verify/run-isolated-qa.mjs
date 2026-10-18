#!/usr/bin/env node
/**
 * Browser QA against an isolated release worktree (fresh build required).
 * Usage: SPOKEDU_RELEASE_REPO_ROOT=... node run-isolated-qa.mjs
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { measureHeroB5Copy } from '../../design/phase-1b5-final/home-b5-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(
  process.env.SPOKEDU_RELEASE_REPO_ROOT ?? path.join(here, '../../../../1-release-candidate-isolated'),
);
const outDir = path.join(here, 'qa-evidence');
const capDir = path.join(outDir, 'captures');
const port = process.env.RELEASE_QA_PORT ?? '3032';
const base = `http://127.0.0.1:${port}`;

const ACTIVITY_TITLES = ['색상 반응', '방향 반응', '연상 반응', '순간 반응', '모션게이트', '액션 무브'];
const FORBIDDEN_COPY = ['SPOMOVE_NOTION', 'process.env', '새 창에서 보기'];

const COMPONENT_FILES = [
  'home-hero.tsx',
  'service-gateway.tsx',
  'spokedu-method.tsx',
  'field-records.tsx',
  'spomove-stage.tsx',
  'master-stage.tsx',
  'final-cta.tsx',
  'home-web-landing.tsx',
];

async function waitServer(urlPath) {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${base}${urlPath}`);
      if (res.status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`server timeout ${urlPath}`);
}

async function cssModuleIntegrity() {
  const homeDir = path.join(repoRoot, 'app/spokedu/components/home-web');
  const cssPath = path.join(homeDir, 'home-web.module.css');
  const cssText = await readFile(cssPath, 'utf8');
  const defined = new Set();
  for (const m of cssText.matchAll(/\.([a-zA-Z_][\w-]*)\s*[,{>:\s]/g)) defined.add(m[1]);
  for (const m of cssText.matchAll(/\.([a-zA-Z_][\w-]*)\s*\{/g)) defined.add(m[1]);
  const missing = [];
  for (const file of COMPONENT_FILES) {
    const tsx = await readFile(path.join(homeDir, file), 'utf8');
    for (const m of tsx.matchAll(/styles\.([a-zA-Z_][\w]*)/g)) {
      if (!defined.has(m[1])) missing.push({ file, class: m[1] });
    }
  }
  return { status: missing.length === 0 ? 'PASS' : 'FAIL', missing };
}

async function heroImagesExist() {
  const assetsPath = path.join(repoRoot, 'app/spokedu/components/home-web/home-web-assets.ts');
  const text = await readFile(assetsPath, 'utf8');
  const paths = [...text.matchAll(/\/images\/[^'"]+/g)].map((m) => m[0]);
  const unique = [...new Set(paths)];
  const checks = [];
  for (const rel of unique) {
    const abs = path.join(repoRoot, 'public', rel.replace(/^\//, ''));
    try {
      const buf = await readFile(abs);
      checks.push({ path: rel, bytes: buf.length, status: buf.length > 0 ? 'PASS' : 'FAIL' });
    } catch {
      checks.push({ path: rel, status: 'FAIL', error: 'missing' });
    }
  }
  const ok = checks.every((c) => c.status === 'PASS');
  return { status: ok ? 'PASS' : 'FAIL', checks };
}

let srv;
const evidence = {
  repoRoot,
  port,
  BUILD_ID: null,
  isolatedBaseCommit: null,
  cssModules: null,
  heroImages: null,
  homeB5: null,
  catalog: null,
  overall: 'FAIL',
};

try {
  await mkdir(capDir, { recursive: true });
  evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();
  evidence.isolatedBaseCommit = (await readFile(path.join(repoRoot, '.git', 'HEAD'), 'utf8')).trim();
  evidence.cssModules = await cssModuleIntegrity();
  evidence.heroImages = await heroImagesExist();

  srv = spawn('npm run start', {
    cwd: repoRoot,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: port },
  });
  await waitServer('/spokedu');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/spokedu`, { waitUntil: 'load', timeout: 60000 });
  const hero = await measureHeroB5Copy(page);
  await page.screenshot({ path: path.join(capDir, 'hero-390.png'), fullPage: false });
  evidence.homeB5 = { status: hero.ok ? 'PASS' : 'FAIL', hero390: hero };

  await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load', timeout: 60000 });
  const catalogProbe = await page.evaluate(
    ({ titles, forbidden }) => {
      const body = document.body?.innerText ?? '';
      const imgs = [...document.querySelectorAll('main img, .site-container img')];
      return {
        h1: document.querySelector('h1')?.textContent?.trim(),
        iframe: document.querySelectorAll('iframe').length,
        activityCount: titles.filter((t) => body.includes(t)).length,
        imgsOk: imgs.every((img) => img.complete && img.naturalWidth > 0),
        linkToSpomove: !!document.querySelector('a[href="/spomove"]'),
        linkToContact: body.includes('기관 도입 문의'),
        forbiddenHit: forbidden.find((f) => body.includes(f)),
      };
    },
    { titles: ACTIVITY_TITLES, forbidden: FORBIDDEN_COPY },
  );
  await page.screenshot({ path: path.join(capDir, 'catalog-390.png'), fullPage: true });
  const catalogPass =
    catalogProbe.h1?.includes('프로그램 구성') &&
    catalogProbe.iframe === 0 &&
    catalogProbe.activityCount === 6 &&
    catalogProbe.imgsOk &&
    !catalogProbe.forbiddenHit;
  evidence.catalog = { status: catalogPass ? 'PASS' : 'FAIL', probe: catalogProbe };

  await page.goto(`${base}/spomove`, { waitUntil: 'load', timeout: 60000 });
  const catalogLink = page.locator('a[href="/spomove/catalog"]').filter({ visible: true }).first();
  let journeyLink = 'FAIL';
  if ((await catalogLink.count()) > 0) {
    await catalogLink.click({ timeout: 10000 });
    await page.waitForURL(/\/spomove\/catalog/, { timeout: 10000 });
    journeyLink = 'PASS';
  }
  evidence.catalog.journeyFromSpomove = journeyLink;

  await browser.close();

  const gates = [
    evidence.cssModules.status,
    evidence.heroImages.status,
    evidence.homeB5.status,
    evidence.catalog.status,
    journeyLink,
  ];
  evidence.overall = gates.every((g) => g === 'PASS') ? 'PASS' : 'FAIL';
} finally {
  if (srv) srv.kill('SIGTERM');
  await writeFile(path.join(outDir, 'ISOLATED_BROWSER_QA.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ overall: evidence.overall, BUILD_ID: evidence.BUILD_ID }, null, 2));
  if (evidence.overall !== 'PASS') process.exit(1);
}
