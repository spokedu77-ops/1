export const LESSON_CATALOG_NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isLessonCatalogNew(listedAt: string | null | undefined, now = Date.now()): boolean {
  if (!listedAt) return false;
  const listed = Date.parse(listedAt);
  if (!Number.isFinite(listed)) return false;
  const elapsed = now - listed;
  return elapsed >= 0 && elapsed < LESSON_CATALOG_NEW_WINDOW_MS;
}
