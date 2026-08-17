import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium, webkit } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const qaEmail = process.env.SPOKEDU_MASTER_QA_ID || process.env.SPOKEDU_MASTER_QA_EMAIL;
if (!supabaseUrl || !anonKey || !serviceKey || !qaEmail) {
  throw new Error('Required QA environment variables are missing.');
}

const artifacts = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-autoplay');
await fs.mkdir(artifacts, { recursive: true });

const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;
const qaUser = usersData.users.find((user) => user.email?.toLowerCase() === qaEmail.toLowerCase());
if (!qaUser?.email) throw new Error('The configured QA auth user does not exist.');

async function authCookies() {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: qaUser.email,
    options: { redirectTo: `${base}/` },
  });
  if (error || !data?.properties?.action_link) throw new Error('Could not create QA login link.');
  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  if (!tokenHash) throw new Error('Could not resolve QA login token.');

  const cookies = [];
  const ssr = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: tokenHash,
    type: actionUrl.searchParams.get('type') ?? 'magiclink',
  });
  if (verifyError) throw verifyError;
  return cookies.map((cookie) => ({
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
  }));
}

function playableKind(videoUrl) {
  if (!videoUrl) return 'none';
  if (/youtube\.com|youtu\.be/i.test(videoUrl)) return 'youtube';
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl)) return 'direct';
  if (/^https?:\/\//i.test(videoUrl)) return 'external';
  return 'none';
}

async function readStore(page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('spokedu-master-store');
    return raw ? JSON.parse(raw) : null;
  });
}

async function clearActivities(page) {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem('spokedu-master-store');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state = {
      ...parsed.state,
      recentProgramActivities: [],
      pendingRecentProgramActivities: [],
    };
    parsed.version = 11;
    window.localStorage.setItem('spokedu-master-store', JSON.stringify(parsed));
  });
}

async function activitiesFor(page, programId) {
  const store = await readStore(page);
  return (store?.state?.recentProgramActivities ?? []).filter(
    (activity) => activity.programId === programId,
  );
}

async function dispatchYoutubePlaying(page) {
  return page.evaluate(() => {
    const iframe = document.querySelector('[data-preview-media] iframe, #lesson-video iframe');
    if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) return false;
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://www.youtube.com',
      source: iframe.contentWindow,
      data: JSON.stringify({ event: 'onStateChange', info: 1 }),
    }));
    return true;
  });
}

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(700);
}

async function runEngine(engineName, browserType, viewport) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  await context.addCookies(await authCookies());
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !/favicon|devtools|extension/i.test(message.text())) {
      consoleErrors.push({
        text: message.text(),
        location: message.location(),
      });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({ status: response.status(), url: response.url() });
    }
  });

  const result = {
    engine: engineName,
    viewport,
    programs: {},
    dashboard: {},
    context: {},
    library: {},
    detail: {},
    continue: {},
    migration: {},
    isolation: {},
    responsive: {},
    consoleErrors,
    pageErrors,
    failedResponses,
  };

  try {
    await page.goto(`${base}/spokedu-master/dashboard`);
    await waitForApp(page);
    const response = await page.request.get(`${base}/api/spokedu-master/programs`);
    if (!response.ok()) throw new Error(`Programs API failed: ${response.status()}`);
    const payload = await response.json();
    const programs = payload.data ?? [];
    const candidates = programs.map((program) => ({
      id: program.id,
      title: program.title,
      videoUrl: program.lessonDetail?.videoUrl ?? null,
      playable: playableKind(program.lessonDetail?.videoUrl),
    }));
    const youtubeProgram = candidates.find((program) => program.playable === 'youtube');
    const alternateProgram = candidates.find((program) => ['direct', 'external'].includes(program.playable));
    const noVideoProgram = candidates.find((program) => program.playable === 'none');
    result.programs = { youtubeProgram, alternateProgram: alternateProgram ?? null, noVideoProgram };
    if (!youtubeProgram || !noVideoProgram) throw new Error('Required public program candidates were not found.');

    const weeklyCards = page.locator('[data-weekly-program]');
    const weeklyIds = await weeklyCards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-weekly-program')));
    const weeklyVideo = candidates.find(
      (program) => weeklyIds.includes(program.id) && program.playable !== 'none',
    );
    result.dashboard.weeklyIds = weeklyIds;
    result.dashboard.videoProgram = weeklyVideo ?? null;

    if (weeklyVideo) {
      await clearActivities(page);
      await page.reload();
      await waitForApp(page);
      const card = page.locator(`[data-weekly-program="${weeklyVideo.id}"]`);
      result.dashboard.nestedInteractive = await card.locator('button a, a button, button button').count();
      result.dashboard.playPointerEvents = await card.locator('span:has(svg.lucide-play)').evaluate(
        (node) => getComputedStyle(node).pointerEvents,
      );
      await card.locator('[data-card-media] > button').click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible' });
      const iframe = dialog.locator('iframe');
      result.dashboard.autoplaySrc = await iframe.getAttribute('src');
      const mediaBox = await dialog.locator('[data-preview-media]').boundingBox();
      const summaryBox = await dialog.locator('[data-preview-summary]').boundingBox();
      const iframeBox = await iframe.boundingBox();
      result.dashboard.modalGeometry = {
        media: mediaBox,
        summary: summaryBox,
        iframe: iframeBox,
        aspectRatio: iframeBox ? iframeBox.height / iframeBox.width : null,
        columnHeightDelta: mediaBox && summaryBox
          ? Math.abs(mediaBox.height - summaryBox.height)
          : null,
      };
      await dialog.screenshot({
        path: path.join(artifacts, `${engineName}-${viewport.width}x${viewport.height}-modal.png`),
      });
      result.dashboard.beforePlaying = (await activitiesFor(page, weeklyVideo.id)).length;
      result.dashboard.playingDispatched = await dispatchYoutubePlaying(page);
      await page.waitForTimeout(100);
      result.dashboard.afterPlaying = (await activitiesFor(page, weeklyVideo.id)).length;
      result.dashboard.action = (await activitiesFor(page, weeklyVideo.id))[0]?.action ?? null;
      await page.keyboard.press('Escape');
      result.dashboard.iframeAfterClose = await page.locator('[role="dialog"] iframe').count();

      const continueItem = page.locator(`[data-continue-item="lesson-${weeklyVideo.id}"]`);
      await continueItem.waitFor({ state: 'visible' });
      result.continue.immediate = true;
      result.continue.text = await continueItem.innerText();
      result.continue.href = await continueItem.getAttribute('href');
      await page.reload();
      await waitForApp(page);
      result.continue.persisted = await page.locator(`[data-continue-item="lesson-${weeklyVideo.id}"]`).isVisible();
    }

    const contextCard = page.locator('[data-context-program]').filter({
      has: page.locator('span:has(svg.lucide-play)'),
    }).first();
    if (await contextCard.count()) {
      const contextId = await contextCard.getAttribute('data-context-program');
      await contextCard.locator('[data-card-media] > button').click();
      await page.getByRole('dialog').waitFor({ state: 'visible' });
      result.context.programId = contextId;
      result.context.autoplaySrc = await page.getByRole('dialog').locator('iframe').getAttribute('src');
      await page.keyboard.press('Escape');
    } else {
      result.context.skipped = 'No playable field-program card is currently public.';
    }

    await page.goto(`${base}/spokedu-master/library`);
    await waitForApp(page);
    const libraryVideoCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: youtubeProgram.title }),
    }).first();
    await libraryVideoCard.locator('button').first().click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    result.library.autoplaySrc = await page.getByRole('dialog').locator('iframe').getAttribute('src');
    await page.keyboard.press('Escape');

    const libraryNoVideoCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: noVideoProgram.title }),
    }).first();
    if (await libraryNoVideoCard.count()) {
      await clearActivities(page);
      await libraryNoVideoCard.locator('button').first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible' });
      result.library.noVideo = {
        playIcons: await dialog.locator('svg.lucide-play').count(),
        iframes: await dialog.locator('iframe').count(),
        videos: await dialog.locator('video').count(),
        activities: (await activitiesFor(page, noVideoProgram.id)).length,
      };
      await page.keyboard.press('Escape');
    }

    const detailPaths = [
      `/spokedu-master/library/${youtubeProgram.id}`,
      `/spokedu-master/library/${youtubeProgram.id}?section=video`,
      `/spokedu-master/library/${youtubeProgram.id}?section=video&autoplay=1`,
    ];
    for (const detailPath of detailPaths) {
      await page.goto(`${base}${detailPath}`);
      await waitForApp(page);
      await clearActivities(page);
      await page.reload();
      await waitForApp(page);
      const iframe = page.locator('#lesson-video iframe');
      const src = await iframe.getAttribute('src');
      const before = (await activitiesFor(page, youtubeProgram.id)).map((item) => item.action);
      if (detailPath.includes('autoplay=1')) {
        await dispatchYoutubePlaying(page);
        await page.waitForTimeout(100);
      }
      const after = (await activitiesFor(page, youtubeProgram.id)).map((item) => item.action);
      result.detail[detailPath] = {
        src,
        before,
        after,
        hadPlayingBeforeMeasurement: before[0] === 'video_started',
        videoVisible: await page.locator('#lesson-video').isVisible(),
      };
    }

    await page.goto(`${base}/spokedu-master/dashboard`);
    await waitForApp(page);
    await page.evaluate(({ videoProgram, missingId }) => {
      const raw = window.localStorage.getItem('spokedu-master-store');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const ownerId = `id:${parsed.state.profile.id}`;
      parsed.version = 10;
      parsed.state.recentProgramActivities = [
        {
          ownerId,
          programId: videoProgram.id,
          programTitle: 'Old title',
          action: 'video_started',
          occurredAt: new Date().toISOString(),
          resumeHref: '/wrong/legacy/path',
        },
        {
          ownerId,
          programId: missingId,
          programTitle: 'Deleted fixture',
          action: 'video_started',
          occurredAt: new Date(Date.now() + 1000).toISOString(),
          resumeHref: '/wrong/deleted/path',
        },
      ];
      window.localStorage.setItem('spokedu-master-store', JSON.stringify(parsed));
    }, { videoProgram: youtubeProgram, missingId: 'qa-missing-program' });
    await page.reload();
    await waitForApp(page);
    const migratedStore = await readStore(page);
    result.migration = {
      version: migratedStore?.version,
      resumeHrefPresent: migratedStore?.state?.recentProgramActivities?.some(
        (activity) => Object.hasOwn(activity, 'resumeHref'),
      ),
      currentTitleShown: await page.locator(`[data-continue-item="lesson-${youtubeProgram.id}"]`).innerText(),
      derivedHref: await page.locator(`[data-continue-item="lesson-${youtubeProgram.id}"]`).getAttribute('href'),
      missingShown: await page.locator('[data-continue-item="lesson-qa-missing-program"]').count(),
    };

    await page.evaluate(({ currentId, currentEmail, program }) => {
      const raw = window.localStorage.getItem('spokedu-master-store');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.version = 10;
      parsed.state.profile = {
        ...parsed.state.profile,
        id: currentId,
        email: currentEmail,
      };
      parsed.state.recentProgramActivities = [
        {
          ownerId: `email:${currentEmail.toLowerCase()}`,
          programId: program.id,
          programTitle: program.title,
          action: 'video_started',
          occurredAt: new Date().toISOString(),
          resumeHref: '/legacy/current-email',
        },
        {
          ownerId: 'email:other-user@spokedu.test',
          programId: program.id,
          programTitle: 'Other user title',
          action: 'video_started',
          occurredAt: new Date(Date.now() + 1000).toISOString(),
          resumeHref: '/legacy/other-email',
        },
        {
          ownerId: 'anonymous',
          programId: program.id,
          programTitle: 'Anonymous title',
          action: 'video_started',
          occurredAt: new Date(Date.now() + 2000).toISOString(),
          resumeHref: '/legacy/anonymous',
        },
      ];
      window.localStorage.setItem('spokedu-master-store', JSON.stringify(parsed));
    }, {
      currentId: qaUser.id,
      currentEmail: qaUser.email,
      program: youtubeProgram,
    });
    await page.reload();
    await waitForApp(page);
    const isolatedStore = await readStore(page);
    const currentOwner = `id:${qaUser.id}`;
    const isolatedActivities = isolatedStore?.state?.recentProgramActivities ?? [];
    result.isolation = {
      currentOwnerCount: isolatedActivities.filter((item) => item.ownerId === currentOwner).length,
      otherEmailCount: isolatedActivities.filter(
        (item) => item.ownerId === 'email:other-user@spokedu.test',
      ).length,
      anonymousCount: isolatedActivities.filter((item) => item.ownerId === 'anonymous').length,
      otherTitleVisible: (await page.locator('body').innerText()).includes('Other user title'),
      anonymousTitleVisible: (await page.locator('body').innerText()).includes('Anonymous title'),
    };

    await page.evaluate(({ ownerId, program }) => {
      const raw = window.localStorage.getItem('spokedu-master-store');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const currentItems = Array.from({ length: 51 }, (_, index) => ({
        ownerId,
        programId: index === 0 ? program.id : `current-${index}`,
        programTitle: index === 0 ? program.title : `Current ${index}`,
        action: 'lesson_opened',
        occurredAt: new Date(Date.now() - index * 1000).toISOString(),
      }));
      parsed.state.recentProgramActivities = [
        ...currentItems,
        {
          ownerId: 'id:other-owner',
          programId: 'other-program',
          programTitle: 'Other owner program',
          action: 'lesson_opened',
          occurredAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem('spokedu-master-store', JSON.stringify(parsed));
    }, { ownerId: currentOwner, program: youtubeProgram });
    await page.reload();
    await waitForApp(page);
    const capCard = page.locator('[data-weekly-program]').filter({
      has: page.locator('span:has(svg.lucide-play)'),
    }).first();
    await capCard.locator('[data-card-media] > button').click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await dispatchYoutubePlaying(page);
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    const cappedStore = await readStore(page);
    const cappedActivities = cappedStore?.state?.recentProgramActivities ?? [];
    result.isolation.currentOwnerAfterCap = cappedActivities.filter(
      (item) => item.ownerId === currentOwner,
    ).length;
    result.isolation.otherOwnerAfterCap = cappedActivities.filter(
      (item) => item.ownerId === 'id:other-owner',
    ).length;

    result.responsive = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dialogs: document.querySelectorAll('[role="dialog"]').length,
    }));
    await page.screenshot({
      path: path.join(artifacts, `${engineName}-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  } finally {
    await context.close();
    await browser.close();
  }
  return result;
}

const runs = [
  ['chromium-desktop', chromium, { width: 1440, height: 900 }],
  ['chromium-mobile', chromium, { width: 390, height: 844 }],
  ['webkit-mobile', webkit, { width: 390, height: 844 }],
];

const results = [];
for (const [name, browserType, viewport] of runs) {
  results.push(await runEngine(name, browserType, viewport));
}

await fs.writeFile(
  path.join(artifacts, 'result.json'),
  JSON.stringify(results, null, 2),
  'utf8',
);
console.log(JSON.stringify(results, null, 2));

const failures = [];
for (const result of results) {
  const autoplayValues = [
    result.dashboard.autoplaySrc,
    result.context.autoplaySrc,
    result.library.autoplaySrc,
  ].filter(Boolean);
  if (autoplayValues.some((src) => !src.includes('autoplay=1') || !src.includes('mute=1'))) {
    failures.push(`${result.engine}: autoplay or mute query missing`);
  }
  if (result.dashboard.videoProgram) {
    if (result.dashboard.beforePlaying !== 0 || result.dashboard.afterPlaying !== 1) {
      failures.push(`${result.engine}: playback recording boundary failed`);
    }
    if (result.dashboard.nestedInteractive !== 0 || result.dashboard.playPointerEvents !== 'none') {
      failures.push(`${result.engine}: card interaction structure failed`);
    }
    if (!result.continue.immediate || !result.continue.persisted) {
      failures.push(`${result.engine}: continue item did not update or persist`);
    }
  } else {
    failures.push(`${result.engine}: no playable weekly recommendation`);
  }
  if (result.library.noVideo) {
    if (
      result.library.noVideo.iframes !== 0 ||
      result.library.noVideo.videos !== 0 ||
      result.library.noVideo.activities !== 0
    ) {
      failures.push(`${result.engine}: no-video preview emitted video state`);
    }
  }
  const normal = result.detail[`/spokedu-master/library/${result.programs.youtubeProgram.id}`];
  const section = result.detail[`/spokedu-master/library/${result.programs.youtubeProgram.id}?section=video`];
  const resume = result.detail[`/spokedu-master/library/${result.programs.youtubeProgram.id}?section=video&autoplay=1`];
  if (normal.src?.includes('autoplay=1') || normal.before[0] !== 'lesson_opened') {
    failures.push(`${result.engine}: normal detail entry failed`);
  }
  if (section.src?.includes('autoplay=1') || section.before[0] !== 'lesson_opened') {
    failures.push(`${result.engine}: section-only detail entry failed`);
  }
  if (
    !resume.src?.includes('autoplay=1') ||
    resume.before.includes('lesson_opened') ||
    resume.after[0] !== 'video_started'
  ) {
    failures.push(`${result.engine}: resume detail entry failed`);
  }
  if (
    result.migration.version !== 11 ||
    result.migration.resumeHrefPresent ||
    result.migration.missingShown !== 0 ||
    !result.migration.derivedHref?.includes('autoplay=1')
  ) {
    failures.push(`${result.engine}: persist migration or stale program filtering failed`);
  }
  if (result.responsive.documentOverflow !== 0) failures.push(`${result.engine}: page overflow`);
  const unexpectedConsoleErrors = result.consoleErrors.filter(
    (message) =>
      !/Failed to load resource: the server responded with a status of 404/i.test(message.text) ||
      Boolean(message.location?.url),
  );
  const unexpectedFailedResponses = result.failedResponses.filter(
    (response) => !/img\.youtube\.com\/vi\/.+\/maxresdefault\.jpg/i.test(response.url),
  );
  if (unexpectedConsoleErrors.length || result.pageErrors.length || unexpectedFailedResponses.length) {
    failures.push(`${result.engine}: console/page/network errors`);
  }
  if (
    result.dashboard.modalGeometry?.aspectRatio &&
    Math.abs(result.dashboard.modalGeometry.aspectRatio - 9 / 16) > 0.02
  ) {
    failures.push(`${result.engine}: preview media is not 16:9`);
  }
  if (
    result.viewport.width >= 1024 &&
    result.dashboard.modalGeometry?.columnHeightDelta > 1
  ) {
    failures.push(`${result.engine}: preview columns differ in height`);
  }
  if (result.dashboard.iframeAfterClose !== 0) failures.push(`${result.engine}: iframe remained after close`);
  if (
    result.isolation.currentOwnerCount !== 1 ||
    result.isolation.otherEmailCount !== 1 ||
    result.isolation.anonymousCount !== 1 ||
    result.isolation.otherTitleVisible ||
    result.isolation.anonymousTitleVisible
  ) {
    failures.push(`${result.engine}: owner migration or isolation failed`);
  }
  if (
    result.isolation.currentOwnerAfterCap !== 50 ||
    result.isolation.otherOwnerAfterCap !== 1
  ) {
    failures.push(`${result.engine}: per-owner activity cap failed`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ failures }, null, 2));
  process.exitCode = 1;
}
