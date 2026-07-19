import { NextResponse } from 'next/server';
import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import {
  normalizeMasterSpace,
  normalizeMasterTarget,
} from '@/app/spokedu-master/lib/programDisplayTags';
import { normalizeLessonTheme } from '@/app/spokedu-master/lib/lessonTheme';
import {
  buildAdminProgramSaveFailure,
  buildAdminProgramSaveSuccess,
  normalizeAdminTags,
  normalizeNullableText,
  normalizeTextarea,
  type AdminProgramSaveStage,
} from '@/app/spokedu-master/lib/adminProgramEditorContract';
import { loadSavedAdminProgram } from './savedProgram';

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
  steps: string[] | null;
};

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[] | null;
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
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
  activity_method: string | null;
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

function publicationStatus(meta: MetaRow | null, overlay: OverlayRow | null): PublicationStatus {
  if (overlay?.is_published !== true) return 'hidden';
  if (!meta) return 'draft';
  if (meta.sm_is_hot && (meta.sm_display_order ?? 9999) < 100) return 'featured';
  if (meta.sm_objective || meta.sm_parent_note || meta.sm_coach_script) return 'ready';
  return 'draft';
}

function completeness(input: {
  target: string;
  space: string;
  equipment: string[];
  steps: string[];
  videoUrl: string | null;
  setupImageUrl: string | null;
}): MaterialStatus {
  const coreReady = Boolean(input.target && input.space && input.equipment.length > 0 && input.steps.length > 0);
  if (!coreReady) return 'incomplete';
  const homeReady = Boolean(input.videoUrl || input.setupImageUrl);
  return homeReady ? 'home-ready' : 'ready';
}

async function loadPrograms() {
  const supabase = getServiceSupabase();
  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,title,url,month,week,display_order,equipment,steps')
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
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids,sm_thumbnail_url,sm_hero_image_url,sm_setup_image_url,sm_gallery_image_urls,sm_briefing_notes,sm_variation_method')
      .in('curriculum_id', ids);
    if (metaErr) throw metaErr;
    for (const meta of (metaRows ?? []) as MetaRow[]) metaById.set(meta.curriculum_id, meta);
  }

  let overlayById = new Map<number, OverlayRow>();
  if (ids.length > 0) {
    const { data: overlayRows, error: overlayErr } = await supabase
      .from('spokedu_pro_programs')
      .select('id,title,source_center_curriculum_id,video_url,equipment,activity_method,main_theme,group_size,is_published,updated_at')
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
    const steps = overlay?.activity_method ? splitLines(overlay.activity_method) : safeArray(row.steps);
    const target = normalizeMasterTarget(meta?.sm_grade ?? overlay?.group_size ?? '');
    const space = normalizeMasterSpace(meta?.sm_space ?? '');
    const status = completeness({
      target,
      space,
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
        steps: safeArray(row.steps),
      },
      meta,
      overlay,
      effective: {
        title,
        videoUrl,
        target,
        space,
        equipment,
        steps,
        parentNote: (meta?.sm_parent_note ?? '').trim(),
        relatedSpomoveIds: safeArray(meta?.sm_related_spomove_ids),
        status,
        publicationStatus: publicationStatus(meta, overlay),
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

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    title?: unknown;
    videoUrl?: unknown;
    equipment?: unknown;
    steps?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const title = normalizeUnknownText(body.title);
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  try {
    const supabase = getServiceSupabase();
    const equipment = splitLines(isString(body.equipment) ? body.equipment : '');
    const steps = splitLines(isString(body.steps) ? body.steps : '');
    const videoUrl = normalizeVideoUrl(isString(body.videoUrl) ? body.videoUrl : null);

    const { data: orderRows, error: orderErr } = await supabase
      .from('curriculum')
      .select('display_order')
      .eq('is_sub', false)
      .order('display_order', { ascending: false, nullsFirst: false })
      .limit(1);
    if (orderErr) throw orderErr;

    const currentMaxOrder = Number((orderRows?.[0] as { display_order?: number | null } | undefined)?.display_order);
    const displayOrder = Number.isFinite(currentMaxOrder) ? currentMaxOrder + 1 : 0;

    const { data: inserted, error: insertErr } = await supabase
      .from('curriculum')
      .insert({
        title,
        url: videoUrl,
        month: null,
        week: null,
        display_order: displayOrder,
        equipment,
        steps,
        is_sub: false,
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    const curriculumId = (inserted as { id: number }).id;

    const { error: overlayErr } = await supabase
      .from('spokedu_pro_programs')
      .insert({
        title,
        source_center_curriculum_id: curriculumId,
        video_url: videoUrl,
        equipment: equipment.join('\n') || null,
        activity_method: steps.join('\n') || null,
        is_published: true,
      });
    if (overlayErr) throw overlayErr;

    const { error: metaErr } = await supabase
      .from('spokedu_master_program_meta')
      .upsert({
        curriculum_id: curriculumId,
        sm_tags: [],
        sm_display_order: displayOrder,
        sm_is_pro: true,
        sm_is_new: true,
        sm_is_hot: false,
      }, { onConflict: 'curriculum_id' });
    if (metaErr) throw metaErr;

    const data = await loadPrograms();
    const program = data.find((item) => item.curriculum.id === curriculumId);
    if (!program) throw new Error(`Created program ${curriculumId} could not be reloaded.`);

    return NextResponse.json({ ok: true, program });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
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
    partialSave: false,
  };
  let failedStage: AdminProgramSaveStage = 'overlay';

  try {
    const supabase = getServiceSupabase();
    const metaInput = body.meta ?? {};
    const overlayInput = body.overlay ?? {};
    const metaPatch: Record<string, unknown> = {};
    if ('sm_theme' in metaInput) {
      metaPatch.sm_theme = normalizeNullableText(normalizeLessonTheme(normalizeUnknownText(metaInput.sm_theme)));
    }
    if ('sm_grade' in metaInput) metaPatch.sm_grade = normalizeUnknownText(metaInput.sm_grade);
    if ('sm_tags' in metaInput) metaPatch.sm_tags = normalizeAdminTags(Array.isArray(metaInput.sm_tags) ? metaInput.sm_tags.filter(isString) : []);
    if ('sm_space' in metaInput) metaPatch.sm_space = normalizeUnknownText(metaInput.sm_space);
    if ('sm_setup_image_url' in metaInput) metaPatch.sm_setup_image_url = normalizeUnknownText(metaInput.sm_setup_image_url);
    if ('sm_coach_script' in metaInput) metaPatch.sm_coach_script = normalizeUnknownTextarea(metaInput.sm_coach_script);
    if ('sm_briefing_notes' in metaInput) metaPatch.sm_briefing_notes = normalizeUnknownTextarea(metaInput.sm_briefing_notes);
    if ('sm_variation_method' in metaInput) metaPatch.sm_variation_method = normalizeUnknownTextarea(metaInput.sm_variation_method);
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
      .select('id')
      .eq('source_center_curriculum_id', curriculumId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingErr) throw existingErr;

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
    state.overlaySaved = true;

    failedStage = 'meta';
    const { error: metaErr } = await supabase
      .from('spokedu_master_program_meta')
      .upsert({ curriculum_id: curriculumId, ...metaPatch }, { onConflict: 'curriculum_id' });
    if (metaErr) throw metaErr;
    state.metaSaved = true;

    failedStage = 'reload';
    const program = await loadSavedAdminProgram(curriculumId, {
      readOverlay: async (id) => {
        const result = await supabase
          .from('spokedu_pro_programs')
          .select('id,source_center_curriculum_id,title,video_url,equipment,activity_method,is_published,updated_at')
          .eq('source_center_curriculum_id', id)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { data: result.data, error: result.error };
      },
      readMeta: async (id) => {
        const result = await supabase
          .from('spokedu_master_program_meta')
          .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids,sm_thumbnail_url,sm_hero_image_url,sm_setup_image_url,sm_gallery_image_urls,sm_briefing_notes,sm_variation_method')
          .eq('curriculum_id', id)
          .maybeSingle();
        return { data: result.data, error: result.error };
      },
    });
    return NextResponse.json(buildAdminProgramSaveSuccess(program));
  } catch (error) {
    const message = errorMessage(error);
    return NextResponse.json(buildAdminProgramSaveFailure({
      overlaySaved: state.overlaySaved,
      metaSaved: state.metaSaved,
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

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'save failed';
}
