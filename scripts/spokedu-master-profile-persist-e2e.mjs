import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const SKIP_SERVER = process.argv.includes('--skip-server-check');

const QA_ID = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPM_QA_ID || '';
const QA_PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD || process.env.SPM_QA_PASSWORD || '';
const MARKER = `QA${Date.now().toString().slice(-10)}`;
const LOGIN_TIMEOUT_MS = 45_000;
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

async function gotoLogin(page, nextPath) {
  const loginUrl = `${BASE}/login?next=${encodeURIComponent(nextPath)}`;
  await page.goto(loginUrl, { waitUntil: 'commit', timeout: 30_000 });
  await page.waitForTimeout(700);
}

async function ensurePasswordForm(page) {
  const passwordLogin = page.getByRole('button', { name: '기존 계정으로 로그인' });
  if (await passwordLogin.isVisible().catch(() => false)) {
    await passwordLogin.click();
    await page.waitForTimeout(400);
  }
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15_000 });
}

async function login(context, nextPath = '/spokedu-master/landing') {
  let lastError = 'unknown';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const page = await context.newPage();
    try {
      page.setDefaultTimeout(15_000);
      page.setDefaultNavigationTimeout(30_000);
      await gotoLogin(page, nextPath);
      await ensurePasswordForm(page);
      await page.locator('input[type="text"], input[type="email"]').first().fill(QA_ID);
      await page.locator('input[type="password"]').first().fill(QA_PASSWORD);
      const submit = page.locator('button[type="submit"]').filter({ hasText: /login/i });
      await submit.waitFor({ state: 'visible', timeout: 15_000 });
      await Promise.all([
        page.waitForURL(/\/spokedu-master\//, { timeout: LOGIN_TIMEOUT_MS }),
        submit.click(),
      ]);
      await page.close();
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await page.close().catch(() => undefined);
      if (attempt < 3) {
        log('login-retry', `attempt ${attempt} failed (${lastError})`);
        await new Promise((resolve) => setTimeout(resolve, LOGIN_RETRY_DELAY_MS));
      }
    }
  }
  fail(`login failed after 3 attempts: ${lastError}`);
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
  assert(QA_ID && QA_PASSWORD, 'SPOKEDU_MASTER_QA_ID and SPOKEDU_MASTER_QA_PASSWORD are required');
  if (!SKIP_SERVER) {
    await assertServerReachable();
    log('server', 'reachable');
  }

  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  const writer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await login(writer);
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
    await login(reader);
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
