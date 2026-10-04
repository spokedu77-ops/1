export type ProgramOverlayCandidate = {
  id: number;
  source_center_curriculum_id: number | null;
  updated_at: string | null;
  is_published: boolean | null;
};

function updatedAtScore(value: string | null) {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function isPreferredProgramOverlay<T extends ProgramOverlayCandidate>(candidate: T, current: T) {
  const candidateUpdatedAt = updatedAtScore(candidate.updated_at);
  const currentUpdatedAt = updatedAtScore(current.updated_at);
  if (candidateUpdatedAt !== currentUpdatedAt) return candidateUpdatedAt > currentUpdatedAt;
  return candidate.id > current.id;
}

export function selectCanonicalPublishedProgramOverlays<T extends ProgramOverlayCandidate>(
  rows: T[],
  allowedCurriculumIds: ReadonlySet<number>,
) {
  const selected = new Map<number, T>();
  for (const row of rows) {
    const curriculumId = row.source_center_curriculum_id;
    if (curriculumId == null || !allowedCurriculumIds.has(curriculumId) || row.is_published !== true) continue;
    const current = selected.get(curriculumId);
    if (!current || isPreferredProgramOverlay(row, current)) selected.set(curriculumId, row);
  }
  return selected;
}
