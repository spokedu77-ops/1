import { createServerSupabaseClient } from '@/app/lib/supabase/server';
import { getServiceSupabase } from '@/app/lib/server/adminAuth';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import type { Program } from '@/app/spokedu-master/types';
import { pickBestHeroUrl } from '@/app/spokedu-master/lib/program-visual';
import {
  getMasterParticipantFormat,
  normalizeMasterDuration,
  normalizeMasterSpace,
  normalizeMasterTarget,
} from '@/app/spokedu-master/lib/programDisplayTags';
import { normalizeLessonTheme } from '@/app/spokedu-master/lib/lessonTheme';
import { parseTextareaLines } from '@/app/spokedu-master/lib/lessonContentContract';
import { findOfficialSpomovePreset } from '@/app/spokedu-master/spomove/officialSpomovePresets';

const FALLBACK_COLORS: [string, string, string, string][] = [
  ['#312e81', '#3730a3', '#4338ca', '#4f46e5'],
  ['#064e3b', '#047857', '#16a34a', '#86efac'],
  ['#713f12', '#92400e', '#b45309', '#d97706'],
  ['#1e1b4b', '#2d2a6e', '#3730a3', '#6366f1'],
  ['#1c1917', '#292524', '#44403c', '#78716c'],
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORY_COLORS: Record<string, [string, string, string, string]> = {
  경쟁형: ['#111827', '#1d4ed8', '#f97316', '#facc15'],
  민첩성: ['#1e1035', '#312e81', '#4338ca', '#818cf8'],
  '반응 속도': ['#1c0a2e', '#4c1d95', '#7c3aed', '#a78bfa'],
  협동: ['#052e16', '#065f46', '#059669', '#34d399'],
  협응력: ['#0c2a4a', '#0369a1', '#0ea5e9', '#7dd3fc'],
  균형: ['#052e16', '#14532d', '#16a34a', '#86efac'],
  표현활동: ['#3f0000', '#7f1d1d', '#be123c', '#fb7185'],
  집중력: ['#1a1333', '#3730a3', '#6366f1', '#c7d2fe'],
};

function categoryToColors(category: string): [string, string, string, string] {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([^"&?/\s]{11})/);
  return match?.[1] ?? null;
}

const INVALID_VIDEO_VALUES = new Set(['', '-', '0', '123', 'none', 'null', 'undefined', '없음', '영상없음']);

function normalizeVideoUrl(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim();
  if (!text || INVALID_VIDEO_VALUES.has(text.toLowerCase().replace(/\s+/g, ''))) return undefined;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : undefined;
  } catch {
    return undefined;
  }
}

function buildThumbnailUrl(videoUrl: string | null | undefined): string | undefined {
  const normalized = normalizeVideoUrl(videoUrl);
  if (!normalized) return undefined;
  const id = extractYouTubeId(normalized);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : undefined;
}

function normalizeImageUrl(value: string | null | undefined): string | undefined {
  const text = (value ?? '').trim();
  return text || undefined;
}

function normalizeImageUrls(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeSpomoveIds(ids: string[]): string[] {
  return [...new Set(ids)].filter((id) => Boolean(findOfficialSpomovePreset(id))).slice(0, 3);
}


function hasBrokenText(value: string | null | undefined) {
  if (!value) return false;
  return value.includes(String.fromCharCode(0xfffd)) || /怨|諛|吏|媛|蹂|鍮|湲|醫|嫄|珥|諛|湲|由|誘/.test(value);
}

function cleanText(value: string | null | undefined, fallback: string) {
  const text = (value ?? '').trim();
  if (!text || hasBrokenText(text)) return fallback;
  return text;
}

function cleanList(items: string[] | null | undefined, fallback: string[]) {
  const cleaned = (items ?? []).map((item) => item.trim()).filter((item) => item && !hasBrokenText(item));
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeProgramForMaster(program: Program): Program {
  const title = cleanText(program.title, '');
  const relatedSpomoveIds = normalizeSpomoveIds(program.lessonDetail?.relatedSpomoveIds ?? []);
  const youtubeThumb = buildThumbnailUrl(program.lessonDetail?.videoUrl);
  const thumbnailUrl = pickBestHeroUrl(program.thumbnailUrl, youtubeThumb);

  return {
    ...program,
    title,
    category: cleanText(program.category, ''),
    grade: cleanText(program.grade, ''),
    space: cleanText(program.space, ''),
    description: cleanText(program.description, ''),
    steps: program.steps.filter(Boolean),
    equipment: program.equipment.filter(Boolean),
    thumbnailUrl,
    tags: [...new Set(program.tags)],
    lessonDetail: program.lessonDetail
      ? {
          ...program.lessonDetail,
          recommendedAge: cleanText(program.lessonDetail.recommendedAge, ''),
          recommendedPlayers: cleanText(program.lessonDetail.recommendedPlayers, ''),
          objective: cleanText(program.lessonDetail.objective, ''),
          developmentFocus: cleanText(program.lessonDetail.developmentFocus, ''),
          coachScript: cleanText(program.lessonDetail.coachScript, ''),
          parentNote: cleanText(program.lessonDetail.parentNote, ''),
          fieldTips: cleanList(program.lessonDetail.fieldTips, []),
          variations: cleanList(program.lessonDetail.variations, []),
          safetyNotes: cleanList(program.lessonDetail.safetyNotes, []),
          briefingNotes: cleanList(program.lessonDetail.briefingNotes ?? [], []),
          rules: cleanList(program.lessonDetail.rules ?? [], []),
          setupNotes: cleanList(program.lessonDetail.setupNotes ?? [], []),
          relatedSpomoveIds,
          videoUrl: normalizeVideoUrl(program.lessonDetail.videoUrl),
          heroImageUrl: pickBestHeroUrl(program.lessonDetail.heroImageUrl, thumbnailUrl),
          setupImageUrl: program.lessonDetail.setupImageUrl,
          galleryImageUrls: program.lessonDetail.galleryImageUrls ?? [],
        }
      : program.lessonDetail,
  };
}

export async function GET() {
  const access = await requireSpokeduMasterAccess();
  if (!access.ok) return withPrivateNoStore(access.response);

  const supabase = getServiceSupabase();
  const { data: curriculumRows, error: currErr } = await supabase
    .from('curriculum')
    .select('id,display_order')
    .eq('is_sub', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('id', { ascending: false });

  if (currErr || !curriculumRows) {
    return privateNoStoreJson({ error: currErr?.message ?? 'DB error' }, { status: 500 });
  }

  const curriculumIds = (curriculumRows as { id: number }[]).map((row) => row.id);

  type MetaRow = {
    curriculum_id: number;
    sm_tags: string[] | null;
    sm_theme: string | null;
    sm_grade: string | null;
    sm_space: string | null;
    sm_duration: number | null;
    sm_is_pro: boolean;
    sm_is_new: boolean;
    sm_is_hot: boolean;
    sm_display_order: number;
    sm_colors: string[] | null;
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

  const metaByCurriculumId = new Map<number, MetaRow>();
  if (curriculumIds.length > 0) {
    const { data: metaRows } = await supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_duration,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_colors,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids,sm_thumbnail_url,sm_hero_image_url,sm_setup_image_url,sm_gallery_image_urls,sm_briefing_notes,sm_variation_method')
      .in('curriculum_id', curriculumIds);
    for (const meta of (metaRows ?? []) as MetaRow[]) {
      metaByCurriculumId.set(meta.curriculum_id, meta);
    }
  }

  type OverlayRow = {
    title: string | null;
    source_center_curriculum_id: number | null;
    video_url: string | null;
    activity_method: string | null;
    equipment: string | null;
    updated_at: string | null;
    is_published: boolean | null;
  };

  const overlayByCurriculumId = new Map<number, OverlayRow>();
  if (curriculumIds.length > 0) {
    const { data: overlayRows } = await supabase
      .from('spokedu_pro_programs')
      .select('title,source_center_curriculum_id,video_url,activity_method,equipment,updated_at,is_published')
      .in('source_center_curriculum_id', curriculumIds);
    for (const overlay of (overlayRows ?? []) as OverlayRow[]) {
      const curriculumId = overlay.source_center_curriculum_id;
      if (curriculumId == null) continue;
      const prev = overlayByCurriculumId.get(curriculumId);
      if (!prev) {
        overlayByCurriculumId.set(curriculumId, overlay);
        continue;
      }
      const prevTime = prev.updated_at ? Date.parse(prev.updated_at) : 0;
      const nextTime = overlay.updated_at ? Date.parse(overlay.updated_at) : 0;
      if (nextTime >= prevTime) overlayByCurriculumId.set(curriculumId, overlay);
    }
  }

  type CurrRow = {
    id: number;
    display_order: number | null;
  };

  const programs: Program[] = (curriculumRows as CurrRow[])
    .filter((row) => overlayByCurriculumId.get(row.id)?.is_published !== false)
    .map((row, index) => {
    const meta = metaByCurriculumId.get(row.id);
    const overlay = overlayByCurriculumId.get(row.id);
    const title = (overlay?.title ?? '').trim();
    const rawCategory = (meta?.sm_theme ?? '').trim();
    const categoryName = normalizeLessonTheme(rawCategory);
    const rawVideoUrl = normalizeVideoUrl(overlay?.video_url);
    const videoUrl = rawVideoUrl;
    const equipment = overlay?.equipment
      ? String(overlay.equipment).split('\n').map((item) => item.trim()).filter(Boolean)
      : [];
    const steps = overlay?.activity_method
      ? String(overlay.activity_method).split('\n').map((item) => item.trim()).filter(Boolean)
      : [];
    const variations = parseTextareaLines(meta?.sm_variation_method);
    const briefingNotes = parseTextareaLines(meta?.sm_briefing_notes);

    const smColors = meta?.sm_colors;
    const colors: [string, string, string, string] =
      Array.isArray(smColors) && smColors.length === 4
        ? [smColors[0], smColors[1], smColors[2], smColors[3]]
        : categoryToColors(categoryName);

    const smTags = meta?.sm_tags ?? [];
    const participantFormat = getMasterParticipantFormat(smTags);
    const relatedSpomoveIds = normalizeSpomoveIds(meta?.sm_related_spomove_ids ?? []);
    const tags = [...new Set(smTags.map((tag) => tag.trim()).filter(Boolean))];
    const setupImageUrl = normalizeImageUrl(meta?.sm_setup_image_url);
    const fallbackThumbnailUrl = buildThumbnailUrl(videoUrl);
    const legacyImageFallback =
      normalizeImageUrl(meta?.sm_thumbnail_url) ?? normalizeImageUrl(meta?.sm_hero_image_url);
    const thumbnailUrl = setupImageUrl ?? fallbackThumbnailUrl ?? legacyImageFallback;
    const heroImageUrl = setupImageUrl ?? fallbackThumbnailUrl ?? legacyImageFallback;
    const galleryImageUrls = normalizeImageUrls(meta?.sm_gallery_image_urls);

    const displayGrade = normalizeMasterTarget(meta?.sm_grade ?? '');
    const displaySpace = normalizeMasterSpace(meta?.sm_space ?? '');
    const displayDuration = normalizeMasterDuration(meta?.sm_duration) ?? 0;

    const program: Program = {
      id: String(row.id),
      curriculumId: row.id,
      title,
      category: categoryName,
      grade: displayGrade,
      duration: displayDuration,
      space: displaySpace,
      description: '',
      steps,
      equipment,
      tags,
      colors,
      isPro: meta?.sm_is_pro ?? false,
      isNew: meta?.sm_is_new ?? false,
      isHot: meta?.sm_is_hot ?? false,
      homeSortOrder: meta?.sm_display_order ?? (typeof row.display_order === 'number' ? row.display_order : 5000 + index),
      thumbnailUrl,
      lessonDetail: {
        recommendedAge: displayGrade,
        recommendedPlayers: participantFormat,
        objective: meta?.sm_objective ?? '',
        developmentFocus: meta?.sm_development_focus ?? meta?.sm_theme ?? '',
        coachScript: meta?.sm_coach_script ?? '',
        parentNote: meta?.sm_parent_note ?? '',
        fieldTips: [],
        variations,
        safetyNotes: [],
        relatedSpomoveIds,
        videoUrl,
        heroImageUrl,
        setupImageUrl,
        galleryImageUrls,
        briefingNotes,
        rules: steps,
        setupNotes: [],
      },
    };

    return normalizeProgramForMaster(program);
    });

  return privateNoStoreJson({ data: programs, total: programs.length });
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const idRaw = searchParams.get('id');
  const curriculumId = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(curriculumId) || curriculumId <= 0) {
    return privateNoStoreJson({ error: 'invalid id' }, { status: 400 });
  }

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return privateNoStoreJson({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return privateNoStoreJson({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['sm_tags', 'sm_theme', 'sm_grade', 'sm_space', 'sm_duration', 'sm_is_pro', 'sm_is_new', 'sm_is_hot', 'sm_display_order', 'sm_colors', 'sm_objective', 'sm_development_focus', 'sm_coach_script', 'sm_parent_note', 'sm_related_spomove_ids', 'sm_thumbnail_url', 'sm_hero_image_url', 'sm_setup_image_url', 'sm_gallery_image_urls', 'sm_briefing_notes', 'sm_variation_method'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_meta')
    .upsert({ curriculum_id: curriculumId, ...patch }, { onConflict: 'curriculum_id' })
    .select()
    .maybeSingle();

  if (error) return privateNoStoreJson({ error: error.message }, { status: 500 });
  return privateNoStoreJson({ data });
}
