import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const QA_ID = process.env.ADMIN_NOTE_QA_ID
  || process.env.SPM_QA_ADMIN_EMAIL
  || 'admin';
const QA_PASSWORD = process.env.ADMIN_NOTE_QA_PASSWORD
  || process.env.SPOKEDU_MASTER_QA_PASSWORD
  || process.env.SPM_QA_PASSWORD
  || '';

const CURRICULUM_ID = 52;
const TITLE = 'Center Linked QA Program';
const UPDATED_TITLE = 'Center Linked QA Program Updated';
const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const EQUIPMENT = ['QA cones', 'QA line tape'];
const ACTIVITY_METHOD = ['QA activity step one', 'QA activity step two'];
const COACH_SCRIPT = 'QA coach script from shared meta.';
const BRIEFING = 'QA briefing note from shared meta.';
const VARIATION = 'QA variation method from shared meta.';
const SETUP_IMAGE = '/spokedu-master-icon.svg';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function safeErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    throw new Error('Playwright is not installed.');
  }
}

async function gotoPage(page, route) {
  const url = route.startsWith('http') ? route : `${BASE}${route}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function pageSnapshot(page, label) {
  const text = await page.locator('body').innerText().catch(() => '');
  return `${label}: ${page.url()} :: ${text.slice(0, 500).replace(/\s+/g, ' ')}`;
}

async function login(context) {
  const page = await context.newPage();
  try {
    await gotoPage(page, `/login?next=${encodeURIComponent('/admin/curriculum')}`);
    await page.locator('input[type="text"], input[type="email"]').first().fill(QA_ID);
      await page.locator('input[type="password"]').first().fill(QA_PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/admin\/curriculum|\/spokedu-master\//, { timeout: 45_000 }).catch(async (error) => {
        throw new Error(`${safeErrorMessage(error)}\n${await pageSnapshot(page, '[debug] login failed')}`);
      });
  } finally {
    await page.close().catch(() => undefined);
  }
}

function publicProgramFromState(meta, overlay) {
  return {
    id: String(CURRICULUM_ID),
    title: overlay.title,
    category: meta.sm_theme,
    grade: meta.sm_grade,
    space: meta.sm_space,
    description: 'QA public library detail.',
    steps: overlay.activity_method.split('\n').filter(Boolean),
    equipment: overlay.equipment.split('\n').filter(Boolean),
    tags: meta.sm_tags,
    colors: ['#312e81', '#4338ca', '#6366f1', '#a5b4fc'],
    isPro: meta.sm_is_pro,
    isNew: meta.sm_is_new,
    isHot: meta.sm_is_hot,
    thumbnailUrl: SETUP_IMAGE,
    curriculumId: CURRICULUM_ID,
    lessonDetail: {
      recommendedAge: meta.sm_grade,
      recommendedPlayers: '2인 1조',
      objective: meta.sm_objective,
      developmentFocus: meta.sm_development_focus,
      coachScript: meta.sm_coach_script,
      parentNote: meta.sm_parent_note,
      fieldTips: [],
      variations: meta.sm_variation_method.split('\n').filter(Boolean),
      safetyNotes: [],
      relatedSpomoveIds: meta.sm_related_spomove_ids,
      videoUrl: overlay.video_url,
      heroImageUrl: meta.sm_hero_image_url,
      setupImageUrl: meta.sm_setup_image_url,
      galleryImageUrls: meta.sm_gallery_image_urls,
      briefingNotes: meta.sm_briefing_notes.split('\n').filter(Boolean),
      rules: overlay.activity_method.split('\n').filter(Boolean),
      setupNotes: [],
    },
  };
}

async function installMocks(page) {
  const state = {
    curriculum: {
      id: CURRICULUM_ID,
      title: TITLE,
      url: VIDEO_URL,
      month: 3,
      week: 1,
      is_sub: false,
      display_order: 1,
      type: 'youtube',
      equipment: EQUIPMENT,
      steps: ACTIVITY_METHOD,
      equipment_tag_numbers: [],
    },
    meta: {
      curriculum_id: CURRICULUM_ID,
      sm_tags: ['신체 기능:협응력', '움직임:동적', '인원:개인전'],
      sm_theme: '반응',
      sm_grade: '미취학',
      sm_space: '교실',
      sm_is_pro: true,
      sm_is_new: true,
      sm_is_hot: true,
      sm_display_order: 7,
      sm_objective: 'Preserve library objective.',
      sm_development_focus: 'Preserve library focus.',
      sm_coach_script: COACH_SCRIPT,
      sm_parent_note: 'Preserved parent note.',
      sm_related_spomove_ids: ['color-match'],
      sm_thumbnail_url: SETUP_IMAGE,
      sm_hero_image_url: SETUP_IMAGE,
      sm_setup_image_url: SETUP_IMAGE,
      sm_gallery_image_urls: [],
      sm_briefing_notes: BRIEFING,
      sm_variation_method: VARIATION,
    },
    overlay: {
      id: 9001,
      source_center_curriculum_id: CURRICULUM_ID,
      title: TITLE,
      video_url: VIDEO_URL,
      equipment: EQUIPMENT.join('\n'),
      activity_method: ACTIVITY_METHOD.join('\n'),
      is_published: true,
      updated_at: '2026-06-20T09:00:00.000Z',
    },
    curriculumPatchUrl: '',
    adminPatchUrl: '',
    adminPatchBody: null,
    syncBody: null,
  };

  await page.route('**/api/spokedu-master/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, userId: '11111111-1111-4111-8111-111111111111' }),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });

  await page.route('**/api/spokedu-master/subscription', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'pro', status: 'active', periodEnd: '2026-07-01T00:00:00.000Z' }),
    });
  });

  await page.route('**/api/spokedu-master/programs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [publicProgramFromState(state.meta, state.overlay)] }),
      headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Authorization' },
    });
  });

  await page.route('**/api/admin/spokedu-master/programs/sync-center', async (route) => {
    const request = route.request();
    state.syncBody = request.method() === 'POST' ? await request.postDataJSON().catch(() => ({})) : null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        dryRun: false,
        applied: 1,
        summary: {
          totalCurriculum: 1,
          linked: 1,
          toInsert: 0,
          toUpdate: 1,
          unchanged: 0,
          fieldMismatches: { title: 1, video_url: 1, equipment: 1, activity_method: 1 },
        },
        changes: [{
          curriculumId: CURRICULUM_ID,
          action: 'update',
          fields: ['title', 'video_url', 'equipment', 'activity_method'],
          after: {
            title: state.curriculum.title,
            video_url: state.curriculum.url,
            equipment: state.curriculum.equipment.join('\n'),
            activity_method: state.curriculum.steps.join('\n'),
          },
        }],
      }),
    });
  });

  await page.route('**/api/admin/spokedu-master/programs?id=*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    state.adminPatchUrl = request.url();
    state.adminPatchBody = await request.postDataJSON();
    assert(url.searchParams.get('id') === String(CURRICULUM_ID), 'admin save did not use the same curriculum id');

    state.meta = { ...state.meta, ...state.adminPatchBody.meta };
    state.overlay = {
      ...state.overlay,
      title: state.adminPatchBody.overlay.title,
      video_url: state.adminPatchBody.overlay.video_url,
      equipment: state.adminPatchBody.overlay.equipment,
      activity_method: state.adminPatchBody.overlay.activity_method,
      is_published: state.adminPatchBody.overlay.is_published,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: [{
          curriculum: { id: CURRICULUM_ID },
          meta: state.meta,
          overlay: state.overlay,
          effective: {
            title: state.overlay.title,
            videoUrl: state.overlay.video_url,
            equipment: state.overlay.equipment,
            steps: state.overlay.activity_method,
            publicationStatus: 'ready',
          },
        }],
      }),
    });
  });

  await page.route('**/rest/v1/curriculum**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([state.curriculum]),
      });
      return;
    }
    if (request.method() === 'PATCH') {
      state.curriculumPatchUrl = request.url();
      const body = await request.postDataJSON();
      state.curriculum = { ...state.curriculum, ...body };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([state.curriculum]),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/spokedu_master_program_meta**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([state.meta]),
    });
  });

  await page.route('**/rest/v1/personal_curriculum**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route('**/rest/v1/curriculum_sub_tags**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route('**/rest/v1/curriculum_equipment_master**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route('**/rest/v1/curriculum_equipment_activities**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  return state;
}

async function fillFirstInput(form, currentValue, nextValue) {
  const input = form.locator(`input[value="${currentValue}"]`).first();
  await input.fill(nextValue);
}

async function main() {
  if (!QA_ID || !QA_PASSWORD) {
    throw new Error('Missing admin QA login credentials for center curriculum browser flow.');
  }

  const startedAt = Date.now();
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  const state = await installMocks(page);
  try {
    await login(context);

    await gotoPage(page, '/admin/curriculum');
    console.log(await pageSnapshot(page, '[debug] admin loaded'));
    await page.locator('main button').nth(1).click();
    await page.waitForTimeout(700);
    console.log(await pageSnapshot(page, '[debug] center tab clicked'));
    await page.getByText(TITLE).waitFor({ state: 'visible' }).catch(async (error) => {
      throw new Error(`${safeErrorMessage(error)}\n${await pageSnapshot(page, '[debug] title missing')}`);
    });
    const card = page.locator('div').filter({ hasText: TITLE }).first();
    await card.locator('button').nth(1).click({ force: true });

    const form = page.locator('form').filter({ hasText: TITLE }).first();
    await form.waitFor({ state: 'visible' });
    const formText = await form.innerText();
    for (const value of ['반응', '미취학', '교실', '협응력', '동적', '개인전']) {
      assert(formText.includes(value), `edit modal did not restore ${value}`);
    }
    await expectTextareaValue(form, COACH_SCRIPT, 'coach script');
    await expectTextareaValue(form, BRIEFING, 'briefing notes');
    await expectTextareaValue(form, VARIATION, 'variation method');

    await fillFirstInput(form, TITLE, UPDATED_TITLE);
    await form.getByRole('button', { name: '2인 1조' }).click();
    await form.locator('button[type="submit"]').click();
    await page.waitForFunction(() => window.__spmCenterSaveDone === true, null, { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(700);

    assert(state.curriculumPatchUrl.includes(`id=eq.${CURRICULUM_ID}`), 'curriculum PATCH did not target the same curriculum id');
    assert(state.adminPatchUrl.includes(`id=${CURRICULUM_ID}`), 'admin PATCH did not use the same curriculum id');
    assert(state.adminPatchBody?.meta?.sm_tags?.includes('인원:2인 1조'), 'admin save did not store participant tag as 2인 1조');
    assert(state.adminPatchBody?.overlay?.title === UPDATED_TITLE, 'admin save did not send updated title');
    assert(state.adminPatchBody?.overlay?.video_url === VIDEO_URL, 'admin save did not preserve video url');
    assert(state.adminPatchBody?.overlay?.equipment === EQUIPMENT.join('\n'), 'admin save did not send equipment');
    assert(state.adminPatchBody?.overlay?.activity_method === ACTIVITY_METHOD.join('\n'), 'admin save did not send activity method');

    await page.evaluate(() => fetch('/api/admin/spokedu-master/programs/sync-center', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: false }),
    }));
    assert(state.syncBody?.dryRun === false, 'sync request was not executed as apply mode');

    await gotoPage(page, `/spokedu-master/library/${CURRICULUM_ID}`);
    const bodyText = await page.locator('body').innerText();
    for (const value of [
      UPDATED_TITLE,
      '인원',
      '2인 1조',
      '사전 체크리스트',
      'QA cones',
      'QA line tape',
      COACH_SCRIPT,
      BRIEFING,
      '초기 교구 세팅',
      'QA activity step one',
      'QA activity step two',
      VARIATION,
    ]) {
      assert(bodyText.includes(value), `library detail missing ${value}`);
    }
    assert(!bodyText.includes('시간'), 'library detail still shows time meta');
    assert(!bodyText.includes('Expert Tip'), 'library detail still shows Expert Tip');

    const checklistSection = page.locator('section').filter({ hasText: '사전 체크리스트' }).first();
    const checklistText = await checklistSection.innerText();
    assert(checklistText.includes('QA cones'), 'checklist missing equipment');
    assert(checklistText.includes(COACH_SCRIPT), 'checklist missing coach script');
    assert(checklistText.includes(BRIEFING), 'checklist missing briefing');
    assert(!checklistText.includes('초기 교구 세팅'), 'setup image is inside checklist section');

    const elapsedMs = Date.now() - startedAt;
    console.log(JSON.stringify({
      ok: true,
      elapsedMs,
      checked: [
        'edit modal restored shared meta',
        'participant saved as 2인 1조',
        'same curriculum id used',
        'sync apply request intercepted',
        'library detail rendered participant/checklist/setup/activity/variation',
        'time meta and Expert Tip absent',
      ],
    }, null, 2));
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function expectTextareaValue(form, expected, label) {
  const count = await form.locator('textarea').count();
  for (let index = 0; index < count; index += 1) {
    const value = await form.locator('textarea').nth(index).inputValue();
    if (value === expected) return;
  }
  throw new Error(`edit modal did not restore ${label}`);
}

main().catch((error) => {
  console.error(safeErrorMessage(error));
  process.exit(1);
});
