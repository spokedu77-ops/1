export type NoteBlocksLoadOptions = {
  /**
   * true면 서버 toggle/tree migration 없이 SELECT만 (prefetch 속도용 — 기본 false).
   * @deprecated op-log 통합 후 제거 예정
   */
  skipServerMigration?: boolean;
};

/** admin/note blocks/load URL — 서버 migration 포함이 기본 */
export function noteBlocksLoadPath(
  documentId: string,
  options?: NoteBlocksLoadOptions,
): string {
  const params = new URLSearchParams({ documentId });
  if (options?.skipServerMigration) {
    params.set('skipReconcile', 'true');
  }
  return `/api/admin/note/blocks/load?${params.toString()}`;
}
