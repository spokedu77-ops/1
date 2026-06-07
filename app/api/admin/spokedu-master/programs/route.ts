import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  normalizeMasterDuration,
  normalizeMasterSpace,
  normalizeMasterTarget,
} from '@/app/spokedu-master/lib/programDisplayTags';

type MaterialStatus = 'incomplete' | 'ready' | 'home-ready';
type PublicationStatus = 'draft' | 'ready' | 'featured' | 'hidden';

type CurriculumDbRow = {
  id: number;
  title: string | null;
  url: string | null;
  month: number | null;
  week: number | null;
  display_order: number | null;
  equipment: string[] | null;
  check_list: string[] | null;
  steps: string[] | null;
};

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[] | null;
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
  sm_duration: number | null;
  sm_is_pro: boolean | null;
  sm_is_new: boolean | null;
  sm_is_hot: boolean | null;
  sm_display_order: number | null;
  sm_objective: string | null;
  sm_development_focus: string | null;
  sm_coach_script: string | null;
  sm_parent_note: string | null;
  sm_related_spomove_ids: string[] | null;
  sm_thumbnail_url: string | null;
  sm_hero_image_url: string | null;
  sm_setup_image_url: string | null;
  sm_gallery_image_urls: string[] | null;
};

type OverlayRow = {
  id: number;
  title: string | null;
  source_center_curriculum_id: number | null;
  video_url: string | null;
  equipment: string | null;
  checklist: string | null;
  activity_method: string | null;
  activity_tip: string | null;
  function_types: string[] | null;
  main_theme: string | null;
  group_size: string | null;
  is_published: boolean | null;
  updated_at: string | null;
};

const INVALID_VIDEO = new Set(['', '-', '0', '123', 'none', 'null', 'undefined', '없음', '영상없음']);

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

function splitLines(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item && !/^\[[^\]]+\]$/.test(item));
}

function safeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function extractSection(source: string | null | undefined, label: string): string[] {
  const lines = (source ?? '').split('\n');
  const start = lines.findIndex((line) => line.trim() === `[${label}]`);
  if (start < 0) return [];
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^\[[^\]]+\]$/.test(line)) break;
    if (line) collected.push(line);
  }
  return collected;
}

function latestOverlay(rows: OverlayRow[]) {
  const map = new Map<number, OverlayRow>();
  for (const row of rows) {
    const id = row.source_center_curriculum_id;
    if (id == null) continue;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, row);
      continue;
    }
    const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
    const nextTime = row.updated_at ? Date.parse(row.updated_at) : 0;
    if (nextTime >= prevTime) map.set(id, row);
  }
  return map;
}

function publicationStatus(meta: MetaRow | null): PublicationStatus {
  if (!meta) return 'draft';
  if (meta.sm_is_hot && (meta.sm_display_order ?? 9999) < 100) return 'featured';
  if (meta.sm_is_pro === false) return 'hidden';
  if (meta.sm_objective || meta.sm_parent_note || meta.sm_coach_script) return 'ready';
  return 'draft';
}

function completeness(input: {
  target: string;
  space: string;
  duration: string;
  equipment: string[];
  steps: string[];
  videoUrl: string | null;
  setupImageUrl: string | null;
}): MaterialStatus {
  const coreReady = Boolean(input.target && input.space && input.duration && input.equipment.length > 0 && input.steps.length > 0);
  if (!coreReady) return 'incomplete';
  const homeReady = Boolean(input.videoUrl || input.setupImageUrl);
  return homeReady ? 'home-ready' : 'ready';
}

async function loadPrograms() {
  const supabase = getServiceSupabase();
  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url,month,week,display_order,equipment,check_list,steps')
    .eq('is_sub', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: false });

  if (currErr) throw currErr;

  const curricula = (curriculumRows ?? []) as CurriculumDbRow[];
  const ids = curricula.map((row) => row.id);

  const metaById = new Map<number, MetaRow>();
  if (ids.length > 0) {
    const { data: metaRows, error: metaErr } = await supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_duration,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids,sm_thumbnail_url,sm_hero_image_url,sm_setup_image_url,sm_gallery_image_urls')
      .in('curriculum_id', ids);
    if (metaErr) throw metaErr;
    for (const meta of (metaRows ?? []) as MetaRow[]) metaById.set(meta.curriculum_id, meta);
  }

  let overlayById = new Map<number, OverlayRow>();
  if (ids.length > 0) {
    const { data: overlayRows, error: overlayErr } = await supabase
      .from('spokedu_pro_programs')
      .select('id,title,source_center_curriculum_id,video_url,equipment,checklist,activity_method,activity_tip,function_types,main_theme,group_size,is_published,updated_at')
      .in('source_center_curriculum_id', ids);
    if (overlayErr) throw overlayErr;
    overlayById = latestOverlay((overlayRows ?? []) as OverlayRow[]);
  }

  const data = curricula.map((row) => {
    const meta = metaById.get(row.id) ?? null;
    const overlay = overlayById.get(row.id) ?? null;
    const title = (overlay?.title ?? row.title ?? '').trim() || `curriculum #${row.id}`;
    const videoUrl = normalizeVideoUrl(overlay?.video_url) ?? normalizeVideoUrl(row.url);
    const equipment = overlay?.equipment ? splitLines(overlay.equipment) : safeArray(row.equipment);
    const checklist = overlay?.checklist ? splitLines(overlay.checklist) : safeArray(row.check_list);
    const steps = overlay?.activity_method ? splitLines(overlay.activity_method) : safeArray(row.steps);
    const safetyNotes = extractSection(overlay?.checklist, '안전 포인트');
    const target = normalizeMasterTarget(meta?.sm_grade ?? overlay?.group_size ?? '');
    const space = normalizeMasterSpace(meta?.sm_space ?? '');
    const duration = normalizeMasterDuration(meta?.sm_duration) ? String(normalizeMasterDuration(meta?.sm_duration)) : '';
    const status = completeness({
      target,
      space,
      duration,
      equipment,
      steps,
      videoUrl,
      setupImageUrl: meta?.sm_setup_image_url ?? null,
    });

    return {
      curriculum: {
        id: row.id,
        title: (row.title ?? '').trim() || `curriculum #${row.id}`,
        url: row.url,
        month: row.month,
        week: row.week,
        displayOrder: row.display_order,
        equipment: safeArray(row.equipment),
        checklist: safeArray(row.check_list),
        steps: safeArray(row.steps),
      },
      meta,
      overlay,
      effective: {
        title,
        videoUrl,
        target,
        space,
        duration,
        equipment,
        checklist,
        steps,
        safetyNotes,
        parentNote: (meta?.sm_parent_note ?? '').trim(),
        relatedSpomoveIds: safeArray(meta?.sm_related_spomove_ids),
        status,
        publicationStatus: publicationStatus(meta),
      },
    };
  });

  return data;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const data = await loadPrograms();
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'load failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const curriculumId = Number(searchParams.get('id'));
  if (!Number.isFinite(curriculumId) || curriculumId <= 0) {
    return NextResponse.json({ error: 'invalid curriculum id' }, { status: 400 });
  }

  let body: {
    meta?: Partial<MetaRow>;
    overlay?: Partial<OverlayRow>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const metaPatch = body.meta ?? {};
    const { error: metaErr } = await supabase
      .from('spokedu_master_program_meta')
      .upsert({ curriculum_id: curriculumId, ...metaPatch }, { onConflict: 'curriculum_id' });
    if (metaErr) throw metaErr;

    const overlayPatch = body.overlay ?? {};
    const { data: existing, error: existingErr } = await supabase
      .from('spokedu_pro_programs')
      .select('id')
      .eq('source_center_curriculum_id', curriculumId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;

    const overlayPayload = {
      title: overlayPatch.title ?? `curriculum #${curriculumId}`,
      source_center_curriculum_id: curriculumId,
      video_url: overlayPatch.video_url ?? null,
      equipment: overlayPatch.equipment ?? null,
      checklist: overlayPatch.checklist ?? null,
      activity_method: overlayPatch.activity_method ?? null,
      activity_tip: overlayPatch.activity_tip ?? null,
      function_types: overlayPatch.function_types ?? null,
      is_published: overlayPatch.is_published ?? true,
    };

    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('spokedu_pro_programs')
        .update(overlayPayload)
        .eq('id', existing.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('spokedu_pro_programs')
        .insert(overlayPayload);
      if (insertErr) throw insertErr;
    }

    const data = await loadPrograms();
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'save failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
