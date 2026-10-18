#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const gateDir = path.join(docsDir, 'release-gate');
const capDir = path.join(gateDir, 'captures');
const repoRoot = path.resolve(docsDir, '../../..');
const port = process.env.CATALOG_QA_PORT ?? '3021';
const base = `http://127.0.0.1:${port}`;

const ACTIVITY_TITLES = ['색상 반응', '방향 반응', '연상 반응', '순간 반응', '모션게이트', '액션 무브'];
const FORBIDDEN_COPY = [
  '개별 프로그램',
  '전체 목록 수',
  '공개 SPOMOVE 랜딩',
  '일반화하지 않습니다',
  'SPOMOVE_NOTION',
  'process.env',
];

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/spomove/catalog`)).ok) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('server timeout');
}

async function scrollAndLoadImages(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight * 0.7);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    for (const img of document.querySelectorAll('img')) {
      if (img.complete) continue;
      await new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }
    await document.fonts?.ready;
  });
}

const viewportsFull = [
  { n: '390', w: 390, h: 844 },
  { n: '941', w: 941, h: 861 },
  { n: '1440', w: 1440, h: 900 },
];

let srv;
const evidence = { BUILD_ID: null, HEAD: null, port, serverPid: null, checks: [], journeys: [], routeSmoke: null };

try {
  evidence.HEAD = (await readFile(path.join(repoRoot, '.git', 'HEAD'), 'utf8')).trim();
  evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8')).trim();

  const env = { ...process.env, PORT: port };
  if (process.env.CATALOG_QA_NO_ENV === '1') delete env.SPOMOVE_NOTION_CATALOG_URL;

  if (process.env.CATALOG_QA_NO_SPAWN !== '1') {
    srv = spawn('npm run start', { cwd: repoRoot, shell: true, stdio: 'pipe', env });
    evidence.serverPid = srv.pid;
  }
  await waitServer();
  await mkdir(capDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Route smoke — direct URL (not Journey A)
  await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load', timeout: 60000 });
  evidence.routeSmoke = {
    status: page.url().includes('/spomove/catalog') ? 'PASS' : 'FAIL',
    url: page.url(),
  };

  for (const vp of viewportsFull) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load', timeout: 60000 });
    await scrollAndLoadImages(page);

    const probe = await page.evaluate(
      ({ titles, forbidden }) => {
        const body = document.body?.innerText ?? '';
        const imgs = [...document.querySelectorAll('main img, .site-container img')];
        const imgStats = imgs.map((img) => ({
          alt: img.alt?.slice(0, 40),
          ok: img.complete && img.naturalWidth > 0,
        }));
        const titleHits = titles.filter((t) => body.includes(t));
        const forbiddenHit = forbidden.find((f) => body.includes(f));
        return {
          h1Count: document.querySelectorAll('h1').length,
          h1: document.querySelector('h1')?.textContent?.trim(),
          iframe: document.querySelectorAll('iframe').length,
          fallback: body.includes('전체 카탈로그를 아직 표시'),
          levels: body.includes('단순 반응') && body.includes('선택 반응') && body.includes('복합 반응'),
          seeDecideMove: body.includes('SEE') && body.includes('DECIDE') && body.includes('MOVE'),
          ctaPrimary: body.includes('SPOMOVE 알아보기'),
          ctaSecondary: body.includes('기관 도입 문의'),
          ctaLab: body.includes('SPOKEDU LAB'),
          activityCount: titleHits.length,
          imgCount: imgs.length,
          imgsOk: imgStats.every((i) => i.ok),
          imgStats,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          forbiddenHit,
          levelsIntro: body.includes('단순·선택·복합 반응으로 구성'),
          activityIntro: body.includes('다양한 움직임 활동'),
        };
      },
      { titles: ACTIVITY_TITLES, forbidden: FORBIDDEN_COPY },
    );

    await page.screenshot({
      path: path.join(capDir, `catalog-full-${vp.n}.png`),
      fullPage: true,
    });

    const pass =
      probe.h1Count === 1 &&
      probe.h1?.includes('프로그램 구성') &&
      probe.iframe === 0 &&
      !probe.fallback &&
      probe.levels &&
      probe.seeDecideMove &&
      probe.activityCount === 6 &&
      probe.imgsOk &&
      probe.imgCount >= 6 &&
      probe.ctaPrimary &&
      probe.ctaSecondary &&
      probe.ctaLab &&
      !probe.overflow &&
      !probe.forbiddenHit &&
      probe.levelsIntro &&
      probe.activityIntro;

    evidence.checks.push({ label: `CATALOG_FULL_${vp.n}`, status: pass ? 'PASS' : 'FAIL', probe });
  }

  // Journey A — strict, no fallback navigation
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/spomove`, { waitUntil: 'load', timeout: 60000 });
  await scrollAndLoadImages(page);
  const catalogLink = page.locator('a[href="/spomove/catalog"]').filter({ visible: true }).first();
  const linkCount = await catalogLink.count();
  let journeyA = { id: 'A', status: 'FAIL', url: page.url(), note: '' };
  if (linkCount === 0) {
    journeyA.note = 'no visible /spomove/catalog link';
  } else {
    try {
      await catalogLink.click({ timeout: 10000 });
      await page.waitForURL(/\/spomove\/catalog/, { timeout: 10000 });
      journeyA = { id: 'A', status: 'PASS', url: page.url(), note: 'clicked visible catalog link' };
    } catch (e) {
      journeyA.note = `click failed: ${String(e.message).slice(0, 120)}`;
    }
  }
  await page.screenshot({ path: path.join(capDir, 'spomove-to-catalog.png'), fullPage: false });
  evidence.journeys.push(journeyA);

  await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load' });
  await page.getByRole('link', { name: 'SPOMOVE 알아보기' }).click();
  await page.waitForTimeout(1000);
  evidence.journeys.push({
    id: 'B',
    status: page.url().includes('/spomove') && !page.url().includes('catalog') ? 'PASS' : 'FAIL',
    url: page.url(),
  });

  await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load' });
  await page.getByRole('link', { name: '기관 도입 문의' }).first().click();
  await page.waitForTimeout(1000);
  evidence.journeys.push({
    id: 'C',
    status: page.url().includes('education') && page.url().includes('spomove') ? 'PASS' : 'FAIL',
    url: page.url(),
  });

  await page.goto(`${base}/spomove/catalog`, { waitUntil: 'load' });
  await page.getByRole('link', { name: 'SPOKEDU LAB 알아보기' }).click();
  await page.waitForTimeout(1000);
  evidence.journeys.push({
    id: 'D',
    status: page.url().includes('spokedu-lab') ? 'PASS' : 'FAIL',
    url: page.url(),
  });

  await browser.close();

  const fails =
    evidence.checks.some((c) => c.status === 'FAIL') ||
    evidence.journeys.some((j) => j.status === 'FAIL') ||
    evidence.routeSmoke.status === 'FAIL';
  evidence.overall = fails ? 'FAIL' : 'PASS';
  await writeFile(path.join(gateDir, 'QA_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ overall: evidence.overall, BUILD_ID: evidence.BUILD_ID }, null, 2));
  if (evidence.overall === 'FAIL') process.exit(1);
} finally {
  if (srv) srv.kill('SIGTERM');
}
