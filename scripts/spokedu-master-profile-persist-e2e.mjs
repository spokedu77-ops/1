import nextEnv from '@next/env';
import { applyMasterAdminSession } from './lib/spokedu-master-admin-auth.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const SKIP_SERVER = process.argv.includes('--skip-server-check');

const QA_ID = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPM_QA_ID || '';
const MARKER = `QA${Date.now().toString().slice(-10)}`;
const LOGIN_RETRY_DELAY_MS = 1_500;

function log(step, detail = '') {
  console.log(detail ? `[profile-persist] ${step} — ${detail}` : `[profile-persist] ${step}`);
}

function fail(message) {
  console.error(`[profile-persist] FAIL: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    fail('playwright is not installed');
  }
}

async function assertServerReachable() {
  const response = await fetch(`${BASE}/login`, { method: 'HEAD', redirect: 'manual' }).catch(() => null);
  assert(response && response.status < 500, `dev server not reachable at ${BASE}`);
}

async function fetchJson(context, path) {
  const response = await context.request.get(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  return { status: response.status(), body };
}

async function patchJson(context, path, payload) {
  const response = await context.request.patch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    data: payload,
  });
  const body = await response.json().catch(() => null);
  return { status: response.status(), body };
}

async function main() {
  assert(QA_ID, 'SPOKEDU_MASTER_QA_ID is required');
  if (!SKIP_SERVER) {
    await assertServerReachable();
    log('server', 'reachable');
  }

  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  const writer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await applyMasterAdminSession(writer, BASE, QA_ID);
    log('session-a', 'login ok');

    const before = await fetchJson(writer, '/api/spokedu-master/profile');
    assert(before.status === 200, `profile GET failed: ${before.status}`);
    const base = before.body?.data ?? {};

    const patch = await patchJson(writer, '/api/spokedu-master/profile', {
      name: MARKER,
      school: base.school ?? 'QA School',
      role: base.role ?? 'teacher',
      ageGroups: base.ageGroups ?? [],
      programTypes: base.programTypes ?? [],
      onboardingDone: true,
    });
    assert(patch.status === 200 && patch.body?.data?.name === MARKER, `profile PATCH failed: ${patch.status}`);
    assert(patch.body?.data?.onboardingDone === true, 'profile PATCH did not persist onboardingDone=true');
    log('patch', 'name + onboardingDone saved');

    const accessA = await fetchJson(writer, '/api/spokedu-master/access');
    assert(accessA.status === 200, `access GET failed: ${accessA.status}`);
    assert(accessA.body?.onboardingDone === true, 'access snapshot did not reflect onboardingDone after PATCH');
    log('access-a', 'onboardingDone=true');
  } finally {
    await writer.clearCookies().catch(() => undefined);
    await writer.close().catch(() => undefined);
  }

  await new Promise((resolve) => setTimeout(resolve, LOGIN_RETRY_DELAY_MS));

  const reader = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await applyMasterAdminSession(reader, BASE, QA_ID);
    log('session-b', 'fresh login ok');

    const profile = await fetchJson(reader, '/api/spokedu-master/profile');
    assert(profile.status === 200, `profile GET in session B failed: ${profile.status}`);
    assert(profile.body?.data?.name === MARKER, 'profile name did not survive a fresh session');
    assert(profile.body?.data?.onboardingDone === true, 'onboardingDone did not survive a fresh session');
    log('profile-b', 'cross-session persist ok');

    const accessB = await fetchJson(reader, '/api/spokedu-master/access');
    assert(accessB.status === 200, `access GET in session B failed: ${accessB.status}`);
    assert(accessB.body?.onboardingDone === true, 'access snapshot lost onboardingDone in fresh session');
    log('access-b', 'onboardingDone=true');
  } finally {
    await reader.close().catch(() => undefined);
  }

  await browser.close().catch(() => undefined);
  console.log(JSON.stringify({
    ok: true,
    verified: ['profile-patch', 'access-after-patch', 'profile-cross-session', 'access-cross-session'],
    marker: MARKER,
  }));
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
