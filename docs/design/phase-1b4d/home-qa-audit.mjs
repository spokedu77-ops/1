#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { measureGateway, measureRecords } from './home-visual-checks.mjs';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.B4D_PORT ?? '3016';
const base = `http://127.0.0.1:${port}/spokedu/`;

const evidencePath = path.join(docsDir, 'FINAL_QA_EVIDENCE.json');
let evidence;
try {
  evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
} catch {
  console.log(JSON.stringify({ auditStatus: 'FAIL', reason: 'MISSING_EVIDENCE' }));
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(base, { waitUntil: 'load', timeout: 60000 });

const live = {
  h1: await page.evaluate(() => document.querySelectorAll('#home-hero-heading').length),
  gateway: await measureGateway(page),
  records: await measureRecords(page),
};

await browser.close();

const failures = [];
if (evidence.overall !== 'PASS') failures.push('evidence.overall not PASS');
if (evidence.checks?.some((c) => c.status === 'FAIL')) failures.push('evidence contains FAIL checks');
if (live.gateway.count !== 3) failures.push('gateway count');
if (live.records.tileCount !== 3) failures.push('records count');
if (live.h1 !== 1) failures.push('h1 count');
if (live.gateway.count === 3 && !live.gateway.bordersOk) failures.push('gateway borders live');

const gwPass = evidence.checks?.find((c) => c.label === 'GATEWAY_LAYOUT_1440')?.status === 'PASS';
if (gwPass && live.gateway.count !== 3) failures.push('evidence vs live gateway');

const audit = {
  evidenceOverall: evidence.overall,
  live,
  failures,
  auditStatus: failures.length ? 'FAIL' : 'PASS',
};
console.log(JSON.stringify(audit, null, 2));
process.exit(failures.length ? 1 : 0);
