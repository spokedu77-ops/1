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
const proUser = usersData.users.find((user) => user.email?.toLowerCase() === 'spm.qa.pro@spokedu.test');
if (!proUser?.email) throw new Error('The pro QA auth user does not exist.');

async function createAuthenticatedContext(browser) {
  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: proUser.email,
    options: { redirectTo: `${base}/` },
  });
  if (error || !data?.properties?.action_link) throw new Error('Could not create pro QA login link.');
  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) throw new Error('Could not resolve pro QA login token.');

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

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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

async function readActivities(page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('spokedu-master-store');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed?.state?.recentProgramActivities ?? [];
  });
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

const artifactDirectory = path.join(process.cwd(), 'qa-artifacts', 'spokedu-master-recent-activity');
await fs.mkdir(artifactDirectory, { recursive: true });

try {
  await page.goto(`${base}/spokedu-master/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => {
    const raw = window.localStorage.getItem('spokedu-master-store');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state = { ...parsed.state, recentProgramActivities: [] };
    window.localStorage.setItem('spokedu-master-store', JSON.stringify(parsed));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const weeklyCards = page.locator('[data-weekly-program]');
  let videoCard = null;
  for (let index = 0; index < await weeklyCards.count(); index += 1) {
    const candidate = weeklyCards.nth(index);
    if (await candidate.locator('button').count() >= 3) {
      videoCard = candidate;
      break;
    }
  }
  if (!videoCard) throw new Error('No weekly recommendation with a playable video was found.');
  const programId = await videoCard.getAttribute('data-weekly-program');
  const programTitle = (await videoCard.locator('h3').innerText()).trim();
  const buttons = videoCard.locator('button');
  if ((await buttons.count()) < 3 || !programId) {
    throw new Error('No weekly recommendation with a playable video was found.');
  }

  await buttons.first().evaluate((element) => element.click());
  const previewDialog = page.getByRole('dialog');
  await previewDialog.waitFor({ state: 'visible' });
  const previewText = await previewDialog.innerText();
  const previewOnlyCount = (await readActivities(page)).length;
  await page.keyboard.press('Escape');

  await buttons.nth(1).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  const afterPlay = await readActivities(page);
  await page.keyboard.press('Escape');

  const continueItem = page.locator(`[data-continue-item="lesson-${programId}"]`);
  await continueItem.waitFor({ state: 'visible' });
  const immediateContinueText = await continueItem.innerText();

  await buttons.nth(1).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  const afterRepeat = await readActivities(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const persistedItem = page.locator(`[data-continue-item="lesson-${programId}"]`);
  await persistedItem.waitFor({ state: 'visible' });
  const persistedContinueText = await persistedItem.innerText();
  await persistedItem.click();
  await page.waitForURL(new RegExp(`/spokedu-master/library/${programId}\\?section=video`));
  await page.locator('#lesson-video').waitFor({ state: 'visible' });
  const detailText = await page.locator('body').innerText();
  const publicResponse = await page.request.get(`${base}/api/spokedu-master/programs`);
  const publicPayload = publicResponse.ok() ? await publicResponse.json() : { data: [] };
  const publicProgram = publicPayload.data.find((program) => program.id === programId);

  const result = {
    programId,
    programTitle,
    previewOnlyCount,
    afterPlayCount: afterPlay.length,
    afterPlayAction: afterPlay[0]?.action,
    afterRepeatCount: afterRepeat.length,
    immediateContinue: immediateContinueText.includes(programTitle),
    persistedContinue: persistedContinueText.includes(programTitle),
    resumePath: new URL(page.url()).pathname + new URL(page.url()).search,
    videoSectionVisible: await page.locator('#lesson-video').isVisible(),
    variationContract: {
      publicApiHasVariation: (publicProgram?.lessonDetail?.variations ?? []).length > 0,
      previewHasOfficialLabel: previewText.includes('변형 방법'),
      previewHasLegacyLabel: previewText.includes('응용 방법'),
      detailHasOfficialLabel: detailText.includes('변형 방법'),
      detailHasLegacyLabel: detailText.includes('응용 방법'),
    },
    consoleErrors,
  };

  await page.screenshot({
    path: path.join(artifactDirectory, 'resume-video-section.png'),
    fullPage: true,
  });
  await fs.writeFile(
    path.join(artifactDirectory, 'result.json'),
    JSON.stringify(result, null, 2),
    'utf8',
  );
  console.log(JSON.stringify(result, null, 2));

  if (
    previewOnlyCount !== 0 ||
    afterPlay.length !== 1 ||
    afterPlay[0]?.action !== 'video_started' ||
    afterRepeat.length !== 1 ||
    !result.immediateContinue ||
    !result.persistedContinue ||
    !result.videoSectionVisible ||
    !result.variationContract.publicApiHasVariation ||
    !result.variationContract.previewHasOfficialLabel ||
    result.variationContract.previewHasLegacyLabel ||
    !result.variationContract.detailHasOfficialLabel ||
    result.variationContract.detailHasLegacyLabel ||
    consoleErrors.length > 0
  ) {
    process.exitCode = 1;
  }
} finally {
  await context.close();
  await browser.close();
}
