#!/usr/bin/env node
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import nextEnv from '@next/env';
import { measureHeroB5Copy } from '../../../design/phase-1b5-final/home-b5-checks.mjs';

const closureDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(closureDir, '../../../..');
nextEnv.loadEnvConfig(repoRoot);
const port = process.env.HOME_B5_SMOKE_PORT ?? '3030';
const base = `http://127.0.0.1:${port}/spokedu`;

let srv;
try {
  srv = spawn('npm run start', { cwd: repoRoot, shell: true, stdio: 'pipe', env: { ...process.env, PORT: port } });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}`)).status < 500) break;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: 'load', timeout: 60000 });
  const hero = await measureHeroB5Copy(page);
  const buildId = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8').catch(() => '')).trim();
  await browser.close();
  const evidence = { BUILD_ID: buildId, port, hero390: hero, overall: hero.ok ? 'PASS' : 'FAIL' };
  await writeFile(path.join(closureDir, 'HOME_B5_SMOKE_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ overall: evidence.overall }, null, 2));
  if (!hero.ok) process.exit(1);
} finally {
  if (srv) srv.kill('SIGTERM');
}
