/**
 * Official SPOKEDU LAB tab perf — T0–T3, warm iterations, no sleep in metrics.
 * Uses an existing BrowserContext (persistent QA session). Does NOT inject storage-state.json.
 *
 *   import { runTabPerfBench } from './spokedu-lab-tab-perf-bench.mjs';
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());

export const TAB_STEPS = {
  home: {
    path: '/spokedu-lab/dashboard',
    tab: '홈',
    t1: '[data-dashboard-chapter="continuity"], [data-dashboard-section="weekly"]',
    t2: '[data-dashboard-card="weekly"], [data-dashboard-section="weekly"]:has([data-dashboard-card="weekly"])',
    t3: '[data-spm-spomove-card-action="start"], [data-dashboard-primary-cta="true"]',
  },
  programs: {
    path: '/spokedu-lab/programs',
    tab: '프로그램',
    t1: 'main h1',
    t2: 'main a[href="/spokedu-lab/spomove"]:visible, main a[href="/spokedu-lab/library"]:visible',
    t3: 'main a[href="/spokedu-lab/library"]',
  },
  favorites: {
    path: '/spokedu-lab/favorites',
    tab: '즐겨찾기',
    t1: 'main h1',
    t2: '[aria-label="저장한 콘텐츠"], :text("저장한 콘텐츠가 없습니다"), :text("저장한 놀이체육 활동이 없습니다")',
    t3: '[aria-label="즐겨찾기 필터"] button[aria-pressed="true"]',
  },
  manage: {
    path: '/spokedu-lab/manage',
    tab: '수업 관리',
    t1: '[data-manage-workspace]',
    t2: '[data-manage-cal-grid]',
    t3: '[data-manage-workspace] [role="tab"][aria-selected="true"]',
  },
  spomove: {
    path: '/spokedu-lab/spomove',
    tab: null,
    t1: '[data-spm-spomove-digital-header="true"]',
    t2: '[data-spm-spomove-family-nav="true"]',
    t3: '[data-spm-spomove-card-grid="true"]',
  },
};

export const PERF_LEGS = [
  ['home', 'programs'],
  ['programs', 'favorites'],
  ['favorites', 'manage'],
  ['manage', 'spomove', 'document'],
  ['spomove', 'home', 'spa'],
];

function pct(values, p) {
  const s = [...values].sort((a, b) => a - b);
  if (!s.length) return null;
  const i = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
  return s[Math.max(0, i)];
}

async function waitHomeWeeklyReady(page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[data-dashboard-card="weekly"]')) return true;
    const weekly = document.querySelector('[data-dashboard-section="weekly"]');
    if (!weekly) return false;
    return !weekly.querySelector('[data-dashboard-skeleton-grid="weekly"]');
  }, { timeout: 30_000 });
}

async function waitManageReady(page) {
  await page.locator('[data-manage-workspace]').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('[data-manage-cal-grid]').first().waitFor({ state: 'visible', timeout: 30_000 });
}

async function waitSelector(page, selector, timeoutMs = 30_000) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
}

function trackRouteData(page, key) {
  const requests = [];
  const required = key === 'manage' ? /\/api\/spokedu-master\/(students|sessions)(?:\?|$)/
    : key === 'programs' || key === 'spomove' ? /\/rest\/v1\/think_asset_packs(?:\?|$)/
    : /\/api\/spokedu-master\/(programs|favorites)(?:\?|$)|\/rest\/v1\/think_asset_packs(?:\?|$)/;
  const listener = request => { if (request.method() === 'GET' && required.test(request.url())) requests.push(request); };
  page.on('request', listener);
  return async () => {
    // Let committed route effects enqueue data reads; never substitute networkidle or a fixed sleep.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    let completed = 0;
    try {
      while (completed < requests.length) {
        const request = requests[completed++];
        const response = await request.response();
        if (!response?.ok()) throw new Error(`Required route data failed: ${new URL(request.url()).pathname}`);
        await response.finished();
      }
      return requests.map(request => new URL(request.url()).pathname);
    } finally { page.off('request', listener); }
  };
}

async function waitContentPaint(page, key) {
  try { await page.waitForFunction((key) => {
    const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0; };
    if (key === 'programs' && document.querySelectorAll('main a[href="/spokedu-lab/library"] img, main a[href="/spokedu-lab/spomove"] img').length < 2) return false;
    if (key === 'spomove' && !document.querySelector('[data-spm-spomove-card-grid] [data-spm-spomove-card-action]')) return false;
    if ([...document.querySelectorAll('main .animate-pulse, [data-spm-spomove-thumbnail-loading]')].some(visible)) return false;
    return [...document.querySelectorAll('main img')].filter(visible).every(img => img.complete && img.naturalWidth > 0);
  }, key, { timeout: 30_000 }); } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0; };
      return { path: location.pathname, title: document.querySelector('main')?.innerText.slice(0, 1000),
        visiblePulse: [...document.querySelectorAll('main .animate-pulse, [data-spm-spomove-thumbnail-loading]')].filter(visible).map(el => el.outerHTML.slice(0, 400)),
        images: [...document.querySelectorAll('main img')].filter(visible).map(img => ({ src: img.currentSrc, complete: img.complete, width: img.naturalWidth })),
        cards: document.querySelectorAll('[data-spm-spomove-card-grid] [data-spm-spomove-card-action]').length };
    });
    const path = join(process.cwd(), '.tmp', 'perf-runs', `readiness-failure-${key}-${Date.now()}`);
    mkdirSync(join(process.cwd(), '.tmp', 'perf-runs'), { recursive: true });
    writeFileSync(`${path}.json`, JSON.stringify(diagnostics, null, 2));
    await page.screenshot({ path: `${path}.png` });
    console.error(JSON.stringify({ stage: 'readiness-failure', key, path, diagnostics }));
    throw error;
  }
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function measureSpaTab(page, baseUrl, toKey) {
  const step = TAB_STEPS[toKey];
  const finishData = trackRouteData(page, toKey);
  const t0 = performance.now();
  await page.locator('[data-spm-tabbar="true"]').getByRole('button', { name: step.tab }).click({ force: true });
  await page.waitForFunction((p) => window.location.pathname === p, step.path, { timeout: 30_000 });
  await waitSelector(page, step.t1);
  const t1 = performance.now();
  if (toKey === 'home') {
    await waitHomeWeeklyReady(page);
  } else if (toKey === 'manage') {
    await waitManageReady(page);
  } else {
    await waitSelector(page, step.t2);
  }
  const dataReads = await finishData();
  await waitContentPaint(page, toKey);
  const t2 = performance.now();
  if (toKey === 'manage') {
    await page.locator(step.t3).first().waitFor({ state: 'visible', timeout: 30_000 });
  } else {
    await waitSelector(page, step.t3);
  }
  const t3 = performance.now();
  return {
    leg: `${toKey}`,
    nav: 'spa',
    dataReads,
    t1Ms: Math.round(t1 - t0),
    t2Ms: Math.round(t2 - t0),
    t3Ms: Math.round(t3 - t0),
  };
}

export async function measureDocument(page, baseUrl, toKey) {
  const step = TAB_STEPS[toKey];
  const finishData = trackRouteData(page, toKey);
  const t0 = performance.now();
  await page.goto(`${baseUrl}${step.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await waitSelector(page, step.t1);
  const t1 = performance.now();
  await waitSelector(page, step.t2);
  const dataReads = await finishData();
  await waitContentPaint(page, toKey);
  const t2 = performance.now();
  await waitSelector(page, step.t3);
  const t3 = performance.now();
  return { leg: toKey, nav: 'document', dataReads, t1Ms: Math.round(t1 - t0), t2Ms: Math.round(t2 - t0), t3Ms: Math.round(t3 - t0) };
}

export async function runTabPerfBench({
  context,
  baseUrl,
  label = 'RUN',
  sha = 'unknown',
  iterations = 20,
  collectTrace = false,
}) {
  const benchUrl = baseUrl.replace(/\/$/, '');
  const page = context.pages()[0] ?? (await context.newPage());
  await page.setViewportSize({ width: 390, height: 844 });

  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');

  let tracePath;
  const runtimeErrors = [];
  const onError = error => runtimeErrors.push(error.message);
  page.on('pageerror', onError);

  const coldT0 = performance.now();
  await page.goto(`${benchUrl}/spokedu-lab/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitHomeWeeklyReady(page);
  const coldT2Ms = Math.round(performance.now() - coldT0);

  for (const key of ['home', 'programs', 'favorites', 'manage']) {
    await measureSpaTab(page, benchUrl, key);
  }
  await measureDocument(page, benchUrl, 'spomove');
  await measureSpaTab(page, benchUrl, 'home');

  const buckets = {};
  for (const leg of PERF_LEGS) {
    buckets[`${leg[0]}_to_${leg[1]}`] = [];
  }

  for (let i = 0; i < iterations; i += 1) {
    for (const leg of PERF_LEGS) {
      const [from, to, mode] = leg;
      const sample = mode === 'document'
        ? await measureDocument(page, benchUrl, to)
        : await measureSpaTab(page, benchUrl, to);
      buckets[`${from}_to_${to}`].push(sample);
    }
  }

  await measureSpaTab(page, benchUrl, 'programs');
  const metrics = await client.send('Performance.getMetrics');
  const cdpMetricsSample = metrics.metrics?.filter((m) => /Script|Layout|TaskDuration|JSHeap/.test(m.name)).slice(0, 12);

  if (collectTrace) {
    // Separate diagnostic pass: tracing overhead is excluded from the percentile samples.
    tracePath = join(process.cwd(), '.tmp', 'perf-runs', `chrome-trace-${label}-${Date.now()}.json`);
    mkdirSync(join(process.cwd(), '.tmp', 'perf-runs'), { recursive: true });
    await client.send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,loading,v8', transferMode: 'ReturnAsStream' });
    await measureSpaTab(page, benchUrl, 'home');
    for (const [from, to, mode] of PERF_LEGS) {
      await page.evaluate(name => performance.mark(name), `${label}:${from}->${to}:start`);
      if (mode === 'document') await measureDocument(page, benchUrl, to);
      else await measureSpaTab(page, benchUrl, to);
      await page.evaluate(name => performance.mark(name), `${label}:${from}->${to}:end`);
    }
    const completed = new Promise(resolve => client.once('Tracing.tracingComplete', resolve));
    await client.send('Tracing.end');
    const { stream } = await completed;
    let trace = '';
    while (true) {
      const chunk = await client.send('IO.read', { handle: stream });
      trace += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString() : chunk.data;
      if (chunk.eof) break;
    }
    await client.send('IO.close', { handle: stream });
    writeFileSync(tracePath, trace);
  }

  const legSummary = {};
  for (const [key, samples] of Object.entries(buckets)) {
    const t2 = samples.map((s) => s.t2Ms);
    const t3 = samples.map((s) => s.t3Ms);
    legSummary[key] = {
      n: samples.length,
      nav: samples[0]?.nav,
      t2: { p50: pct(t2, 50), p95: pct(t2, 95) },
      t3: { p50: pct(t3, 50), p95: pct(t3, 95) },
    };
  }

  const spaT2 = Object.values(buckets).flat().filter((s) => s.nav === 'spa').map((s) => s.t2Ms);
  const result = {
    ok: runtimeErrors.length === 0,
    runtimeErrors,
    label,
    sha,
    baseUrl: benchUrl,
    capturedAt: new Date().toISOString(),
    iterations,
    coldDashboardT2Ms: coldT2Ms,
    warmSpaT2: { p50: pct(spaT2, 50), p95: pct(spaT2, 95), n: spaT2.length },
    legs: legSummary,
    samples: buckets,
    cdpMetricsSample,
    tracePath: tracePath ?? null,
    measurementRules: [
      'No waitForTimeout in T1/T2/T3 metrics',
      'T0=tab click or document goto',
      'SPA vs document separated',
      'Persistent single browser context (no storage-state.json)',
      'T2 waits for real cards, visible image completion, no visible pulse placeholders and two paint frames',
      'T2 also waits for route-required GET responses, including Favorites catalog / favorite data before accepting its empty state',
      'Chrome Performance trace uses a separate representative pass',
    ],
  };

  const outDir = join(process.cwd(), '.tmp', 'perf-runs');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `tab-perf-${label}-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  page.off('pageerror', onError);
  if (runtimeErrors.length) throw new Error(`Runtime errors during ${label}; see ${outPath}`);
  return { ...result, outPath };
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('spokedu-lab-tab-perf-bench.mjs');
if (isMain) {
  console.error('Use scripts/spokedu-lab-tab-perf-run.mjs (persistent session). This module exports runTabPerfBench().');
  process.exit(2);
}
