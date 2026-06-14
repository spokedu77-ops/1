import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  normalizeMasterDuration,
  normalizeMasterSpace,
  normalizeMasterTarget,
} from '@/app/spokedu-master/lib/programDisplayTags';
import {
  buildAdminProgramSaveFailure,
  normalizeAdminTags,
  normalizeNullableText,
  normalizeTextarea,
  type AdminProgramSaveStage,
} from '@/app/spokedu-master/lib/adminProgramEditorContract';
import { replaceExactSection } from '@/app/spokedu-master/lib/lessonContentContract';

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
  sm_briefing_notes: string | null;
  sm_variation_method: string | null;
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
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_duration,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids,sm_thumbnail_url,sm_hero_image_url,sm_setup_image_url,sm_gallery_image_urls,sm_briefing_notes,sm_variation_method')
      .in('curriculum_id', ids);
    if (metaErr) throw metaErr;
    for (const meta of (metaRows ?? []) as MetaRow[]) metaById.set(meta.curriculum_id, meta);
  }

  let overlayById = new Map<number, OverlayRow>();
  if (ids.length > 0) {
    const { data: overlayRows, error: overlayErr } = await supabase
      .from('spokedu_pro_programs')
      .select('id,title,source_center_curriculum_id,video_url,equipment,checklist,activity_method,activity_tip,main_theme,group_size,is_published,updated_at')
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
    meta?: {
      sm_theme?: unknown;
      sm_grade?: unknown;
      sm_tags?: unknown;
      sm_space?: unknown;
      sm_duration?: unknown;
      sm_setup_image_url?: unknown;
      sm_coach_script?: unknown;
      sm_briefing_notes?: unknown;
      sm_variation_method?: unknown;
    };
    overlay?: {
      title?: unknown;
      video_url?: unknown;
      equipment?: unknown;
      activity_method?: unknown;
      is_published?: unknown;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const state = {
    ok: false,
    overlaySaved: false,
    metaSaved: false,
    legacyMirrorSaved: false,
    partialSave: false,
  };
  let failedStage: AdminProgramSaveStage = 'overlay';

  try {
    const supabase = getServiceSupabase();
    const metaInput = body.meta ?? {};
    const overlayInput = body.overlay ?? {};
    const metaPatch = {
      sm_theme: normalizeUnknownText(metaInput.sm_theme),
      sm_grade: normalizeUnknownText(metaInput.sm_grade),
      sm_tags: normalizeAdminTags(Array.isArray(metaInput.sm_tags) ? metaInput.sm_tags.filter(isString) : []),
      sm_space: normalizeUnknownText(metaInput.sm_space),
      sm_duration: normalizeUnknownDuration(metaInput.sm_duration),
      sm_setup_image_url: normalizeUnknownText(metaInput.sm_setup_image_url),
      sm_coach_script: normalizeUnknownTextarea(metaInput.sm_coach_script),
      sm_briefing_notes: normalizeUnknownTextarea(metaInput.sm_briefing_notes),
      sm_variation_method: normalizeUnknownTextarea(metaInput.sm_variation_method),
    };
    const overlayPayload = {
      title: normalizeUnknownText(overlayInput.title) ?? `curriculum #${curriculumId}`,
      source_center_curriculum_id: curriculumId,
      video_url: normalizeUnknownText(overlayInput.video_url),
      equipment: normalizeUnknownTextarea(overlayInput.equipment),
      activity_method: normalizeUnknownTextarea(overlayInput.activity_method),
      is_published: typeof overlayInput.is_published === 'boolean' ? overlayInput.is_published : true,
    };

    const { data: existing, error: existingErr } = await supabase
      .from('spokedu_pro_programs')
      .select('id,checklist,activity_tip')
      .eq('source_center_curriculum_id', curriculumId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;

    let overlayId: number;
    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('spokedu_pro_programs')
        .update(overlayPayload)
        .eq('id', existing.id);
      if (updateErr) throw updateErr;
      overlayId = existing.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('spokedu_pro_programs')
        .insert(overlayPayload)
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      overlayId = inserted.id;
    }
    state.overlaySaved = true;

    failedStage = 'meta';
    const { error: metaErr } = await supabase
      .from('spokedu_master_program_meta')
      .upsert({ curriculum_id: curriculumId, ...metaPatch }, { onConflict: 'curriculum_id' });
    if (metaErr) throw metaErr;
    state.metaSaved = true;

    failedStage = 'legacy-mirror';
    // Temporary 2B compatibility mirror. Remove after the public programs API reads Master meta in 2C.
    const legacyPatch = {
      checklist: replaceExactSection(existing?.checklist, '사전 교육', metaPatch.sm_briefing_notes),
      activity_tip: replaceExactSection(existing?.activity_tip, '변형 방법', metaPatch.sm_variation_method),
    };
    const { error: mirrorErr } = await supabase
      .from('spokedu_pro_programs')
      .update(legacyPatch)
      .eq('id', overlayId);
    if (mirrorErr) throw mirrorErr;
    state.legacyMirrorSaved = true;

    failedStage = 'reload';
    const data = await loadPrograms();
    return NextResponse.json({
      ...state,
      ok: true,
      partialSave: false,
      data,
      total: data.length,
    });
  } catch (error) {
    const message = errorMessage(error);
    return NextResponse.json(buildAdminProgramSaveFailure({
      overlaySaved: state.overlaySaved,
      metaSaved: state.metaSaved,
      legacyMirrorSaved: state.legacyMirrorSaved,
      failedStage,
      error: message,
    }), { status: 500 });
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function normalizeUnknownText(value: unknown) {
  return normalizeNullableText(isString(value) ? value : null);
}

function normalizeUnknownTextarea(value: unknown) {
  return normalizeTextarea(isString(value) ? value : null);
}

function normalizeUnknownDuration(value: unknown) {
  const duration = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'save failed';
}
