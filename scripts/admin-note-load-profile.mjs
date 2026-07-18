/**
 * Admin Note load/API profile.
 *
 * Usage:
 *   node scripts/admin-note-load-profile.mjs [baseUrl]
 *   node scripts/admin-note-load-profile.mjs http://localhost:3000 --doc=<id> --alt=<id>
 */
import {
  NOTE_QA_DOCUMENTS,
  createNoteQaContext,
  loadPlaywrightChromium,
} from './note-qa/shared.mjs';

const args = process.argv.slice(2);
const baseArg = args.find((arg) => !arg.startsWith('--'));
const BASE = (baseArg || process.env.NOTE_QA_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const docArg = args.find((arg) => arg.startsWith('--doc='));
const altArg = args.find((arg) => arg.startsWith('--alt='));
const TRUSTED_PROFILE_DOC_ID = '630e1104-84f9-41a2-b25b-7c4faa6a1300';
const DOC_ID = docArg?.slice('--doc='.length) || TRUSTED_PROFILE_DOC_ID;
const ALT_DOC_ID = altArg?.slice('--alt='.length) || NOTE_QA_DOCUMENTS.find((doc) => doc.id !== DOC_ID)?.id || DOC_ID;

function endpointKey(url) {
  const parsed = new URL(url);
  if (!parsed.pathname.startsWith('/api/admin/note')) return null;
  if (parsed.pathname.endsWith('/blocks/load')) {
    return `${parsed.pathname}?skipReconcile=${parsed.searchParams.get('skipReconcile') === 'true'}`;
  }
  return parsed.pathname;
}

function summarize(records) {
  const byEndpoint = new Map();
  for (const record of records) {
    const bucket = byEndpoint.get(record.key) ?? {
      count: 0,
      totalMs: 0,
      maxMs: 0,
      statuses: new Map(),
      bytes: 0,
      examples: [],
    };
    bucket.count += 1;
    bucket.totalMs += record.durationMs;
    bucket.maxMs = Math.max(bucket.maxMs, record.durationMs);
    bucket.bytes += record.bytes;
    bucket.statuses.set(record.status, (bucket.statuses.get(record.status) ?? 0) + 1);
    if (bucket.examples.length < 3) bucket.examples.push(record.path);
    byEndpoint.set(record.key, bucket);
  }

  return [...byEndpoint.entries()]
    .map(([key, bucket]) => ({
      endpoint: key,
      count: bucket.count,
      avgMs: Math.round(bucket.totalMs / bucket.count),
      maxMs: Math.round(bucket.maxMs),
      bytes: bucket.bytes,
      statuses: Object.fromEntries(bucket.statuses),
      examples: bucket.examples,
    }))
    .sort((a, b) => b.count - a.count || b.maxMs - a.maxMs);
}

async function waitForRows(page) {
  await page.getByRole('status', { name: '페이지 불러오는 중' }).waitFor({ state: 'detached', timeout: 45_000 }).catch(() => undefined);
  await page.locator('[data-note-block-row]').first().waitFor({ state: 'visible', timeout: 45_000 });
}

async function runScenario(page, label, fn, sink) {
  const before = sink.records.length;
  const start = Date.now();
  await fn();
  await page.waitForTimeout(1500);
  const elapsedMs = Date.now() - start;
  const records = sink.records.slice(before);
  return {
    label,
    elapsedMs,
    requestCount: records.length,
    summary: summarize(records),
  };
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  const sink = { records: [] };
  const starts = new Map();

  try {
    const context = await createNoteQaContext(browser, BASE);
    const page = await context.newPage();

    page.on('request', (request) => {
      const key = endpointKey(request.url());
      if (!key) return;
      starts.set(request, { key, startedAt: Date.now(), url: request.url() });
    });
    page.on('response', async (response) => {
      const request = response.request();
      const started = starts.get(request);
      if (!started) return;
      starts.delete(request);
      let bytes = 0;
      try {
        const body = await response.body();
        bytes = body.length;
      } catch {
        bytes = 0;
      }
      const parsed = new URL(started.url);
      sink.records.push({
        key: started.key,
        status: response.status(),
        durationMs: Date.now() - started.startedAt,
        bytes,
        path: `${parsed.pathname}${parsed.search}`,
      });
    });

    const scenarios = [];
    scenarios.push(await runScenario(page, 'cold document open', async () => {
      await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(DOC_ID)}`, { waitUntil: 'domcontentloaded' });
      await waitForRows(page);
    }, sink));

    scenarios.push(await runScenario(page, 'switch to alternate document', async () => {
      await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(ALT_DOC_ID)}`, { waitUntil: 'domcontentloaded' });
      await waitForRows(page);
    }, sink));

    scenarios.push(await runScenario(page, 'switch back to first document', async () => {
      await page.goto(`${BASE}/admin/note?id=${encodeURIComponent(DOC_ID)}`, { waitUntil: 'domcontentloaded' });
      await waitForRows(page);
    }, sink));

    scenarios.push(await runScenario(page, 'idle 10s on loaded document', async () => {
      await page.waitForTimeout(10_000);
    }, sink));

    console.log(JSON.stringify({
      baseUrl: BASE,
      documentId: DOC_ID,
      alternateDocumentId: ALT_DOC_ID,
      scenarios,
      total: {
        requestCount: sink.records.length,
        summary: summarize(sink.records),
      },
    }, null, 2));

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
