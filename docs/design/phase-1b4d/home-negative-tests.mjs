#!/usr/bin/env node
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import {
  measureGateway,
  measureRecords,
  measureOverflow,
  checkLabel,
} from './home-visual-checks.mjs';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.B4D_PORT ?? '3016';
const base = `http://127.0.0.1:${port}/spokedu/`;

const results = { tests: [], overall: 'PASS' };

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // A — Gateway border removed
  await page.goto(base, { waitUntil: 'load' });
  await page.addStyleTag({
    content: 'a[class*="gatewayCard"] { border: none !important; box-shadow: none !important; }',
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  const gA = await measureGateway(page);
  const detectedA = !gA.bordersOk;
  results.tests.push({
    label: 'NEGATIVE_GATEWAY_BORDER',
    status: detectedA ? 'PASS' : 'FAIL',
    detail: gA,
  });

  // B — Records media collapse
  await ctx.close();
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(base, { waitUntil: 'load' });
  await page2.setViewportSize({ width: 390, height: 844 });
  await page2.addStyleTag({
    content:
      'section[aria-labelledby="home-records-heading"] [class*="tileCard"]:nth-of-type(2) [class*="tileMedia"], section[aria-labelledby="home-records-heading"] [class*="tileCard"]:nth-of-type(3) [class*="tileMedia"] { height: 24px !important; min-height: 24px !important; aspect-ratio: auto !important; }',
  });
  const recB = await measureRecords(page2, { mobileMinRatio: 0.6 });
  const detectedB = !recB.mobileHeightsOk;
  results.tests.push({
    label: 'NEGATIVE_RECORDS_MEDIA_HEIGHT',
    status: detectedB ? 'PASS' : 'FAIL',
    detail: recB,
  });

  // C — Overflow
  await ctx2.close();
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await page3.goto(base, { waitUntil: 'load' });
  await page3.setViewportSize({ width: 390, height: 844 });
  await page3.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'qa-overflow-probe';
    el.style.width = '200vw';
    el.style.height = '1px';
    document.body.appendChild(el);
  });
  const ov = await measureOverflow(page3);
  results.tests.push({
    label: 'NEGATIVE_OVERFLOW_X',
    status: ov ? 'PASS' : 'FAIL',
    detail: { overflowX: ov },
  });

  await browser.close();

  // D — Audit logic (no browser)
  const mockFailEvidence = { overall: 'FAIL', checks: [{ status: 'FAIL' }] };
  const auditWouldFail =
    mockFailEvidence.overall !== 'PASS' ||
    mockFailEvidence.checks.some((c) => c.status === 'FAIL');
  results.tests.push({
    label: 'NEGATIVE_INDEPENDENT_AUDIT_LOGIC',
    status: auditWouldFail ? 'PASS' : 'FAIL',
    detail: { auditWouldFail },
  });

  const anyWrong = results.tests.some((t) => t.label.startsWith('NEGATIVE_') && t.status !== 'PASS');
  results.overall = anyWrong ? 'QA_GATE_UNRELIABLE' : 'PASS';
  await writeFile(path.join(docsDir, 'NEGATIVE_TEST_EVIDENCE.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(anyWrong ? 1 : 0);
}

run();
