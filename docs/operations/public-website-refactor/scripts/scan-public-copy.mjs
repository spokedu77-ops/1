#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { stabilizePublicPage } from './capture-page-utils.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(here, '..', 'PUBLIC_COPY_SCAN.json');
const repo = path.resolve(here, '../../../..');
const port = process.env.REFACTOR_CAPTURE_PORT ?? '3055';
const base = `http://127.0.0.1:${port}`;

const ROUTES = [
  '/',
  '/education',
  '/private',
  '/spomove',
  '/spomove/catalog',
  '/spokedu-lab',
  '/records',
  '/about',
  '/spomat',
  '/partners',
  '/contact',
];

const PATTERNS = [
  { id: 'ssot', re: /\bSSOT\b/i },
  { id: 'primary-secondary', re: /\bPrimary\b|\bSecondary\b/i },
  { id: 'handoff', re: /\bHandoff\b/i },
  { id: 'fact-required', re: /FACT_REQUIRED/i },
  { id: 'next-public', re: /NEXT_PUBLIC_/i },
  { id: 'env-config', re: /환경변수 설정/i },
  { id: 'product-ledger', re: /제품 원장/i },
  { id: 'review-criteria', re: /검수 기준/i },
  { id: 'contract-scope', re: /공개 계약 범위/i },
  { id: 'info-page-disclaimer', re: /이 페이지는 안내입니다/i },
  { id: 'brand-internal', re: /공식 사이트와 같은 브랜드|SPOKEDU 공식 사이트와/i },
  { id: 'master-token', re: /\bMASTER\b/ },
];

async function waitLocal() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('local server timeout');
}

let srv;
try {
  srv = spawn('npm run start', { cwd: repo, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  await waitLocal();
  const browser = await chromium.launch();
  const hits = [];
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 900 });
    await stabilizePublicPage(page, `${base}${route}`);
    const text = await page.evaluate(() => document.body.innerText);
    for (const { id, re } of PATTERNS) {
      const m = text.match(re);
      if (m) {
        hits.push({ route, patternId: id, match: m[0], context: text.slice(Math.max(0, m.index - 40), m.index + 80) });
      }
    }
    await page.close();
  }
  await browser.close();
  await writeFile(outPath, JSON.stringify({ scannedAt: new Date().toISOString(), hits }, null, 2));
  console.log(JSON.stringify({ ok: hits.length === 0, hits: hits.length, outPath }, null, 2));
  if (hits.length) process.exitCode = 1;
} finally {
  if (srv) srv.kill('SIGTERM');
}
