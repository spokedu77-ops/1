import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

import {
  buildFallbackBackfillPlan,
  TARGET_CURRICULUM_IDS,
} from './lib/spokedu-master-program-meta-fallback-backfill.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const confirmed = args.has('--confirm');
const allowApply = process.env.ALLOW_SPOKEDU_MASTER_FALLBACK_BACKFILL === '1';
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
    'Refusing to apply without ALLOW_SPOKEDU_MASTER_FALLBACK_BACKFILL=1.',
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const before = await loadState();
const initialPlan = buildFallbackBackfillPlan(before);
printPlan(initialPlan, apply ? 'apply-requested' : 'dry-run');

if (!initialPlan.ok) {
  console.error('Backfill safety checks failed. No data was modified.');
  process.exitCode = 1;
} else if (initialPlan.planned.length > TARGET_CURRICULUM_IDS.length) {
  console.error('Refusing to update more than two curriculum rows.');
  process.exitCode = 1;
} else if (apply) {
  const applyResult = await applyPlan();
  const after = await loadState();
  const finalPlan = buildFallbackBackfillPlan(after);
  const preservation = buildPreservationReport(before, after);

  if (!finalPlan.ok || finalPlan.planned.length > 0) {
    throw new Error('Post-apply verification failed.');
  }
  if (!Object.values(preservation).every(Boolean)) {
    throw new Error('Source preservation verification failed.');
  }

  console.log(JSON.stringify({
    mode: 'apply',
    updatedRows: applyResult.updatedRows,
    updatedColumnsByCurriculumId: applyResult.updatedColumnsByCurriculumId,
    postApplyPlannedRows: finalPlan.planned.length,
    preservation,
  }, null, 2));
}

async function applyPlan() {
  const updatedRows = [];
  const updatedColumnsByCurriculumId = {};

  for (const item of initialPlan.planned) {
    if (!TARGET_CURRICULUM_IDS.includes(item.curriculumId)) {
      throw new Error(`Blocked unexpected curriculum ${item.curriculumId}.`);
    }

    const currentState = await loadTargetMeta(item.curriculumId);
    const currentPlan = buildFallbackBackfillPlan({
      overlayRows: before.overlayRows,
      metaRows: [
        ...before.metaRows.filter((row) => row.curriculum_id !== item.curriculumId),
        currentState,
      ],
    });
    const currentItem = currentPlan.items.find(
      (candidate) => candidate.curriculumId === item.curriculumId,
    );
    if (!currentPlan.ok || !currentItem) {
      throw new Error(`Concurrent data change detected for curriculum ${item.curriculumId}.`);
    }

    const safePatch = currentItem.patch;
    if (Object.keys(safePatch).length === 0) continue;

    const result = await supabase
      .from('spokedu_master_program_meta')
      .update(safePatch)
      .eq('curriculum_id', item.curriculumId)
      .select('curriculum_id');
    if (result.error) throw result.error;
    if ((result.data ?? []).length !== 1) {
      throw new Error(`Expected one updated row for curriculum ${item.curriculumId}.`);
    }

    updatedRows.push(item.curriculumId);
    updatedColumnsByCurriculumId[item.curriculumId] = Object.keys(safePatch);
  }

  if (updatedRows.length > TARGET_CURRICULUM_IDS.length) {
    throw new Error('Updated row count exceeded the fixed limit.');
  }
  return { updatedRows, updatedColumnsByCurriculumId };
}

async function loadState() {
  const [
    overlayResult,
    targetMetaResult,
    allMetaResult,
    overlayCountResult,
    metaCountResult,
  ] = await Promise.all([
    supabase
      .from('spokedu_pro_programs')
      .select('id,source_center_curriculum_id,title,video_url,equipment,activity_method,main_theme,group_size,function_type,function_types,is_published,updated_at')
      .in('source_center_curriculum_id', TARGET_CURRICULUM_IDS),
    supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_theme,sm_grade,sm_tags')
      .in('curriculum_id', TARGET_CURRICULUM_IDS),
    supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_theme,sm_grade,sm_tags')
      .not('curriculum_id', 'in', `(${TARGET_CURRICULUM_IDS.join(',')})`),
    supabase
      .from('spokedu_pro_programs')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id', { count: 'exact', head: true }),
  ]);

  for (const result of [
    overlayResult,
    targetMetaResult,
    allMetaResult,
    overlayCountResult,
    metaCountResult,
  ]) {
    if (result.error) throw result.error;
  }

  return {
    overlayRows: overlayResult.data ?? [],
    metaRows: targetMetaResult.data ?? [],
    otherMetaRows: allMetaResult.data ?? [],
    overlayCount: overlayCountResult.count ?? 0,
    metaCount: metaCountResult.count ?? 0,
  };
}

async function loadTargetMeta(curriculumId) {
  const result = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id,sm_theme,sm_grade,sm_tags')
    .eq('curriculum_id', curriculumId);
  if (result.error) throw result.error;
  if ((result.data ?? []).length !== 1) {
    throw new Error(`Expected one meta row for curriculum ${curriculumId}.`);
  }
  return result.data[0];
}

function printPlan(plan, mode) {
  console.log(JSON.stringify({
    mode,
    targetCurriculumIds: TARGET_CURRICULUM_IDS,
    ok: plan.ok,
    errors: plan.errors,
    items: plan.items.map((item) => ({
      curriculumId: item.curriculumId,
      latestOverlayId: item.overlayId,
      legacy: item.legacy,
      currentMeta: item.current,
      plannedFields: Object.keys(item.patch),
      protectedFields: item.protectedFields,
      conflicts: item.conflicts,
    })),
    plannedRows: plan.planned.length,
  }, null, 2));
}

function buildPreservationReport(beforeState, afterState) {
  return {
    overlayRowCountUnchanged: beforeState.overlayCount === afterState.overlayCount,
    metaRowCountUnchanged: beforeState.metaCount === afterState.metaCount,
    targetOverlayUnchanged:
      stableHash(beforeState.overlayRows) === stableHash(afterState.overlayRows),
    otherCurriculumMetaUnchanged:
      stableHash(beforeState.otherMetaRows) === stableHash(afterState.otherMetaRows),
  };
}

function stableHash(value) {
  const normalized = [...value].sort((left, right) => {
    const leftId = left.curriculum_id ?? left.source_center_curriculum_id ?? left.id ?? 0;
    const rightId = right.curriculum_id ?? right.source_center_curriculum_id ?? right.id ?? 0;
    if (leftId !== rightId) return leftId - rightId;
    return Number(left.id ?? 0) - Number(right.id ?? 0);
  });
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
