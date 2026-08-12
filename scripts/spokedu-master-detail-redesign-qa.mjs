import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const SHOULD_SERVE = process.argv.includes('--serve');
const BASE = (process.argv[2] || (SHOULD_SERVE ? 'http://localhost:3003' : 'http://localhost:3000')).replace(/\/$/, '');
const OWNER_ID = '11111111-1111-4111-8111-111111111111';

const fullProgram = {
  id: 'detail-redesign-full',
  title: '아주 긴 프로그램 제목으로 확인하는 다리 사이 골대 활동',
  category: '도전형',
  grade: '미취학, 초등학생 이상',
  space: '체육관, 교실',
  description: '움직이는 상대를 관찰하며 타이밍을 맞춰 공을 통과시키는 활동입니다.',
  steps: ['정지된 목표물을 향해 패스합니다.', '상대가 움직이는 상황에서 타이밍을 맞춥니다.', '열리는 순간을 판단해 공을 통과시킵니다.', '역할을 바꾸어 같은 순서로 반복합니다.', '신호에 맞춰 방향을 바꿉니다.'],
  equipment: ['라바콘 3개', '원마커 2개', '공 1개', '긴 준비물 이름도 화면 밖으로 넘치지 않는지 확인하는 항목'],
  tags: ['신체 기능:순발력', '신체 기능:협응력', '움직임:정적'],
  colors: ['#1d4ed8', '#2563eb', '#60a5fa', '#dbeafe'],
  isPro: false,
  isNew: false,
  lessonDetail: {
    recommendedAge: '미취학, 초등학생 이상',
    recommendedPlayers: '개인전',
    objective: '상대의 움직임을 관찰하고 적절한 타이밍에 공을 보냅니다.',
    developmentFocus: '순발력 / 협응력',
    coachScript: '친구의 움직임을 먼저 보고 공을 보낼 순간을 찾아보세요.\n공을 세게 차는 것보다 정확한 타이밍이 중요합니다.',
    parentNote: '오늘은 움직임을 관찰하고 타이밍을 조절하는 활동을 했습니다.',
    fieldTips: ['공보다 상대 움직임을 먼저 보게 합니다.', '충분한 간격을 유지합니다.'],
    variations: ['쉽게: 목표물을 고정합니다.', '어렵게: 목표물의 이동 속도를 높입니다.'],
    safetyNotes: ['공을 차기 전에 앞 공간을 확인합니다.'],
    relatedSpomoveIds: [],
    setupImageUrl: '/images/spokedu-master/programs/funstick-fencing/setup.png',
    briefingNotes: ['활동 전에 인사이드 패스를 연습합니다.'],
    setupNotes: ['라바콘으로 시작선과 목표 구역을 표시합니다.'],
  },
};

const minimalProgram = {
  ...fullProgram,
  id: 'detail-redesign-minimal',
  title: '준비물이 적은 활동',
  steps: ['한 단계로 진행합니다.'],
  equipment: ['공 1개'],
  lessonDetail: {
    ...fullProgram.lessonDetail,
    setupImageUrl: undefined,
    variations: [],
    fieldTips: [],
    safetyNotes: [],
    briefingNotes: [],
    setupNotes: [],
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function storeValue() {
  return JSON.stringify({ state: { profile: { id: OWNER_ID, name: 'QA', email: 'qa@example.com', school: 'QA', avatarColor: '#312e81', plan: 'premium', role: 'teacher', centerId: null, centerName: null, ageGroups: [], programTypes: [], onboardingDone: true, trialEndsAt: null, createdAt: new Date().toISOString(), subscriptionStatus: 'active' }, programs: [], programsLoaded: false, programsError: null, operational: { online: true, lastSyncAt: null, retryQueue: [] }, recentProgramActivities: [], favoriteProgramIdsByOwner: {}, todayLessonByOwner: {} }, version: 12 });
}

async function installMocks(page) {
  await page.route('**/api/spokedu-master/access', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, allowed: true, onboardingDone: true, plan: 'premium', subscriptionStatus: 'active', isAdmin: false, canUseLibrary: true, canUseClassTools: true, canUseRecords: true, canUseSpomove: true }) }));
  await page.route('**/api/spokedu-master/subscription', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: 'premium', status: 'active', userId: OWNER_ID }) }));
  await page.route('**/api/spokedu-master/programs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [fullProgram, minimalProgram] }) }));
  await page.route('**/api/spokedu-master/students', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/class-records**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/operational-data**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ students: [], classRecords: [] }) }));
  await page.route('**/api/spokedu-master/program-favorites**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
  await page.route('**/api/spokedu-master/profile**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }));
  await page.route('**/api/spokedu-master/client-errors**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route('**/api/spokedu-master/explanations**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) }));
}

async function checkViewport(browser, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([{ name: 'spm-qa-auth-bypass', value: '1', url: BASE, sameSite: 'Lax' }]);
  await context.addInitScript((value) => localStorage.setItem('spokedu-master-store', value), storeValue());
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  await installMocks(page);
  await page.goto(`${BASE}/spokedu-master/library/${fullProgram.id}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('h1').waitFor({ state: 'visible', timeout: 20_000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('img[alt*="초기 교구 세팅"]');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  }, undefined, { timeout: 20_000 }).catch(() => false);
  const labels = ['테마', '대상', '기능', '움직임', '공간', '인원'];
  for (const label of labels) assert(await page.getByText(label, { exact: true }).count() > 0, `missing taxonomy: ${label}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!overflow, `horizontal overflow at ${viewport.width}px`);
  await mkdir('tmp/spokedu-master-detail-redesign', { recursive: true });
  await page.screenshot({ path: `tmp/spokedu-master-detail-redesign/detail-${viewport.width}.png`, fullPage: true });
  assert(await page.getByRole('link', { name: /수업 기록 시작/ }).count() === 1, 'primary record action missing');
  assert(await page.getByRole('button', { name: /오늘 수업으로 지정/ }).count() === 1, 'today lesson action missing');
  assert(await page.getByRole('button', { name: /빠른 기록/ }).count() === 1, 'quick record action missing');
  assert(await page.getByRole('link', { name: /안내문/ }).count() >= 1, 'report action missing');
  assert(await page.getByRole('button', { name: /지도안 복사/ }).count() === 1, 'copy action missing');
  assert(await page.locator('ol').filter({ hasText: '정지된 목표물' }).locator('li').count() === 5, 'variable steps not rendered');
  await page.getByRole('button', { name: '이미지 확대' }).click();
  assert(await page.getByRole('dialog').count() === 1, 'image dialog did not open');
  await page.keyboard.press('Escape');
  assert(await page.getByRole('dialog').count() === 0, 'image dialog did not close with Escape');
  const appConsoleErrors = consoleErrors.filter((message) => !/ERR_NETWORK_ACCESS_DENIED/.test(message));
  assert(appConsoleErrors.length === 0, `console errors: ${appConsoleErrors.join(' | ')}; responses: ${failedResponses.join(' | ')}`);
  if (viewport.width === 1024) {
    const minimalPage = await context.newPage();
    await installMocks(minimalPage);
    await minimalPage.goto(`${BASE}/spokedu-master/library/${minimalProgram.id}`, { waitUntil: 'domcontentloaded' });
    await minimalPage.locator('h1').waitFor({ state: 'visible' });
    assert(await minimalPage.getByText('난이도 조절 · 변형 활동', { exact: true }).count() === 0, 'empty variation section rendered');
    const minimalOverflow = await minimalPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!minimalOverflow, `minimal page overflow at ${viewport.width}px`);
  }
  await context.close();
  return { viewport, taxonomy: 6, steps: 5, imageDialog: true, optionalSectionHidden: true };
}

let serverProcess;
if (SHOULD_SERVE) {
  serverProcess = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm.cmd run dev -- -p ${new URL(BASE).port}`], {
    cwd: process.cwd(),
    env: { ...process.env, SPOKEDU_MASTER_QA_BYPASS_AUTH: '1' },
    windowsHide: true,
    stdio: 'inherit',
  });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`${BASE}/spokedu-master`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  const widthArgument = process.argv.find((argument) => argument.startsWith('--widths='));
  const requestedWidths = new Set((widthArgument?.split('=')[1] || '390,768,1024,1440').split(',').map(Number));
  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1024, height: 900 }, { width: 1440, height: 1000 }].filter(({ width }) => requestedWidths.has(width))) {
    results.push(await checkViewport(browser, viewport));
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await browser.close();
  if (serverProcess?.pid) spawnSync('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F'], { stdio: 'ignore' });
}
