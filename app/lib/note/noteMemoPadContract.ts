/**
 * Memo Pad Contract — admin/note 사용자-facing SSOT.
 *
 * 메모장 = 사용자가 쓴 글·체크·목록 순서는 Intent 없이 바뀌지 않는다.
 * ZERO LOSS(`note-data-preservation`)와 동치이나, 순서·서버 repair 금지를 한곳에 모은다.
 */

/** 서버 load/enforce/op normalize가 DB에 쓸 수 있는 구조 필드 — order_index 제외 */
export type MemoPadServerStructuralPatch = {
  parent_block_id?: string | null;
  type?: string;
};

const MEMO_PAD_FORBIDDEN_SILENT_SERVER_FIELDS = ['order_index'] as const;

/**
 * 서버 자동 수리(sanitize·invariant migration)가 DB에 persist할 patch.
 * order_index·content 등 사용자 기록은 클라이언트 topology/content op로만.
 */
export function pickMemoPadServerStructuralPatch(
  patch: Record<string, unknown> | null | undefined,
): MemoPadServerStructuralPatch | null {
  if (!patch) return null;
  const out: MemoPadServerStructuralPatch = {};
  if ('parent_block_id' in patch) {
    out.parent_block_id = (patch.parent_block_id ?? null) as string | null;
  }
  if (typeof patch.type === 'string') {
    out.type = patch.type;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** 계약 위반 여부 — 테스트·리뷰용 */
export function violatesMemoPadSilentServerMutation(
  patch: Record<string, unknown> | null | undefined,
): boolean {
  if (!patch) return false;
  return MEMO_PAD_FORBIDDEN_SILENT_SERVER_FIELDS.some((key) => key in patch);
}

/** op-log transaction normalize가 sanitize 결과로 덮어써도 되는 필드 */
export function mergeMemoPadTransactionPatchFromSanitize<T extends Record<string, unknown>>(
  clientPatch: T,
  sanitized: { document_id?: string; parent_block_id?: string | null; type?: string },
): T {
  return {
    ...clientPatch,
    ...(sanitized.document_id !== undefined ? { document_id: sanitized.document_id } : {}),
    ...(sanitized.parent_block_id !== undefined
      ? { parent_block_id: sanitized.parent_block_id ?? null }
      : {}),
    ...(sanitized.type !== undefined ? { type: sanitized.type } : {}),
  };
}
