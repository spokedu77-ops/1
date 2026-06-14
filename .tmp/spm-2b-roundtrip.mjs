import fs from 'node:fs/promises';
import path from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const base = 'http://localhost:3000';
const curriculumId = 52;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Required Supabase environment variables are missing.');

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const backupPath = path.join(process.cwd(), '.tmp', 'spokedu-master-program-52-before.json');
const resultPath = path.join(process.cwd(), '.tmp', 'spokedu-master-program-52-roundtrip-result.json');
const marker = `[QA-2B-${Date.now()}]`;

const overlayFields = [
  'id',
  'source_center_curriculum_id',
  'title',
  'video_url',
  'equipment',
  'activity_method',
  'checklist',
  'activity_tip',
  'main_theme',
  'group_size',
  'function_type',
  'function_types',
  'is_published',
  'updated_at',
].join(',');
const metaFields = [
  'curriculum_id',
  'sm_theme',
  'sm_grade',
  'sm_tags',
  'sm_space',
  'sm_duration',
  'sm_setup_image_url',
  'sm_coach_script',
  'sm_briefing_notes',
  'sm_variation_method',
].join(',');

function normalize(value) {
  return String(value ?? '').trim();
}

function appendMarker(value) {
  return [normalize(value), marker].filter(Boolean).join('\n');
}

function parseSections(source) {
  const result = [];
  let current = { label: null, lines: [] };
  result.push(current);
  for (const raw of String(source ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    const match = line.match(/^\[([^\]]+)\]$/);
    if (match) {
      current = { label: match[1], lines: [] };
      result.push(current);
    } else if (line) {
      current.lines.push(line);
    }
  }
  return result;
}

function sectionSnapshot(source, targetLabel) {
  return parseSections(source).map((section) => ({
    label: section.label,
    lines: section.label === targetLabel
      ? section.lines.filter((line) => line !== marker)
      : section.lines,
  }));
}

function withoutUpdatedAt(value) {
  const { updated_at: _updatedAt, ...rest } = value;
  return rest;
}

async function readState() {
  const [overlayResult, metaResult] = await Promise.all([
    service
      .from('spokedu_pro_programs')
      .select(overlayFields)
      .eq('source_center_curriculum_id', curriculumId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1)
      .single(),
    service
      .from('spokedu_master_program_meta')
      .select(metaFields)
      .eq('curriculum_id', curriculumId)
      .single(),
  ]);
  if (overlayResult.error) throw overlayResult.error;
  if (metaResult.error) throw metaResult.error;
  return { overlay: overlayResult.data, meta: metaResult.data };
}

async function createAuthenticatedContext(browser) {
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const adminUser = ['spm.qa.admin@spokedu.test', 'choijihoon@spokedu.com']
    .map((email) => usersData.users.find((user) => user.email?.toLowerCase() === email))
    .find(Boolean);
  if (!adminUser?.email) throw new Error('No usable admin auth user exists.');

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email,
    options: { redirectTo: `${base}/` },
  });
  if (error || !data?.properties?.action_link) throw new Error('Could not create admin login link.');
  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) throw new Error('Could not resolve login token.');

  const cookies = [];
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({ token_hash: tokenHash, type: verificationType });
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
  return { context, adminEmail: adminUser.email };
}

function restorePayload(backup) {
  return {
    meta: {
      sm_theme: backup.meta.sm_theme,
      sm_grade: backup.meta.sm_grade,
      sm_tags: backup.meta.sm_tags,
      sm_space: backup.meta.sm_space,
      sm_duration: backup.meta.sm_duration,
      sm_setup_image_url: backup.meta.sm_setup_image_url,
      sm_coach_script: backup.meta.sm_coach_script,
      sm_briefing_notes: backup.meta.sm_briefing_notes,
      sm_variation_method: backup.meta.sm_variation_method,
    },
    overlay: {
      title: backup.overlay.title,
      video_url: backup.overlay.video_url,
      equipment: backup.overlay.equipment,
      activity_method: backup.overlay.activity_method,
      is_published: backup.overlay.is_published,
    },
  };
}

const backup = await readState();
await fs.writeFile(backupPath, JSON.stringify(backup, null, 2), 'utf8');

const browser = await chromium.launch({ headless: true });
const { context, adminEmail } = await createAuthenticatedContext(browser);
const page = await context.newPage();
let saveFlags = null;
let reloadedForm = null;
let savedState = null;
let restoreFlags = null;
let finalState = null;
let failure = null;

try {
  await page.goto(`${base}/admin/spokedu-master/programs`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  if (new URL(page.url()).pathname !== '/admin/spokedu-master/programs') {
    throw new Error(`Admin route denied: ${new URL(page.url()).pathname}`);
  }

  const itemButton = page.getByRole('button').filter({ hasText: `curriculumId ${curriculumId}` }).first();
  await itemButton.click();
  const textareas = page.locator('textarea');
  if (await textareas.count() !== 5) throw new Error(`Unexpected textarea count: ${await textareas.count()}`);

  const originalUiValues = await textareas.evaluateAll((nodes) => nodes.map((node) => node.value));
  if (normalize(originalUiValues[2]) !== normalize(backup.meta.sm_briefing_notes)) {
    throw new Error('Briefing form did not initialize from Master meta.');
  }
  if (normalize(originalUiValues[4]) !== normalize(backup.meta.sm_variation_method)) {
    throw new Error('Variation form did not initialize from Master meta.');
  }

  await textareas.nth(2).fill(appendMarker(originalUiValues[2]));
  await textareas.nth(4).fill(appendMarker(originalUiValues[4]));
  const saveResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'PATCH'
    && response.url().includes(`/api/admin/spokedu-master/programs?id=${curriculumId}`),
  );
  await page.getByRole('button', { name: /^저장$/ }).click();
  const saveResponse = await saveResponsePromise;
  saveFlags = await saveResponse.json();
  if (!saveResponse.ok() || saveFlags.ok !== true) throw new Error(`Admin save failed: ${JSON.stringify(saveFlags)}`);

  savedState = await readState();
  if (!normalize(savedState.meta.sm_briefing_notes).endsWith(marker)) throw new Error('Briefing marker missing from meta.');
  if (!normalize(savedState.meta.sm_variation_method).endsWith(marker)) throw new Error('Variation marker missing from meta.');

  const checklistLabels = parseSections(savedState.overlay.checklist).filter((section) => section.label === '사전 교육');
  const variationLabels = parseSections(savedState.overlay.activity_tip).filter((section) => section.label === '변형 방법');
  if (checklistLabels.length !== 1 || !checklistLabels[0].lines.includes(marker)) throw new Error('Briefing mirror is invalid.');
  if (variationLabels.length !== 1 || !variationLabels[0].lines.includes(marker)) throw new Error('Variation mirror is invalid.');
  if (JSON.stringify(sectionSnapshot(savedState.overlay.checklist, '사전 교육')) !== JSON.stringify(sectionSnapshot(backup.overlay.checklist, '사전 교육'))) {
    throw new Error('Non-briefing checklist content changed.');
  }
  if (JSON.stringify(sectionSnapshot(savedState.overlay.activity_tip, '변형 방법')) !== JSON.stringify(sectionSnapshot(backup.overlay.activity_tip, '변형 방법'))) {
    throw new Error('Non-variation activity_tip content changed.');
  }

  for (const key of ['title', 'video_url', 'equipment', 'activity_method', 'main_theme', 'group_size', 'function_type', 'function_types', 'is_published']) {
    if (JSON.stringify(savedState.overlay[key]) !== JSON.stringify(backup.overlay[key])) {
      throw new Error(`Forbidden overlay field changed: ${key}`);
    }
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByRole('button').filter({ hasText: `curriculumId ${curriculumId}` }).first().click();
  const reloadedTextareas = page.locator('textarea');
  reloadedForm = {
    briefingHasMarker: normalize(await reloadedTextareas.nth(2).inputValue()).endsWith(marker),
    variationHasMarker: normalize(await reloadedTextareas.nth(4).inputValue()).endsWith(marker),
    otherValuesUnchanged: JSON.stringify([
      await reloadedTextareas.nth(0).inputValue(),
      await reloadedTextareas.nth(1).inputValue(),
      await reloadedTextareas.nth(3).inputValue(),
    ]) === JSON.stringify([originalUiValues[0], originalUiValues[1], originalUiValues[3]]),
  };
  if (!reloadedForm.briefingHasMarker || !reloadedForm.variationHasMarker || !reloadedForm.otherValuesUnchanged) {
    throw new Error('Reloaded form verification failed.');
  }
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
} finally {
  try {
    try {
      const restoreResponse = await page.request.patch(
        `${base}/api/admin/spokedu-master/programs?id=${curriculumId}`,
        { data: restorePayload(backup), timeout: 90_000 },
      );
      restoreFlags = await restoreResponse.json();
      if (!restoreResponse.ok() || restoreFlags.ok !== true) {
        throw new Error(`Restore request failed: ${JSON.stringify(restoreFlags)}`);
      }
    } catch (restoreError) {
      restoreFlags = {
        responseTimedOut: restoreError instanceof Error && restoreError.name === 'TimeoutError',
        error: restoreError instanceof Error ? restoreError.message : String(restoreError),
      };
    }
    finalState = await readState();
    const overlayMatches = JSON.stringify(withoutUpdatedAt(finalState.overlay)) === JSON.stringify(withoutUpdatedAt(backup.overlay));
    const metaMatches = JSON.stringify(finalState.meta) === JSON.stringify(backup.meta);
    if (!overlayMatches || !metaMatches) {
      throw new Error(`Restore mismatch: overlay=${overlayMatches}, meta=${metaMatches}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

const result = {
  backupPath,
  adminEmail,
  curriculumId,
  overlayId: backup.overlay.id,
  marker,
  saveFlags,
  saved: savedState ? {
    metaBriefingMarker: normalize(savedState.meta.sm_briefing_notes).endsWith(marker),
    metaVariationMarker: normalize(savedState.meta.sm_variation_method).endsWith(marker),
    checklistExactSectionMarker: parseSections(savedState.overlay.checklist)
      .filter((section) => section.label === '사전 교육').some((section) => section.lines.includes(marker)),
    activityTipExactSectionMarker: parseSections(savedState.overlay.activity_tip)
      .filter((section) => section.label === '변형 방법').some((section) => section.lines.includes(marker)),
  } : null,
  reloadedForm,
  restoreFlags,
  restored: finalState ? {
    overlayMatchesBackup: JSON.stringify(withoutUpdatedAt(finalState.overlay)) === JSON.stringify(withoutUpdatedAt(backup.overlay)),
    metaMatchesBackup: JSON.stringify(finalState.meta) === JSON.stringify(backup.meta),
  } : null,
  failure,
};
await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
if (failure) process.exitCode = 1;
