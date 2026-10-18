#!/usr/bin/env node
/** 2nd-pass audit: re-fetch page and verify claims in QA_EVIDENCE.json */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.B4C_PORT ?? '3015';
const base = `http://127.0.0.1:${port}/spokedu/`;

const evidence = JSON.parse(await readFile(path.join(docsDir, 'QA_EVIDENCE.json'), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base, { waitUntil: 'load', timeout: 60000 });

const live = await page.evaluate(() => {
  const missingClassProbe = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const cls = el.className;
    return { found: true, className: cls, display: getComputedStyle(el).display };
  };
  return {
    gatewayCards: document.querySelectorAll('a[class*="gatewayCard"]').length,
    gatewayGrid: getComputedStyle(document.querySelector('[class*="gatewayCards"]')).gridTemplateColumns,
    recordsTiles: document.querySelectorAll('[class*="tileCard"]').length,
    h1: document.querySelectorAll('#home-hero-heading').length,
  };
});

await browser.close();

const mismatches = [];
if (live.gatewayCards !== 3) mismatches.push('gateway card count');
const gwCheck = evidence.checks.find((c) => c.label === 'GATEWAY_LAYOUT_1440');
if (gwCheck?.status === 'PASS' && live.gatewayCards !== 3) mismatches.push('evidence vs live gateway');

const audit = {
  evidenceOverall: evidence.overall,
  live,
  mismatches,
  auditStatus: mismatches.length ? 'FAIL' : 'PASS',
};
console.log(JSON.stringify(audit, null, 2));
process.exit(mismatches.length ? 1 : 0);
