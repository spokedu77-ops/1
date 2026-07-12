import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');
const MANUAL_ONLY = process.argv.includes('--manual-only');
const MOCK_ACTIVATION = process.argv.includes('--mock-activation');
const SKIP_SERVER = process.argv.includes('--skip-server-check');

const QA_ID = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPM_QA_ID || '';
const QA_PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD || process.env.SPM_QA_PASSWORD || '';
const PAYMENT_QA_ID =
  process.env.SPOKEDU_MASTER_QA_SECONDARY_ID ||
  process.env.SPM_QA_EXPIRED_EMAIL ||
  'spm.qa.expired@spokedu.test';
const PAYMENT_QA_PASSWORD =
  process.env.SPOKEDU_MASTER_QA_SECONDARY_PASSWORD ||
  process.env.SPM_QA_EXPIRED_PASSWORD ||
  QA_PASSWORD;
const PLAN = process.env.SPOKEDU_MASTER_PAYMENT_E2E_PLAN === 'premium' ? 'premium' : 'lite';
const AUTH_KEY = process.env.SPOKEDU_MASTER_PAYMENT_E2E_AUTH_KEY || '';
const CUSTOMER_KEY = process.env.SPOKEDU_MASTER_PAYMENT_E2E_CUSTOMER_KEY || '';

const TOSS_CLIENT = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';
const TOSS_SECRET = process.env.TOSS_SECRET_KEY || '';

function log(step, detail = '') {
  console.log(detail ? `[payment-e2e] ${step} — ${detail}` : `[payment-e2e] ${step}`);
}

function fail(message) {
  console.error(`[payment-e2e] FAIL: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function isTestTossKey(value) {
  return /^test_/i.test(value);
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

async function login(context, { id = PAYMENT_QA_ID, password = PAYMENT_QA_PASSWORD, next = `/spokedu-master/payment?plan=${PLAN}` } = {}) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login?next=${encodeURIComponent(next)}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.locator('input[type="text"], input[type="email"]').first().fill(id);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/spokedu-master\//, { timeout: 90_000, waitUntil: 'domcontentloaded' });
  await page.close();
}

async function fetchJson(context, path) {
  const response = await context.request.get(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  return { status: response.status(), body };
}

async function postJson(context, path, payload) {
  const response = await context.request.post(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    data: payload,
  });
  const body = await response.json().catch(() => null);
  return { status: response.status(), body };
}

async function verifyAccessAfterPayment(context, plan) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const { status, body } = await fetchJson(context, '/api/spokedu-master/access');
    if (status === 200 && body?.allowed === true && body?.plan === plan) {
      assert(body.canUseLibrary === true, 'canUseLibrary is false after payment');
      assert(body.onboardingDone === true, 'onboardingDone is false after paid activation');
      log('access verified', `plan=${plan} attempt=${attempt}`);
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  fail('access did not activate after billing/issue');
}

function activeAccessSnapshot(plan) {
  const periodEnd = new Date(Date.now() + 10_000 * 60_000).toISOString();
  return {
    authenticated: true,
    allowed: true,
    onboardingDone: true,
    plan,
    subscriptionStatus: 'active',
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    isAdmin: false,
    isCenterOrTeam: false,
    canUseLibrary: true,
    canUseClassTools: true,
    canUseRecords: true,
    canUseSpomove: plan === 'premium',
  };
}

async function runMockActivation(context, plan) {
  const page = await context.newPage();
  let billingCalls = 0;
  let accessCalls = 0;

  await page.route('**/api/spokedu-master/payment/billing/issue', async (route) => {
    billingCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        alreadyConfirmed: false,
        plan,
        periodEnd: new Date(Date.now() + 10_000 * 60_000).toISOString(),
      }),
    });
  });
  await page.route('**/api/spokedu-master/access', async (route) => {
    accessCalls += 1;
    if (accessCalls === 1) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, allowed: false, code: 'subscription_required' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activeAccessSnapshot(plan)),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });
  await page.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan,
        status: 'active',
        isAdmin: false,
        periodEnd: new Date(Date.now() + 10_000 * 60_000).toISOString(),
        trialEndsAt: null,
      }),
    });
  });

  await page.goto(
    `${BASE}/spokedu-master/payment/success?plan=${plan}&authKey=auth_mock_no_toss&customerKey=spm_mock_no_toss`,
    { waitUntil: 'domcontentloaded' },
  );
  await page.getByText('결제가 완료되었습니다').waitFor({ state: 'visible', timeout: 15_000 });
  assert(billingCalls === 1, `billing/issue mock was called ${billingCalls} times`);
  assert(accessCalls >= 2, `access polling mock was called ${accessCalls} times`);

  const libraryLink = page.locator('a[href="/spokedu-master/library"]').first();
  await libraryLink.waitFor({ state: 'visible', timeout: 10_000 });
  await libraryLink.click();
  await page.waitForURL(/\/spokedu-master\/library/, { timeout: 15_000 });
  log('mock-activation', `success UI + library navigation ok (plan=${plan}, no Toss)`);
  await page.close();
}

function printManualTossSteps(plan) {
  console.log('\n[payment-e2e] MANUAL TOSS SANDBOX STEPS');
  console.log(`1. Open ${BASE}/spokedu-master/payment?plan=${plan}`);
  console.log('2. Log in with the disposable QA account if needed.');
  console.log(`3. Select ${plan === 'lite' ? 'Lite' : 'Premium'} and complete Toss test billing auth.`);
  console.log('4. On success redirect, confirm dashboard CTA and library entry.');
  console.log('5. Optional API replay (same browser session cookies required):');
  console.log('   set SPOKEDU_MASTER_PAYMENT_E2E_PLAN=lite|premium');
  console.log('   set SPOKEDU_MASTER_PAYMENT_E2E_AUTH_KEY=<authKey from success URL>');
  console.log('   set SPOKEDU_MASTER_PAYMENT_E2E_CUSTOMER_KEY=<customerKey from success URL>');
  console.log(`   node scripts/spokedu-master-staging-payment-e2e.mjs ${BASE} --complete-billing\n`);
}

async function main() {
  log('base', BASE);

  assert(QA_PASSWORD, 'SPOKEDU_MASTER_QA_PASSWORD (or SPM_QA_PASSWORD) is required');
  assert(PAYMENT_QA_ID && PAYMENT_QA_PASSWORD, 'payment QA credentials are required (secondary/expired account)');
  assert(isTestTossKey(TOSS_CLIENT), 'NEXT_PUBLIC_TOSS_CLIENT_KEY must be a Toss test key');
  assert(isTestTossKey(TOSS_SECRET), 'TOSS_SECRET_KEY must be a Toss test key');

  if (!SKIP_SERVER) {
    await assertServerReachable();
    log('server', 'reachable');
  }

  if (MANUAL_ONLY) {
    printManualTossSteps(PLAN);
    return;
  }

  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

  try {
    await login(context);
    log('login', `ok (${PAYMENT_QA_ID})`);

    const profile = await fetchJson(context, '/api/spokedu-master/profile');
    assert(profile.status === 200, `profile API returned ${profile.status}`);
    log('profile', `onboardingDone=${profile.body?.onboardingDone === true}`);

    const subscriptionBefore = await fetchJson(context, '/api/spokedu-master/subscription');
    assert(subscriptionBefore.status === 200, `subscription API returned ${subscriptionBefore.status}`);
    log('subscription-before', `plan=${subscriptionBefore.body?.plan ?? 'unknown'} status=${subscriptionBefore.body?.status ?? 'unknown'}`);

    const accessBefore = await fetchJson(context, '/api/spokedu-master/access');
    log('access-before', `status=${accessBefore.status} allowed=${accessBefore.body?.allowed === true}`);

    const paymentPage = await context.newPage();
    await paymentPage.goto(`${BASE}/spokedu-master/payment?plan=${PLAN}`, { waitUntil: 'domcontentloaded' });
    await paymentPage.waitForLoadState('networkidle').catch(() => undefined);
    const paymentText = await paymentPage.locator('body').innerText();
    assert(/이용권|라이트|프리미엄/.test(paymentText), 'payment page did not render plan copy');
    assert(await paymentPage.locator(`button[data-plan-id="${PLAN}"]`).count() >= 1, `${PLAN} plan button missing`);
    await paymentPage.waitForFunction(() => typeof window.TossPayments === 'function', undefined, { timeout: 15_000 }).catch(() => {
      fail('TossPayments SDK did not load on payment page');
    });
    log('payment-page', `Toss SDK loaded, plan=${PLAN}`);
    await paymentPage.close();

    if (MOCK_ACTIVATION) {
      await runMockActivation(context, PLAN);
      console.log(JSON.stringify({
        ok: true,
        phase: 'mock-activation',
        plan: PLAN,
        tossRequired: false,
        verified: ['billing-issue-mock', 'access-retry-mock', 'success-ui', 'library-navigation'],
      }));
      return;
    }

    if (process.argv.includes('--complete-billing')) {
      assert(AUTH_KEY && CUSTOMER_KEY, 'SPOKEDU_MASTER_PAYMENT_E2E_AUTH_KEY and CUSTOMER_KEY are required for --complete-billing');
      const issue = await postJson(context, '/api/spokedu-master/payment/billing/issue', {
        planId: PLAN,
        authKey: AUTH_KEY,
        customerKey: CUSTOMER_KEY,
      });
      assert(issue.status === 200 && issue.body?.ok === true, `billing/issue failed: status=${issue.status}`);
      log('billing-issue', `plan=${issue.body?.plan ?? PLAN}`);

      const access = await verifyAccessAfterPayment(context, PLAN);
      const libraryPage = await context.newPage();
      await libraryPage.goto(`${BASE}/spokedu-master/library`, { waitUntil: 'domcontentloaded' });
      await libraryPage.waitForLoadState('networkidle').catch(() => undefined);
      const libraryText = await libraryPage.locator('body').innerText();
      assert(!/이용권이 필요/.test(libraryText), 'library still gated after payment');
      log('library', 'accessible after payment');
      await libraryPage.close();

      const profileAfter = await fetchJson(context, '/api/spokedu-master/profile');
      assert(profileAfter.body?.onboardingDone === true, 'profile onboardingDone not persisted after payment');
      log('profile-after', 'onboardingDone=true');

      console.log(JSON.stringify({ ok: true, phase: 'full-billing', plan: PLAN, canUseLibrary: access.canUseLibrary }));
      return;
    }

    printManualTossSteps(PLAN);
    console.log(JSON.stringify({
      ok: true,
      phase: 'preflight',
      plan: PLAN,
      profileOk: profile.status === 200,
      tossSdkOk: true,
      accessBefore: accessBefore.body?.allowed === true,
      next: 'complete Toss sandbox manually, then rerun with --complete-billing and authKey/customerKey env vars',
    }));
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
