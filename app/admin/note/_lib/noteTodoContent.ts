/** 노션 계약: todo 본문은 text + checked. 중첩은 parent_block_id만. */

/** @deprecated listNestLevel은 로드 migration 입력 전용 — 신규 write 금지 */
export const MAX_TODO_LIST_NEST_LEVEL = 8;

/** @deprecated migration 입력 전용 */
export function readTodoListNestLevel(
  content: Record<string, unknown> | null | undefined,
): number {
  const raw = content?.listNestLevel;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(MAX_TODO_LIST_NEST_LEVEL, Math.floor(raw)));
}

export function normalizeTodoBlockContentRecord(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...content,
    text: typeof content.text === 'string' ? content.text : '',
    checked: content.checked === true,
  };
  // 계약: nesting ≠ content.listNestLevel
  delete next.listNestLevel;
  return next;
}

export function resolveTodoChecked(
  content: Record<string, unknown> | null | undefined,
): boolean {
  return content?.checked === true;
}

export function patchTodoChecked(
  content: Record<string, unknown>,
): Record<string, unknown> {
  return normalizeTodoBlockContentRecord({
    ...content,
    checked: !resolveTodoChecked(content),
  });
}
