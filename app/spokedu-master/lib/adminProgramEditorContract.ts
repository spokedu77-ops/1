import {
  extractExactSectionText,
  parseVariationMethod,
} from './lessonContentContract';

export type AdminProgramSaveInput = {
  title: string;
  fallbackTitle: string;
  videoUrl: string;
  equipment: string;
  activityMethod: string;
  publicationStatus: 'draft' | 'ready' | 'featured' | 'hidden';
  theme: string;
  target: string;
  tags: string[];
  space: string;
  duration: number | null;
  setupImageUrl: string;
  coachScript: string;
  briefingNotes: string;
  variationMethod: string;
};

export type AdminProgramSaveStage = 'overlay' | 'meta' | 'legacy-mirror' | 'reload';

export function normalizeNullableText(value: string | null | undefined) {
  const text = (value ?? '').trim();
  return text || null;
}

export function normalizeTextarea(value: string | null | undefined) {
  const text = (value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
  return text || null;
}

export function normalizeAdminTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

export function resolveAdminBriefingNotes(
  metaValue: string | null | undefined,
  legacyChecklist: string | null | undefined,
) {
  return normalizeNullableText(metaValue)
    ?? extractExactSectionText(legacyChecklist, '사전 교육');
}

export function resolveAdminVariationMethod(
  metaValue: string | null | undefined,
  legacyActivityTip: string | null | undefined,
) {
  return normalizeNullableText(metaValue)
    ?? parseVariationMethod(legacyActivityTip).join('\n');
}

export function buildAdminProgramSavePayload(input: AdminProgramSaveInput) {
  return {
    meta: {
      sm_theme: normalizeNullableText(input.theme),
      sm_grade: normalizeNullableText(input.target),
      sm_tags: normalizeAdminTags(input.tags),
      sm_space: normalizeNullableText(input.space),
      sm_duration: Number.isFinite(input.duration) && Number(input.duration) > 0
        ? Number(input.duration)
        : null,
      sm_setup_image_url: normalizeNullableText(input.setupImageUrl),
      sm_coach_script: normalizeTextarea(input.coachScript),
      sm_briefing_notes: normalizeTextarea(input.briefingNotes),
      sm_variation_method: normalizeTextarea(input.variationMethod),
    },
    overlay: {
      title: normalizeNullableText(input.title) ?? input.fallbackTitle.trim(),
      video_url: normalizeNullableText(input.videoUrl),
      equipment: normalizeTextarea(input.equipment),
      activity_method: normalizeTextarea(input.activityMethod),
      is_published: input.publicationStatus !== 'hidden',
    },
  };
}

export function buildAdminProgramSaveFailure(input: {
  overlaySaved: boolean;
  metaSaved: boolean;
  legacyMirrorSaved: boolean;
  failedStage: AdminProgramSaveStage;
  error: string;
}) {
  return {
    ok: false as const,
    overlaySaved: input.overlaySaved,
    metaSaved: input.metaSaved,
    legacyMirrorSaved: input.legacyMirrorSaved,
    partialSave: input.overlaySaved || input.metaSaved || input.legacyMirrorSaved,
    failedStage: input.failedStage,
    error: input.error,
  };
}
