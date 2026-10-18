#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureRecords } from './home-visual-checks.mjs';

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.B4D_PORT ?? '3016';
const base = `http://127.0.0.1:${port}/spokedu/`;

const widths = [390, 767, 834, 1440];
const out = { port, widths: {} };
const browser = await chromium.launch();
const page = await browser.newPage();
for (const w of widths) {
  await page.setViewportSize({ width: w, height: w === 1440 ? 900 : 844 });
  await page.goto(base, { waitUntil: 'load' });
  await page.locator('#home-records-heading').scrollIntoViewIfNeeded();
  out.widths[w] = await measureRecords(page, w <= 767 ? { mobileMinRatio: 0.6 } : {});
}
await browser.close();
await writeFile(path.join(docsDir, 'RECORDS_METRICS_AFTER.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.widths[390]?.tiles, null, 2));
