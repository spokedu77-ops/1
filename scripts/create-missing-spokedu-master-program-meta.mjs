import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const TARGET_CURRICULUM_IDS = Object.freeze([29, 128]);
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const confirmed = args.has('--confirm');
const allowApply = process.env.ALLOW_SPOKEDU_MASTER_META_ROW_CREATE === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}
if (apply && !confirmed) {
  throw new Error('Refusing to apply without --confirm.');
}
if (apply && !allowApply) {
  throw new Error(
    'Refusing to apply without ALLOW_SPOKEDU_MASTER_META_ROW_CREATE=1.',
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const before = await loadState();
const missingCurriculumIds = TARGET_CURRICULUM_IDS.filter(
  (curriculumId) => !before.targetRows.some((row) => row.curriculum_id === curriculumId),
);

printSummary({
  mode: apply ? 'apply-requested' : 'dry-run',
  before,
  missingCurriculumIds,
});

if (missingCurriculumIds.length !== 2) {
  console.error('Expected exactly two missing meta rows. No data was modified.');
  process.exitCode = 1;
} else if (apply) {
  const rows = missingCurriculumIds.map((curriculumId) => ({
    curriculum_id: curriculumId,
    sm_tags: [],
    sm_gallery_image_urls: [],
  }));

  const result = await supabase
    .from('spokedu_master_program_meta')
    .upsert(rows, {
      onConflict: 'curriculum_id',
      ignoreDuplicates: true,
    })
    .select('curriculum_id');
  if (result.error) throw result.error;

  const after = await loadState();
  const verification = verifyCreatedRows({ before, after });
  if (!verification.ok) {
    throw new Error(`Meta row creation verification failed: ${verification.errors.join(', ')}`);
  }

  console.log(JSON.stringify({
    mode: 'apply',
    insertedCurriculumIds: (result.data ?? [])
      .map((row) => row.curriculum_id)
      .sort((a, b) => a - b),
    metaRowCountBefore: before.totalCount,
    metaRowCountAfter: after.totalCount,
    createdRows: after.targetRows.map(summarizeRow),
    verification,
  }, null, 2));
}

async function loadState() {
  const [targetResult, countResult] = await Promise.all([
    supabase
      .from('spokedu_master_program_meta')
      .select('*')
      .in('curriculum_id', TARGET_CURRICULUM_IDS)
      .order('curriculum_id'),
    supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id', { count: 'exact', head: true }),
  ]);

  if (targetResult.error) throw targetResult.error;
  if (countResult.error) throw countResult.error;

  return {
    targetRows: targetResult.data ?? [],
    totalCount: countResult.count ?? 0,
  };
}

function printSummary({ mode, before, missingCurriculumIds }) {
  console.log(JSON.stringify({
    mode,
    targetCurriculumIds: TARGET_CURRICULUM_IDS,
    currentRows: before.targetRows.map(summarizeRow),
    missingCurriculumIds,
    plannedRowCount: missingCurriculumIds.length,
    metaRowCountBefore: before.totalCount,
    expectedMetaRowCountAfter: before.totalCount + missingCurriculumIds.length,
  }, null, 2));
}

function summarizeRow(row) {
  const contentColumns = Object.entries(row)
    .filter(([key]) => ![
      'curriculum_id',
      'created_at',
      'updated_at',
      'sm_tags',
      'sm_gallery_image_urls',
    ].includes(key))
    .filter(([, value]) =>
      value !== null &&
      value !== '' &&
      (!Array.isArray(value) || value.length > 0)
    )
    .map(([key]) => key)
    .sort();

  return {
    curriculumId: row.curriculum_id,
    themePresent: hasText(row.sm_theme),
    gradePresent: hasText(row.sm_grade),
    tagsCount: Array.isArray(row.sm_tags) ? row.sm_tags.length : null,
    galleryCount: Array.isArray(row.sm_gallery_image_urls)
      ? row.sm_gallery_image_urls.length
      : null,
    nonEmptyContentColumns: contentColumns,
    createdAtPresent: hasText(row.created_at),
    updatedAtPresent: hasText(row.updated_at),
  };
}

function verifyCreatedRows({ before, after }) {
  const errors = [];
  const expectedCount = before.totalCount + 2;

  if (after.totalCount !== expectedCount) {
    errors.push(`expected row count ${expectedCount}, received ${after.totalCount}`);
  }
  if (after.targetRows.length !== 2) {
    errors.push(`expected two target rows, received ${after.targetRows.length}`);
  }

  for (const curriculumId of TARGET_CURRICULUM_IDS) {
    const row = after.targetRows.find((item) => item.curriculum_id === curriculumId);
    if (!row) {
      errors.push(`missing curriculum ${curriculumId}`);
      continue;
    }
    if (hasText(row.sm_theme)) errors.push(`curriculum ${curriculumId} sm_theme is not empty`);
    if (hasText(row.sm_grade)) errors.push(`curriculum ${curriculumId} sm_grade is not empty`);
    if (!Array.isArray(row.sm_tags) || row.sm_tags.length !== 0) {
      errors.push(`curriculum ${curriculumId} sm_tags is not empty`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
