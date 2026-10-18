#!/usr/bin/env node
/**
 * E15 — authenticated /admin/consult (API + UI). No auth bypass.
 * Exit: 0 PASS | 1 FAIL | 2 BLOCKED (missing creds or DB safety)
 */
import nextEnv from '@next/env';
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { assertContactE2eDbSafety } from '../lib/contact-e2e-db-safety.mjs';

const closureDir = path.dirname(fileURLToPath(import.meta.url));
const integratedDir = path.resolve(closureDir, '../../integrated-release-review');
const capDir = path.join(integratedDir, 'captures');
const repoRoot = path.resolve(closureDir, '../../../..');
nextEnv.loadEnvConfig(repoRoot);

const port = process.env.CONTACT_QA_PORT ?? '3035';
const base = `http://127.0.0.1:${port}`;

const evidence = {
  port,
  BUILD_ID: null,
  outcome: 'BLOCKED',
  E15: 'BLOCKED',
  checks: [],
  cleanup: { deletes: [], verify: [] },
  seedConsultId: null,
  seedMarker: null,
};

function exitBlocked(reason) {
  evidence.outcome = 'BLOCKED';
  evidence.E15 = 'BLOCKED';
  evidence.blockedReason = reason;
  return 2;
}

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/login`)).status < 500) return;
    } catch {
      /* */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('server timeout');
}

async function cleanupSeed(sb, consultId) {
  if (!consultId || !sb) return true;
  const del = await sb.from('consultations').delete().eq('id', consultId);
  evidence.cleanup.deletes.push({ table: 'consultations', id: consultId, error: del.error?.message ?? null });
  const row = await sb.from('consultations').select('id').eq('id', consultId).maybeSingle();
  const gone = !row.data?.id;
  evidence.cleanup.verify.push({ table: 'consultations', id: consultId, gone, error: row.error?.message ?? null });
  return gone && !del.error;
}

let srv;
let sb;
let exitCode = 2;

try {
  await mkdir(capDir, { recursive: true });
  await mkdir(integratedDir, { recursive: true });

  const adminEmail = process.env.CONTACT_E2E_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.CONTACT_E2E_ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) {
    exitCode = exitBlocked('CONTACT_E2E_ADMIN_EMAIL or CONTACT_E2E_ADMIN_PASSWORD not configured');
    throw new Error('blocked-credentials');
  }

  let safety;
  try {
    safety = assertContactE2eDbSafety();
    evidence.safety = safety;
  } catch (e) {
    exitCode = exitBlocked(String(e.message ?? e));
    throw e;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  sb = createClient(url, key, { auth: { persistSession: false } });

  if (process.env.CONTACT_E2E_NO_SPAWN !== '1') {
    srv = spawn('npm run start', {
      cwd: repoRoot,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: port },
    });
  }
  await waitServer();
  evidence.BUILD_ID = (await readFile(path.join(repoRoot, '.next', 'BUILD_ID'), 'utf8').catch(() => '')).trim();

  // E14 — before login
  const unauth = await fetch(`${base}/api/admin/consult?limit=5`);
  evidence.checks.push({ id: 'E14', status: unauth.status === 401 ? 'PASS' : 'FAIL', http: unauth.status });

  const marker = process.env.CONTACT_E2E_ADMIN_MARKER?.trim() || `[E15-${Date.now().toString(36).toUpperCase()}]`;
  evidence.seedMarker = marker;
  const seedName = `합성관리자QA ${marker}`;

  const seedRes = await fetch(`${base}/api/private/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'private',
      name: seedName,
      phone: `0105555${String(Date.now()).slice(-4)}`,
      content: `${marker} E15 admin inbox seed`,
      preferred_format: 'undecided',
      cta_intent_id: 'private_fit_consult',
      acquisition: { entrySurface: 'direct' },
    }),
  });
  const seedJson = await seedRes.json().catch(() => null);
  evidence.seedConsultId = seedJson?.leadId ?? null;
  evidence.seedHttp = { status: seedRes.status, ok: seedJson?.ok ?? false };
  if (!evidence.seedConsultId) {
    exitCode = 1;
    evidence.E15 = 'FAIL';
    evidence.outcome = 'FAIL';
    throw new Error('seed create failed');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${base}/login?type=admin&next=${encodeURIComponent('/admin/consult')}`, {
    waitUntil: 'load',
    timeout: 60000,
  });
  await page.locator('input[type="email"], input[name="email"]').first().fill(adminEmail);
  await page.locator('input[type="password"]').first().fill(adminPassword);
  await page.getByRole('button', { name: /로그인|login/i }).click();
  await page.waitForTimeout(3000);

  await page.goto(`${base}/admin/consult`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000);

  const onLoginPage = page.url().includes('/login');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const uiListHit =
    !onLoginPage &&
    (bodyText.includes('합성관리자QA') || bodyText.includes(marker.replace(/[[\]]/g, '').slice(0, 12)));

  await page.screenshot({ path: path.join(capDir, 'admin-e15-inbox.png'), fullPage: false });

  const apiRes = await page.request.get(`${base}/api/admin/consult?limit=50`);
  const apiJson = await apiRes.json().catch(() => null);
  const row = Array.isArray(apiJson?.rows)
    ? apiJson.rows.find((r) => r.id === evidence.seedConsultId)
    : null;
  const inApiList = Boolean(row);
  const apiTypeOk = row ? row.consult_type === 'tutoring' || row.summary : false;

  let detailOk = false;
  if (inApiList && !onLoginPage) {
    const detailRes = await page.request.get(
      `${base}/api/admin/consult/${encodeURIComponent(evidence.seedConsultId)}`,
    );
    const detailJson = await detailRes.json().catch(() => null);
    detailOk =
      detailRes.status() === 200 &&
      detailJson?.ok === true &&
      String(detailJson?.row?.content ?? detailJson?.row?.summary ?? '').length > 0;
    evidence.checks.push({
      id: 'E15-detail-api',
      status: detailOk ? 'PASS' : 'FAIL',
      http: detailRes.status(),
    });
  }

  evidence.checks.push({
    id: 'E15',
    status:
      !onLoginPage && inApiList && uiListHit && apiRes.status() === 200 && detailOk ? 'PASS' : 'FAIL',
    onLoginPage,
    adminApiStatus: apiRes.status(),
    inApiList,
    uiListHit,
    detailOk,
    url: page.url(),
  });

  await browser.close();

  const e15Pass =
    evidence.checks.find((c) => c.id === 'E15')?.status === 'PASS' &&
    evidence.checks.find((c) => c.id === 'E14')?.status === 'PASS';

  evidence.E15 = e15Pass ? 'PASS' : 'FAIL';
  evidence.outcome = e15Pass ? 'PASS' : 'FAIL';
  exitCode = e15Pass ? 0 : 1;
} catch (e) {
  if (String(e.message) === 'blocked-credentials') {
    /* exitCode already 2 */
  } else if (evidence.outcome !== 'BLOCKED' && evidence.outcome !== 'FAIL') {
    evidence.error = String(e.message ?? e);
    evidence.outcome = 'FAIL';
    evidence.E15 = 'FAIL';
    exitCode = 1;
  }
} finally {
  if (sb && evidence.seedConsultId) {
    const cleanupOk = await cleanupSeed(sb, evidence.seedConsultId);
    if (!cleanupOk && evidence.outcome === 'PASS') {
      evidence.outcome = 'FAIL';
      evidence.E15 = 'FAIL';
      evidence.cleanupFailure = true;
      exitCode = 1;
    }
  }
  if (srv) srv.kill('SIGTERM');

  await writeFile(path.join(closureDir, 'ADMIN_QA_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  await writeFile(path.join(integratedDir, 'ADMIN_E15_EVIDENCE.json'), JSON.stringify(evidence, null, 2));
  console.log(
    JSON.stringify(
      { outcome: evidence.outcome, E15: evidence.E15, exitCode, blockedReason: evidence.blockedReason ?? null },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}
