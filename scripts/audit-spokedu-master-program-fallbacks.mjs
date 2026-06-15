import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [
  { data: curriculumRows, error: curriculumError },
  { data: overlayRows, error: overlayError },
  { data: metaRows, error: metaError },
] = await Promise.all([
  supabase
    .from('curriculum')
    .select('id,title,equipment,steps')
    .eq('is_sub', false),
  supabase
    .from('spokedu_pro_programs')
    .select('id,source_center_curriculum_id,title,equipment,activity_method,main_theme,group_size,function_types,is_published,updated_at'),
  supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id,sm_theme,sm_grade,sm_tags'),
]);

if (curriculumError) throw curriculumError;
if (overlayError) throw overlayError;
if (metaError) throw metaError;

const latestOverlayByCurriculumId = selectLatestOverlays(overlayRows ?? []);
const metaByCurriculumId = new Map(
  (metaRows ?? []).map((row) => [row.curriculum_id, row]),
);
const counts = createCounts();
const fallbackCurriculumIds = createIdLists();

for (const curriculum of curriculumRows ?? []) {
  const overlay = latestOverlayByCurriculumId.get(curriculum.id) ?? null;
  if (overlay?.is_published === false) continue;

  const meta = metaByCurriculumId.get(curriculum.id) ?? null;
  countField({
    counts: counts.title,
    fallbackIds: fallbackCurriculumIds.title,
    curriculumId: curriculum.id,
    primary: hasText(overlay?.title),
    fallback: hasText(curriculum.title),
  });
  countField({
    counts: counts.equipment,
    fallbackIds: fallbackCurriculumIds.equipment,
    curriculumId: curriculum.id,
    primary: hasText(overlay?.equipment),
    fallback: hasItems(curriculum.equipment),
  });
  countField({
    counts: counts.activityMethod,
    fallbackIds: fallbackCurriculumIds.activityMethod,
    curriculumId: curriculum.id,
    primary: hasText(overlay?.activity_method),
    fallback: hasItems(curriculum.steps),
  });
  countField({
    counts: counts.theme,
    fallbackIds: fallbackCurriculumIds.theme,
    curriculumId: curriculum.id,
    primary: hasText(meta?.sm_theme),
    fallback: hasText(overlay?.main_theme),
  });
  countField({
    counts: counts.target,
    fallbackIds: fallbackCurriculumIds.target,
    curriculumId: curriculum.id,
    primary: hasText(meta?.sm_grade),
    fallback: hasText(overlay?.group_size),
  });
  countField({
    counts: counts.tags,
    fallbackIds: fallbackCurriculumIds.tags,
    curriculumId: curriculum.id,
    primary: hasItems(meta?.sm_tags),
    fallback: hasItems(overlay?.function_types),
  });
}

console.log(JSON.stringify({
  mode: 'read-only',
  publicationRule: 'latest overlay is_published !== false',
  publicProgramCount: Object.values(counts.title).reduce((sum, value) => sum + value, 0),
  fields: {
    title: summary(counts.title, fallbackCurriculumIds.title),
    equipment: summary(counts.equipment, fallbackCurriculumIds.equipment),
    activityMethod: summary(counts.activityMethod, fallbackCurriculumIds.activityMethod),
    theme: summary(counts.theme, fallbackCurriculumIds.theme),
    target: summary(counts.target, fallbackCurriculumIds.target),
    tags: summary(counts.tags, fallbackCurriculumIds.tags),
  },
}, null, 2));

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasItems(value) {
  return Array.isArray(value) && value.some((item) => hasText(item));
}

function selectLatestOverlays(rows) {
  const latest = new Map();
  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (curriculumId == null) continue;

    const previous = latest.get(curriculumId);
    if (!previous || compareOverlayRows(row, previous) > 0) {
      latest.set(curriculumId, row);
    }
  }
  return latest;
}

function compareOverlayRows(left, right) {
  const leftTime = left.updated_at ? Date.parse(left.updated_at) : 0;
  const rightTime = right.updated_at ? Date.parse(right.updated_at) : 0;
  if (leftTime !== rightTime) return leftTime - rightTime;
  return Number(left.id ?? 0) - Number(right.id ?? 0);
}

function createFieldCounts() {
  return { primary: 0, fallback: 0, missing: 0 };
}

function createCounts() {
  return {
    title: createFieldCounts(),
    equipment: createFieldCounts(),
    activityMethod: createFieldCounts(),
    theme: createFieldCounts(),
    target: createFieldCounts(),
    tags: createFieldCounts(),
  };
}

function createIdLists() {
  return {
    title: [],
    equipment: [],
    activityMethod: [],
    theme: [],
    target: [],
    tags: [],
  };
}

function countField({ counts: fieldCounts, fallbackIds, curriculumId, primary, fallback }) {
  if (primary) {
    fieldCounts.primary += 1;
    return;
  }
  if (fallback) {
    fieldCounts.fallback += 1;
    fallbackIds.push(curriculumId);
    return;
  }
  fieldCounts.missing += 1;
}

function summary(fieldCounts, fallbackIds) {
  return {
    primary: fieldCounts.primary,
    fallback: fieldCounts.fallback,
    missing: fieldCounts.missing,
    fallbackCurriculumIds: fallbackIds.sort((a, b) => a - b),
  };
}
