import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
  buildBackfillPlan,
  normalizeText,
} from './lib/spokedu-master-program-meta-backfill.mjs';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const confirmed = args.has('--confirm');
const allowApply = process.env.ALLOW_SPOKEDU_MASTER_META_BACKFILL === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 50;

if (!url || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}
if (apply && !confirmed) {
  throw new Error('Refusing to apply without --confirm.');
}
if (apply && !allowApply) {
  throw new Error('Refusing to apply without ALLOW_SPOKEDU_MASTER_META_BACKFILL=1.');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [{ data: curriculumRows, error: curriculumError }, { data: overlayRows, error: overlayError }] =
  await Promise.all([
    supabase.from('curriculum').select('id').eq('is_sub', false),
    supabase
      .from('spokedu_pro_programs')
      .select('id,source_center_curriculum_id,checklist,activity_tip,updated_at'),
  ]);

if (curriculumError) throw curriculumError;
if (overlayError) throw overlayError;

const metaResult = await loadMetaRows();
const plan = buildBackfillPlan({
  overlayRows: overlayRows ?? [],
  metaRows: metaResult.rows,
  curriculumIds: (curriculumRows ?? []).map((row) => row.id),
  metaColumnsAvailable: metaResult.columnsAvailable,
});

printSummary(plan, apply ? 'apply requested' : 'dry-run');

if (!apply) process.exit(0);
if (!metaResult.columnsAvailable) {
  throw new Error('Backfill columns are unavailable. Apply the schema migration first.');
}

const result = await applyPlan(plan.planned);
console.log(JSON.stringify({
  mode: 'apply',
  succeeded: result.succeeded,
  failed: result.failed.length,
  failedCurriculumIds: result.failed.map((item) => item.curriculumId),
}, null, 2));
if (result.failed.length > 0) process.exitCode = 1;

async function loadMetaRows() {
  const withColumns = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id,sm_briefing_notes,sm_variation_method');

  if (!withColumns.error) {
    return { rows: withColumns.data ?? [], columnsAvailable: true };
  }

  const missingColumn = /sm_briefing_notes|sm_variation_method/i.test(withColumns.error.message);
  if (!missingColumn) throw withColumns.error;

  const fallback = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id');
  if (fallback.error) throw fallback.error;

  return {
    rows: (fallback.data ?? []).map((row) => ({
      curriculum_id: row.curriculum_id,
      sm_briefing_notes: null,
      sm_variation_method: null,
    })),
    columnsAvailable: false,
  };
}

async function applyPlan(items) {
  let succeeded = 0;
  const failed = [];

  for (let index = 0; index < items.length; index += BATCH_SIZE) {
    const batch = items.slice(index, index + BATCH_SIZE);
    for (const item of batch) {
      try {
        const currentResult = await supabase
          .from('spokedu_master_program_meta')
          .select('curriculum_id,sm_briefing_notes,sm_variation_method')
          .eq('curriculum_id', item.curriculumId)
          .maybeSingle();
        if (currentResult.error) throw currentResult.error;

        const safePatch = {};
        if (
          'sm_briefing_notes' in item.patch &&
          !normalizeText(currentResult.data?.sm_briefing_notes)
        ) {
          safePatch.sm_briefing_notes = item.patch.sm_briefing_notes;
        }
        if (
          'sm_variation_method' in item.patch &&
          !normalizeText(currentResult.data?.sm_variation_method)
        ) {
          safePatch.sm_variation_method = item.patch.sm_variation_method;
        }
        if (Object.keys(safePatch).length === 0) continue;

        const writeResult = currentResult.data
          ? await supabase
              .from('spokedu_master_program_meta')
              .update(safePatch)
              .eq('curriculum_id', item.curriculumId)
          : await supabase
              .from('spokedu_master_program_meta')
              .insert({ curriculum_id: item.curriculumId, ...safePatch });
        if (writeResult.error) throw writeResult.error;
        succeeded += 1;
      } catch {
        failed.push({ curriculumId: item.curriculumId });
      }
    }
  }

  return { succeeded, failed };
}

function printSummary(result, mode) {
  console.log(JSON.stringify({
    mode,
    schema: result.schema,
    totals: result.totals,
    briefing: result.briefing,
    variation: result.variation,
    conflicts: result.conflicts,
    plannedCurriculumIds: result.planned.map((item) => item.curriculumId),
  }, null, 2));
}
