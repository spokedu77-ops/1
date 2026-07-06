import { getServiceSupabase, requireAdmin } from '@/app/lib/server/adminAuth';
import { reportError } from '@/app/lib/monitoring/errorReporter';
import { privateNoStoreJson, withPrivateNoStore } from '@/app/lib/server/privateNoStore';
import { requireSpokeduMasterAccess } from '@/app/lib/server/spokeduMasterAccess';
import type { Program } from '@/app/spokedu-master/types';
import { pickBestHeroUrl } from '@/app/spokedu-master/lib/program-visual';
import {
  getMasterParticipantFormat,
  normalizeMasterSpace,
  normalizeMasterTarget,
} from '@/app/spokedu-master/lib/programDisplayTags';
import { normalizeLessonTheme } from '@/app/spokedu-master/lib/lessonTheme';
import { extractExactSectionLines, parseTextareaLines, parseVariationMethod } from '@/app/spokedu-master/lib/lessonContentContract';
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

const PROGRAM_SOURCE_ERROR = {
  error: '수업 자료를 불러오지 못했습니다.',
  code: 'PROGRAM_SOURCE_FAILED',
};

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
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : undefined;
  } catch {
    return undefined;
  }
}

function normalizeImageUrls(value: string[] | null | undefined): string[] {
  return (value ?? []).map((item) => normalizeImageUrl(item)).filter((item): item is string => Boolean(item));
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
  const cleaned = [...new Set((items ?? []).map((item) => item.trim()).filter((item) => item && !hasBrokenText(item)))];
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

function canAccessProProgramDetails(access: Awaited<ReturnType<typeof requireSpokeduMasterAccess>>): boolean {
  return access.ok && (access.isAdmin || access.plan === 'premium' || access.plan === 'team' || access.plan === 'admin');
}

function redactProgramForAccess(program: Program, canAccessProDetails: boolean): Program {
  if (!program.isPro || canAccessProDetails) return program;
  return {
    ...program,
    steps: [],
    equipment: [],
    lessonDetail: undefined,
  };
}

type MetaRow = {
  curriculum_id: number;
  sm_tags: string[] | null;
  sm_theme: string | null;
  sm_grade: string | null;
  sm_space: string | null;
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

type OverlayRow = {
  title: string | null;
  source_center_curriculum_id: number | null;
  video_url: string | null;
  activity_method: string | null;
  equipment: string | null;
  updated_at: string | null;
  is_published: boolean | null;
};

type CurrRow = {
  id: number;
  display_order: number | null;
};

type ProgramValidationIssue =
  | 'invalid_curriculum_id'
  | 'missing_title'
  | 'broken_title'
  | 'missing_category'
  | 'broken_category'
  | 'missing_grade'
  | 'missing_space'
  | 'missing_steps';

type BuildProgramResult =
  | { ok: true; program: Program }
  | { ok: false; curriculumId: number | null; issues: ProgramValidationIssue[] };

function hasValidCurriculumId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function splitLines(value: string | null | undefined): string[] {
  return [...new Set(String(value ?? '').split('\n').map((item) => item.trim()).filter((item) => item && !hasBrokenText(item)))];
}

function extractAnySectionLines(source: string | null | undefined, labels: string[]) {
  const values = labels.flatMap((label) => extractExactSectionLines(source, label));
  return cleanList(values, []);
}

function parseVariationLines(source: string | null | undefined) {
  const section = parseVariationMethod(source);
  return section.length > 0 ? section : parseTextareaLines(source);
}

function getMasterProgramValidationIssues(input: {
  row: CurrRow;
  meta: MetaRow | undefined;
  overlay: OverlayRow | undefined;
  title: string;
  rawCategory: string;
  categoryName: string;
  grade: string;
  space: string;
  steps: string[];
}): ProgramValidationIssue[] {
  const issues: ProgramValidationIssue[] = [];

  if (!hasValidCurriculumId(input.row.id)) issues.push('invalid_curriculum_id');
  if (!input.overlay || input.overlay.source_center_curriculum_id !== input.row.id) issues.push('invalid_curriculum_id');
  if (!input.title) issues.push('missing_title');
  if (hasBrokenText(input.overlay?.title)) issues.push('broken_title');
  if (!input.rawCategory || !input.categoryName) issues.push('missing_category');
  if (hasBrokenText(input.rawCategory)) issues.push('broken_category');
  if (!input.grade) issues.push('missing_grade');
  if (!input.space) issues.push('missing_space');
  if (input.steps.length === 0) issues.push('missing_steps');
  if (!input.meta) issues.push('missing_category');

  return [...new Set(issues)];
}

function buildMasterProgram(row: CurrRow, index: number, meta: MetaRow | undefined, overlay: OverlayRow | undefined): BuildProgramResult {
  const title = cleanText(overlay?.title, '');
  const rawCategory = cleanText(meta?.sm_theme, '');
  const categoryName = normalizeLessonTheme(rawCategory);
  const rawVideoUrl = normalizeVideoUrl(overlay?.video_url);
  const videoUrl = rawVideoUrl;
  const equipment = splitLines(overlay?.equipment);
  const steps = splitLines(overlay?.activity_method);
  const variations = parseVariationLines(meta?.sm_variation_method);
  const briefingNotes = parseTextareaLines(meta?.sm_briefing_notes);
  const safetyNotes = extractAnySectionLines(meta?.sm_briefing_notes, ['안전 포인트', '안전 유의사항', '안전']);
  const fieldTips = extractAnySectionLines(meta?.sm_briefing_notes, ['운영 팁', '지도 포인트', '현장 팁']);
  const setupNotes = extractAnySectionLines(meta?.sm_briefing_notes, ['세팅', '준비', '사전 준비']);
  const displayGrade = normalizeMasterTarget(meta?.sm_grade ?? '');
  const displaySpace = normalizeMasterSpace(meta?.sm_space ?? '');
  const issues = getMasterProgramValidationIssues({
    row,
    meta,
    overlay,
    title,
    rawCategory,
    categoryName,
    grade: displayGrade,
    space: displaySpace,
    steps,
  });

  if (issues.length > 0) {
    return { ok: false, curriculumId: hasValidCurriculumId(row.id) ? row.id : null, issues };
  }

  const smColors = meta?.sm_colors;
  const colors: [string, string, string, string] =
    Array.isArray(smColors) && smColors.length === 4
      ? [smColors[0], smColors[1], smColors[2], smColors[3]]
      : categoryToColors(categoryName);

  const smTags = meta?.sm_tags ?? [];
  const participantFormat = getMasterParticipantFormat(smTags);
  const relatedSpomoveIds = normalizeSpomoveIds(meta?.sm_related_spomove_ids ?? []);
  const tags = [...new Set(smTags.map((tag) => tag.trim()).filter((tag) => tag && !hasBrokenText(tag)))];
  const setupImageUrl = normalizeImageUrl(meta?.sm_setup_image_url);
  const fallbackThumbnailUrl = buildThumbnailUrl(videoUrl);
  const legacyImageFallback =
    normalizeImageUrl(meta?.sm_thumbnail_url) ?? normalizeImageUrl(meta?.sm_hero_image_url);
  const thumbnailUrl = setupImageUrl ?? fallbackThumbnailUrl ?? legacyImageFallback;
  const heroImageUrl = setupImageUrl ?? fallbackThumbnailUrl ?? legacyImageFallback;
  const galleryImageUrls = normalizeImageUrls(meta?.sm_gallery_image_urls);

  const program: Program = {
    id: String(row.id),
    curriculumId: row.id,
    title,
    category: categoryName,
    grade: displayGrade,
    space: displaySpace,
    description: '',
    steps,
    equipment,
    tags,
    colors,
    isPro: meta?.sm_is_pro ?? false,
    hasReferenceVideo: Boolean(normalizeVideoUrl(videoUrl)),
    hasSpomoveConnection: relatedSpomoveIds.length > 0,
    isNew: meta?.sm_is_new ?? false,
    isHot: meta?.sm_is_hot ?? false,
    homeSortOrder: meta?.sm_display_order ?? (typeof row.display_order === 'number' ? row.display_order : 5000 + index),
    thumbnailUrl,
    lessonDetail: {
      recommendedAge: displayGrade,
      recommendedPlayers: participantFormat,
      objective: cleanText(meta?.sm_objective, ''),
      developmentFocus: cleanText(meta?.sm_development_focus, rawCategory),
      coachScript: cleanText(meta?.sm_coach_script, ''),
      parentNote: cleanText(meta?.sm_parent_note, ''),
      fieldTips,
      variations,
      safetyNotes,
      relatedSpomoveIds,
      videoUrl,
      heroImageUrl,
      setupImageUrl,
      galleryImageUrls,
      briefingNotes,
      rules: steps,
      setupNotes,
    },
  };

  return { ok: true, program: normalizeProgramForMaster(program) };
}

async function reportProgramSourceFailure(error: unknown, source: string) {
  await reportError(error instanceof Error ? error : new Error(`SPOKEDU MASTER program ${source} query failed`), {
    context: 'spokedu-master.programs.source',
    tags: {
      source,
    },
  });
}

async function reportInvalidMasterPrograms(invalid: Array<{ curriculumId: number | null; issues: ProgramValidationIssue[] }>) {
  if (invalid.length === 0) return;
  await reportError(new Error('SPOKEDU MASTER invalid published programs excluded'), {
    context: 'spokedu-master.programs.validation',
    tags: {
      invalidCount: invalid.length,
      curriculumIds: invalid.map((item) => item.curriculumId).filter((id): id is number => id != null).join(','),
      issues: [...new Set(invalid.flatMap((item) => item.issues))].join(','),
    },
  });
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
    await reportProgramSourceFailure(currErr, 'curriculum');
    return privateNoStoreJson(PROGRAM_SOURCE_ERROR, { status: 500 });
  }

  const curriculumIds = (curriculumRows as CurrRow[]).map((row) => row.id);
  const curriculumIdSet = new Set(curriculumIds);

  const metaByCurriculumId = new Map<number, MetaRow>();
  if (curriculumIds.length > 0) {
    const { data: metaRows, error: metaErr } = await supabase
      .from('spokedu_master_program_meta')
      .select('curriculum_id,sm_tags,sm_theme,sm_grade,sm_space,sm_is_pro,sm_is_new,sm_is_hot,sm_display_order,sm_colors,sm_objective,sm_development_focus,sm_coach_script,sm_parent_note,sm_related_spomove_ids,sm_thumbnail_url,sm_hero_image_url,sm_setup_image_url,sm_gallery_image_urls,sm_briefing_notes,sm_variation_method')
      .in('curriculum_id', curriculumIds);
    if (metaErr || !metaRows) {
      await reportProgramSourceFailure(metaErr, 'spokedu_master_program_meta');
      return privateNoStoreJson(PROGRAM_SOURCE_ERROR, { status: 500 });
    }
    for (const meta of (metaRows ?? []) as MetaRow[]) {
      metaByCurriculumId.set(meta.curriculum_id, meta);
    }
  }

  const overlayByCurriculumId = new Map<number, OverlayRow>();
  if (curriculumIds.length > 0) {
    const { data: overlayRows, error: overlayErr } = await supabase
      .from('spokedu_pro_programs')
      .select('title,source_center_curriculum_id,video_url,activity_method,equipment,updated_at,is_published')
      .in('source_center_curriculum_id', curriculumIds);
    if (overlayErr || !overlayRows) {
      await reportProgramSourceFailure(overlayErr, 'spokedu_pro_programs');
      return privateNoStoreJson(PROGRAM_SOURCE_ERROR, { status: 500 });
    }
    for (const overlay of (overlayRows ?? []) as OverlayRow[]) {
      const curriculumId = overlay.source_center_curriculum_id;
      if (curriculumId == null) continue;
      if (!curriculumIdSet.has(curriculumId)) continue;
      if (overlay.is_published !== true) continue;
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

  const programs: Program[] = [];
  const invalidPrograms: Array<{ curriculumId: number | null; issues: ProgramValidationIssue[] }> = [];

  for (const [index, row] of (curriculumRows as CurrRow[]).entries()) {
    const overlay = overlayByCurriculumId.get(row.id);
    if (!overlay) continue;
    const result = buildMasterProgram(row, index, metaByCurriculumId.get(row.id), overlay);
    if (result.ok) {
      programs.push(result.program);
    } else {
      invalidPrograms.push({ curriculumId: result.curriculumId, issues: result.issues });
    }
  }

  await reportInvalidMasterPrograms(invalidPrograms);

  if (overlayByCurriculumId.size > 0 && programs.length === 0) {
    return privateNoStoreJson(PROGRAM_SOURCE_ERROR, { status: 500 });
  }

  const canAccessProDetails = canAccessProProgramDetails(access);
  const visiblePrograms = programs.map((program) => redactProgramForAccess(program, canAccessProDetails));

  return privateNoStoreJson({ data: visiblePrograms, total: visiblePrograms.length });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return withPrivateNoStore(admin.response);

  const { searchParams } = new URL(request.url);
  const idRaw = searchParams.get('id');
  const curriculumId = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(curriculumId) || curriculumId <= 0) {
    return privateNoStoreJson({ error: 'invalid id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return privateNoStoreJson({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['sm_tags', 'sm_theme', 'sm_grade', 'sm_space', 'sm_is_pro', 'sm_is_new', 'sm_is_hot', 'sm_display_order', 'sm_colors', 'sm_objective', 'sm_development_focus', 'sm_coach_script', 'sm_parent_note', 'sm_related_spomove_ids', 'sm_thumbnail_url', 'sm_hero_image_url', 'sm_setup_image_url', 'sm_gallery_image_urls', 'sm_briefing_notes', 'sm_variation_method'];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return privateNoStoreJson({ error: 'empty patch' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('spokedu_master_program_meta')
    .upsert({ curriculum_id: curriculumId, ...patch }, { onConflict: 'curriculum_id' })
    .select()
    .maybeSingle();

  if (error) {
    await reportError(error, {
      context: 'spokedu_master.programs.patch',
      tags: { method: 'PATCH', stage: 'meta_upsert', status: 500 },
    });
    return privateNoStoreJson(
      { error: '프로그램 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
  return privateNoStoreJson({ data });
}
