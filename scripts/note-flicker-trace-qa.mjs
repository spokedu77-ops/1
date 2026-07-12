/**
 * Admin Note — flicker trace QA (Playwright)
 *
 * Phase 0+1 계측을 브라우저에서 직접 돌리고 dump 결과를 수집한다.
 *
 * Usage:
 *   node scripts/note-flicker-trace-qa.mjs [baseUrl]
 *   node scripts/note-flicker-trace-qa.mjs http://localhost:3000 --doc=7c095438-...
 */
import {
  NOTE_QA_DOCUMENTS,
  attachPageDiagnostics,
  createNoteQaContext,
  loadPlaywrightChromium,
} from './note-qa/shared.mjs';

const cliArgs = process.argv.slice(2);
const docArg = cliArgs.find((a) => a.startsWith('--doc='));
const DOC_ID = docArg ? docArg.slice('--doc='.length) : NOTE_QA_DOCUMENTS[0].id;
const baseArg = cliArgs.find((a) => !a.startsWith('--'));
const BASE = (process.env.NOTE_QA_BASE_URL || baseArg || 'http://localhost:3000').replace(/\/$/, '');

const SCENARIO_MS = Number(process.env.NOTE_FLICKER_SCENARIO_MS || 30_000);
const IDLE_MS = Number(process.env.NOTE_FLICKER_IDLE_MS || SCENARIO_MS);

const THRESHOLDS = {
  enter: {
    snapshotDispatch: 1,
    loadingTransitions: 2,
    noteBlockCanvasRender: 14,
  },
  reentry: {
    snapshotDispatch: 0,
    blocksLoad: 0,
    loadingTransitions: 2,
  },
  idle: {
    snapshotDispatch: 1,
    blocksLoad: 0,
    pullOps: 1,
    fetchSyncState: 2,
    loadingTransitions: 0,
    noteBlockCanvasRender: 3,
  },
};

async function resetTrace(page) {
  await page.evaluate(() => {
    if (!window.__noteFlickerTrace) return;
    window.__noteFlickerTrace.reset();
  });
}

async function dumpTrace(page) {
  return page.evaluate(() => window.__noteFlickerTrace?.dump() ?? null);
}

async function waitForNoteReady(page) {
  await page.waitForSelector('[data-note-block-list], [role="status"][aria-label="페이지 불러오는 중"]', {
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);
}

async function runScrollScenario(page, ms) {
  const start = Date.now();
  let down = true;
  while (Date.now() - start < ms) {
    await page.evaluate((delta) => {
      const root = document.querySelector('[data-note-marquee-zone]')?.parentElement
        ?? document.scrollingElement;
      if (root) root.scrollTop += delta;
    }, down ? 280 : -280);
    down = !down;
    await page.waitForTimeout(350);
  }
}

function sumRenderPrefix(counters, prefix) {
  return Object.entries(counters.render ?? {})
    .filter(([key]) => key === prefix || key.startsWith(`${prefix}#`) || key.startsWith(`${prefix}:`))
    .reduce((sum, [, n]) => sum + n, 0);
}

function countLoadingTransitions(counters) {
  return Object.values(counters.loading ?? {}).reduce((sum, n) => sum + n, 0);
}

function evaluateEnterScenario(dump) {
  const c = dump.counters;
  const issues = [];
  if ((c.snapshotDispatch ?? 0) > THRESHOLDS.enter.snapshotDispatch) {
    issues.push(`snapshotDispatch=${c.snapshotDispatch} > ${THRESHOLDS.enter.snapshotDispatch}`);
  }
  const loadingN = countLoadingTransitions(c);
  if (loadingN > THRESHOLDS.enter.loadingTransitions) {
    issues.push(`loadingTransitions=${loadingN} > ${THRESHOLDS.enter.loadingTransitions}`);
  }
  const canvasRenders = sumRenderPrefix(c, 'NoteBlockCanvas');
  if (canvasRenders > THRESHOLDS.enter.noteBlockCanvasRender) {
    issues.push(`NoteBlockCanvas renders=${canvasRenders} > ${THRESHOLDS.enter.noteBlockCanvasRender}`);
  }
  return issues;
}

function evaluateReentryScenario(dump) {
  const c = dump.counters;
  const issues = [];
  if ((c.snapshotDispatch ?? 0) > THRESHOLDS.reentry.snapshotDispatch) {
    issues.push(`snapshotDispatch=${c.snapshotDispatch} > ${THRESHOLDS.reentry.snapshotDispatch}`);
  }
  if ((c.api?.blocksLoad ?? 0) > THRESHOLDS.reentry.blocksLoad) {
    issues.push(`blocksLoad=${c.api.blocksLoad} > ${THRESHOLDS.reentry.blocksLoad}`);
  }
  const loadingN = countLoadingTransitions(c);
  if (loadingN > THRESHOLDS.reentry.loadingTransitions) {
    issues.push(`loadingTransitions=${loadingN} > ${THRESHOLDS.reentry.loadingTransitions}`);
  }
  return issues;
}

function evaluateIdleScenario(dump) {
  const c = dump.counters;
  const issues = [];
  if ((c.snapshotDispatch ?? 0) > THRESHOLDS.idle.snapshotDispatch) {
    issues.push(`snapshotDispatch=${c.snapshotDispatch} > ${THRESHOLDS.idle.snapshotDispatch}`);
  }
  if ((c.api?.blocksLoad ?? 0) > THRESHOLDS.idle.blocksLoad) {
    issues.push(`blocksLoad=${c.api.blocksLoad} > ${THRESHOLDS.idle.blocksLoad}`);
  }
  if ((c.api?.pullOps ?? 0) > THRESHOLDS.idle.pullOps) {
    issues.push(`pullOps=${c.api.pullOps} > ${THRESHOLDS.idle.pullOps}`);
  }
  if ((c.api?.fetchSyncState ?? 0) > THRESHOLDS.idle.fetchSyncState) {
    issues.push(`fetchSyncState=${c.api.fetchSyncState} > ${THRESHOLDS.idle.fetchSyncState}`);
  }
  const loadingN = countLoadingTransitions(c);
  if (loadingN > THRESHOLDS.idle.loadingTransitions) {
    issues.push(`loadingTransitions=${loadingN} > ${THRESHOLDS.idle.loadingTransitions}`);
  }
  const canvasRenders = sumRenderPrefix(c, 'NoteBlockCanvas');
  if (canvasRenders > THRESHOLDS.idle.noteBlockCanvasRender) {
    issues.push(`NoteBlockCanvas renders=${canvasRenders} > ${THRESHOLDS.idle.noteBlockCanvasRender}`);
  }
  return issues;
}

function printDump(label, dump) {
  const c = dump.counters;
  console.log(`\n=== ${label} (${dump.elapsedMs}ms) ===`);
  console.log('snapshot:', {
    skip: c.snapshotSkip,
    dispatch: c.snapshotDispatch,
    byOrigin: c.snapshotByOrigin,
    byReason: c.snapshotByReason,
  });
  console.log('realtime:', c.realtime);
  console.log('api:', c.api);
  console.log('loading:', c.loading);
  const topRenders = Object.entries(c.render ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  console.log('render top:', Object.fromEntries(topRenders));
}

async function main() {
  const chromium = await loadPlaywrightChromium();
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  let exitCode = 0;

  try {
    const context = await createNoteQaContext(browser, BASE);
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('NOTE_FLICKER_TRACE', '1');
      } catch {
        // ignore
      }
    });
    const page = await context.newPage();
    attachPageDiagnostics(page, pageErrors);

    const openUrl = `${BASE}/admin/note?noteTrace=1&id=${encodeURIComponent(DOC_ID)}`;
    console.log(`OPEN ${openUrl}`);

    // --- Scenario A: enter (load 포함 30s) ---
    const enterStart = Date.now();
    await page.goto(openUrl, { waitUntil: 'domcontentloaded' });
    const enterRemain = Math.max(0, SCENARIO_MS - (Date.now() - enterStart));
    await page.waitForTimeout(enterRemain);
    const enterDump = await dumpTrace(page);
    if (!enterDump?.enabled) throw new Error('trace not enabled after page load');
    printDump('A: enter (30s incl. load)', enterDump);

    await waitForNoteReady(page);

    // --- Scenario B: scroll ---
    await resetTrace(page);
    await runScrollScenario(page, SCENARIO_MS);
    const scrollDump = await dumpTrace(page);
    printDump('B: scroll (30s)', scrollDump);

    // --- Scenario C: idle ---
    await resetTrace(page);
    await page.waitForTimeout(IDLE_MS);
    const idleDump = await dumpTrace(page);
    printDump('C: idle (30s)', idleDump);

    // --- Scenario D: re-entry (session cache warm) ---
    const altDocId = NOTE_QA_DOCUMENTS.find((d) => d.id !== DOC_ID)?.id ?? DOC_ID;
    await page.goto(
      `${BASE}/admin/note?noteTrace=1&id=${encodeURIComponent(altDocId)}`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForTimeout(2500);
    await resetTrace(page);
    const reentryStart = Date.now();
    await page.goto(openUrl, { waitUntil: 'domcontentloaded' });
    const reentryRemain = Math.max(0, SCENARIO_MS - (Date.now() - reentryStart));
    await page.waitForTimeout(reentryRemain);
    const reentryDump = await dumpTrace(page);
    printDump('D: re-entry (30s incl. load)', reentryDump);

    const enterIssues = evaluateEnterScenario(enterDump);
    const reentryIssues = evaluateReentryScenario(reentryDump);
    const idleIssues = evaluateIdleScenario(idleDump);
    if (enterIssues.length > 0) {
      console.error('\nFAIL enter thresholds:');
      for (const issue of enterIssues) console.error(`  - ${issue}`);
      exitCode = 1;
    } else {
      console.log('\nOK enter thresholds passed');
    }
    if (reentryIssues.length > 0) {
      console.error('\nFAIL re-entry thresholds:');
      for (const issue of reentryIssues) console.error(`  - ${issue}`);
      exitCode = 1;
    } else {
      console.log('OK re-entry thresholds passed');
    }
    if (idleIssues.length > 0) {
      console.error('\nFAIL idle thresholds:');
      for (const issue of idleIssues) console.error(`  - ${issue}`);
      exitCode = 1;
    } else {
      console.log('\nOK idle thresholds passed');
    }

    const report = {
      documentId: DOC_ID,
      baseUrl: BASE,
      scenarios: {
        enter: enterDump,
        scroll: scrollDump,
        idle: idleDump,
        reentry: reentryDump,
      },
      enterIssues,
      reentryIssues,
      idleIssues,
      pageErrors,
    };
    console.log('\n--- JSON report ---');
    console.log(JSON.stringify(report, null, 2));

    await context.close();
  } finally {
    await browser.close();
  }

  process.exit(exitCode);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
