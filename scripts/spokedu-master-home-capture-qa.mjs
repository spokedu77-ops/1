/**
 * 홈 CompactOpsBar 모바일 캡처 3종 QA
 * Usage: node scripts/spokedu-master-home-capture-qa.mjs http://localhost:3000
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPOKEDU_MASTER_QA_EMAIL;
const password = process.env.SPOKEDU_MASTER_QA_PASSWORD || process.env.SPM_QA_PASSWORD;
if (!email || !password) throw new Error('QA login env missing');

const OUT = path.join(process.cwd(), 'tmp', 'home-capture-qa');
const LONG_TITLE =
  '미취학·초등 혼합반을 위한 반응·균형·협동 통합 수업 — 좁은 교실에서도 바로 펼치는 현장 준비형 프로그램';

function seoulDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

async function ensurePasswordForm(page) {
  const passwordLogin = page.getByRole('button', { name: /비밀번호로 로그인|기존 계정으로 로그인/ });
  if (await passwordLogin.isVisible().catch(() => false)) {
    await passwordLogin.click();
    await page.waitForTimeout(400);
  }
  await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15_000 });
}

async function login(page) {
  await page.goto(`${BASE}/login?next=${encodeURIComponent('/spokedu-master/dashboard')}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(700);
  await ensurePasswordForm(page);
  await page.locator('input[type="text"], input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  const submit = page.locator('button[type="submit"]').filter({ hasText: /login/i });
  await Promise.all([
    page.waitForURL(/\/spokedu-master\//, { timeout: 90_000, waitUntil: 'domcontentloaded' }),
    submit.click(),
  ]);
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

async function waitForDashboardOwner(page) {
  await page.goto(`${BASE}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForSelector('[data-dashboard-section="compact-ops-bar"]', { timeout: 30_000 });
  await page.waitForFunction(
    (qaEmail) => {
      const raw = localStorage.getItem('spokedu-master-store');
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        const profile = (parsed.state ?? parsed).profile;
        const id = profile?.id?.trim();
        const email = (profile?.email || qaEmail || '').trim().toLowerCase();
        return Boolean((id && id !== 'local') || email);
      } catch {
        return false;
      }
    },
    email,
    { timeout: 30_000 },
  );
}

async function applyHomeState(page, mode) {
  await waitForDashboardOwner(page);

  await page.evaluate(
    ({ mode, longTitle, dayKey, qaEmail }) => {
      const CLASS_RECORD_DRAFT_KEY = 'spm-class-record-draft-v1';
      const REPORT_DRAFT_KEY = 'spm-report-draft-v1';
      const QUICK_RECORD_DRAFT_KEY = 'spm-quick-record-draft-v1';

      const raw = localStorage.getItem('spokedu-master-store');
      if (!raw) throw new Error('spokedu-master-store missing');
      const parsed = JSON.parse(raw);
      const state = parsed.state ?? parsed;
      if (!state.profile || typeof state.profile !== 'object') {
        state.profile = {};
      }
      const profile = state.profile;
      if (!profile.email?.trim() && qaEmail) {
        profile.email = qaEmail;
      }
      const resolvedEmail = profile.email?.trim().toLowerCase() || qaEmail.trim().toLowerCase();
      const emailOwnerId = resolvedEmail ? `email:${resolvedEmail}` : null;
      const id = profile?.id?.trim();
      const ownerId = id && id !== 'local' ? `id:${id}` : emailOwnerId;
      if (!ownerId) {
        throw new Error(
          `ownerId missing profile=${JSON.stringify({ id: profile?.id, email: profile?.email })}`,
        );
      }

      const draftKeys = Array.from(
        new Set([
          CLASS_RECORD_DRAFT_KEY,
          REPORT_DRAFT_KEY,
          QUICK_RECORD_DRAFT_KEY,
          `${CLASS_RECORD_DRAFT_KEY}:${ownerId}`,
          `${REPORT_DRAFT_KEY}:${ownerId}`,
          `${QUICK_RECORD_DRAFT_KEY}:${ownerId}`,
          emailOwnerId ? `${CLASS_RECORD_DRAFT_KEY}:${emailOwnerId}` : null,
          emailOwnerId ? `${REPORT_DRAFT_KEY}:${emailOwnerId}` : null,
          emailOwnerId ? `${QUICK_RECORD_DRAFT_KEY}:${emailOwnerId}` : null,
        ].filter(Boolean)),
      );
      for (const key of draftKeys) sessionStorage.removeItem(key);

      const todayLessonByOwner = { ...(state.todayLessonByOwner || {}) };
      const ownerKeys = Array.from(new Set([ownerId, emailOwnerId].filter(Boolean)));

      if (mode === 'today_long') {
        const assignment = {
          programId: 'qa-long-title-program',
          programTitle: longTitle,
          assignedAt: new Date().toISOString(),
          dayKey,
        };
        for (const key of ownerKeys) todayLessonByOwner[key] = assignment;
      } else if (mode === 'draft') {
        const assignment = {
          programId: 'qa-today-hidden-by-draft',
          programTitle: '오늘 수업(가려져야 함)',
          assignedAt: new Date().toISOString(),
          dayKey,
        };
        for (const key of ownerKeys) todayLessonByOwner[key] = assignment;
        sessionStorage.setItem(
          `${CLASS_RECORD_DRAFT_KEY}:${ownerId}`,
          JSON.stringify({
            selectedProgramId: 'qa-draft-program',
            classMemo: '작성 중 — draft가 today보다 앞에 와야 한다',
            classId: 'QA반',
            attendance: { s1: 'present' },
          }),
        );
      } else if (mode === 'empty') {
        for (const key of ownerKeys) delete todayLessonByOwner[key];
      }

      state.todayLessonByOwner = todayLessonByOwner;
      localStorage.setItem('spokedu-master-store', JSON.stringify(parsed));
    },
    { mode, longTitle: LONG_TITLE, dayKey: seoulDayKey(), qaEmail: email },
  );

  await page.goto(`${BASE}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForSelector('[data-dashboard-section="compact-ops-bar"]', { timeout: 20_000 });
  await page.waitForTimeout(800);
}

async function measureBar(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-dashboard-section="compact-ops-bar"]');
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    const kind = bar.getAttribute('data-anchor-kind');
    const titleEl = bar.querySelector('p.truncate, p.min-w-0');
    const title = titleEl?.textContent?.trim() ?? '';
    const titleOverflow =
      titleEl instanceof HTMLElement ? titleEl.scrollWidth > titleEl.clientWidth + 1 : false;
    return {
      kind,
      height: Math.round(rect.height),
      title,
      titleOverflow,
      text: bar.textContent?.replace(/\s+/g, ' ').trim().slice(0, 220) ?? '',
    };
  });
}

async function capture(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = await measureBar(page);
  return { file, metrics };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const report = [];
  try {
    await login(page);

    await applyHomeState(page, 'today_long');
    report.push({
      id: '1-today-long',
      ...(await capture(page, '1-today-long')),
      checks: {
        expectKind: 'today_lesson',
        maxHeight: 84,
      },
    });

    await applyHomeState(page, 'draft');
    report.push({
      id: '2-draft-priority',
      ...(await capture(page, '2-draft-priority')),
      checks: {
        expectKind: 'record_draft',
        maxHeight: 84,
      },
    });

    await applyHomeState(page, 'empty');
    report.push({
      id: '3-empty',
      ...(await capture(page, '3-empty')),
      checks: {
        expectKind: 'empty',
        maxHeight: 84,
      },
    });
  } finally {
    await browser.close();
  }

  const summary = report.map((row) => {
    const kindOk = row.metrics?.kind === row.checks.expectKind;
    const heightOk = typeof row.metrics?.height === 'number' && row.metrics.height <= row.checks.maxHeight;
    return {
      id: row.id,
      file: row.file,
      kind: row.metrics?.kind,
      height: row.metrics?.height,
      title: row.metrics?.title,
      titleOverflow: row.metrics?.titleOverflow,
      kindOk,
      heightOk,
      text: row.metrics?.text,
      pass: kindOk && heightOk,
    };
  });

  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify({ out: OUT, summary }, null, 2));
  if (summary.some((row) => !row.pass)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
