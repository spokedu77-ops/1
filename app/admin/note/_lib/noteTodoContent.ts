/** 노션 todo: text + checked(boolean) + listNestLevel(형제 체크리스트 들여쓰기) */
export const MAX_TODO_LIST_NEST_LEVEL = 8;

export function readTodoListNestLevel(
  content: Record<string, unknown> | null | undefined,
): number {
  const raw = content?.listNestLevel;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(MAX_TODO_LIST_NEST_LEVEL, Math.floor(raw)));
}

export function normalizeTodoBlockContentRecord(  content: Record<string, unknown>,
): Record<string, unknown> {
  const listNestLevel = readTodoListNestLevel(content);
  return {
    ...content,
    text: typeof content.text === 'string' ? content.text : '',
    checked: content.checked === true,
    ...(listNestLevel > 0 ? { listNestLevel } : {}),
  };
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
