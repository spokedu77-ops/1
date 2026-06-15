export type SyncChangeLike = {
  curriculumId: number;
  action: 'insert' | 'update';
};

export function buildMissingMasterMetaRows(
  changes: SyncChangeLike[],
  existingCurriculumIds: Iterable<number>,
) {
  const existing = new Set(existingCurriculumIds);
  const planned = new Set<number>();

  for (const change of changes) {
    if (change.action !== 'insert') continue;
    if (existing.has(change.curriculumId)) continue;
    planned.add(change.curriculumId);
  }

  return [...planned]
    .sort((left, right) => left - right)
    .map((curriculumId) => ({
      curriculum_id: curriculumId,
      sm_tags: [] as string[],
      sm_gallery_image_urls: [] as string[],
    }));
}
