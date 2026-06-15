import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { buildMissingMasterMetaRows } from './metaRowContract';

const INVALID_VIDEO = new Set(['', '-', '0', '123', 'none', 'null', 'undefined', '없음', '영상없음']);

const SYNC_FIELDS = ['video_url', 'checklist', 'equipment', 'activity_method', 'activity_tip'] as const;
type SyncField = (typeof SYNC_FIELDS)[number];

type CurriculumRow = {
  id: number;
  title: string | null;
  url: string | null;
  equipment: string[] | null;
  check_list: string[] | null;
  steps: string[] | null;
  expert_tip: string | null;
};

type OverlayRow = {
  id: number;
  source_center_curriculum_id: number | null;
  video_url: string | null;
  checklist: string | null;
  equipment: string | null;
  activity_method: string | null;
  activity_tip: string | null;
  updated_at: string | null;
};

type SyncPayload = {
  video_url: string | null;
  checklist: string | null;
  equipment: string | null;
  activity_method: string | null;
  activity_tip: string | null;
};

type SyncChange = {
  curriculumId: number;
  title: string;
  action: 'insert' | 'update';
  fields: SyncField[];
  before: Partial<Record<SyncField, string | null>>;
  after: SyncPayload;
};

function normalizeVideoUrl(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text || INVALID_VIDEO.has(text.toLowerCase().replace(/\s+/g, ''))) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : null;
  } catch {
    return null;
  }
}

function joinLines(items: string[] | null | undefined): string | null {
  const lines = (items ?? []).map((item) => item.trim()).filter(Boolean);
  return lines.length > 0 ? lines.join('\n') : null;
}

function normalizeText(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  return text || null;
}

function payloadFromCurriculum(row: CurriculumRow): SyncPayload {
  return {
    video_url: normalizeVideoUrl(row.url),
    checklist: joinLines(row.check_list),
    equipment: joinLines(row.equipment),
    activity_method: joinLines(row.steps),
    activity_tip: normalizeText(row.expert_tip),
  };
}

function overlaySnapshot(overlay: OverlayRow | undefined): SyncPayload {
  return {
    video_url: normalizeVideoUrl(overlay?.video_url),
    checklist: normalizeText(overlay?.checklist),
    equipment: normalizeText(overlay?.equipment),
    activity_method: normalizeText(overlay?.activity_method),
    activity_tip: normalizeText(overlay?.activity_tip),
  };
}

function diffFields(before: SyncPayload, after: SyncPayload): SyncField[] {
  return SYNC_FIELDS.filter((field) => before[field] !== after[field]);
}

function latestOverlayByCurriculumId(rows: OverlayRow[]) {
  const map = new Map<number, OverlayRow>();
  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (curriculumId == null) continue;
    const prev = map.get(curriculumId);
    if (!prev) {
      map.set(curriculumId, row);
      continue;
    }
    const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
    const nextTime = row.updated_at ? Date.parse(row.updated_at) : 0;
    if (nextTime >= prevTime) map.set(curriculumId, row);
  }
  return map;
}

async function buildSyncPlan() {
  const supabase = getServiceSupabase();
  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url,equipment,check_list,steps,expert_tip')
    .eq('is_sub', false)
    .order('display_order', { ascending: true, nullsFirst: false });

  if (currErr) throw currErr;

  const curricula = (curriculumRows ?? []) as CurriculumRow[];
  const ids = curricula.map((row) => row.id);

  let overlayById = new Map<number, OverlayRow>();
  if (ids.length > 0) {
    const { data: overlayRows, error: overlayErr } = await supabase
      .from('spokedu_pro_programs')
      .select('id,source_center_curriculum_id,video_url,checklist,equipment,activity_method,activity_tip,updated_at')
      .in('source_center_curriculum_id', ids);
    if (overlayErr) throw overlayErr;
    overlayById = latestOverlayByCurriculumId((overlayRows ?? []) as OverlayRow[]);
  }

  const changes: SyncChange[] = [];
  const fieldMismatches: Record<SyncField, number> = {
    video_url: 0,
    checklist: 0,
    equipment: 0,
    activity_method: 0,
    activity_tip: 0,
  };

  for (const row of curricula) {
    const after = payloadFromCurriculum(row);
    const overlay = overlayById.get(row.id);
    const before = overlaySnapshot(overlay);
    const fields = overlay ? diffFields(before, after) : SYNC_FIELDS.filter((field) => after[field] != null);

    if (fields.length === 0) continue;
    for (const field of fields) fieldMismatches[field] += 1;

    changes.push({
      curriculumId: row.id,
      title: (row.title ?? '').trim() || `curriculum #${row.id}`,
      action: overlay ? 'update' : 'insert',
      fields,
      before: overlay
        ? Object.fromEntries(fields.map((field) => [field, before[field]]))
        : {},
      after,
    });
  }

  return {
    curricula,
    overlayById,
    changes,
    summary: {
      totalCurriculum: curricula.length,
      linked: overlayById.size,
      toInsert: changes.filter((change) => change.action === 'insert').length,
      toUpdate: changes.filter((change) => change.action === 'update').length,
      unchanged: curricula.length - changes.length,
      fieldMismatches,
    },
  };
}

async function applySync(changes: SyncChange[], overlayById: Map<number, OverlayRow>) {
  const supabase = getServiceSupabase();

  for (const change of changes) {
    const payload = {
      video_url: change.after.video_url,
      checklist: change.after.checklist,
      equipment: change.after.equipment,
      activity_method: change.after.activity_method,
      activity_tip: change.after.activity_tip,
      source_center_curriculum_id: change.curriculumId,
    };

    const existing = overlayById.get(change.curriculumId);
    if (existing?.id) {
      const { error } = await supabase
        .from('spokedu_pro_programs')
        .update(payload)
        .eq('id', existing.id);
      if (error) throw error;
      continue;
    }

    const { error } = await supabase
      .from('spokedu_pro_programs')
      .insert({
        title: change.title,
        ...payload,
        is_published: true,
        center_curriculum_is_sub: false,
      });
    if (error) throw error;
  }

  const insertedCurriculumIds = changes
    .filter((change) => change.action === 'insert')
    .map((change) => change.curriculumId);
  if (insertedCurriculumIds.length === 0) return;

  const { data: existingMetaRows, error: metaReadError } = await supabase
    .from('spokedu_master_program_meta')
    .select('curriculum_id')
    .in('curriculum_id', insertedCurriculumIds);
  if (metaReadError) throw metaReadError;

  const metaRows = buildMissingMasterMetaRows(
    changes,
    (existingMetaRows ?? []).map((row) => row.curriculum_id as number),
  );
  if (metaRows.length === 0) return;

  const { error: metaInsertError } = await supabase
    .from('spokedu_master_program_meta')
    .upsert(metaRows, {
      onConflict: 'curriculum_id',
      ignoreDuplicates: true,
    });
  if (metaInsertError) throw metaInsertError;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { changes, summary } = await buildSyncPlan();
    return NextResponse.json({
      ok: true,
      dryRun: true,
      summary,
      changes: changes.slice(0, 80),
      message:
        changes.length > 0
          ? `커리큘럼과 overlay가 다른 항목 ${changes.length}개를 찾았습니다. (신규 ${summary.toInsert}, 갱신 ${summary.toUpdate})`
          : '커리큘럼과 overlay 본문이 모두 일치합니다.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'sync preview failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const dryRun = body.dryRun !== false;

  try {
    const { changes, overlayById, summary } = await buildSyncPlan();

    if (!dryRun && changes.length > 0) {
      await applySync(changes, overlayById);
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      applied: dryRun ? 0 : changes.length,
      summary,
      changes: changes.slice(0, 80),
      message:
        changes.length === 0
          ? '동기화할 차이가 없습니다.'
          : dryRun
            ? `미리보기: ${changes.length}개 항목이 갱신 대상입니다. dryRun=false로 다시 호출하면 적용됩니다.`
            : `커리큘럼 본문 ${changes.length}개를 overlay에 반영했습니다.`,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'sync failed' }, { status: 500 });
  }
}
