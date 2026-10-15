import nextEnv from '@next/env';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyMasterAdminSession } from './lib/spokedu-master-admin-auth.mjs';

nextEnv.loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const LABEL = process.argv[3] || 'baseline';
const RUNS = Number(process.env.SPM_PERF_RUNS || 5);
const OUT = path.join(process.cwd(), '.tmp', 'spokedu-lab-entry-perf', LABEL);
const DASHBOARD = '/spokedu-lab/dashboard';
const ACCOUNTS = [
  { plan: 'free', email: 'spm.qa.trial@spokedu.test' },
  { plan: 'lite', email: 'spm.qa.lite@spokedu.test' },
  { plan: 'premium', email: 'spm.qa.pro@spokedu.test' },
];
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
];

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
};

function summarize(samples) {
  const numericKeys = [
    'loginToUrlMs', 'urlToSkeletonEndMs', 'urlToContentMs', 'urlToImagesMs',
    'urlToApisDoneMs', 'accessRequests', 'assetPackRequests', 'requestCount',
    'transferBytes', 'jsTransferBytes', 'duplicateRequests', 'runtimeErrors',
  ];
  return Object.fromEntries(numericKeys.map((key) => {
    const values = samples.map((sample) => sample[key]);
    return [key, { median: percentile(values, 0.5), p95: percentile(values, 0.95) }];
  }));
}

async function measure(page, { revisit }) {
  const requests = [];
  const errors = [];
  const networkErrors = [];
  let urlArrivedAt = 0;
  const start = performance.now();
  const pending = new Set();

  const onRequest = (request) => {
    const url = request.url();
    if (!url.startsWith(BASE) && !url.includes('.supabase.co')) return;
    pending.add(request);
    requests.push({ url, type: request.resourceType(), transfer: 0 });
  };
  const onResponse = async (response) => {
    const request = response.request();
    pending.delete(request);
    const entry = [...requests].reverse().find((item) => item.url === request.url() && item.transfer === 0);
    if (!entry) return;
    try {
      const timing = await response.serverAddr().catch(() => null);
      void timing;
      const headers = await response.allHeaders();
      entry.transfer = Number(headers['content-length'] || 0);
    } catch {}
  };
  page.on('request', onRequest);
  page.on('requestfailed', (request) => { pending.delete(request); networkErrors.push(`request:${request.url()}`); });
  page.on('response', onResponse);
  page.on('pageerror', (error) => errors.push(`page:${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console:${message.text()}`); });

  if (revisit) {
    await page.goto(`${BASE}${DASHBOARD}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-dashboard-root="true"]').waitFor({ timeout: 20_000 });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    requests.length = 0;
    errors.length = 0;
    networkErrors.length = 0;
  }

  const navigationStart = performance.now();
  await page.goto(`${BASE}${DASHBOARD}`, { waitUntil: 'commit' });
  urlArrivedAt = performance.now();
  const loginToUrlMs = urlArrivedAt - navigationStart;
  const skeleton = page.locator('[data-dashboard-skeleton-grid]');
  const content = page.locator('[data-dashboard-root="true"]');
  await content.waitFor({ timeout: 20_000 });
  const contentAt = performance.now();
  await skeleton.first().waitFor({ state: 'detached', timeout: 20_000 }).catch(() => undefined);
  const skeletonEndAt = performance.now();
  await page.waitForFunction(() => [...document.images].filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight * 2;
  }).every((image) => image.complete), null, { timeout: 20_000 }).catch(() => undefined);
  const imagesAt = performance.now();
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  const apisDoneAt = performance.now();
  const perfEntries = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
    name: entry.name,
    transferSize: entry.transferSize,
    initiatorType: entry.initiatorType,
  })));
  const apiUrls = requests.filter((item) => item.url.includes('/api/') || item.url.includes('.supabase.co')).map((item) => item.url.replace(/([?&])_=[^&]+/, '$1'));
  const counts = new Map();
  for (const url of apiUrls) counts.set(url, (counts.get(url) || 0) + 1);
  const transferBytes = perfEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
  const jsTransferBytes = perfEntries.filter((entry) => entry.initiatorType === 'script' || entry.name.includes('/_next/static/chunks/')).reduce((sum, entry) => sum + (entry.transferSize || 0), 0);

  page.off('request', onRequest);
  page.off('response', onResponse);
  return {
    loginToUrlMs: Math.round(loginToUrlMs),
    urlToSkeletonEndMs: Math.round(skeletonEndAt - urlArrivedAt),
    urlToContentMs: Math.round(contentAt - urlArrivedAt),
    urlToImagesMs: Math.round(imagesAt - urlArrivedAt),
    urlToApisDoneMs: Math.round(apisDoneAt - urlArrivedAt),
    accessRequests: apiUrls.filter((url) => url.includes('/api/spokedu-master/access')).length,
    assetPackRequests: apiUrls.filter((url) => url.includes('think_asset_packs')).length,
    requestCount: requests.length,
    transferBytes,
    jsTransferBytes,
    duplicateRequests: [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
    runtimeErrors: errors.length,
    errors: errors.slice(0, 10),
    networkErrors: networkErrors.slice(0, 10),
    wallMs: Math.round(performance.now() - start),
  };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const account of ACCOUNTS) {
    const authContext = await browser.newContext();
    await applyMasterAdminSession(authContext, BASE, account.email);
    const storageState = await authContext.storageState();
    await authContext.close();
    for (const viewport of VIEWPORTS) {
      for (const visit of ['first', 'revisit']) {
        const samples = [];
        for (let run = 1; run <= RUNS; run += 1) {
          const context = await browser.newContext({ viewport, serviceWorkers: 'block', storageState });
          const page = await context.newPage();
          const sample = await measure(page, { revisit: visit === 'revisit' });
          samples.push(sample);
          if (run === RUNS) {
            await page.screenshot({ path: path.join(OUT, `${account.plan}-${viewport.name}-${visit}.png`), fullPage: true });
          }
          await context.close();
          console.log(JSON.stringify({ label: LABEL, plan: account.plan, viewport: viewport.name, visit, run, ...sample }));
        }
        results.push({ plan: account.plan, viewport: viewport.name, visit, runs: RUNS, summary: summarize(samples), samples });
        await writeFile(path.join(OUT, 'results.partial.json'), JSON.stringify({ label: LABEL, baseUrl: BASE, runs: RUNS, results }, null, 2));
      }
    }
  }
} finally {
  await browser.close();
}
await writeFile(path.join(OUT, 'results.json'), JSON.stringify({ label: LABEL, baseUrl: BASE, runs: RUNS, results }, null, 2));
console.log(JSON.stringify({ ok: true, label: LABEL, output: OUT, scenarios: results.length }));
