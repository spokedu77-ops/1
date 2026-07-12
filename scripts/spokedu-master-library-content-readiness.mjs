import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const BASE = (process.argv.find((arg) => /^https?:\/\//.test(arg)) || 'http://localhost:3000').replace(/\/$/, '');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

const PLACEHOLDER_PATTERN = /확인 필요|활동 공간 확인|미정|undefined|null|NaN/i;
const ADMIN_EMAILS = ['spm.qa.admin@spokedu.test', 'choijihoon@spokedu.com'];

function fail(message) {
  console.error(`[library-content] FAIL: ${message}`);
  process.exit(1);
}

function isPlaceholder(value) {
  const text = String(value ?? '').trim();
  return !text || PLACEHOLDER_PATTERN.test(text);
}

function hasExecutionDetail(program) {
  return Boolean((program.lessonDetail?.rules?.length ?? 0) >= 2 || (program.steps?.length ?? 0) >= 2);
}

function hasTeachingSupport(program) {
  const detail = program.lessonDetail ?? {};
  return Boolean(
    detail.safetyNotes?.some((item) => !isPlaceholder(item))
      || detail.variations?.some((item) => !isPlaceholder(item))
      || detail.fieldTips?.some((item) => !isPlaceholder(item))
      || (detail.coachScript && !isPlaceholder(detail.coachScript))
      || detail.briefingNotes?.some((item) => !isPlaceholder(item)),
  );
}

function hasPreview(program) {
  const detail = program.lessonDetail ?? {};
  const hero = program.heroImageUrl || program.thumbnailUrl || detail.setupImageUrl || detail.heroImageUrl;
  const video = program.videoUrl || detail.videoUrl;
  if (hero && !isPlaceholder(hero)) return true;
  if (video && !isPlaceholder(video)) return true;
  return program.hasReferenceVideo === true;
}

function hasSpecialSupportTag(program) {
  return (program.tags ?? []).some((tag) => /specialSupport|특수|느린학습|느린 학습/i.test(tag));
}

function hasSpecialSupportEvidence(program) {
  const detail = program.lessonDetail ?? {};
  const text = [
    detail.coachScript,
    ...(detail.fieldTips ?? []),
    ...(detail.variations ?? []),
    ...(detail.briefingNotes ?? []),
    ...(detail.safetyNotes ?? []),
  ].join(' ');
  return /속도|반복|단순|시각|단서|도움|감각|안전|speed|repeat|simple|visual|cue|support|sensory/i.test(text);
}

function qualityReport(program) {
  const detail = program.lessonDetail ?? {};
  const missing = [];
  const hasTarget = !isPlaceholder(detail.recommendedAge || program.grade);
  const hasSpace = !isPlaceholder(program.space);
  const hasEquipment = (program.equipment ?? []).some((item) => !isPlaceholder(item));
  const hasExecution = hasExecutionDetail(program);
  const hasTeaching = hasTeachingSupport(program);
  const hasPreviewAsset = hasPreview(program);

  if (!hasTarget) missing.push('대상');
  if (!hasSpace) missing.push('공간');
  if (!hasEquipment) missing.push('준비물');
  if (!hasExecution) missing.push('진행');
  if (!hasTeaching) missing.push('지도/변형');
  if (!hasPreviewAsset) missing.push('미리보기 자료');
  if (hasSpecialSupportTag(program) && !hasSpecialSupportEvidence(program)) missing.push('특수 대상 지원 근거');

  if (missing.length === 0) return { status: 'READY', missing };
  if (hasTarget && hasSpace && hasEquipment && hasExecution) return { status: 'LIMITED', missing };
  return { status: 'INCOMPLETE', missing };
}

async function loadPlaywright() {
  const mod = await import('playwright');
  return mod.chromium;
}

async function createAdminContext(browser) {
  if (!supabaseUrl || !anonKey || !serviceRole) {
    fail('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const { data: usersData, error: usersError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) fail(`admin user lookup failed: ${usersError.message}`);

  const adminUser = ADMIN_EMAILS
    .map((email) => usersData.users.find((user) => user.email?.toLowerCase() === email))
    .find(Boolean);
  if (!adminUser?.email) fail('No admin QA user found (spm.qa.admin@spokedu.test or choijihoon@spokedu.com)');

  const { data, error } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: adminUser.email,
    options: { redirectTo: `${BASE}/` },
  });
  if (error || !data?.properties?.action_link) fail('Could not create admin login link');

  const actionUrl = new URL(data.properties.action_link);
  const tokenHash = actionUrl.searchParams.get('token');
  const verificationType = actionUrl.searchParams.get('type') ?? 'magiclink';
  if (!tokenHash) fail('Could not resolve admin login token');

  const cookies = [];
  const ssr = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => cookies.splice(0, cookies.length, ...nextCookies),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({
    token_hash: tokenHash,
    type: verificationType,
  });
  if (verifyError) fail(`admin OTP verify failed: ${verifyError.message}`);

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies(cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    url: BASE,
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

async function main() {
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });

  try {
    const { context, adminEmail } = await createAdminContext(browser);
    const response = await context.request.get(`${BASE}/api/spokedu-master/programs`, {
      headers: { accept: 'application/json' },
    });
    if (response.status() === 401) fail('programs API returned 401 after admin login');
    if (response.status() === 403) fail('programs API returned 403 after admin login');
    if (!response.ok()) fail(`programs API returned ${response.status()}`);

    const payload = await response.json();
    const programs = Array.isArray(payload?.data) ? payload.data : [];
    if (programs.length === 0) fail('programs API returned an empty catalog');

    const reports = programs.map((program) => ({
      id: program.id,
      title: program.title,
      isHot: program.isHot === true,
      homeSortOrder: program.homeSortOrder ?? 9999,
      ...qualityReport(program),
    }));

    const ready = reports.filter((row) => row.status === 'READY').length;
    const limited = reports.filter((row) => row.status === 'LIMITED').length;
    const incomplete = reports.filter((row) => row.status === 'INCOMPLETE').length;
    const eligible = reports.filter((row) => row.status !== 'INCOMPLETE').length;

    const hotSlots = [1, 2, 3, 4].map((slot) => {
      const candidate = reports.find((row) => row.isHot && row.homeSortOrder === slot);
      return {
        slot,
        programId: candidate?.id ?? null,
        title: candidate?.title ?? null,
        status: candidate?.status ?? 'missing',
        eligible: candidate ? candidate.status !== 'INCOMPLETE' : false,
      };
    });
    const hotEligibleCount = hotSlots.filter((slot) => slot.eligible).length;

    const withoutDedicatedSafety = programs.filter(
      (program) => !(program.lessonDetail?.safetyNotes ?? []).some((item) => !isPlaceholder(item)),
    ).length;

    const warnings = [];
    if (eligible < 8) warnings.push('fewer_than_8_home_eligible_programs');
    if (hotEligibleCount < 4) warnings.push('weekly_hot_slots_incomplete');
    if (incomplete > eligible) warnings.push('more_incomplete_than_eligible');
    if (withoutDedicatedSafety > 0) {
      warnings.push(`dedicated_safety_section_missing:${withoutDedicatedSafety}/${programs.length}`);
    }

    const sampleIncomplete = reports
      .filter((row) => row.status === 'INCOMPLETE')
      .slice(0, 8)
      .map((row) => ({ id: row.id, title: row.title, missing: row.missing }));

    console.log(JSON.stringify({
      ok: true,
      phase: 'library-content-readiness',
      auth: { mode: 'admin-magiclink', email: adminEmail },
      total: programs.length,
      ready,
      limited,
      incomplete,
      homeEligible: eligible,
      hotEligibleCount,
      hotSlots,
      withoutDedicatedSafety,
      warnings,
      sampleIncomplete,
      next: warnings.length
        ? 'Improve INCOMPLETE programs in admin/spokedu-master before paid launch'
        : 'Catalog content readiness looks acceptable for home/weekly recommendation',
    }, null, 2));

    if (eligible < 4) process.exit(1);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
