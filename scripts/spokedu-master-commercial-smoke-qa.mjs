import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function readCliValue(name) {
  const equalsArg = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

const positionalBaseUrl = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith('--') && /^https?:\/\//.test(arg));
const BASE = (readCliValue('--base-url') || positionalBaseUrl || 'http://localhost:3000').replace(/\/$/, '');
const ENV_PREFLIGHT_ONLY = process.argv.includes('--env-preflight');
const SKIP_SERVER_CHECK = process.argv.includes('--skip-server-check');
const FLOW_FILTERS = process.argv
  .flatMap((arg) => {
    if (!arg.startsWith('--flow=')) return [];
    return arg.slice('--flow='.length).split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  });
const qaIdSource = process.env.SPOKEDU_MASTER_QA_ID ? 'official' : process.env.SPM_QA_ID ? 'legacy' : 'missing';
const qaPasswordSource = process.env.SPOKEDU_MASTER_QA_PASSWORD ? 'official' : process.env.SPM_QA_PASSWORD ? 'legacy' : 'missing';
const qaBypassEnabled = process.env.SPOKEDU_MASTER_QA_BYPASS_AUTH === '1';
const useMockAuth = process.env.SPOKEDU_MASTER_QA_USE_MOCK_AUTH === '1';
const QA_ID = process.env.SPOKEDU_MASTER_QA_ID ?? process.env.SPM_QA_ID ?? '';
const QA_PASSWORD = process.env.SPOKEDU_MASTER_QA_PASSWORD ?? process.env.SPM_QA_PASSWORD ?? '';
const MASTER_DELETE_CONFIRMATION = 'MASTER \uB370\uC774\uD130 \uC0AD\uC81C';
const MASTER_DELETE_SUCCESS = 'MASTER \uC6B4\uC601 \uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.';

const DEV_SERVER_TIMEOUT_MS = 10_000;
const BROWSER_LAUNCH_TIMEOUT_MS = 30_000;
const LOGIN_TIMEOUT_MS = 45_000;
const FLOW_TIMEOUT_MS = 75_000;
const TOTAL_TIMEOUT_MS = 12 * 60_000;

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ALICE_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_BOB_ID = '33333333-3333-4333-8333-333333333333';

const now = new Date();

function iso(offsetMinutes = 0) {
  return new Date(now.getTime() + offsetMinutes * 60_000).toISOString();
}

const EXISTING_RECORD_DATE = iso(-1500).slice(0, 10);

function activeAccessSnapshot(overrides = {}) {
  return {
    authenticated: true,
    allowed: true,
    onboardingDone: true,
    plan: 'premium',
    subscriptionStatus: 'active',
    currentPeriodEnd: iso(10_000),
    cancelAtPeriodEnd: false,
    isAdmin: false,
    isCenterOrTeam: false,
    canUseLibrary: true,
    canUseClassTools: true,
    canUseRecords: true,
    canUseSpomove: true,
    ...overrides,
  };
}

function logStep(message) {
  console.log(message);
}

function safeErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function withTimeout(label, timeoutMs, task) {
  let timeoutId;
  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const programs = [
  {
    id: '52',
    title: 'QA Jump Adventure',
    category: 'QA Movement',
    grade: 'elementary',
    space: 'indoor',
    description: 'QA smoke lesson for movement and balance.',
    steps: ['Warm up safely', 'Jump through markers', 'Cool down'],
    equipment: ['cones', 'markers'],
    tags: ['coordination', 'reaction', 'balance', 'SPOMOVE'],
    colors: ['#312e81', '#4338ca', '#6366f1', '#a5b4fc'],
    isPro: false,
    isNew: true,
    isHot: true,
    thumbnailUrl: '/spokedu-master-icon.svg',
    curriculumId: 52,
    lessonDetail: {
      recommendedAge: 'elementary',
      recommendedPlayers: '6-20 students',
      objective: 'Students practice balance and coordination.',
      developmentFocus: 'coordination / balance / reaction',
      coachScript: 'Move safely and follow the signal.',
      parentNote: 'QA parent note for quick record smoke.',
      fieldTips: ['Keep spacing safe.'],
      variations: ['Slow tempo first.'],
      safetyNotes: ['No pushing.'],
      relatedSpomoveIds: [],
      briefingNotes: ['Explain the signal.'],
      rules: ['Follow the start signal.', 'Return to base.'],
      setupNotes: ['Place cones in a line.'],
      heroImageUrl: '/spokedu-master-icon.svg',
      setupImageUrl: '/spokedu-master-icon.svg',
      galleryImageUrls: [],
    },
  },
  {
    id: '53',
    title: 'QA Balance Program',
    category: 'QA Balance',
    grade: 'preschool',
    space: 'classroom',
    description: 'QA second lesson.',
    steps: ['Stand', 'Balance', 'Finish'],
    equipment: ['line tape'],
    tags: ['balance', 'focus'],
    colors: ['#064e3b', '#047857', '#10b981', '#86efac'],
    isPro: false,
    isNew: false,
    isHot: false,
    thumbnailUrl: '/spokedu-master-icon.svg',
    curriculumId: 53,
    lessonDetail: {
      recommendedAge: 'preschool',
      recommendedPlayers: '4-12 students',
      objective: 'Students practice steady balance.',
      developmentFocus: 'balance / focus',
      coachScript: 'Balance with calm breathing.',
      parentNote: 'QA balance parent note.',
      fieldTips: [],
      variations: [],
      safetyNotes: [],
      relatedSpomoveIds: [],
      briefingNotes: [],
      rules: ['Stay on the line.'],
      setupNotes: [],
      heroImageUrl: '/spokedu-master-icon.svg',
      setupImageUrl: '/spokedu-master-icon.svg',
      galleryImageUrls: [],
    },
  },
];

const students = [
  {
    id: STUDENT_ALICE_ID,
    legacyId: 'legacy-alice',
    name: 'QA Alice Longname Student',
    group: 'QA Class',
    meta: 'QA memo meta',
    createdAt: iso(-300),
    updatedAt: iso(-300),
  },
  {
    id: STUDENT_BOB_ID,
    legacyId: 'legacy-bob',
    name: 'QA Bob Student',
    group: 'QA Class',
    meta: {},
    createdAt: iso(-300),
    updatedAt: iso(-300),
  },
];

function recordDto(overrides) {
  const dto = {
    id: 'record-existing-1',
    legacyId: null,
    date: iso(-1500),
    lessonTitle: 'QA Jump Adventure',
    classId: 'QA Class',
    programId: 52,
    programTitle: 'QA Jump Adventure',
    recordType: 'detailed',
    memo: null,
    parentNoteSnapshot: null,
    present: 1,
    absent: 0,
    focusCount: 1,
    skillCount: 1,
    students: [
      {
        id: 'record-existing-1-student-1',
        studentId: STUDENT_ALICE_ID,
        studentLegacyId: 'legacy-alice',
        studentName: 'QA Alice Longname Student',
        attendance: 'present',
        focused: true,
        skills: ['coordination'],
        memo: 'Detailed Alice memo for next class preparation.',
        createdAt: iso(-120),
        updatedAt: iso(-120),
      },
      {
        id: 'record-existing-1-student-2',
        studentId: STUDENT_BOB_ID,
        studentLegacyId: 'legacy-bob',
        studentName: 'QA Bob Student',
        attendance: 'present',
        focused: false,
        skills: [],
        memo: 'Bob private memo should not appear for Alice.',
        createdAt: iso(-120),
        updatedAt: iso(-120),
      },
    ],
    createdAt: iso(-120),
    updatedAt: iso(-120),
  };
  return { ...dto, ...overrides };
}

function aggregateRecord(input, id) {
  const rows = input.students ?? [];
  return {
    id,
    legacyId: input.legacyId ?? null,
    date: input.date,
    lessonTitle: input.lessonTitle,
    classId: input.classId,
    programId: input.programId,
    programTitle: input.programTitle,
    recordType: input.recordType,
    memo: input.memo,
    parentNoteSnapshot: input.parentNoteSnapshot,
    present: rows.filter((student) => student.attendance === 'present').length,
    absent: rows.filter((student) => student.attendance === 'absent').length,
    focusCount: rows.filter((student) => student.focused).length,
    skillCount: rows.reduce((sum, student) => sum + (student.skills?.length ?? 0), 0),
    students: rows.map((student, index) => ({
      id: `${id}-student-${index + 1}`,
      studentId: student.studentId,
      studentLegacyId: student.studentLegacyId,
      studentName: student.studentName,
      attendance: student.attendance,
      focused: student.focused,
      skills: student.skills ?? [],
      memo: student.memo,
      createdAt: iso(index + 1),
      updatedAt: iso(index + 1),
    })),
    createdAt: iso(10),
    updatedAt: iso(10),
  };
}

function bootstrapStore() {
  return JSON.stringify({
    state: {
      profile: {
        id: OWNER_ID,
        name: 'QA Teacher',
        email: QA_ID,
        school: 'QA School',
        avatarColor: '#312e81',
        plan: 'premium',
        role: 'teacher',
        centerId: null,
        centerName: null,
        ageGroups: [],
        programTypes: [],
        onboardingDone: true,
        trialEndsAt: null,
        createdAt: iso(-1000),
        subscriptionStatus: 'active',
        previousPaidPlan: null,
        periodEnd: iso(10_000),
      },
      programs,
      programsLoaded: true,
      programsError: null,
      lessons: [],
      operational: { online: true, lastSyncAt: null, retryQueue: [] },
      sessions: [],
      recentProgramActivities: [],
      favorites: [],
      cart: [],
      notifications: [],
    },
    version: 12,
  });
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    throw new Error('Chromium smoke QA cannot start because playwright is not installed.');
  }
}

function assertRequiredEnv() {
  const idLoaded = QA_ID.trim().length > 0;
  const passwordLoaded = QA_PASSWORD.trim().length > 0;
  console.log(`QA ID loaded: ${idLoaded ? 'yes' : 'no'}`);
  console.log(`QA password loaded: ${passwordLoaded ? 'yes' : 'no'}`);
  console.log(`QA auth bypass loaded: ${qaBypassEnabled ? 'yes' : 'no'}`);
  console.log(`QA auth mode: ${useMockAuth ? 'mock' : 'real'}`);
  console.log(`Credential source: ${qaIdSource === 'official' && qaPasswordSource === 'official' ? 'official' : qaIdSource === 'legacy' || qaPasswordSource === 'legacy' ? 'legacy' : 'missing'}`);
  const missing = [
    ...(!idLoaded ? ['SPOKEDU_MASTER_QA_ID or SPM_QA_ID'] : []),
    ...(!passwordLoaded ? ['SPOKEDU_MASTER_QA_PASSWORD or SPM_QA_PASSWORD'] : []),
    ...(useMockAuth && !qaBypassEnabled ? ['SPOKEDU_MASTER_QA_BYPASS_AUTH=1'] : []),
  ];
  if (useMockAuth && process.env.SPOKEDU_MASTER_QA_BYPASS_AUTH !== '1') {
    console.warn('Mock auth mode also needs SPOKEDU_MASTER_QA_BYPASS_AUTH=1 in the Next.js server (.env.local) for protected routes.');
  }
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function assertDevServerReachable() {
  return withTimeout('dev server check', DEV_SERVER_TIMEOUT_MS, async () => {
    const response = await fetch(`${BASE}/login`, { redirect: 'manual' });
    if (response.status >= 500) {
      throw new Error(`HTTP ${response.status}`);
    }
  }).catch((error) => {
    throw new Error(`Dev server is not reachable at ${BASE}: ${safeErrorMessage(error)}`);
  });
}

async function loginWithRealCredentials(context) {
  const page = await context.newPage();
  try {
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);
    await gotoPage(page, `/login?next=${encodeURIComponent('/spokedu-master/landing')}`);
    await page.locator('input[type="text"], input[type="email"]').first().fill(QA_ID);
    await page.locator('input[type="password"]').first().fill(QA_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/spokedu-master\//, { timeout: LOGIN_TIMEOUT_MS });
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function loginWithMockCredentials(context) {
  await context.addCookies([{
    name: 'spm-qa-auth-bypass',
    value: '1',
    url: BASE,
    sameSite: 'Lax',
  }]);
}

async function login(context) {
  logStep(`[auth] creating QA session (${useMockAuth ? 'mock' : 'real'})`);
  await withTimeout('QA login', LOGIN_TIMEOUT_MS, async () => {
    if (useMockAuth) {
      await loginWithMockCredentials(context);
      return;
    }
    await loginWithRealCredentials(context);
  });
  logStep('[auth] QA session ready');
}

async function installAppState(context) {
  await context.addInitScript((storeValue) => {
    window.localStorage.setItem('spokedu-master-store', storeValue);
  }, bootstrapStore());
}

async function installAccessDeniedMocks(page) {
  let accessCalls = 0;
  let operationalCalls = 0;

  await page.route('**/api/spokedu-master/access', async (route) => {
    accessCalls += 1;
    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Forbidden' }),
    });
  });
  await page.route('**/api/spokedu-master/students', async (route) => {
    operationalCalls += 1;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'should not load' }) });
  });
  await page.route('**/api/spokedu-master/class-records**', async (route) => {
    operationalCalls += 1;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'should not load' }) });
  });
  await page.route('**/api/spokedu-master/explanations', async (route) => {
    operationalCalls += 1;
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'should not load' }) });
  });
  await page.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'free', status: 'expired', isAdmin: false, userId: OWNER_ID, periodEnd: null, trialEndsAt: null }),
    });
  });

  return {
    get accessCalls() {
      return accessCalls;
    },
    get operationalCalls() {
      return operationalCalls;
    },
  };
}

async function installOperationalMocks(page, options = {}) {
  let smokeStudents = [...students];
  let classRecords = [recordDto({})];
  let explanations = [
    {
      id: 'exp-existing-1',
    programId: '53',
      programTitle: 'QA Balance Program',
      audience: 'school',
      text: 'Saved explanation text for QA Balance Program.',
      createdAt: iso(-30),
    },
  ];
  let failNextRecordPost = Boolean(options.failNextRecordPost);
  let recordPostCount = 0;
  let lastRecordPostBody = null;
  let recordPatchCount = 0;
  let lastRecordPatchBody = null;
  let lastRecordPatchId = null;
  let explanationPostCount = 0;
  let studentPostCount = 0;
  let studentsGetCalls = 0;
  let lastStudentPostBody = null;

  await page.route('**/api/spokedu-master/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activeAccessSnapshot()),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });
  await page.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: 'premium',
        status: 'active',
        isAdmin: false,
        userId: OWNER_ID,
        email: QA_ID,
        periodEnd: iso(10_000),
        trialEndsAt: iso(10_000),
      }),
    });
  });
  await page.route('**/api/spokedu-master/programs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: programs }),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });
  await page.route('**/api/spokedu-master/students', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      studentsGetCalls += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: smokeStudents }) });
      return;
    }
    if (request.method() === 'POST') {
      studentPostCount += 1;
      const input = await request.postDataJSON();
      lastStudentPostBody = input;
      const saved = {
        id: `student-created-${studentPostCount}`,
        legacyId: input.legacyId ?? null,
        name: input.name,
        group: input.group ?? null,
        meta: input.meta ?? {},
        createdAt: iso(studentPostCount),
        updatedAt: iso(studentPostCount),
      };
      smokeStudents = [saved, ...smokeStudents.filter((student) => student.id !== saved.id)];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: saved, duplicate: false }) });
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/spokedu-master/class-records**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: classRecords }) });
      return;
    }
    if (request.method() === 'POST') {
      recordPostCount += 1;
      if (failNextRecordPost) {
        failNextRecordPost = false;
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'record save failed' }) });
        return;
      }
      const input = await request.postDataJSON();
      lastRecordPostBody = input;
      const id = input.recordType === 'quick' ? `quick-record-${recordPostCount}` : `detailed-record-${recordPostCount}`;
      const saved = aggregateRecord(input, id);
      classRecords = [saved, ...classRecords.filter((record) => record.id !== saved.id)];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: saved }) });
      return;
    }
    if (request.method() === 'PATCH') {
      recordPatchCount += 1;
      const url = new URL(request.url());
      const id = url.searchParams.get('id');
      const input = await request.postDataJSON();
      lastRecordPatchBody = input;
      lastRecordPatchId = id;
      const existing = classRecords.find((record) => record.id === id);
      if (!existing) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Record not found' }) });
        return;
      }
      const saved = aggregateRecord(input, id);
      classRecords = [saved, ...classRecords.filter((record) => record.id !== id)];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: saved }) });
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/spokedu-master/explanations', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: explanations.slice(0, 10), total: explanations.length }),
        headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
      });
      return;
    }
    if (request.method() === 'POST') {
      explanationPostCount += 1;
      const input = await request.postDataJSON();
      const saved = {
        id: `exp-new-${explanationPostCount}`,
        programId: input.programId,
        programTitle: input.programTitle,
        audience: input.audience,
        text: input.text,
        createdAt: iso(explanationPostCount),
      };
      explanations = [saved, ...explanations];
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: saved }) });
      return;
    }
    await route.fallback();
  });

  return {
    get classRecords() {
      return classRecords;
    },
    get explanations() {
      return explanations;
    },
    get students() {
      return smokeStudents;
    },
    get studentsGetCalls() {
      return studentsGetCalls;
    },
    get studentPostCount() {
      return studentPostCount;
    },
    get lastStudentPostBody() {
      return lastStudentPostBody;
    },
    get recordPostCount() {
      return recordPostCount;
    },
    get lastRecordPostBody() {
      return lastRecordPostBody;
    },
    get recordPatchCount() {
      return recordPatchCount;
    },
    get lastRecordPatchBody() {
      return lastRecordPatchBody;
    },
    get lastRecordPatchId() {
      return lastRecordPatchId;
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoConsoleErrors(page, label) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/favicon|Failed to load resource/i.test(text)) return;
    errors.push(text);
  });
  return () => assert(errors.length === 0, `${label} console errors: ${errors.slice(0, 3).join(' | ')}`);
}

async function waitAppReady(page) {
  await page.waitForTimeout(700);
}

async function waitForOperationalReady(page) {
  await page.waitForResponse(
    (response) => response.url().includes('/api/spokedu-master/class-records') && response.request().method() === 'GET' && response.ok(),
    { timeout: 15_000 },
  ).catch(() => undefined);
  await page.waitForTimeout(300);
}

async function waitForReportOutput(page, expectedSubstring, description) {
  const output = page.locator('[data-report-output]');
  await output.waitFor({ state: 'visible', timeout: 15_000 });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const value = await output.inputValue().catch(() => '');
    if (value.includes(expectedSubstring)) return value;
    await page.waitForTimeout(250);
  }
  const value = await output.inputValue().catch(() => '');
  throw new Error(`${description}: expected output to include "${expectedSubstring}", got "${value.slice(0, 240)}"`);
}

async function gotoPage(page, route) {
  const url = route.startsWith('http') ? route : `${BASE}${route}`;
  await page.goto(url, { waitUntil: 'commit', timeout: 30_000 });
  await waitAppReady(page);
}

async function clickFirstAvailable(locators, description) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const item = locator.nth(index);
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        return;
      }
    }
  }
  throw new Error(`Could not find visible ${description}`);
}

async function checkNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    doc: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  assert(
    Math.max(metrics.body, metrics.doc) <= metrics.width + 2,
    `${label} horizontal overflow: body=${metrics.body}, doc=${metrics.doc}, viewport=${metrics.width}`,
  );
}

async function waitForText(page, text, description) {
  try {
    await page.getByText(text).first().waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    const body = await page.locator('body').innerText().catch(() => '');
    throw new Error(`${description} not visible. Body: ${body.slice(0, 700).replace(/\s+/g, ' ')}`);
  }
}

async function expectValue(locator, expected, description) {
  const value = await locator.inputValue({ timeout: 10_000 });
  assert(value === expected, `${description} mismatch: expected "${expected}", got "${value}"`);
}

async function fillStudentFieldSelect(dialog, testId, customValue, description) {
  const select = dialog.getByTestId(testId);
  await select.selectOption('__custom__');
  const customInput = dialog.locator(`label:has([data-testid="${testId}"]) input[type="text"]`);
  await customInput.waitFor({ state: 'visible', timeout: 5000 });
  await customInput.fill(customValue);
  await expectValue(customInput, customValue, description);
}

async function runUnauthRedirectSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await gotoPage(page, '/spokedu-master/students');
  await page.waitForURL(/\/login\?next=/, { timeout: 20_000 });
  const url = new URL(page.url());
  assert(url.pathname === '/login', 'unauthenticated students route did not land on /login');
  assert(url.searchParams.get('next')?.startsWith('/spokedu-master/students'), 'login next did not preserve protected path');
  await page.waitForTimeout(500);
  assert(new URL(page.url()).pathname === '/login', 'login page entered a redirect loop');
  await context.close();
}

async function runAccessDeniedSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, '403 access');
  const mocks = await installAccessDeniedMocks(page);
  await gotoPage(page, '/spokedu-master/students');
  await page.getByRole('heading', { name: 'SPOKEDU MASTER 이용 권한이 필요합니다.' }).waitFor({ state: 'visible', timeout: 15_000 });
  const bodyText = await page.locator('body').innerText();
  assert(bodyText.includes('SPOKEDU MASTER'), '403 screen did not render SPOKEDU MASTER copy');
  const paymentCta = page.getByRole('link', { name: /이용권 선택|이용권 다시 선택|구독 관리/ });
  assert(await paymentCta.count() >= 1, 'payment CTA missing');
  assert(await page.locator('a[href="/spokedu-master/landing"]').count() >= 1, 'landing CTA missing');
  assert(mocks.operationalCalls === 0, '403 state rendered operational providers or children');
  const before = mocks.accessCalls;
  await page.getByRole('button', { name: '권한 다시 확인' }).click();
  await page.waitForTimeout(500);
  assert(mocks.accessCalls > before, 'retry did not re-call access endpoint');
  assert(mocks.operationalCalls === 0, 'retry triggered operational data requests');
  finishConsoleCheck();
  await context.close();
}

async function installPaymentActivationOperationalMocks(page) {
  await page.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: 'premium',
        status: 'active',
        isAdmin: false,
        userId: OWNER_ID,
        email: QA_ID,
        periodEnd: iso(10_000),
        trialEndsAt: iso(10_000),
      }),
    });
  });
  await page.route('**/api/spokedu-master/programs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: programs }),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });
  await page.route('**/api/spokedu-master/students', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: students }) });
  });
  await page.route('**/api/spokedu-master/class-records**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [recordDto({})] }) });
  });
  await page.route('**/api/spokedu-master/explanations**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) });
  });
  await page.route('**/api/spokedu-master/profile', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
}

async function runPaymentActivationSmoke(browser) {
  const planContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(planContext);
  await login(planContext);
  const planPage = await planContext.newPage();
  await planPage.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plan: 'free',
        status: 'none',
        isAdmin: false,
        userId: OWNER_ID,
        email: QA_ID,
        periodEnd: null,
        trialEndsAt: null,
      }),
    });
  });
  const finishPlanConsoleCheck = await assertNoConsoleErrors(planPage, 'payment plan selection');
  await gotoPage(planPage, '/spokedu-master/payment?plan=premium');
  await planPage.locator('button[data-plan-id="premium"]').waitFor({ state: 'visible', timeout: 10_000 });
  await planPage.locator('a[href^="mailto:"], a[href*="contact"], a[href*="center"]').first().waitFor({ state: 'visible', timeout: 10_000 });
  finishPlanConsoleCheck();
  await planContext.close();

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'payment activation');
  let confirmCalls = 0;
  let accessCalls = 0;

  await installPaymentActivationOperationalMocks(page);
  await page.route('**/api/spokedu-master/payment/billing/issue', async (route) => {
    confirmCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, alreadyConfirmed: false, plan: 'premium', periodEnd: iso(10_000) }),
    });
  });
  await page.route('**/api/spokedu-master/access', async (route) => {
    accessCalls += 1;
    if (accessCalls <= 1) {
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
      body: JSON.stringify(activeAccessSnapshot()),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });

  await gotoPage(page, '/spokedu-master/payment/success?plan=premium&authKey=auth_qa_success&customerKey=spm_qa_success');
  await page.getByRole('heading', { name: '결제가 완료되었습니다' }).waitFor({ state: 'visible', timeout: 20_000 });
  const startLink = page.getByRole('link', { name: '홈으로' });
  try {
    await startLink.waitFor({ state: 'visible', timeout: 12_000 });
  } catch (error) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    throw new Error(`payment start CTA did not appear. Body: ${bodyText.slice(0, 1000)}. ${safeErrorMessage(error)}`);
  }
  assert(confirmCalls === 1, `payment confirm was called ${confirmCalls} times`);
  assert(accessCalls >= 2, 'access activation was not rechecked after initial pending state');
  await startLink.click();
  await page.waitForURL(/\/spokedu-master\/dashboard/, { timeout: 10_000 });
  await gotoPage(page, '/spokedu-master/library');
  await waitForText(page, 'QA Jump Adventure', 'library accessible after payment activation');
  await gotoPage(page, '/spokedu-master/students');
  await waitForText(page, 'QA Alice Longname Student', 'students accessible after payment activation');
  finishConsoleCheck();
  await context.close();

  const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(retryContext);
  await login(retryContext);
  const retryPage = await retryContext.newPage();
  const finishRetryConsoleCheck = await assertNoConsoleErrors(retryPage, 'payment access retry');
  let retryConfirmCalls = 0;
  let retryAccessCalls = 0;

  await installPaymentActivationOperationalMocks(retryPage);
  await retryPage.route('**/api/spokedu-master/payment/billing/issue', async (route) => {
    retryConfirmCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, alreadyConfirmed: false, plan: 'premium', periodEnd: iso(10_000) }),
    });
  });
  await retryPage.route('**/api/spokedu-master/access', async (route) => {
    retryAccessCalls += 1;
    if (retryAccessCalls === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'temporary access check failure' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activeAccessSnapshot()),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });

  await gotoPage(retryPage, '/spokedu-master/payment/success?plan=premium&authKey=auth_qa_retry&customerKey=spm_qa_retry');
  const retryButton = retryPage.getByRole('button', { name: '이용권 다시 확인' });
  await retryButton.waitFor({ state: 'visible', timeout: 12_000 });
  await retryButton.click();
  await retryPage.getByRole('heading', { name: '결제가 완료되었습니다' }).waitFor({ state: 'visible', timeout: 20_000 });
  await retryPage.getByRole('link', { name: '홈으로' }).waitFor({ state: 'visible', timeout: 12_000 });
  assert(retryConfirmCalls === 1, `retry path called confirm ${retryConfirmCalls} times`);
  assert(retryAccessCalls >= 2, 'retry path did not recheck access');
  finishRetryConsoleCheck();
  await retryContext.close();

  const failureContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(failureContext);
  await login(failureContext);
  const failurePage = await failureContext.newPage();
  const finishFailureConsoleCheck = await assertNoConsoleErrors(failurePage, 'payment confirm failure');
  let failureConfirmCalls = 0;
  let failureAccessCalls = 0;

  await failurePage.route('**/api/spokedu-master/payment/billing/issue', async (route) => {
    failureConfirmCalls += 1;
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'raw provider detail should not be shown' }),
    });
  });
  await failurePage.route('**/api/spokedu-master/access', async (route) => {
    failureAccessCalls += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'should not check access after confirm failure' }),
    });
  });

  await gotoPage(failurePage, '/spokedu-master/payment/success?plan=premium&authKey=auth_qa_failed&customerKey=spm_qa_failed');
  await failurePage.getByRole('heading', { name: '결제를 완료하지 못했습니다' }).waitFor({ state: 'visible', timeout: 15_000 });
  assert(failureConfirmCalls === 1, `failed payment confirm was called ${failureConfirmCalls} times`);
  assert(failureAccessCalls === 0, 'access was checked after confirm failure');
  assert(await failurePage.locator('a[href="/spokedu-master/dashboard"]').count() === 0, 'start CTA was visible after confirm failure');
  assert(await failurePage.locator('a[href="/spokedu-master/payment?plan=premium"]').count() === 1, 'payment retry link missing after confirm failure');
  finishFailureConsoleCheck();
  await failureContext.close();
}

async function runStudentCreationSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'student creation');
  const mocks = await installOperationalMocks(page);
  const newStudentName = 'QA New Student Name';

  await gotoPage(page, '/spokedu-master/students?add=1');
  await waitAppReady(page);
  const dialog = page.locator('[role="dialog"]');
  try {
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  } catch (error) {
    const body = await page.locator('body').innerText().catch(() => '');
    throw new Error(`student add dialog did not open from add=1. URL: ${page.url()}. Body: ${body.slice(0, 900).replace(/\s+/g, ' ')}. ${safeErrorMessage(error)}`);
  }
  const nameInput = dialog.getByTestId('spm-student-add-name');
  await nameInput.waitFor({ state: 'visible', timeout: 10_000 });
  assert(await nameInput.evaluate((node) => document.activeElement === node), 'add=1 did not focus the student name input');
  await nameInput.pressSequentially(newStudentName, { delay: 5 });
  await fillStudentFieldSelect(dialog, 'spm-student-add-group', 'QA New Class', 'student group custom field');
  await fillStudentFieldSelect(dialog, 'spm-student-add-meta', 'QA 3 months', 'student meta custom field');
  await expectValue(nameInput, newStudentName, 'student name typed character-by-character');
  await dialog.locator('button').last().click();
  await waitForText(page, newStudentName, 'created student name');
  assert(mocks.studentPostCount === 1, `expected one student POST, got ${mocks.studentPostCount}`);
  assert(mocks.lastStudentPostBody?.name === newStudentName, 'student create request body did not preserve input name');
  assert(!('ownerId' in mocks.lastStudentPostBody), 'student create request included ownerId');
  assert(mocks.students[0]?.name === newStudentName, 'student create response DTO did not preserve name');

  await page.reload({ waitUntil: 'commit', timeout: 30_000 });
  await waitAppReady(page);
  await waitForText(page, newStudentName, 'created student name after provider reload');
  assert(mocks.studentsGetCalls >= 2, 'student provider was not reloaded after refresh');
  await page.getByText(newStudentName).first().click();
  await waitAppReady(page);
  assert((await page.locator('body').innerText()).includes(newStudentName), 'student detail did not show created name');

  await gotoPage(page, '/spokedu-master/class-record?program=52');
  await waitAppReady(page);
  await waitForText(page, newStudentName, 'created student in class-record roster');
  finishConsoleCheck();
  await context.close();
}

async function runQuickRecordToReportSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'quick record');
  await installOperationalMocks(page);
  await gotoPage(page, '/spokedu-master/library/52');
  await waitAppReady(page);
  await waitForText(page, 'QA Jump Adventure', 'library detail title');
  await checkNoHorizontalOverflow(page, 'library detail before quick modal');
  await page.getByRole('button', { name: '빠른 기록' }).click();
  await page.locator('[role="dialog"] input[type="date"]').fill(EXISTING_RECORD_DATE);
  const textareas = page.locator('[role="dialog"] textarea');
  await textareas.nth(0).fill('QA quick memo for report context.');
  await textareas.nth(1).fill('QA parent note snapshot.');
  await clickFirstAvailable([
    page.locator('[role="dialog"] button.bg-emerald-600'),
  ], 'quick record save button');
  const reportLink = page.locator('[role="dialog"] a[href*="/spokedu-master/report?record="]').first();
  await reportLink.waitFor({ state: 'visible', timeout: 10_000 });
  const href = await reportLink.getAttribute('href');
  assert(href?.includes('record=quick-record-1'), 'quick record report link missing saved record id');
  assert(href?.includes('program=52'), 'quick record report link missing program id');
  await gotoPage(page, href);
  await page.waitForURL(/record=quick-record-1/, { timeout: 10_000 });
  assert(new URL(page.url()).searchParams.get('record') === 'quick-record-1', 'quick report URL lost record query');
  await waitForReportOutput(page, 'QA quick memo for report context.', 'quick record report output');
  finishConsoleCheck();
  await context.close();
}

async function runDetailedRecordSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'detailed record');
  await installOperationalMocks(page);
  await gotoPage(page, '/spokedu-master/class-record?program=52');
  await waitAppReady(page);
  await checkNoHorizontalOverflow(page, 'class-record initial');
  await waitForText(page, 'QA Alice Longname Student', 'class-record Alice row');
  await page.evaluate(() => {
    const nameNode = [...document.querySelectorAll('strong, span, p')].find((node) =>
      node.textContent?.includes('QA Alice Longname Student'),
    );
    const card = nameNode?.closest('div.rounded-\\[15px\\]');
    const attendanceButton = card?.querySelectorAll('button')[1];
    if (!(attendanceButton instanceof HTMLButtonElement)) throw new Error('Alice attendance button not found');
    attendanceButton.click();
  });
  await page.getByText('QA Alice Longname Student').first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await dialog.locator('button').nth(1).click();
  await dialog.locator('textarea').fill('Detailed Alice memo from browser smoke.');
  await page.keyboard.press('Escape');
  await clickFirstAvailable([
    page.locator('button.h-12.w-full'),
  ], 'detailed record save button');
  const reportHref = await page.locator('a[href*="/spokedu-master/report?record="]').first().getAttribute('href');
  assert(reportHref?.includes('record=detailed-record-1'), 'detailed save report link missing record id');
  assert(reportHref?.includes('program=52'), 'detailed save report link missing program id');
  await gotoPage(page, reportHref);
  await waitAppReady(page);
  await waitForReportOutput(page, 'Detailed Alice memo from browser smoke.', 'detailed record report output');
  finishConsoleCheck();
  await context.close();
}

async function runDetailedRecordFailureSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'detailed record failure');
  const mocks = await installOperationalMocks(page, { failNextRecordPost: true });
  await gotoPage(page, '/spokedu-master/class-record?program=52');
  await waitAppReady(page);
  await waitForText(page, 'QA Alice Longname Student', 'class-record Alice row');
  await page.evaluate(() => {
    const nameNode = [...document.querySelectorAll('strong, span, p')].find((node) =>
      node.textContent?.includes('QA Alice Longname Student'),
    );
    const card = nameNode?.closest('div.rounded-\\[15px\\]');
    const attendanceButton = card?.querySelectorAll('button')[1];
    if (!(attendanceButton instanceof HTMLButtonElement)) throw new Error('Alice attendance button not found');
    attendanceButton.click();
  });
  await page.getByText('QA Alice Longname Student').first().click();
  await page.locator('[role="dialog"] textarea').fill('Memo retained after failure.');
  await page.keyboard.press('Escape');
  await clickFirstAvailable([
    page.locator('button.h-12.w-full'),
  ], 'detailed record save button');
  await page.waitForTimeout(700);
  assert(await page.locator('a[href*="record=detailed-record"]').count() === 0, 'failure state showed detailed success link');
  await clickFirstAvailable([
    page.locator('button.h-12.w-full'),
  ], 'detailed record retry save button');
  await page.locator('a[href*="record=detailed-record-2"]').first().waitFor({ state: 'visible', timeout: 10_000 });
  assert(mocks.recordPostCount === 2, 'retry did not submit a second record POST');
  finishConsoleCheck();
  await context.close();
}

async function runReportSaveRestoreSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'report save restore');
  await installOperationalMocks(page);
  await gotoPage(page, '/spokedu-master/report?record=record-existing-1&program=52');
  await waitAppReady(page);
  await waitForOperationalReady(page);
  await waitForReportOutput(page, 'Detailed Alice memo for next class preparation.', 'record-based report output');
  await page.locator('[data-report-action="save"]').click();
  await page.waitForURL(/saved=exp-new-1/, { timeout: 10_000 });
  const savedUrl = new URL(page.url());
  assert(savedUrl.searchParams.get('program') === '52', 'saved URL missing program');
  assert(!savedUrl.searchParams.has('record'), 'saved URL still contains record context');
  await page.reload({ waitUntil: 'commit', timeout: 30_000 });
  await waitAppReady(page);
  await waitForOperationalReady(page);
  assert(new URL(page.url()).searchParams.get('saved') === 'exp-new-1', 'reload lost saved query');
  await waitForReportOutput(page, 'Detailed Alice memo for next class preparation.', 'saved restore report output');
  await page.locator('aside section').nth(1).getByRole('button', { name: /^QA Balance Program / }).first().click();
  await page.waitForURL(/program=53/, { timeout: 10_000 });
  const programOnlyUrl = new URL(page.url());
  assert(programOnlyUrl.searchParams.get('program') === '53', 'program select did not switch program');
  assert(!programOnlyUrl.searchParams.has('saved'), 'program select kept saved query');
  assert(!programOnlyUrl.searchParams.has('record'), 'program select kept record query');
  await gotoPage(page, '/spokedu-master/report?program=52&saved=exp-new-1');
  await waitAppReady(page);
  await page.locator('[data-report-output]').fill('Edited draft after saved restore.');
  await page.waitForTimeout(500);
  assert(!new URL(page.url()).searchParams.has('saved'), 'editing note did not clear saved query');
  finishConsoleCheck();
  await context.close();
}

async function runStudentPreparationSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'students prep');
  await installOperationalMocks(page);
  await gotoPage(page, '/spokedu-master/students');
  await waitAppReady(page);
  await checkNoHorizontalOverflow(page, 'students list');
  await page.getByText('QA Alice Longname Student').first().click();
  await waitAppReady(page);
  const bodyText = await page.locator('body').innerText();
  assert(bodyText.includes('Detailed Alice memo for next class preparation.'), 'Alice detail missing recent memo');
  assert(bodyText.includes('coordination'), 'Alice detail missing skill tag');
  assert(!bodyText.includes('Bob private memo should not appear for Alice.'), 'Alice detail leaked Bob memo');
  const libraryHref = await page.locator('a[href="/spokedu-master/library/52"]').first().getAttribute('href');
  const prepHref = await page.locator('a[href="/spokedu-master/class-record?program=52"]').first().getAttribute('href');
  assert(libraryHref === '/spokedu-master/library/52', 'student prep library href mismatch');
  assert(prepHref === '/spokedu-master/class-record?program=52', 'student prep class-record href mismatch');
  finishConsoleCheck();
  await context.close();
}

async function runRecordCorrectionSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'record correction');
  const mocks = await installOperationalMocks(page);
  const correctedMemo = 'Corrected Alice memo for regenerated report.';

  await gotoPage(page, '/spokedu-master/class-record');
  const editLink = page.locator('a[href="/spokedu-master/class-record?record=record-existing-1&program=52"]').first();
  await editLink.waitFor({ state: 'visible', timeout: 10_000 });
  await editLink.click();
  await waitAppReady(page);
  await waitForOperationalReady(page);

  const dateInput = page.locator('input[type="date"]').first();
  await expectValue(dateInput, EXISTING_RECORD_DATE, 'record edit date restore');
  await page.getByText('QA Alice Longname Student').first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await expectValue(dialog.locator('textarea'), 'Detailed Alice memo for next class preparation.', 'record edit student memo restore');
  await dialog.locator('textarea').fill(correctedMemo);
  await page.keyboard.press('Escape');

  await dateInput.fill('2026-06-21');
  await page.locator('textarea').first().fill('Corrected full class memo.');
  await page.evaluate(() => {
    const nameNode = [...document.querySelectorAll('strong, span, p')].find((node) =>
      node.textContent?.includes('QA Alice Longname Student'),
    );
    const card = nameNode?.closest('div.rounded-\\[15px\\]');
    const absentButton = card?.querySelectorAll('button')[2];
    if (!(absentButton instanceof HTMLButtonElement)) throw new Error('Alice absent button not found');
    absentButton.click();
  });
  await clickFirstAvailable([
    page.locator('button.h-12.w-full'),
  ], 'record correction save button');
  await page.waitForTimeout(700);
  assert(mocks.recordPatchCount === 1, `expected one record PATCH, got ${mocks.recordPatchCount}`);
  assert(mocks.recordPostCount === 0, 'record correction unexpectedly created a new record');
  assert(mocks.lastRecordPatchId === 'record-existing-1', 'record correction used the wrong record id');
  assert(mocks.lastRecordPatchBody?.memo === 'Corrected full class memo.', 'record correction PATCH lost full memo');
  const patchedStudent = mocks.lastRecordPatchBody?.students?.find((student) => student.studentId === STUDENT_ALICE_ID);
  assert(patchedStudent?.memo === correctedMemo, 'record correction PATCH lost student memo');
  assert(patchedStudent?.attendance === 'absent', 'record correction PATCH lost attendance change');
  assert(mocks.classRecords[0]?.id === 'record-existing-1', 'record correction changed record id');

  await gotoPage(page, '/spokedu-master/class-record');
  await waitAppReady(page);
  assert(mocks.classRecords[0]?.date?.startsWith('2026-06-21'), 'corrected record date was not persisted');

  await gotoPage(page, '/spokedu-master/students');
  await waitAppReady(page);
  await page.getByText('QA Alice Longname Student').first().click();
  await waitForText(page, correctedMemo, 'corrected student memo in student detail');
  assert(!(await page.locator('body').innerText()).includes('Bob private memo should not appear for Alice.'), 'record correction leaked Bob memo into Alice detail');

  await gotoPage(page, '/spokedu-master/report?record=record-existing-1&program=52');
  await waitAppReady(page);
  await waitForText(page, correctedMemo, 'corrected memo in regenerated report draft');
  finishConsoleCheck();
  await context.close();
}

async function runLibraryDiscoveryReuseSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'library discovery reuse');
  const mocks = await installOperationalMocks(page);

  await gotoPage(page, '/spokedu-master/library?q=line%20tape');
  await waitAppReady(page);
  const filteredUrl = new URL(page.url());
  assert(filteredUrl.searchParams.get('q') === 'line tape', 'library search query was not preserved in URL');
  await waitForText(page, 'QA Balance Program', 'library filtered program result');
  await page.locator('a[href="/spokedu-master/library/53"]').first().click();
  await page.waitForURL(/\/spokedu-master\/library\/53/, { timeout: 10_000 });
  await waitAppReady(page);
  await waitForText(page, 'QA Balance Program', 'program detail title');

  await gotoPage(page, '/spokedu-master/library?q=jump');
  await waitAppReady(page);
  await gotoPage(page, '/spokedu-master/class-record?from=record-existing-1&program=52');
  await waitAppReady(page);
  await waitForOperationalReady(page);
  const fromUrl = new URL(page.url());
  assert(fromUrl.searchParams.get('from') === 'record-existing-1', 'previous roster start did not keep source record id in URL');
  assert(fromUrl.searchParams.get('program') === '52', 'previous roster start did not keep program id');
  await expectValue(page.getByTestId('class-id-input'), 'QA Class', 'previous class name restore');
  const dateValue = await page.locator('input[type="date"]').first().inputValue();
  assert(dateValue !== EXISTING_RECORD_DATE, 'previous record date was copied into a new record');
  await page.getByText('QA Alice Longname Student').first().click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await expectValue(dialog.locator('textarea'), '', 'new record student memo reset');
  await dialog.locator('textarea').fill('Fresh memo after roster reuse.');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const nameNode = [...document.querySelectorAll('strong, span, p')].find((node) =>
      node.textContent?.includes('QA Alice Longname Student'),
    );
    const card = nameNode?.closest('div.rounded-\\[15px\\]');
    const presentButton = card?.querySelectorAll('button')[1];
    if (!(presentButton instanceof HTMLButtonElement)) throw new Error('Alice present button not found');
    presentButton.click();
  });
  await clickFirstAvailable([
    page.locator('button.h-12.w-full'),
  ], 'roster reuse save button');
  await page.waitForTimeout(700);
  assert(mocks.recordPostCount === 1, `expected one new record POST, got ${mocks.recordPostCount}`);
  assert(mocks.recordPatchCount === 0, 'roster reuse unexpectedly patched the source record');
  assert(mocks.classRecords[0]?.id !== 'record-existing-1', 'roster reuse returned the previous record id');
  assert(mocks.lastRecordPostBody?.classId === 'QA Class', 'roster reuse did not preserve class name');
  assert(!mocks.lastRecordPostBody?.memo, 'roster reuse copied previous full class memo');
  const postedAlice = mocks.lastRecordPostBody?.students?.find((student) => student.studentId === STUDENT_ALICE_ID);
  assert(postedAlice?.attendance === 'present', 'new record did not save fresh attendance');
  assert(postedAlice?.memo === 'Fresh memo after roster reuse.', 'new record did not save fresh student memo');
  const sourceRecord = mocks.classRecords.find((record) => record.id === 'record-existing-1');
  assert(sourceRecord?.students?.[0]?.memo === 'Detailed Alice memo for next class preparation.', 'source record was mutated by roster reuse');
  finishConsoleCheck();
  await context.close();
}

async function runShopPurchaseSafetySmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  const finishConsoleCheck = await assertNoConsoleErrors(page, 'shop purchase safety');
  await installOperationalMocks(page);

  await gotoPage(page, '/spokedu-master/shop');
  await waitForText(page, 'SPOMAT', 'shop product title');
  await waitForText(page, '회원가로 구매하기', 'shop purchase CTA');
  await checkNoHorizontalOverflow(page, 'shop 390px');

  const purchaseHref = await page.locator('a[href="/api/spokedu-master/shop/spomat/purchase"]').first().getAttribute('href');
  assert(purchaseHref === '/api/spokedu-master/shop/spomat/purchase', 'shop purchase CTA does not use the server redirect route');

  const purchaseResponse = await page.evaluate(async () => {
    const response = await fetch('/api/spokedu-master/shop/spomat/purchase', { redirect: 'manual' });
    const text = await response.text();
    return {
      status: response.status,
      location: response.headers.get('location'),
      text,
    };
  });
  assert(purchaseResponse.status === 503, `shop purchase route should fail closed without env URL, got ${purchaseResponse.status}`);
  assert(!purchaseResponse.location, `shop purchase route unexpectedly redirected to ${purchaseResponse.location}`);
  assert(!purchaseResponse.text.includes('example.com'), 'shop purchase route exposed an example.com placeholder');
  assert(purchaseResponse.text.includes('구매 링크가 아직 연결되지 않았습니다'), 'shop purchase route missing safe unavailable message');

  finishConsoleCheck();
  await context.close();
}

async function runMobileSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  await installOperationalMocks(page);
  for (const [route, label] of [
    ['/spokedu-master/library/52', 'library detail 390px'],
    ['/spokedu-master/class-record?program=52', 'class-record 390px'],
    ['/spokedu-master/students', 'students 390px'],
  ]) {
    await gotoPage(page, route);
    await waitAppReady(page);
    await checkNoHorizontalOverflow(page, label);
  }
  await context.close();
}

async function runMasterDataDeletionSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  let deleteCalls = 0;
  let studentsGetCalls = 0;
  let recordsGetCalls = 0;
  let explanationsGetCalls = 0;
  let smokeStudents = students;
  let smokeRecords = [recordDto({})];
  const deleteRequests = [];

  await installAppState(context);
  await login(context);
  const page = await context.newPage();
  try {
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);
    page.on('request', (request) => {
      if (request.method() === 'DELETE') {
        deleteRequests.push(new URL(request.url()).pathname);
      }
    });
    await page.route('**/api/spokedu-master/access', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activeAccessSnapshot()),
        headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
      });
    });
    await page.route('**/api/spokedu-master/subscription', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'premium',
          status: 'active',
          isAdmin: false,
          userId: OWNER_ID,
          email: QA_ID,
          periodEnd: iso(10_000),
          trialEndsAt: iso(10_000),
        }),
      });
    });
    await page.route('**/api/spokedu-master/programs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: programs }),
        headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
      });
    });
    await page.route('**/api/spokedu-master/students', async (route) => {
      if (route.request().method() === 'GET') {
        studentsGetCalls += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: smokeStudents }) });
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/spokedu-master/class-records', async (route) => {
      if (route.request().method() === 'GET') {
        recordsGetCalls += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: smokeRecords }) });
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/spokedu-master/explanations', async (route) => {
      if (route.request().method() === 'GET') {
        explanationsGetCalls += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) });
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/spokedu-master/operational-data', async (route) => {
      assert(route.request().method() === 'DELETE', 'operational-data route was called with a non-DELETE method');
      deleteCalls += 1;
      const body = await route.request().postDataJSON();
      assert(body.confirmation === MASTER_DELETE_CONFIRMATION, 'delete confirmation body mismatch');
      smokeStudents = [];
      smokeRecords = [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await gotoPage(page, '/spokedu-master/dashboard');
    await waitAppReady(page);
    assert(await page.locator('[data-dashboard-section="first-start"]').count() === 0, 'existing user saw first-start onboarding guide');

    await gotoPage(page, '/spokedu-master/profile');
    await waitAppReady(page);
    const section = page.locator('section').filter({ has: page.locator('input') }).last();
    await section.waitFor({ state: 'visible', timeout: 10_000 });
    const button = section.getByRole('button', { name: MASTER_DELETE_CONFIRMATION });
    assert(await button.isDisabled(), 'delete button was enabled before confirmation input');
    await section.locator('input').fill(MASTER_DELETE_CONFIRMATION);
    assert(!(await button.isDisabled()), 'delete button did not enable after exact confirmation input');
    await button.click();
    await waitForText(page, MASTER_DELETE_SUCCESS, 'MASTER data deletion success message');
    assert(deleteCalls === 1, `expected one operational-data DELETE call, got ${deleteCalls}`);
    assert(studentsGetCalls >= 2, 'operational provider did not reload students after deletion');
    assert(recordsGetCalls >= 2, 'operational provider did not reload class records after deletion');
    assert(explanationsGetCalls >= 2, 'explanation provider did not reload explanations after deletion');
    assert(deleteRequests.every((pathname) => pathname === '/api/spokedu-master/operational-data'), 'unexpected DELETE request fired during data deletion smoke');
    await gotoPage(page, '/spokedu-master/dashboard');
    await waitAppReady(page);
    const firstStart = page.locator('[data-dashboard-section="first-start"]');
    await firstStart.waitFor({ state: 'visible', timeout: 10_000 });
    assert(await firstStart.locator('a[href="/spokedu-master/library"]').count() === 1, 'first-start library CTA missing');
    assert(await firstStart.locator('a[href="/spokedu-master/spomove"]').count() === 1, 'first-start spomove CTA missing');
    assert(await firstStart.locator('a[href="/spokedu-master/class-record"]').count() === 1, 'first-start class-record CTA missing');
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function main() {
  const suiteStartedAt = Date.now();
  let browser;

  await withTimeout('commercial smoke suite', TOTAL_TIMEOUT_MS, async () => {
    logStep('[setup] checking required environment');
    assertRequiredEnv();
    if (ENV_PREFLIGHT_ONLY) {
      logStep('[setup] env preflight passed');
      return;
    }
    if (SKIP_SERVER_CHECK) {
      logStep('[setup] skipping dev server preflight');
    } else {
      logStep('[setup] checking dev server');
      await assertDevServerReachable();
      logStep('[setup] dev server reachable');
    }

    logStep('[setup] loading playwright');
    const chromium = await loadPlaywright();
    logStep('[setup] launching chromium');
    browser = await withTimeout('chromium launch', BROWSER_LAUNCH_TIMEOUT_MS, () => chromium.launch({ headless: true }));
    logStep('[setup] chromium launched');

    const results = [];
    const flows = [
      ['unauth redirect', () => runUnauthRedirectSmoke(browser)],
      ['403 access state', () => runAccessDeniedSmoke(browser)],
      ['payment activation first use', () => runPaymentActivationSmoke(browser)],
      ['student creation roster contract', () => runStudentCreationSmoke(browser)],
      ['quick record to report', () => runQuickRecordToReportSmoke(browser)],
      ['detailed record to report', () => runDetailedRecordSmoke(browser)],
      ['detailed record failure retry', () => runDetailedRecordFailureSmoke(browser)],
      ['report save restore', () => runReportSaveRestoreSmoke(browser)],
      ['student next lesson preparation', () => runStudentPreparationSmoke(browser)],
      ['record correction to report', () => runRecordCorrectionSmoke(browser)],
      ['library discovery roster reuse', () => runLibraryDiscoveryReuseSmoke(browser)],
      ['shop purchase safety', () => runShopPurchaseSafetySmoke(browser)],
      ['mobile 390px', () => runMobileSmoke(browser)],
      ['master data deletion', () => runMasterDataDeletionSmoke(browser)],
    ];
    const selectedFlows = FLOW_FILTERS.length
      ? flows.filter(([name]) => FLOW_FILTERS.some((filter) => name.toLowerCase().includes(filter)))
      : flows;
    assert(selectedFlows.length > 0, `No smoke flows matched --flow=${FLOW_FILTERS.join(',')}`);

    try {
      for (const [index, [name, run]] of selectedFlows.entries()) {
        const label = `[${index + 1}/${selectedFlows.length}] ${name}`;
        logStep(label);
        const startedAt = Date.now();
        try {
          await withTimeout(name, FLOW_TIMEOUT_MS, run);
          const ms = Date.now() - startedAt;
          results.push({ name, ok: true, ms });
          console.log(JSON.stringify({ ok: true, flow: name, ms }));
        } catch (error) {
          const ms = Date.now() - startedAt;
          const message = safeErrorMessage(error);
          results.push({ name, ok: false, ms, message });
          console.error(JSON.stringify({ ok: false, flow: name, ms, message }));
        }
      }
    } finally {
      await browser.close().catch(() => undefined);
    }

    const failed = results.filter((result) => !result.ok);
    if (failed.length > 0) {
      console.error(`\n${failed.length} SPOKEDU MASTER commercial smoke flow(s) failed.`);
      process.exit(1);
    }

    const totalMs = Date.now() - suiteStartedAt;
    logStep(`[done] commercial smoke passed in ${totalMs}ms`);
  }).finally(async () => {
    if (browser) await browser.close().catch(() => undefined);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
