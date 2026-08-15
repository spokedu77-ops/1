import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SHOULD_SERVE = process.argv.includes('--serve');
const baseArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const BASE = (baseArgument || (SHOULD_SERVE ? 'http://localhost:3003' : 'http://localhost:3000')).replace(/\/$/, '');
const OUT = path.join(process.cwd(), 'tmp', 'spokedu-master-detail-final');
const OWNER_ID = '11111111-1111-4111-8111-111111111111';

const program = {
  id: '91001',
  title: '다리 사이 골대 (Leg-Gate Passing: Timed Kick)',
  category: '도전형',
  grade: '미취학, 초등학생 이상',
  space: '체육관',
  description: '상대의 움직임을 관찰하며 공을 통과시키는 활동입니다.',
  steps: [
    '공격자는 일정 거리에서 공을 찹니다.',
    '수비자는 공격자를 등지고 다리를 벌려 골대 역할을 합니다.',
    '열리는 순간을 판단해 공을 통과시키고 역할을 바꿉니다.',
  ],
  equipment: ['라바콘 3개', '원마커 2개', '공 1개'],
  tags: ['협응력', '패스', '움직임:조작운동', '2인 활동', '인원:2명'],
  colors: ['#1d4ed8', '#2563eb', '#60a5fa', '#dbeafe'],
  isPro: false,
  isNew: false,
  lessonDetail: {
    recommendedAge: '미취학, 초등학생 이상',
    recommendedPlayers: '2명',
    objective: '화면에 표시하면 안 되는 수업 목표',
    developmentFocus: '화면에 표시하면 안 되는 핵심 기능',
    coachScript: "오늘 할 '다리 사이 골대'는 친구의 다리 사이를 골대처럼 활용하는 활동이에요. 힘보다 정확한 타이밍에 집중해 보세요.",
    parentNote: '화면에 표시하면 안 되는 안내문',
    fieldTips: ['화면에 표시하면 안 되는 지도 포인트'],
    variations: ['목표물을 고정해 쉽게 시작합니다.', '골대 역할의 이동 속도를 높입니다.'],
    safetyNotes: ['화면에 표시하면 안 되는 별도 안전 섹션'],
    relatedSpomoveIds: ['balance-basic'],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    setupImageUrl: '/images/spokedu-master/programs/funstick-fencing/setup.png',
    briefingNotes: ['활동 전에 인사이드 패스를 연습합니다.', '앞 공간을 확인한 뒤 공을 찹니다.'],
    setupNotes: ['라바콘으로 시작선과 목표 구역을 표시합니다.'],
  },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function storeValue() {
  return JSON.stringify({
    state: {
      profile: { id: OWNER_ID, name: 'QA', email: 'qa@example.com', school: 'QA', avatarColor: '#312e81', plan: 'premium', role: 'teacher', centerId: null, centerName: null, ageGroups: [], programTypes: [], onboardingDone: true, subscriptionStatus: 'active', createdAt: new Date().toISOString() },
      programs: [], programsLoaded: false, programsError: null,
      operational: { online: true, lastSyncAt: null, retryQueue: [] },
      recentProgramActivities: [], favoriteProgramIdsByOwner: {}, todayLessonByOwner: {},
    },
    version: 12,
  });
}

async function installMocks(page) {
  await page.route('**/api/spokedu-master/access', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: true, allowed: true, onboardingDone: true, plan: 'premium', subscriptionStatus: 'active', canUseLibrary: true, canUseClassTools: true, canUseRecords: true, canUseSpomove: true }) }));
  await page.route('**/api/spokedu-master/subscription', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ plan: 'premium', status: 'active', userId: OWNER_ID }) }));
  await page.route('**/api/spokedu-master/programs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [program] }) }));
  for (const routePattern of ['**/api/spokedu-master/students', '**/api/spokedu-master/class-records**', '**/api/spokedu-master/operational-data**', '**/api/spokedu-master/program-favorites**', '**/api/spokedu-master/explanations**']) {
    await page.route(routePattern, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], students: [], classRecords: [] }) }));
  }
  await page.route('**/api/spokedu-master/profile**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) }));
  await page.route('**/api/spokedu-master/client-errors**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
}

async function checkViewport(browser, viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.addCookies([{ name: 'spm-qa-auth-bypass', value: '1', url: BASE, sameSite: 'Lax' }]);
  await context.addInitScript((value) => localStorage.setItem('spokedu-master-store', value), storeValue());
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await installMocks(page);
  await page.goto(`${BASE}/spokedu-master/library/${program.id}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  try {
    await page.locator('[data-detail-hero-title]').waitFor({ state: 'visible', timeout: 20_000 });
  } catch (error) {
    console.error(JSON.stringify({ width: viewport.width, url: page.url(), title: await page.title(), body: (await page.locator('body').innerText()).slice(0, 800) }, null, 2));
    throw error;
  }
  await page.waitForTimeout(500);

  assert(await page.locator('[data-detail-hero-title]').textContent() === '다리 사이 골대', `${viewport.width}: Korean title split failed`);
  assert(await page.locator('[data-detail-english-title]').textContent() === 'Leg-Gate Passing: Timed Kick', `${viewport.width}: English title split failed`);
  assert(await page.locator('[data-detail-public-tags] > span').count() === 3, `${viewport.width}: public tag filtering failed`);
  assert(await page.locator('[data-detail-action]').count() === 3, `${viewport.width}: action count mismatch`);

  const layout = await page.evaluate(() => {
    const actions = [...document.querySelectorAll('[data-detail-action]')].map((element) => element.getBoundingClientRect());
    const execution = document.querySelector('[data-detail-row="execution"]');
    const preparation = document.querySelector('[data-detail-row="preparation"]');
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      actionTops: actions.map((box) => Math.round(box.top)),
      actionHeights: actions.map((box) => box.height),
      executionColumns: execution ? getComputedStyle(execution).gridTemplateColumns.split(' ').length : 0,
      preparationColumns: preparation ? getComputedStyle(preparation).gridTemplateColumns.split(' ').length : 0,
    };
  });
  assert(!layout.overflow, `${viewport.width}: horizontal overflow`);
  assert(new Set(layout.actionTops).size === 1, `${viewport.width}: actions are not one row`);
  assert(layout.actionHeights.every((height) => height >= 44), `${viewport.width}: action height below 44px`);
  const expectedColumns = viewport.width >= 900 ? 2 : 1;
  assert(layout.executionColumns === expectedColumns, `${viewport.width}: Row 1 column mismatch`);
  assert(layout.preparationColumns === expectedColumns, `${viewport.width}: Row 2 column mismatch`);

  for (const label of ['준비물', '스크립트', '사전교육']) {
    assert(await page.getByRole('heading', { name: label, exact: true }).count() === 1, `${viewport.width}: missing overview ${label}`);
  }
  for (const forbidden of ['화면에 표시하면 안 되는 수업 목표', '화면에 표시하면 안 되는 핵심 기능', '화면에 표시하면 안 되는 안내문', 'SPOMOVE 연계']) {
    assert(!(await page.locator('body').innerText()).includes(forbidden), `${viewport.width}: forbidden content rendered: ${forbidden}`);
  }
  assert(await page.getByRole('heading', { name: '관련영상', exact: true }).count() === 0, `${viewport.width}: empty related-video section rendered`);

  await page.getByRole('button', { name: '이미지 확대' }).click();
  assert(await page.getByRole('dialog').count() === 1, `${viewport.width}: setup image dialog did not open`);
  await page.keyboard.press('Escape');
  assert(await page.getByRole('dialog').count() === 0, `${viewport.width}: setup image dialog did not close`);

  await mkdir(OUT, { recursive: true });
  const screenshot = path.join(OUT, `detail-${viewport.width}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const relevantErrors = consoleErrors.filter((message) => !/ERR_NETWORK_ACCESS_DENIED|favicon|youtube/i.test(message));
  assert(relevantErrors.length === 0, `${viewport.width}: console errors: ${relevantErrors.join(' | ')}`);
  await context.close();
  return { width: viewport.width, ...layout, screenshot };
}

let serverProcess;
if (SHOULD_SERVE) {
  serverProcess = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm.cmd run dev -- -p ${new URL(BASE).port}`], {
    cwd: process.cwd(), env: { ...process.env, SPOKEDU_MASTER_QA_BYPASS_AUTH: '1' }, windowsHide: true, stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`${BASE}/spokedu-master`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 900 }, { width: 820, height: 900 }, { width: 1024, height: 900 }, { width: 1440, height: 1000 }]) {
    results.push(await checkViewport(browser, viewport));
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await browser.close();
  if (serverProcess?.pid) spawnSync('taskkill', ['/PID', String(serverProcess.pid), '/T', '/F'], { stdio: 'ignore' });
}
