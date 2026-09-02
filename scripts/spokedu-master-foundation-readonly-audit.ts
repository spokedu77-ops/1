/**
 * Read-only FOUNDATION RESET audit.
 * Prints counts only: no owner IDs, favorite IDs, object paths, URLs, or PII.
 */
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

import { SPOMOVE_GUIDE_VIDEO_PACK_ID, normalizeSpomoveGuideVideoMap } from '../app/lib/spomove/spomoveOfficialAssets';
import { OFFICIAL_SPOMOVE_LIBRARY } from '../app/spokedu-master/spomove/officialSpomovePresets';

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) throw new Error('Supabase read-only audit credentials are not configured.');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const VERIFIED_LEGACY_PROGRAM_RENAMES = new Map([['figure-8', '116']]);

async function allRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function main() {
const [favorites, curricula, overlays, meta, guidePack] = await Promise.all([
  allRows<{ owner_id: string; program_id: string }>('spokedu_master_program_favorites', 'owner_id,program_id'),
  allRows<{ id: number; is_sub: boolean }>('curriculum', 'id,is_sub'),
  allRows<{ source_center_curriculum_id: number | null; is_published: boolean | null }>(
    'spokedu_pro_programs',
    'source_center_curriculum_id,is_published',
  ),
  allRows<{ curriculum_id: number }>('spokedu_master_program_meta', 'curriculum_id'),
  supabase.from('think_asset_packs').select('assets_json').eq('id', SPOMOVE_GUIDE_VIDEO_PACK_ID).maybeSingle(),
]);

const eligibleCurricula = new Set(curricula.filter((row) => row.is_sub === false).map((row) => row.id));
const publishedOverlays = new Set(
  overlays
    .filter((row) => row.is_published === true && row.source_center_curriculum_id != null)
    .map((row) => row.source_center_curriculum_id as number),
);
const metaIds = new Set(meta.map((row) => row.curriculum_id));
const programIds = new Set(
  [...eligibleCurricula]
    .filter((id) => publishedOverlays.has(id) && metaIds.has(id))
    .map(String),
);
const spomoveIds = new Set(OFFICIAL_SPOMOVE_LIBRARY.map((preset) => preset.id));

const favoriteCounts = { total: favorites.length, program: 0, spomove: 0, verifiedLegacyRemap: 0, unknown: 0, collision: 0 };
for (const row of favorites) {
  const verifiedTarget = VERIFIED_LEGACY_PROGRAM_RENAMES.get(row.program_id);
  if (verifiedTarget && programIds.has(verifiedTarget)) {
    favoriteCounts.verifiedLegacyRemap += 1;
    continue;
  }
  const isProgram = programIds.has(row.program_id);
  const isSpomove = spomoveIds.has(row.program_id);
  if (isProgram && isSpomove) favoriteCounts.collision += 1;
  else if (isProgram) favoriteCounts.program += 1;
  else if (isSpomove) favoriteCounts.spomove += 1;
  else favoriteCounts.unknown += 1;
}

if (guidePack.error) throw guidePack.error;
const guideValues = Object.values(normalizeSpomoveGuideVideoMap(guidePack.data?.assets_json));
let anonymouslyPlayable = 0;
let anonymouslyInaccessible = 0;
let publicExternalUrls = 0;
let privateObjectRefs = 0;
for (const value of guideValues) {
  if (/^https?:\/\//i.test(value)) publicExternalUrls += 1;
  else privateObjectRefs += 1;
  const objectUrl = /^https?:\/\//i.test(value)
    ? value
    : `${url}/storage/v1/object/public/iiwarmup-files/${value.split('/').map(encodeURIComponent).join('/')}`;
  try {
    const response = await fetch(objectUrl, { method: 'GET', headers: { Range: 'bytes=0-0' }, redirect: 'follow' });
    if (response.ok || response.status === 206) anonymouslyPlayable += 1;
    else anonymouslyInaccessible += 1;
  } catch {
    anonymouslyInaccessible += 1;
  }
}

console.log(JSON.stringify({
  favorites: {
    ...favoriteCounts,
    ownerCount: new Set(favorites.map((row) => row.owner_id)).size,
    safeToBackfill: favoriteCounts.unknown === 0 && favoriteCounts.collision === 0,
  },
  premiumGuideMedia: {
    auditedObjectCount: guideValues.length,
    publicExternalUrls,
    privateObjectRefs,
    anonymouslyPlayable,
    anonymouslyInaccessible,
    sharedBucketMutations: 0,
  },
}, null, 2));

if (favoriteCounts.unknown > 0 || favoriteCounts.collision > 0) process.exitCode = 2;
}

void main().catch((error: unknown) => {
  const detail = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : null;
  console.error(JSON.stringify({
    error: 'Read-only audit failed.',
    code: typeof detail?.code === 'string' ? detail.code : undefined,
    message: typeof detail?.message === 'string' ? detail.message : undefined,
  }));
  process.exitCode = 1;
});
