#!/usr/bin/env node
/**
 * Equipment UI final QA — visual fixture (always when dev up) + isolated E2E (local Supabase only).
 * Reuses Stage 2.9 test accounts and SSR cookie injection.
 */
import { chromium } from 'playwright';
import { createServerClient } from '@supabase/ssr';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runVisualFixtureQa } from './ui_visual_fixture_qa.mjs';
import { assertLocalQaTarget } from '../../scripts/lib/qa-network-guard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.UI_QA_BASE_URL || 'http://127.0.0.1:3000';
assertLocalQaTarget(BASE);
const OUT_DIR = path.join(__dirname, 'ui_final_qa_screenshots');
const RESULTS_PATH = path.join(__dirname, 'EQUIPMENT_UI_FINAL_QA_RESULTS.json');

const ADMIN_EMAIL = process.env.UI_QA_ADMIN_EMAIL || process.env.STAGE29_ADMIN_EMAIL || 'equip-admin@test.local';
const ADMIN_PASS = process.env.UI_QA_ADMIN_PASSWORD || process.env.STAGE29_TEST_PASSWORD || 'stage2-equip-test-9';
const TEACHER_EMAIL = process.env.UI_QA_TEACHER_EMAIL || process.env.STAGE29_TEACHER_A_EMAIL || 'equip-teachera@test.local';
const TEACHER_PASS = process.env.UI_QA_TEACHER_PASSWORD || process.env.STAGE29_TEST_PASSWORD || 'stage2-equip-test-9';

const results = [];
const log = (section, status, detail = '') => {
  results.push({ section, status, detail });
  console.log(`${status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○'} [${section}] ${status}${detail ? `: ${detail}` : ''}`);
};

function isLocalSupabaseUrl(url) {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local');
  } catch {
    return false;
  }
}

function dockerAvailable() {
  const r = spawnSync('docker', ['info'], { encoding: 'utf8', timeout: 15_000 });
  return r.status === 0;
}

function key(label) {
  return crypto.createHash('sha256').update(`${label}-${Date.now()}`).digest('hex').slice(0, 32);
}

async function injectSupabaseCookies(context, email, password) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('missing Supabase public env');
  const cookies = [];
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookies,
      setAll: (next) => cookies.splice(0, cookies.length, ...next),
    },
  });
  const { error } = await ssr.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  if (!cookies.length) throw new Error('no session cookies');
  await context.addCookies(
    cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      url: BASE,
      httpOnly: cookie.options?.httpOnly,
      secure: BASE.startsWith('https'),
      sameSite:
        cookie.options?.sameSite === 'strict' ? 'Strict' : cookie.options?.sameSite === 'none' ? 'None' : 'Lax',
    })),
  );
}

async function login(page, email, password, type = 'admin') {
  await injectSupabaseCookies(page.context(), email, password);
  await page.goto(`${BASE}/login?type=${type}&next=${encodeURIComponent(type === 'admin' ? '/admin/inventory' : '/teacher/inventory')}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90_000,
  });
  if (page.url().includes('/login')) {
    await page.locator('input[name="spk-account"]').fill(email);
    await page.locator('input[name="spk-secret"]').fill(password);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 90_000 });
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isolated = isLocalSupabaseUrl(supabaseUrl);
  const dockerOk = dockerAvailable();

  log('env_supabase_isolated', isolated ? 'PASS' : 'SKIP', isolated ? 'local URL' : 'remote — mutation blocked');
  log('docker_available', dockerOk ? 'PASS' : 'SKIP', dockerOk ? 'ok' : 'Stage 2.9 DB bootstrap unavailable');

  const health = await fetch(BASE, { method: 'HEAD' }).catch(() => null);
  if (!health?.ok) {
    log('next_dev', 'FAIL', `Cannot reach ${BASE}`);
    writeResults();
    process.exit(2);
  }
  log('next_dev', 'PASS', BASE);

  const visual = await runVisualFixtureQa((section, status, detail) => log(`visual_${section}`, status, detail));
  log(
    'visual_fixture_gate',
    visual.pass ? 'PASS' : 'FAIL',
    visual.pass ? 'VISUAL_FIXTURE_QA_PASS' : 'visual fixture failures',
  );

  const allowMutations = isolated && dockerOk && process.env.UI_QA_ALLOW_MUTATIONS !== '0';
  log(
    'integration_e2e',
    allowMutations ? 'PASS' : 'NOT_VERIFIED',
    allowMutations ? 'local+Docker — attempting Stage29 auth' : 'remote or no Docker — skipped',
  );

  if (!allowMutations) {
    writeResults();
    summarize();
    process.exit(visual.pass ? 0 : 1);
  }

  const stage = spawnSync(process.execPath, [path.join(__dirname, 'stage29_full_e2e.mjs')], {
    env: { ...process.env, STAGE29_BASE_URL: BASE },
    encoding: 'utf8',
    timeout: 300_000,
  });
  log('stage29_full_e2e', stage.status === 0 ? 'PASS' : 'FAIL', `exit=${stage.status}`);
  if (stage.stdout) console.log(stage.stdout.slice(-2000));

  writeResults();
  summarize();
  const fail = results.some((r) => r.status === 'FAIL');
  process.exit(fail ? 1 : 0);
}

function writeResults() {
  fs.writeFileSync(RESULTS_PATH, JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2));
  console.log(`Wrote ${RESULTS_PATH}`);
}

function summarize() {
  console.log(
    `\nSummary: PASS=${results.filter((r) => r.status === 'PASS').length} FAIL=${results.filter((r) => r.status === 'FAIL').length} NOT_VERIFIED=${results.filter((r) => r.status === 'NOT_VERIFIED').length}`,
  );
}

main().catch((e) => {
  log('fatal', 'FAIL', e.message);
  writeResults();
  process.exit(1);
});
