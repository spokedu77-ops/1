import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Required Supabase environment variables are missing.');

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;

const preferredEmails = ['spm.qa.admin@spokedu.test', 'choijihoon@spokedu.com'];
const adminUser = preferredEmails
  .map((email) => usersData.users.find((user) => user.email?.toLowerCase() === email))
  .find(Boolean);
if (!adminUser?.email) throw new Error('No usable admin QA auth user exists.');

async function createAuthenticatedContext(browser) {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email,
    options: { redirectTo: `${base}/` },
  });
  if (error || !data?.properties?.action_link) throw new Error('Could not create admin QA login link.');

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) throw new Error('Could not resolve admin QA login token.');

  const cookies = [];
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType,
  });
  if (verifyError) throw verifyError;

  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addCookies(cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: base,
    httpOnly: cookie.options?.httpOnly,
    secure: cookie.options?.secure,
    sameSite: cookie.options?.sameSite === 'strict'
      ? 'Strict'
      : cookie.options?.sameSite === 'none'
        ? 'None'
        : 'Lax',
  })));
  return context;
}

function saveBody(item, overrides = {}) {
  return {
    meta: {
      ...(item.meta ?? {}),
      ...(overrides.meta ?? {}),
    },
    overlay: {
      title: item.overlay?.title ?? item.effective.title,
      video_url: item.overlay?.video_url ?? null,
      equipment: item.overlay?.equipment ?? null,
      checklist: item.overlay?.checklist ?? null,
      activity_method: item.overlay?.activity_method ?? null,
      activity_tip: item.overlay?.activity_tip ?? null,
      function_types: item.overlay?.function_types ?? null,
      main_theme: item.overlay?.main_theme ?? null,
      group_size: item.overlay?.group_size ?? null,
      is_published: item.overlay?.is_published ?? true,
      ...(overrides.overlay ?? {}),
    },
    publicationStatus: item.effective.publicationStatus,
  };
}

const browser = await chromium.launch({ headless: true });
const context = await createAuthenticatedContext(browser);
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && !/favicon|devtools|extension/i.test(message.text())) {
    consoleErrors.push(message.text());
  }
});

const artifactDirectory = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-admin-roundtrip');
await fs.mkdir(artifactDirectory, { recursive: true });

let originalItem;
let testProgramId;
let result;
try {
  await page.goto(`${base}/admin/spokedu-master/programs`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  if (new URL(page.url()).pathname !== '/admin/spokedu-master/programs') {
    throw new Error(`Admin route denied: ${new URL(page.url()).pathname}`);
  }

  const adminResponse = await page.request.get(`${base}/api/admin/spokedu-master/programs`);
  if (!adminResponse.ok()) throw new Error(`Admin programs GET failed: ${adminResponse.status()}`);
  const adminPayload = await adminResponse.json();
  originalItem = adminPayload.data.find((item) =>
    item.meta?.sm_is_hot === true &&
    Number(item.meta?.sm_display_order) >= 1 &&
    Number(item.meta?.sm_display_order) <= 4,
  ) ?? adminPayload.data.find((item) => item.curriculum.id === 52);
  if (!originalItem) throw new Error('No suitable roundtrip test program exists.');

  testProgramId = originalItem.curriculum.id;
  const marker = `QA-${Date.now()}`;
  const expected = {
    title: `${originalItem.effective.title} ${marker}`,
    theme: '협동형',
    target: '미취학',
    space: '교실',
    equipment: [`${marker} 원마커`, `${marker} 밴드`],
    coachScript: `${marker} 수업 스크립트`,
    activityMethod: [`${marker} 활동 1`, `${marker} 활동 2`],
    variationMethod: [`${marker} 변형 1`, `${marker} 변형 2`],
  };

  const mutationBody = saveBody(originalItem, {
    meta: {
      sm_theme: expected.theme,
      sm_grade: expected.target,
      sm_space: expected.space,
      sm_coach_script: expected.coachScript,
    },
    overlay: {
      title: expected.title,
      equipment: expected.equipment.join('\n'),
      activity_method: expected.activityMethod.join('\n'),
      activity_tip: ['[변형 방법]', ...expected.variationMethod].join('\n'),
      main_theme: expected.theme,
      group_size: expected.target,
    },
  });

  const saveResponse = await page.request.patch(
    `${base}/api/admin/spokedu-master/programs?id=${testProgramId}`,
    { data: mutationBody },
  );
  if (!saveResponse.ok()) throw new Error(`Admin save failed: ${saveResponse.status()}`);
  const savedAdminPayload = await saveResponse.json();
  const savedAdmin = savedAdminPayload.data.find((item) => item.curriculum.id === testProgramId);

  const publicResponse = await page.request.get(`${base}/api/spokedu-master/programs`);
  if (!publicResponse.ok()) throw new Error(`Public programs GET failed: ${publicResponse.status()}`);
  const publicPayload = await publicResponse.json();
  const publicProgram = publicPayload.data.find((program) => program.id === String(testProgramId));
  if (!publicProgram) throw new Error('Saved program is missing from public programs API.');

  await page.goto(`${base}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const weeklyCard = page.locator(`[data-weekly-program="${testProgramId}"]`);
  await weeklyCard.waitFor({ state: 'visible' });
  const cardText = await weeklyCard.innerText();
  await weeklyCard.locator('button').last().click();
  const dialog = page.getByRole('dialog', { name: '수업 미리보기' });
  await dialog.waitFor({ state: 'visible' });
  const modalText = await dialog.innerText();
  await page.keyboard.press('Escape');

  await page.goto(`${base}/spokedu-master/library/${testProgramId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const detailText = await page.locator('body').innerText();

  result = {
    adminEmail: adminUser.email,
    programId: testProgramId,
    expected,
    adminApi: {
      title: savedAdmin?.effective?.title,
      theme: savedAdmin?.meta?.sm_theme,
      target: savedAdmin?.meta?.sm_grade,
      space: savedAdmin?.meta?.sm_space,
      equipment: savedAdmin?.effective?.equipment,
      coachScript: savedAdmin?.meta?.sm_coach_script,
      activityMethod: savedAdmin?.effective?.steps,
      variationMethod: savedAdmin?.overlay?.activity_tip,
    },
    publicApi: {
      title: publicProgram.title,
      theme: publicProgram.category,
      target: publicProgram.grade,
      space: publicProgram.space,
      equipment: publicProgram.equipment,
      coachScript: publicProgram.lessonDetail?.coachScript,
      activityMethod: publicProgram.steps,
      variationMethod: publicProgram.lessonDetail?.variations,
    },
    screen: {
      card: {
        title: cardText.includes(expected.title),
        theme: cardText.includes(expected.theme),
        target: cardText.includes(expected.target),
        space: cardText.includes(expected.space),
      },
      modal: {
        title: modalText.includes(expected.title),
        equipment: expected.equipment.every((value) => modalText.includes(value)),
        coachScript: modalText.includes(expected.coachScript),
        activityMethod: expected.activityMethod.every((value) => modalText.includes(value)),
        variationMethod: expected.variationMethod.every((value) => modalText.includes(value)),
      },
      detail: {
        title: detailText.includes(expected.title),
        equipment: expected.equipment.every((value) => detailText.includes(value)),
        coachScript: detailText.includes(expected.coachScript),
        activityMethod: expected.activityMethod.every((value) => detailText.includes(value)),
        variationMethod: expected.variationMethod.every((value) => detailText.includes(value)),
      },
    },
    consoleErrors,
  };
} finally {
  if (originalItem && testProgramId) {
    const restoreResponse = await page.request.patch(
      `${base}/api/admin/spokedu-master/programs?id=${testProgramId}`,
      { data: saveBody(originalItem) },
    );
    if (!restoreResponse.ok()) {
      throw new Error(`Original program restore failed: ${restoreResponse.status()}`);
    }
    const restoredPayload = await restoreResponse.json();
    const restored = restoredPayload.data.find((item) => item.curriculum.id === testProgramId);
    if (restored?.effective?.title !== originalItem.effective.title) {
      throw new Error('Original program restore verification failed.');
    }
  }
  await context.close();
  await browser.close();
}

await fs.writeFile(
  path.join(artifactDirectory, 'result.json'),
  JSON.stringify(result, null, 2),
  'utf8',
);
console.log(JSON.stringify(result, null, 2));
