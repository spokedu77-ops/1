/**
 * Single persistent Playwright session for SPOKEDU LAB perf (no storage-state.json injection).
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { readMasterQaAccess } from './spokedu-master-auth-state.mjs';

export const PERF_USER_DATA_DIR = process.env.SPOKEDU_PERF_PROFILE_DIR
  ? path.resolve(process.env.SPOKEDU_PERF_PROFILE_DIR)
  : path.join(process.cwd(), '.tmp', 'spokedu-lab-perf-chrome-profile');
export const PERF_VIEWPORT = { width: 390, height: 844 };

export async function launchPerfPersistentContext({ headless = false } = {}) {
  await mkdir(PERF_USER_DATA_DIR, { recursive: true });
  return chromium.launchPersistentContext(PERF_USER_DATA_DIR, {
    channel: 'chrome',
    headless,
    viewport: PERF_VIEWPORT,
    locale: 'ko-KR',
    args: ['--disable-dev-shm-usage'],
  });
}

export async function probeQaAccess(context, baseUrl) {
  const { status, snapshot } = await readMasterQaAccess(context, baseUrl);
  return {
    ok: status === 200 && snapshot?.authenticated === true,
    status,
    canUseLibrary: snapshot?.canUseLibrary === true,
  };
}

/**
 * Login phase: opens spokedu-lab login until /access is 200. No token logging.
 * Reuses the same persistent profile on later runs (refresh stays in browser).
 */
export async function ensureQaLoginInPersistentContext(context, baseUrl, { loginBaseUrl } = {}) {
  const authUrl = (loginBaseUrl || baseUrl).replace(/\/$/, '');
  const benchUrl = baseUrl.replace(/\/$/, '');
  if (new URL(authUrl).hostname === '127.0.0.1' || new URL(benchUrl).hostname === '127.0.0.1') {
    throw new Error('Use http://localhost — QA cookies are scoped to hostname "localhost".');
  }

  let probe = await probeQaAccess(context, benchUrl);
  if (probe.ok && probe.canUseLibrary) {
    console.log(JSON.stringify({ stage: 'login', ok: true, method: 'persistent-profile', accessStatus: 200, secretLogged: false }));
    return probe;
  }

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(
    `${authUrl}/spokedu-lab/login?next=${encodeURIComponent('/spokedu-lab/dashboard')}`,
    { waitUntil: 'domcontentloaded', timeout: 120_000 },
  );

  console.log('── QA 로그인 단계 ──');
  console.log('Playwright 전용 창에서 spokedu-lab QA 계정으로 로그인하세요.');
  console.log('일반 Chrome 로그인과 세션은 공유되지 않습니다.');
  console.log('로그인 성공 시 자동으로 벤치 단계로 진행합니다 (토큰·쿠키는 로그하지 않음).');

  const started = Date.now();
  let lastHint = 0;
  while (true) {
    probe = await probeQaAccess(context, benchUrl);
    if (probe.ok && probe.canUseLibrary) {
      console.log(JSON.stringify({
        stage: 'login',
        ok: true,
        method: 'interactive-persistent',
        accessStatus: 200,
        waitedMs: Date.now() - started,
        secretLogged: false,
      }));
      return probe;
    }
    const now = Date.now();
    if (now - lastHint > 30_000) {
      lastHint = now;
      console.log(`… 로그인 대기 중 (access HTTP ${probe.status}, ${Math.round((now - started) / 1000)}s)`);
    }
    await page.waitForTimeout(2000);
  }
}
